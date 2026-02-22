# =============================================================================
# voice_clone_services.py — Expanded Voice Clone Use Cases
# =============================================================================
# Location: src/api/voice_clone_services.py
# Register: app.register_blueprint(voice_clone_services_bp)
#
# 6 new voice clone services beyond Radio DJ:
#   1. Podcast Intros/Outros
#   2. Video Narration / Voiceover
#   3. Live Stream Alerts (tip/sub notifications)
#   4. Automated Fan Shoutouts (paid personalized messages)
#   5. Story/Reel Narration
#   6. Course/Tutorial Audio Generation
#
# All generated audio → Cloudflare R2
# Uses existing ElevenLabs voice clone from ai_radio_dj.py
# =============================================================================

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
import os
import tempfile
import traceback
import requests
import uuid

# R2 storage (primary) with Cloudinary fallback
try:
    from src.api.r2_storage_setup import uploadFile
except ImportError:
    from src.api.cloudinary_setup import uploadFile

from src.api.models import db, User

voice_clone_services_bp = Blueprint('voice_clone_services', __name__)


# =============================================================================
# SHARED: Get user's cloned voice ID
# =============================================================================

def get_user_voice_id(user_id):
    """
    Look up user's cloned voice ID.
    Checks: user profile → radio station dj_config.
    Returns (voice_id, voice_name) or (None, None).
    """
    try:
        # Check radio stations for existing cloned voice
        from src.api.models import RadioStation
        stations = RadioStation.query.filter_by(user_id=user_id).all()
        for station in stations:
            if station.playlist_schedule:
                dj_config = station.playlist_schedule.get("dj_config", {})
                voice_id = dj_config.get("custom_voice_id")
                if voice_id:
                    voice_name = dj_config.get("custom_voice_name", "Custom Voice")
                    return voice_id, voice_name

        # Check user profile for stored voice_id
        user = User.query.get(user_id)
        if user and hasattr(user, 'metadata') and user.metadata:
            meta = user.metadata if isinstance(user.metadata, dict) else {}
            voice_id = meta.get("voice_clone_id")
            if voice_id:
                return voice_id, meta.get("voice_clone_name", "My Voice")

    except Exception as e:
        print(f"⚠️ Error fetching voice ID: {e}")

    return None, None


def generate_voice_audio(text, voice_id, filename_prefix="voice"):
    """
    Generate audio from text using ElevenLabs cloned voice.
    Uploads to R2 and returns the URL.
    Returns (audio_url, duration_estimate) or (None, None).
    """
    elevenlabs_key = os.environ.get("ELEVENLABS_API_KEY")
    if not elevenlabs_key:
        return None, None

    temp_dir = tempfile.mkdtemp()
    try:
        output_path = os.path.join(temp_dir, f"{filename_prefix}.mp3")

        response = requests.post(
            f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
            headers={
                "xi-api-key": elevenlabs_key,
                "Content-Type": "application/json",
            },
            json={
                "text": text,
                "model_id": "eleven_monolingual_v1",
                "voice_settings": {
                    "stability": 0.65,
                    "similarity_boost": 0.80,
                },
            },
            timeout=60,
        )
        response.raise_for_status()

        with open(output_path, "wb") as f:
            f.write(response.content)

        # Upload to R2
        uid = uuid.uuid4().hex[:8]
        r2_filename = f"{filename_prefix}_{uid}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.mp3"
        with open(output_path, "rb") as f:
            audio_url = uploadFile(f, r2_filename)

        # Rough duration estimate: ~150 words/min, ~5 chars/word
        duration_estimate = max(1, len(text) / (5 * 150 / 60))

        print(f"🎤 Voice audio generated → R2: {r2_filename}")
        return audio_url, round(duration_estimate, 1)

    except Exception as e:
        print(f"❌ Voice generation error: {e}")
        traceback.print_exc()
        return None, None

    finally:
        try:
            import shutil
            shutil.rmtree(temp_dir, ignore_errors=True)
        except Exception:
            pass


def check_voice_available(user_id):
    """Check if user has a cloned voice and ElevenLabs is configured."""
    elevenlabs_key = os.environ.get("ELEVENLABS_API_KEY")
    if not elevenlabs_key:
        return None, None, "Voice cloning not configured. Add ELEVENLABS_API_KEY to enable."
    
    voice_id, voice_name = get_user_voice_id(user_id)
    if not voice_id:
        return None, None, "No cloned voice found. Clone your voice first in AI Radio DJ → Voice tab."
    
    return voice_id, voice_name, None


# =============================================================================
# 1. PODCAST INTROS / OUTROS
# =============================================================================

PODCAST_INTRO_TEMPLATES = {
    "casual": "What's good everybody, welcome back to {show_name}. I'm {host_name}, and today we're diving into {topic}. Let's get into it.",
    "professional": "Hello and welcome to {show_name}. I'm your host {host_name}. In today's episode, we're exploring {topic}. Let's get started.",
    "energetic": "Yooo what's up everyone! You're tuned in to {show_name} with {host_name}! Today's topic is gonna be fire — we're talking about {topic}. Let's gooo!",
    "storytelling": "Picture this. You're about to hear something that might just change how you think about {topic}. Welcome to {show_name}. I'm {host_name}, and this is going to be a good one.",
    "interview": "Welcome to {show_name}. I'm {host_name}, and today I've got an incredible guest joining us to talk about {topic}. You don't want to miss this conversation.",
}

PODCAST_OUTRO_TEMPLATES = {
    "casual": "Alright y'all, that's a wrap on this one. If you liked it, hit that subscribe button and leave a review — it really helps. Until next time, I'm {host_name}, peace.",
    "professional": "Thank you for listening to {show_name}. If you enjoyed this episode, please subscribe and leave a review. I'm {host_name}, and I'll see you next time.",
    "energetic": "And THAT'S the episode! You already know what to do — subscribe, share it with your people, and drop a review. I'm {host_name}, catch you on the next one! Let's go!",
    "call_to_action": "Thanks for rocking with me on {show_name}. If you want more, check out the links in the show notes. Follow me on social media, and don't forget to subscribe. I'm {host_name}, talk soon.",
}


@voice_clone_services_bp.route('/api/voice/podcast/intro', methods=['POST'])
@jwt_required()
def generate_podcast_intro():
    """Generate a podcast intro in the creator's cloned voice."""
    user_id = get_jwt_identity()
    data = request.get_json()

    voice_id, voice_name, error = check_voice_available(user_id)
    if error:
        return jsonify({"error": error}), 400

    show_name = data.get("show_name", "my podcast")
    host_name = data.get("host_name", "your host")
    topic = data.get("topic", "something amazing")
    style = data.get("style", "casual")
    custom_script = data.get("custom_script")

    # Use custom script or template
    if custom_script and custom_script.strip():
        script = custom_script.strip()
    else:
        template = PODCAST_INTRO_TEMPLATES.get(style, PODCAST_INTRO_TEMPLATES["casual"])
        script = template.format(show_name=show_name, host_name=host_name, topic=topic)

    if len(script) > 2000:
        return jsonify({"error": "Script too long. Max 2000 characters."}), 400

    audio_url, duration = generate_voice_audio(script, voice_id, "podcast_intro")
    if not audio_url:
        return jsonify({"error": "Failed to generate intro audio"}), 500

    return jsonify({
        "message": "🎙️ Podcast intro generated!",
        "audio_url": audio_url,
        "script": script,
        "style": style,
        "duration_seconds": duration,
        "voice_name": voice_name,
        "type": "intro",
    }), 200


@voice_clone_services_bp.route('/api/voice/podcast/outro', methods=['POST'])
@jwt_required()
def generate_podcast_outro():
    """Generate a podcast outro in the creator's cloned voice."""
    user_id = get_jwt_identity()
    data = request.get_json()

    voice_id, voice_name, error = check_voice_available(user_id)
    if error:
        return jsonify({"error": error}), 400

    show_name = data.get("show_name", "my podcast")
    host_name = data.get("host_name", "your host")
    style = data.get("style", "casual")
    custom_script = data.get("custom_script")

    if custom_script and custom_script.strip():
        script = custom_script.strip()
    else:
        template = PODCAST_OUTRO_TEMPLATES.get(style, PODCAST_OUTRO_TEMPLATES["casual"])
        script = template.format(show_name=show_name, host_name=host_name)

    if len(script) > 2000:
        return jsonify({"error": "Script too long. Max 2000 characters."}), 400

    audio_url, duration = generate_voice_audio(script, voice_id, "podcast_outro")
    if not audio_url:
        return jsonify({"error": "Failed to generate outro audio"}), 500

    return jsonify({
        "message": "🎙️ Podcast outro generated!",
        "audio_url": audio_url,
        "script": script,
        "style": style,
        "duration_seconds": duration,
        "voice_name": voice_name,
        "type": "outro",
    }), 200


# =============================================================================
# 2. VIDEO NARRATION / VOICEOVER
# =============================================================================

@voice_clone_services_bp.route('/api/voice/narration', methods=['POST'])
@jwt_required()
def generate_video_narration():
    """
    Generate voiceover narration from a script.
    Creator submits text → returns audio file URL for use in video editor.
    """
    user_id = get_jwt_identity()
    data = request.get_json()

    voice_id, voice_name, error = check_voice_available(user_id)
    if error:
        return jsonify({"error": error}), 400

    script = data.get("script", "").strip()
    title = data.get("title", "Voiceover")

    if not script:
        return jsonify({"error": "Please provide a narration script."}), 400

    if len(script) > 5000:
        return jsonify({"error": "Script too long. Max 5000 characters (~3 minutes of audio)."}), 400

    # For long scripts, split into chunks and stitch
    # ElevenLabs handles up to ~5000 chars well
    audio_url, duration = generate_voice_audio(script, voice_id, "narration")
    if not audio_url:
        return jsonify({"error": "Failed to generate narration"}), 500

    return jsonify({
        "message": "🎬 Voiceover narration generated!",
        "audio_url": audio_url,
        "script": script,
        "title": title,
        "duration_seconds": duration,
        "voice_name": voice_name,
        "tip": "Download this audio and import it into the Video Editor as a voiceover track.",
    }), 200


@voice_clone_services_bp.route('/api/voice/narration/batch', methods=['POST'])
@jwt_required()
def generate_batch_narration():
    """
    Generate multiple narration segments at once.
    Useful for multi-section tutorials or video chapters.
    """
    user_id = get_jwt_identity()
    data = request.get_json()

    voice_id, voice_name, error = check_voice_available(user_id)
    if error:
        return jsonify({"error": error}), 400

    segments = data.get("segments", [])
    if not segments:
        return jsonify({"error": "Please provide at least one segment."}), 400
    if len(segments) > 20:
        return jsonify({"error": "Max 20 segments per batch."}), 400

    results = []
    for i, seg in enumerate(segments):
        script = seg.get("script", "").strip()
        title = seg.get("title", f"Segment {i + 1}")

        if not script:
            results.append({"title": title, "error": "Empty script", "audio_url": None})
            continue

        if len(script) > 3000:
            results.append({"title": title, "error": "Script too long (max 3000 chars)", "audio_url": None})
            continue

        audio_url, duration = generate_voice_audio(script, voice_id, f"narration_seg{i}")
        results.append({
            "title": title,
            "audio_url": audio_url,
            "script": script,
            "duration_seconds": duration,
            "error": None if audio_url else "Generation failed",
        })

    successful = sum(1 for r in results if r.get("audio_url"))
    return jsonify({
        "message": f"🎬 Generated {successful}/{len(segments)} narration segments!",
        "segments": results,
        "voice_name": voice_name,
        "total_segments": len(segments),
        "successful": successful,
    }), 200


# =============================================================================
# 3. LIVE STREAM ALERTS
# =============================================================================

ALERT_TEMPLATES = {
    "tip": {
        "default": "Yo, big shoutout to {username} for the {amount} tip! You're the real one, thank you!",
        "hype": "Let's gooo! {username} just dropped {amount}! You already know we appreciate that! Thank you!",
        "chill": "Hey, {username} just sent {amount}. Thank you so much, I really appreciate the support.",
    },
    "subscribe": {
        "default": "Welcome to the family, {username}! Thanks for subscribing, you're gonna love it here.",
        "hype": "{username} just subscribed! Let's go! Welcome to the squad!",
        "chill": "Hey {username}, welcome aboard. Thanks for the sub, glad to have you.",
    },
    "follow": {
        "default": "Shoutout to {username} for the follow! Welcome!",
        "hype": "{username} in the building! Thanks for the follow! Let's go!",
        "chill": "Hey {username}, thanks for the follow. Stick around, we got some good stuff coming.",
    },
    "raid": {
        "default": "Oh snap, {username} just raided with {amount} viewers! Welcome everyone, glad you're here!",
        "hype": "RAID! {username} coming through with {amount} people! Let's gooo! Welcome everybody!",
        "chill": "Nice, {username} just came through with a raid. {amount} viewers, welcome all of you.",
    },
    "gift_sub": {
        "default": "{username} just gifted {amount} subs! That's incredible, thank you so much!",
        "hype": "Are you serious?! {username} gifted {amount} subs! You are absolutely insane! Thank you!",
        "chill": "Wow, {username} gifted {amount} subs. That's really generous, thank you.",
    },
}


@voice_clone_services_bp.route('/api/voice/stream-alert', methods=['POST'])
@jwt_required()
def generate_stream_alert():
    """
    Generate a live stream alert in the creator's voice.
    Called when someone tips, subscribes, follows, raids, or gifts subs.
    """
    user_id = get_jwt_identity()
    data = request.get_json()

    voice_id, voice_name, error = check_voice_available(user_id)
    if error:
        return jsonify({"error": error}), 400

    alert_type = data.get("alert_type", "tip")  # tip, subscribe, follow, raid, gift_sub
    username = data.get("username", "someone")
    amount = data.get("amount", "")
    tone = data.get("tone", "default")  # default, hype, chill
    custom_message = data.get("custom_message")

    if custom_message and custom_message.strip():
        script = custom_message.strip()
    else:
        templates = ALERT_TEMPLATES.get(alert_type, ALERT_TEMPLATES["tip"])
        template = templates.get(tone, templates["default"])
        script = template.format(username=username, amount=amount)

    if len(script) > 500:
        return jsonify({"error": "Alert message too long. Max 500 characters."}), 400

    audio_url, duration = generate_voice_audio(script, voice_id, f"stream_alert_{alert_type}")
    if not audio_url:
        return jsonify({"error": "Failed to generate alert audio"}), 500

    return jsonify({
        "message": f"🔴 Stream alert generated!",
        "audio_url": audio_url,
        "script": script,
        "alert_type": alert_type,
        "username": username,
        "duration_seconds": duration,
        "voice_name": voice_name,
    }), 200


@voice_clone_services_bp.route('/api/voice/stream-alert/pregenerate', methods=['POST'])
@jwt_required()
def pregenerate_stream_alerts():
    """
    Pre-generate a set of common alert sounds so they play instantly during streams.
    Generates one audio file per alert type + tone combination.
    """
    user_id = get_jwt_identity()
    data = request.get_json()

    voice_id, voice_name, error = check_voice_available(user_id)
    if error:
        return jsonify({"error": error}), 400

    tone = data.get("tone", "default")
    test_username = data.get("test_username", "StreamFan42")
    test_amount = data.get("test_amount", "$5")

    alerts = {}
    for alert_type, templates in ALERT_TEMPLATES.items():
        template = templates.get(tone, templates["default"])
        script = template.format(username=test_username, amount=test_amount)
        audio_url, duration = generate_voice_audio(script, voice_id, f"pregen_{alert_type}")
        alerts[alert_type] = {
            "audio_url": audio_url,
            "script": script,
            "duration_seconds": duration,
        }

    successful = sum(1 for a in alerts.values() if a.get("audio_url"))
    return jsonify({
        "message": f"🔴 Pre-generated {successful}/{len(alerts)} alert sounds!",
        "alerts": alerts,
        "tone": tone,
        "voice_name": voice_name,
        "tip": "These alerts will play instantly during your streams when events happen.",
    }), 200


# =============================================================================
# 4. AUTOMATED FAN SHOUTOUTS (Paid Personalized Messages)
# =============================================================================

SHOUTOUT_TEMPLATES = {
    "greeting": "Hey {fan_name}! It's {creator_name}. {message} Thanks for being part of the community, I appreciate you!",
    "birthday": "Happy birthday {fan_name}! It's {creator_name}, and I just wanted to wish you an amazing day. {message} Enjoy it!",
    "thank_you": "What's up {fan_name}, {creator_name} here. I just wanted to say thank you. {message} Your support means the world to me.",
    "motivational": "Hey {fan_name}, it's {creator_name}. I got a message for you. {message} Keep pushing, you got this!",
    "custom": "{message}",
}


@voice_clone_services_bp.route('/api/voice/shoutout', methods=['POST'])
@jwt_required()
def generate_fan_shoutout():
    """
    Generate a personalized fan shoutout in the creator's voice.
    Fans can request (and pay for) personalized voice messages.
    """
    user_id = get_jwt_identity()
    data = request.get_json()

    voice_id, voice_name, error = check_voice_available(user_id)
    if error:
        return jsonify({"error": error}), 400

    fan_name = data.get("fan_name", "fan")
    creator_name = data.get("creator_name", "me")
    message = data.get("message", "")
    shoutout_type = data.get("type", "greeting")  # greeting, birthday, thank_you, motivational, custom
    custom_script = data.get("custom_script")

    if custom_script and custom_script.strip():
        script = custom_script.strip()
    else:
        template = SHOUTOUT_TEMPLATES.get(shoutout_type, SHOUTOUT_TEMPLATES["greeting"])
        script = template.format(fan_name=fan_name, creator_name=creator_name, message=message)

    if len(script) > 1000:
        return jsonify({"error": "Shoutout too long. Max 1000 characters."}), 400

    audio_url, duration = generate_voice_audio(script, voice_id, "shoutout")
    if not audio_url:
        return jsonify({"error": "Failed to generate shoutout"}), 500

    return jsonify({
        "message": f"🎤 Shoutout for {fan_name} generated!",
        "audio_url": audio_url,
        "script": script,
        "fan_name": fan_name,
        "shoutout_type": shoutout_type,
        "duration_seconds": duration,
        "voice_name": voice_name,
    }), 200


@voice_clone_services_bp.route('/api/voice/shoutout/batch', methods=['POST'])
@jwt_required()
def generate_batch_shoutouts():
    """
    Generate multiple shoutouts at once.
    For creators who want to batch-produce personalized messages.
    """
    user_id = get_jwt_identity()
    data = request.get_json()

    voice_id, voice_name, error = check_voice_available(user_id)
    if error:
        return jsonify({"error": error}), 400

    shoutouts = data.get("shoutouts", [])
    creator_name = data.get("creator_name", "me")

    if not shoutouts:
        return jsonify({"error": "No shoutouts provided."}), 400
    if len(shoutouts) > 25:
        return jsonify({"error": "Max 25 shoutouts per batch."}), 400

    results = []
    for i, s in enumerate(shoutouts):
        fan_name = s.get("fan_name", f"Fan {i + 1}")
        message = s.get("message", "")
        shoutout_type = s.get("type", "greeting")

        template = SHOUTOUT_TEMPLATES.get(shoutout_type, SHOUTOUT_TEMPLATES["greeting"])
        script = template.format(fan_name=fan_name, creator_name=creator_name, message=message)

        audio_url, duration = generate_voice_audio(script, voice_id, f"shoutout_{i}")
        results.append({
            "fan_name": fan_name,
            "audio_url": audio_url,
            "script": script,
            "duration_seconds": duration,
            "error": None if audio_url else "Generation failed",
        })

    successful = sum(1 for r in results if r.get("audio_url"))
    return jsonify({
        "message": f"🎤 Generated {successful}/{len(shoutouts)} shoutouts!",
        "shoutouts": results,
        "voice_name": voice_name,
    }), 200


# =============================================================================
# 5. STORY / REEL NARRATION
# =============================================================================

@voice_clone_services_bp.route('/api/voice/story-narration', methods=['POST'])
@jwt_required()
def generate_story_narration():
    """
    Generate voiceover narration for a Story or Reel.
    Short-form: max 60 seconds for stories, 180 seconds for reels.
    """
    user_id = get_jwt_identity()
    data = request.get_json()

    voice_id, voice_name, error = check_voice_available(user_id)
    if error:
        return jsonify({"error": error}), 400

    script = data.get("script", "").strip()
    content_type = data.get("content_type", "story")  # story or reel

    if not script:
        return jsonify({"error": "Please provide narration text."}), 400

    # Enforce character limits based on content type
    # ~150 words/min ≈ 750 chars/min
    if content_type == "story":
        max_chars = 750  # ~60 seconds
        max_label = "60 seconds (story)"
    else:
        max_chars = 2250  # ~180 seconds
        max_label = "3 minutes (reel)"

    if len(script) > max_chars:
        return jsonify({
            "error": f"Script too long for {content_type}. Max ~{max_label}. Reduce to {max_chars} characters."
        }), 400

    audio_url, duration = generate_voice_audio(script, voice_id, f"{content_type}_narration")
    if not audio_url:
        return jsonify({"error": "Failed to generate narration"}), 500

    return jsonify({
        "message": f"📱 {content_type.title()} narration generated!",
        "audio_url": audio_url,
        "script": script,
        "content_type": content_type,
        "duration_seconds": duration,
        "voice_name": voice_name,
        "tip": f"Add this audio to your {content_type} before posting.",
    }), 200


# =============================================================================
# 6. COURSE / TUTORIAL AUDIO GENERATION
# =============================================================================

@voice_clone_services_bp.route('/api/voice/course/lesson', methods=['POST'])
@jwt_required()
def generate_course_lesson_audio():
    """
    Generate audio for a course lesson from a text script.
    Supports long-form content by splitting into chunks.
    """
    user_id = get_jwt_identity()
    data = request.get_json()

    voice_id, voice_name, error = check_voice_available(user_id)
    if error:
        return jsonify({"error": error}), 400

    script = data.get("script", "").strip()
    lesson_title = data.get("title", "Lesson")
    course_name = data.get("course_name", "")

    if not script:
        return jsonify({"error": "Please provide lesson content."}), 400

    if len(script) > 10000:
        return jsonify({"error": "Lesson script too long. Max 10,000 characters (~7 minutes). Split into multiple lessons."}), 400

    # For scripts over 5000 chars, split into chunks and generate separately
    if len(script) > 5000:
        midpoint = len(script) // 2
        # Find nearest sentence break
        break_point = script.rfind('. ', 0, midpoint + 200)
        if break_point == -1:
            break_point = midpoint

        part1 = script[:break_point + 1].strip()
        part2 = script[break_point + 1:].strip()

        url1, dur1 = generate_voice_audio(part1, voice_id, "course_p1")
        url2, dur2 = generate_voice_audio(part2, voice_id, "course_p2")

        return jsonify({
            "message": f"📚 Lesson audio generated in 2 parts!",
            "parts": [
                {"audio_url": url1, "duration_seconds": dur1, "part": 1},
                {"audio_url": url2, "duration_seconds": dur2, "part": 2},
            ],
            "lesson_title": lesson_title,
            "course_name": course_name,
            "total_duration": (dur1 or 0) + (dur2 or 0),
            "voice_name": voice_name,
            "tip": "Combine parts in the video editor or upload separately as lesson audio.",
        }), 200

    # Single chunk
    audio_url, duration = generate_voice_audio(script, voice_id, "course_lesson")
    if not audio_url:
        return jsonify({"error": "Failed to generate lesson audio"}), 500

    return jsonify({
        "message": f"📚 Lesson audio generated!",
        "audio_url": audio_url,
        "script": script,
        "lesson_title": lesson_title,
        "course_name": course_name,
        "duration_seconds": duration,
        "voice_name": voice_name,
    }), 200


@voice_clone_services_bp.route('/api/voice/course/batch', methods=['POST'])
@jwt_required()
def generate_course_batch():
    """
    Generate audio for multiple course lessons at once.
    """
    user_id = get_jwt_identity()
    data = request.get_json()

    voice_id, voice_name, error = check_voice_available(user_id)
    if error:
        return jsonify({"error": error}), 400

    lessons = data.get("lessons", [])
    course_name = data.get("course_name", "My Course")

    if not lessons:
        return jsonify({"error": "No lessons provided."}), 400
    if len(lessons) > 30:
        return jsonify({"error": "Max 30 lessons per batch."}), 400

    results = []
    for i, lesson in enumerate(lessons):
        script = lesson.get("script", "").strip()
        title = lesson.get("title", f"Lesson {i + 1}")

        if not script:
            results.append({"title": title, "error": "Empty script", "audio_url": None})
            continue
        if len(script) > 5000:
            results.append({"title": title, "error": "Script too long (max 5000 chars per lesson in batch)", "audio_url": None})
            continue

        audio_url, duration = generate_voice_audio(script, voice_id, f"course_L{i + 1}")
        results.append({
            "title": title,
            "lesson_number": i + 1,
            "audio_url": audio_url,
            "duration_seconds": duration,
            "error": None if audio_url else "Generation failed",
        })

    successful = sum(1 for r in results if r.get("audio_url"))
    total_duration = sum(r.get("duration_seconds", 0) or 0 for r in results)

    return jsonify({
        "message": f"📚 Generated {successful}/{len(lessons)} lesson audios!",
        "course_name": course_name,
        "lessons": results,
        "voice_name": voice_name,
        "total_lessons": len(lessons),
        "successful": successful,
        "total_duration_seconds": round(total_duration, 1),
    }), 200


# =============================================================================
# UNIVERSAL: Check voice status & available services
# =============================================================================

@voice_clone_services_bp.route('/api/voice/status', methods=['GET'])
@jwt_required()
def get_voice_status():
    """Check if user has a cloned voice and what services are available."""
    user_id = get_jwt_identity()

    has_elevenlabs = bool(os.environ.get("ELEVENLABS_API_KEY"))
    voice_id, voice_name = get_user_voice_id(user_id)

    return jsonify({
        "has_cloned_voice": bool(voice_id),
        "voice_name": voice_name,
        "elevenlabs_configured": has_elevenlabs,
        "services": {
            "podcast_intros": bool(voice_id),
            "video_narration": bool(voice_id),
            "stream_alerts": bool(voice_id),
            "fan_shoutouts": bool(voice_id),
            "story_narration": bool(voice_id),
            "course_audio": bool(voice_id),
            "radio_dj": bool(voice_id),
        },
        "clone_location": "AI Radio DJ → Voice tab" if not voice_id else None,
    }), 200


@voice_clone_services_bp.route('/api/voice/history', methods=['GET'])
@jwt_required()
def get_voice_generation_history():
    """
    Return recent voice generations.
    Note: This is a lightweight endpoint that returns info about recent files.
    Full history tracking would require a VoiceGeneration model.
    """
    user_id = get_jwt_identity()
    voice_id, voice_name = get_user_voice_id(user_id)

    return jsonify({
        "has_voice": bool(voice_id),
        "voice_name": voice_name,
        "message": "Voice generation history is tracked per feature. Check your podcast episodes, videos, streams, and shoutouts for generated audio.",
        "services_used": {
            "podcast": "/api/voice/podcast/intro",
            "narration": "/api/voice/narration",
            "stream_alerts": "/api/voice/stream-alert",
            "shoutouts": "/api/voice/shoutout",
            "stories": "/api/voice/story-narration",
            "courses": "/api/voice/course/lesson",
        }
    }), 200