# src/api/ai_radio_dj.py
# =====================================================
# AI RADIO DJ — StreamPireX
# =====================================================
# Phase 2: Fully automated AI-powered radio DJ system
#
# Pipeline per talk break:
#   1. AI writes DJ script (Claude/OpenAI API)
#   2. TTS generates DJ voice audio (OpenAI TTS / ElevenLabs)
#   3. FFmpeg stitches: talk break + crossfade + next song
#   4. Output feeds into existing radio stream
#
# Register: app.register_blueprint(ai_radio_dj_bp)
# =====================================================

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
import os
import json
import tempfile
import traceback
import subprocess
import random
import requests

# Internal imports
from src.api.models import db, Audio, RadioStation, RadioPlaylist, User
from src.api.cloudinary_setup import uploadFile

ai_radio_dj_bp = Blueprint('ai_radio_dj', __name__)


# =====================================================
# DJ PERSONAS
# =====================================================
# Each persona defines the DJ's personality, voice,
# and style. Creators pick a persona or create custom.
# =====================================================

DJ_PERSONAS = {
    "smooth_mike": {
        "name": "Smooth Mike",
        "personality": "Laid-back, warm, soulful. Talks like a late-night R&B DJ. Smooth transitions, keeps it chill.",
        "voice": "onyx",             # OpenAI TTS voice
        "elevenlabs_voice": None,    # ElevenLabs voice ID (if using)
        "genres": ["rnb", "soul", "jazz", "lo-fi"],
        "catchphrases": [
            "You're vibin' with Smooth Mike...",
            "Let that one breathe for a second...",
            "Stay locked in...",
        ],
        "icon": "🎙️",
    },
    "dj_blaze": {
        "name": "DJ Blaze",
        "personality": "Hype, energetic, loud. Like a hip-hop club DJ. Gets the crowd going, drops ad-libs.",
        "voice": "echo",
        "elevenlabs_voice": None,
        "genres": ["hip-hop", "trap", "drill", "edm"],
        "catchphrases": [
            "DJ Blaze in the building!",
            "We don't stop! Next one is CRAZY...",
            "Turn it UP!",
        ],
        "icon": "🔥",
    },
    "luna": {
        "name": "Luna",
        "personality": "Calm, ethereal, dreamy. Perfect for chill/ambient/lo-fi stations. Speaks softly with poetic flair.",
        "voice": "nova",
        "elevenlabs_voice": None,
        "genres": ["lo-fi", "ambient", "chill", "acoustic"],
        "catchphrases": [
            "You're floating with Luna...",
            "Let that wash over you...",
            "Close your eyes for this next one...",
        ],
        "icon": "🌙",
    },
    "mc_voltage": {
        "name": "MC Voltage",
        "personality": "High-energy EDM/dance DJ. Festival vibes, countdown drops, crowd interaction.",
        "voice": "fable",
        "elevenlabs_voice": None,
        "genres": ["edm", "house", "techno", "dance"],
        "catchphrases": [
            "ARE YOU READY?!",
            "Drop incoming in 3... 2... 1...",
            "MC Voltage keeping the energy ALIVE!",
        ],
        "icon": "⚡",
    },
    "big_country": {
        "name": "Big Country",
        "personality": "Warm, friendly, down-to-earth. Classic country/rock radio host. Tells quick stories between songs.",
        "voice": "alloy",
        "elevenlabs_voice": None,
        "genres": ["country", "rock", "acoustic", "folk"],
        "catchphrases": [
            "Big Country here, keepin' it real...",
            "That one never gets old...",
            "Grab your boots for this next one...",
        ],
        "icon": "🤠",
    },
    "professor_jazz": {
        "name": "Professor Jazz",
        "personality": "Sophisticated, knowledgeable, smooth. Shares brief facts about artists and songs. NPR-meets-jazz-club vibe.",
        "voice": "shimmer",
        "elevenlabs_voice": None,
        "genres": ["jazz", "classical", "blues", "bossa nova"],
        "catchphrases": [
            "A timeless piece, that one...",
            "Let me set the scene for this next selection...",
            "The Professor recommends...",
        ],
        "icon": "🎷",
    },
    "auto_dj": {
        "name": "Auto DJ",
        "personality": "Clean, professional, neutral. Generic station announcer. Works for any genre.",
        "voice": "alloy",
        "elevenlabs_voice": None,
        "genres": [],
        "catchphrases": [
            "You're listening to {station_name}...",
            "Up next...",
            "Stay tuned...",
        ],
        "icon": "🤖",
    },
}


# =====================================================
# TALK BREAK TEMPLATES
# =====================================================
# Different types of talk breaks the DJ can generate.
# The automation system picks the right one based on
# schedule rules (time of day, song count, etc.)
# =====================================================

BREAK_TYPES = {
    "song_intro": {
        "description": "Quick intro before the next song plays",
        "max_words": 35,
        "prompt_template": """You are {dj_name}, a radio DJ on {station_name}.
Your personality: {personality}
Genre: {genre}

The last song was "{last_song}" by {last_artist}.
Next up is "{next_song}" by {next_artist}.

Write a quick, natural talk break introducing the next song.
Keep it under {max_words} words. Sound like a real DJ, not robotic.
{catchphrase_hint}""",
    },
    "station_id": {
        "description": "Station identification break (FCC-style)",
        "max_words": 20,
        "prompt_template": """You are {dj_name} on {station_name}.
Your personality: {personality}

Write a very short station ID. Example: "You're locked in to [station name], [tagline]."
Keep it under {max_words} words. Natural and quick.""",
    },
    "time_check": {
        "description": "Time and weather check",
        "max_words": 40,
        "prompt_template": """You are {dj_name} on {station_name}.
Your personality: {personality}
Current time: {current_time}
Day: {day_of_week}

Write a quick time check with personality. Maybe mention the time of day vibe.
Keep it under {max_words} words.""",
    },
    "shoutout": {
        "description": "Listener shoutout or engagement",
        "max_words": 40,
        "prompt_template": """You are {dj_name} on {station_name}.
Your personality: {personality}
Listener count: {listener_count}
{request_info}

Write a quick shoutout to the listeners. Maybe thank them for tuning in,
or acknowledge a request if one was made.
Keep it under {max_words} words.""",
    },
    "mood_set": {
        "description": "Set the mood for the next block of songs",
        "max_words": 45,
        "prompt_template": """You are {dj_name} on {station_name}.
Your personality: {personality}
Genre: {genre}
Time of day: {time_of_day}
Coming up: a block of {upcoming_count} songs in the {mood} mood.

Set the vibe for the next few songs. Get listeners excited or relaxed
depending on the mood. Keep it under {max_words} words.""",
    },
}


# =====================================================
# SCHEDULE RULES
# =====================================================
# Defines when talk breaks happen and what type.
# Creators can customize these per station.
# =====================================================

DEFAULT_SCHEDULE_RULES = {
    "songs_between_breaks": 3,          # Talk break every N songs
    "station_id_interval_minutes": 30,  # Station ID every 30 min
    "time_check_interval_minutes": 60,  # Time check every hour
    "shoutout_interval_minutes": 45,    # Listener shoutout every 45 min
    "crossfade_duration_seconds": 3,    # Crossfade between talk + song
    "talk_break_max_seconds": 15,       # Max talk break length
    "enable_song_intros": True,
    "enable_station_ids": True,
    "enable_time_checks": True,
    "enable_shoutouts": True,
    "enable_mood_sets": True,
}


# =====================================================
# AI SCRIPT GENERATION
# =====================================================

def generate_dj_script(
    persona_key,
    break_type,
    station_name,
    genre="",
    last_song="",
    last_artist="",
    next_song="",
    next_artist="",
    listener_count=0,
    request_info="",
    upcoming_count=3,
    mood="chill",
):
    """
    Generate a DJ talk break script using AI.

    Tries OpenAI first, falls back to template-based generation.
    Returns the script text.
    """
    persona = DJ_PERSONAS.get(persona_key, DJ_PERSONAS["auto_dj"])
    break_config = BREAK_TYPES.get(break_type, BREAK_TYPES["song_intro"])

    now = datetime.utcnow()
    catchphrase = random.choice(persona["catchphrases"]).replace("{station_name}", station_name)

    # Build the prompt
    prompt = break_config["prompt_template"].format(
        dj_name=persona["name"],
        station_name=station_name,
        personality=persona["personality"],
        genre=genre,
        last_song=last_song,
        last_artist=last_artist,
        next_song=next_song,
        next_artist=next_artist,
        max_words=break_config["max_words"],
        catchphrase_hint=f'You might start with something like: "{catchphrase}"',
        current_time=now.strftime("%I:%M %p"),
        day_of_week=now.strftime("%A"),
        time_of_day=_get_time_of_day(now.hour),
        listener_count=listener_count,
        request_info=f"A listener requested: {request_info}" if request_info else "",
        upcoming_count=upcoming_count,
        mood=mood,
    )

    # Try OpenAI API
    openai_key = os.environ.get("OPENAI_API_KEY")
    if openai_key:
        try:
            script = _generate_with_openai(prompt, openai_key)
            if script:
                return script
        except Exception as e:
            print(f"⚠️ OpenAI script generation failed: {e}")

    # Try Anthropic API
    anthropic_key = os.environ.get("ANTHROPIC_API_KEY")
    if anthropic_key:
        try:
            script = _generate_with_anthropic(prompt, anthropic_key)
            if script:
                return script
        except Exception as e:
            print(f"⚠️ Anthropic script generation failed: {e}")

    # Fallback: template-based (no API needed)
    return _generate_fallback_script(persona, break_type, station_name,
                                      last_song, last_artist, next_song, next_artist)


def _generate_with_openai(prompt, api_key):
    """Generate script using OpenAI Chat API."""
    response = requests.post(
        "https://api.openai.com/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json={
            "model": "gpt-4o-mini",
            "messages": [
                {"role": "system", "content": "You are a radio DJ scriptwriter. Write natural, conversational talk breaks. Never use hashtags, emojis, or stage directions. Just the spoken words."},
                {"role": "user", "content": prompt},
            ],
            "max_tokens": 100,
            "temperature": 0.9,
        },
        timeout=10,
    )
    response.raise_for_status()
    data = response.json()
    return data["choices"][0]["message"]["content"].strip()


def _generate_with_anthropic(prompt, api_key):
    """Generate script using Anthropic Claude API."""
    response = requests.post(
        "https://api.anthropic.com/v1/messages",
        headers={
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
        },
        json={
            "model": "claude-sonnet-4-20250514",
            "max_tokens": 100,
            "messages": [
                {"role": "user", "content": prompt},
            ],
        },
        timeout=10,
    )
    response.raise_for_status()
    data = response.json()
    return data["content"][0]["text"].strip()


def _generate_fallback_script(persona, break_type, station_name,
                               last_song, last_artist, next_song, next_artist):
    """
    Template-based fallback when no AI API is available.
    Still sounds decent — just less varied.
    """
    dj = persona["name"]
    catchphrase = random.choice(persona["catchphrases"]).replace("{station_name}", station_name)

    templates = {
        "song_intro": [
            f"{catchphrase} That was {last_song} by {last_artist}. Coming up next, {next_song} by {next_artist}.",
            f"Nice. {last_artist} with {last_song}. Now let's get into {next_song} by {next_artist}.",
            f"{dj} here. Up next — {next_artist}, {next_song}. Let's go.",
        ],
        "station_id": [
            f"You're listening to {station_name}. {dj} keeping it going.",
            f"This is {station_name}. {catchphrase}",
            f"{station_name}. All day, all night. I'm {dj}.",
        ],
        "time_check": [
            f"It's {datetime.utcnow().strftime('%I:%M %p')}. I'm {dj} and you're locked in to {station_name}.",
            f"{dj} checking in — it's {datetime.utcnow().strftime('%I:%M %p')} and the vibes are right.",
        ],
        "shoutout": [
            f"Shoutout to everyone tuning in right now. {catchphrase}",
            f"Big love to the listeners. {dj} appreciates every one of you.",
        ],
        "mood_set": [
            f"Alright, we're about to switch it up. {catchphrase}",
            f"Got a nice little run coming up for you. Stay right here.",
        ],
    }

    options = templates.get(break_type, templates["song_intro"])
    return random.choice(options)


def _get_time_of_day(hour):
    """Get a human-readable time of day label."""
    if hour < 6:
        return "late night"
    elif hour < 12:
        return "morning"
    elif hour < 17:
        return "afternoon"
    elif hour < 21:
        return "evening"
    else:
        return "night"


# =====================================================
# TEXT-TO-SPEECH
# =====================================================

def generate_tts_audio(script, persona_key, output_path, custom_voice_id=None):
    """
    Convert DJ script to spoken audio.

    Priority order:
    1. Custom cloned voice (creator's own voice via ElevenLabs)
    2. OpenAI TTS (preset persona voice)
    3. ElevenLabs preset voice
    4. pyttsx3 offline fallback

    Returns path to the generated audio file.
    """
    persona = DJ_PERSONAS.get(persona_key, DJ_PERSONAS["auto_dj"])

    # Priority 1: Custom cloned voice (creator's own voice)
    elevenlabs_key = os.environ.get("ELEVENLABS_API_KEY")
    if custom_voice_id and elevenlabs_key:
        try:
            result = _tts_elevenlabs(script, custom_voice_id, output_path, elevenlabs_key)
            if result:
                print(f"🎤 Using creator's cloned voice: {custom_voice_id}")
                return result
        except Exception as e:
            print(f"⚠️ Custom voice TTS failed, falling back: {e}")

    # Priority 2: OpenAI TTS (preset persona voice)
    openai_key = os.environ.get("OPENAI_API_KEY")
    if openai_key:
        try:
            result = _tts_openai(script, persona["voice"], output_path, openai_key)
            if result:
                return result
        except Exception as e:
            print(f"⚠️ OpenAI TTS failed: {e}")

    # Priority 3: ElevenLabs preset voice
    voice_id = persona.get("elevenlabs_voice")
    if elevenlabs_key and voice_id:
        try:
            result = _tts_elevenlabs(script, voice_id, output_path, elevenlabs_key)
            if result:
                return result
        except Exception as e:
            print(f"⚠️ ElevenLabs TTS failed: {e}")

    # Priority 4: Offline fallback (pyttsx3)
    try:
        result = _tts_offline(script, output_path)
        if result:
            return result
    except Exception as e:
        print(f"⚠️ Offline TTS failed: {e}")

    return None


def _tts_openai(script, voice, output_path, api_key):
    """Generate speech using OpenAI TTS API. ~$0.015 per 1K chars."""
    response = requests.post(
        "https://api.openai.com/v1/audio/speech",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json={
            "model": "tts-1",
            "voice": voice,       # alloy, echo, fable, onyx, nova, shimmer
            "input": script,
            "response_format": "mp3",
            "speed": 1.05,        # Slightly faster for radio energy
        },
        timeout=30,
    )
    response.raise_for_status()

    with open(output_path, "wb") as f:
        f.write(response.content)

    print(f"🗣️ OpenAI TTS generated: {output_path} ({len(script)} chars)")
    return output_path


def _tts_elevenlabs(script, voice_id, output_path, api_key):
    """Generate speech using ElevenLabs API. Higher quality, custom voices."""
    response = requests.post(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
        headers={
            "xi-api-key": api_key,
            "Content-Type": "application/json",
        },
        json={
            "text": script,
            "model_id": "eleven_monolingual_v1",
            "voice_settings": {
                "stability": 0.6,
                "similarity_boost": 0.75,
            },
        },
        timeout=30,
    )
    response.raise_for_status()

    with open(output_path, "wb") as f:
        f.write(response.content)

    print(f"🗣️ ElevenLabs TTS generated: {output_path}")
    return output_path


def _tts_offline(script, output_path):
    """Offline TTS fallback using pyttsx3 (no API key needed)."""
    try:
        import pyttsx3
        engine = pyttsx3.init()
        engine.setProperty("rate", 160)
        engine.save_to_file(script, output_path)
        engine.runAndWait()
        print(f"🗣️ Offline TTS generated: {output_path}")
        return output_path
    except ImportError:
        print("⚠️ pyttsx3 not installed. No TTS available.")
        return None


# =====================================================
# AUDIO STITCHING (FFmpeg)
# =====================================================

def stitch_talk_and_song(talk_break_path, song_path, output_path, crossfade_seconds=3):
    """
    Combine talk break audio + song with a crossfade.

    Uses FFmpeg acrossfade filter:
    [talk break] --crossfade--> [song]

    Returns path to the combined output file.
    """
    try:
        cmd = [
            "ffmpeg", "-y",
            "-i", talk_break_path,
            "-i", song_path,
            "-filter_complex",
            f"[0][1]acrossfade=d={crossfade_seconds}:c1=tri:c2=tri",
            "-c:a", "libmp3lame",
            "-b:a", "192k",
            output_path,
        ]

        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)

        if result.returncode != 0:
            print(f"⚠️ FFmpeg crossfade failed: {result.stderr}")
            # Fallback: simple concatenation without crossfade
            return _concat_simple(talk_break_path, song_path, output_path)

        print(f"🎵 Stitched: talk break + song → {output_path}")
        return output_path

    except Exception as e:
        print(f"❌ Stitch error: {e}")
        return _concat_simple(talk_break_path, song_path, output_path)


def _concat_simple(audio_a, audio_b, output_path):
    """Simple concatenation fallback (no crossfade)."""
    try:
        temp_dir = os.path.dirname(output_path)
        list_file = os.path.join(temp_dir, "concat_list.txt")

        with open(list_file, "w") as f:
            f.write(f"file '{audio_a}'\n")
            f.write(f"file '{audio_b}'\n")

        cmd = [
            "ffmpeg", "-y",
            "-f", "concat",
            "-safe", "0",
            "-i", list_file,
            "-c:a", "libmp3lame",
            "-b:a", "192k",
            output_path,
        ]

        subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        os.remove(list_file)
        return output_path

    except Exception as e:
        print(f"❌ Concat fallback failed: {e}")
        return None


def insert_station_id(song_path, station_id_path, output_path, position="start"):
    """
    Insert a station ID clip at the start or end of a song.

    position: "start" or "end"
    """
    try:
        if position == "start":
            first, second = station_id_path, song_path
        else:
            first, second = song_path, station_id_path

        return stitch_talk_and_song(first, second, output_path, crossfade_seconds=2)

    except Exception as e:
        print(f"❌ Station ID insert error: {e}")
        return None


def download_audio_file(url, output_path):
    """Download audio from Cloudinary URL to local temp file."""
    response = requests.get(url, stream=True, timeout=120)
    response.raise_for_status()
    with open(output_path, "wb") as f:
        for chunk in response.iter_content(chunk_size=8192):
            f.write(chunk)
    return output_path


# =====================================================
# AUTOMATION ENGINE
# =====================================================

def get_next_break_type(station_state):
    """
    Decide what kind of talk break to play next based on schedule rules.

    station_state tracks:
    - songs_since_last_break
    - last_station_id_at
    - last_time_check_at
    - last_shoutout_at
    """
    rules = station_state.get("rules", DEFAULT_SCHEDULE_RULES)
    now = datetime.utcnow()

    # Station ID check (highest priority)
    last_station_id = station_state.get("last_station_id_at")
    if last_station_id and rules["enable_station_ids"]:
        if isinstance(last_station_id, str):
            last_station_id = datetime.fromisoformat(last_station_id)
        minutes_since = (now - last_station_id).total_seconds() / 60
        if minutes_since >= rules["station_id_interval_minutes"]:
            return "station_id"

    # Time check
    last_time_check = station_state.get("last_time_check_at")
    if last_time_check and rules["enable_time_checks"]:
        if isinstance(last_time_check, str):
            last_time_check = datetime.fromisoformat(last_time_check)
        minutes_since = (now - last_time_check).total_seconds() / 60
        if minutes_since >= rules["time_check_interval_minutes"]:
            return "time_check"

    # Shoutout
    last_shoutout = station_state.get("last_shoutout_at")
    if last_shoutout and rules["enable_shoutouts"]:
        if isinstance(last_shoutout, str):
            last_shoutout = datetime.fromisoformat(last_shoutout)
        minutes_since = (now - last_shoutout).total_seconds() / 60
        if minutes_since >= rules["shoutout_interval_minutes"]:
            return "shoutout"

    # Song intro (default — every N songs)
    songs_since = station_state.get("songs_since_last_break", 0)
    if songs_since >= rules["songs_between_breaks"] and rules["enable_song_intros"]:
        return "song_intro"

    return None  # No break needed


def generate_break_segment(
    station_id,
    persona_key,
    break_type,
    last_track_info,
    next_track_info,
    listener_count=0,
):
    """
    Full pipeline: generate script → TTS → return audio path.

    This is the main function called by the automation loop.
    Returns path to the talk break audio file, or None.
    """
    station = RadioStation.query.get(station_id)
    if not station:
        return None

    temp_dir = tempfile.mkdtemp()

    try:
        # Step 1: Generate script
        script = generate_dj_script(
            persona_key=persona_key,
            break_type=break_type,
            station_name=station.name,
            genre=station.genres[0] if station.genres else "",
            last_song=last_track_info.get("title", ""),
            last_artist=last_track_info.get("artist", ""),
            next_song=next_track_info.get("title", ""),
            next_artist=next_track_info.get("artist", ""),
            listener_count=listener_count,
        )

        print(f"📝 DJ Script ({break_type}): {script}")

        # Step 2: Generate TTS audio (check for custom cloned voice)
        custom_voice_id = None
        if station.playlist_schedule:
            dj_config = station.playlist_schedule.get("dj_config", {})
            custom_voice_id = dj_config.get("custom_voice_id")

        tts_path = os.path.join(temp_dir, "talk_break.mp3")
        tts_result = generate_tts_audio(script, persona_key, tts_path, custom_voice_id=custom_voice_id)

        if not tts_result:
            print("⚠️ TTS failed — skipping talk break")
            return None

        # Step 3: Upload talk break to Cloudinary for streaming
        break_filename = f"dj_break_{station_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.mp3"
        with open(tts_path, "rb") as f:
            break_url = uploadFile(f, break_filename)

        print(f"☁️ Talk break uploaded: {break_url}")

        return {
            "audio_url": break_url,
            "script": script,
            "break_type": break_type,
            "persona": persona_key,
            "generated_at": datetime.utcnow().isoformat(),
        }

    except Exception as e:
        print(f"❌ Break segment generation failed: {e}")
        traceback.print_exc()
        return None

    finally:
        # Cleanup temp files
        try:
            import shutil
            shutil.rmtree(temp_dir, ignore_errors=True)
        except Exception:
            pass


def generate_stitched_segment(
    station_id,
    persona_key,
    break_type,
    last_track_info,
    next_track_info,
    crossfade_seconds=3,
    listener_count=0,
):
    """
    Full pipeline: script → TTS → stitch with next song → upload.

    Returns a complete audio segment: [talk break + crossfade + next song]
    ready to be inserted into the radio stream.
    """
    station = RadioStation.query.get(station_id)
    if not station:
        return None

    temp_dir = tempfile.mkdtemp()

    try:
        # Step 1: Generate the talk break audio
        script = generate_dj_script(
            persona_key=persona_key,
            break_type=break_type,
            station_name=station.name,
            genre=station.genres[0] if station.genres else "",
            last_song=last_track_info.get("title", ""),
            last_artist=last_track_info.get("artist", ""),
            next_song=next_track_info.get("title", ""),
            next_artist=next_track_info.get("artist", ""),
            listener_count=listener_count,
        )

        print(f"📝 DJ Script: {script}")

        # Check for custom cloned voice
        custom_voice_id = None
        if station.playlist_schedule:
            dj_config = station.playlist_schedule.get("dj_config", {})
            custom_voice_id = dj_config.get("custom_voice_id")

        tts_path = os.path.join(temp_dir, "talk_break.mp3")
        tts_result = generate_tts_audio(script, persona_key, tts_path, custom_voice_id=custom_voice_id)

        if not tts_result:
            return None

        # Step 2: Download next song from Cloudinary
        next_song_url = next_track_info.get("file_url")
        if not next_song_url:
            # Try to get from Audio model
            audio = Audio.query.get(next_track_info.get("id"))
            if audio:
                next_song_url = audio.file_url

        if not next_song_url:
            print("⚠️ No song URL — returning talk break only")
            break_filename = f"dj_break_{station_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.mp3"
            with open(tts_path, "rb") as f:
                break_url = uploadFile(f, break_filename)
            return {"audio_url": break_url, "script": script, "type": "break_only"}

        song_path = os.path.join(temp_dir, "next_song.mp3")
        download_audio_file(next_song_url, song_path)

        # Step 3: Stitch together
        output_path = os.path.join(temp_dir, "stitched_segment.mp3")
        stitch_result = stitch_talk_and_song(tts_path, song_path, output_path, crossfade_seconds)

        if not stitch_result:
            return None

        # Step 4: Upload stitched segment
        segment_filename = f"dj_segment_{station_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.mp3"
        with open(output_path, "rb") as f:
            segment_url = uploadFile(f, segment_filename)

        print(f"🎵 Stitched segment uploaded: {segment_url}")

        return {
            "audio_url": segment_url,
            "script": script,
            "break_type": break_type,
            "next_track": next_track_info,
            "persona": persona_key,
            "generated_at": datetime.utcnow().isoformat(),
        }

    except Exception as e:
        print(f"❌ Stitched segment failed: {e}")
        traceback.print_exc()
        return None

    finally:
        try:
            import shutil
            shutil.rmtree(temp_dir, ignore_errors=True)
        except Exception:
            pass


# =====================================================
# API ROUTES
# =====================================================

@ai_radio_dj_bp.route('/api/ai/radio/personas', methods=['GET'])
def get_dj_personas():
    """Get all available DJ personas."""
    personas = []
    for key, persona in DJ_PERSONAS.items():
        personas.append({
            "id": key,
            "name": persona["name"],
            "personality": persona["personality"],
            "genres": persona["genres"],
            "icon": persona["icon"],
            "voice": persona["voice"],
        })
    return jsonify({"personas": personas}), 200


@ai_radio_dj_bp.route('/api/ai/radio/break-types', methods=['GET'])
def get_break_types():
    """Get all available talk break types."""
    types = []
    for key, bt in BREAK_TYPES.items():
        types.append({
            "id": key,
            "description": bt["description"],
            "max_words": bt["max_words"],
        })
    return jsonify({"break_types": types}), 200


@ai_radio_dj_bp.route('/api/ai/radio/generate-script', methods=['POST'])
@jwt_required()
def api_generate_script():
    """
    Generate a DJ talk break script (text only, no audio).

    JSON body:
    {
        "station_id": 1,
        "persona": "dj_blaze",
        "break_type": "song_intro",
        "last_song": "Title",
        "last_artist": "Artist",
        "next_song": "Title",
        "next_artist": "Artist"
    }
    """
    user_id = get_jwt_identity()
    data = request.get_json()

    station_id = data.get("station_id")
    station = RadioStation.query.get(station_id)

    if not station:
        return jsonify({"error": "Station not found"}), 404
    if str(station.user_id) != str(user_id):
        return jsonify({"error": "Unauthorized"}), 403

    persona_key = data.get("persona", "auto_dj")
    break_type = data.get("break_type", "song_intro")

    script = generate_dj_script(
        persona_key=persona_key,
        break_type=break_type,
        station_name=station.name,
        genre=station.genres[0] if station.genres else "",
        last_song=data.get("last_song", ""),
        last_artist=data.get("last_artist", ""),
        next_song=data.get("next_song", ""),
        next_artist=data.get("next_artist", ""),
        listener_count=data.get("listener_count", 0),
        request_info=data.get("request_info", ""),
    )

    return jsonify({
        "script": script,
        "persona": persona_key,
        "break_type": break_type,
        "station": station.name,
    }), 200


@ai_radio_dj_bp.route('/api/ai/radio/generate-break', methods=['POST'])
@jwt_required()
def api_generate_break():
    """
    Generate a complete talk break: script + TTS audio.

    JSON body:
    {
        "station_id": 1,
        "persona": "smooth_mike",
        "break_type": "song_intro",
        "last_song": "Title",
        "last_artist": "Artist",
        "next_song": "Title",
        "next_artist": "Artist"
    }

    Returns: { "audio_url": "...", "script": "..." }
    """
    user_id = get_jwt_identity()
    data = request.get_json()

    station_id = data.get("station_id")
    station = RadioStation.query.get(station_id)

    if not station:
        return jsonify({"error": "Station not found"}), 404
    if str(station.user_id) != str(user_id):
        return jsonify({"error": "Unauthorized"}), 403

    persona_key = data.get("persona", "auto_dj")
    break_type = data.get("break_type", "song_intro")

    last_track = {
        "title": data.get("last_song", ""),
        "artist": data.get("last_artist", ""),
    }
    next_track = {
        "title": data.get("next_song", ""),
        "artist": data.get("next_artist", ""),
    }

    result = generate_break_segment(
        station_id=station_id,
        persona_key=persona_key,
        break_type=break_type,
        last_track_info=last_track,
        next_track_info=next_track,
        listener_count=data.get("listener_count", 0),
    )

    if not result:
        return jsonify({"error": "Failed to generate talk break"}), 500

    return jsonify(result), 200


@ai_radio_dj_bp.route('/api/ai/radio/generate-segment', methods=['POST'])
@jwt_required()
def api_generate_stitched_segment():
    """
    Generate a full stitched segment: talk break + crossfade + next song.

    JSON body:
    {
        "station_id": 1,
        "persona": "dj_blaze",
        "break_type": "song_intro",
        "next_track_id": 42,
        "last_song": "Previous Song",
        "last_artist": "Previous Artist",
        "crossfade_seconds": 3
    }

    Returns: { "audio_url": "...", "script": "...", "next_track": {...} }
    """
    user_id = get_jwt_identity()
    data = request.get_json()

    station_id = data.get("station_id")
    station = RadioStation.query.get(station_id)

    if not station:
        return jsonify({"error": "Station not found"}), 404
    if str(station.user_id) != str(user_id):
        return jsonify({"error": "Unauthorized"}), 403

    # Get next track info
    next_track_id = data.get("next_track_id")
    if next_track_id:
        audio = Audio.query.get(next_track_id)
        if not audio:
            return jsonify({"error": "Track not found"}), 404
        next_track = {
            "id": audio.id,
            "title": audio.title,
            "artist": getattr(audio, "artist_name", "Unknown Artist"),
            "file_url": audio.file_url,
        }
    else:
        return jsonify({"error": "next_track_id is required"}), 400

    last_track = {
        "title": data.get("last_song", ""),
        "artist": data.get("last_artist", ""),
    }

    persona_key = data.get("persona", "auto_dj")
    break_type = data.get("break_type", "song_intro")
    crossfade = data.get("crossfade_seconds", 3)

    result = generate_stitched_segment(
        station_id=station_id,
        persona_key=persona_key,
        break_type=break_type,
        last_track_info=last_track,
        next_track_info=next_track,
        crossfade_seconds=crossfade,
        listener_count=data.get("listener_count", 0),
    )

    if not result:
        return jsonify({"error": "Failed to generate segment"}), 500

    return jsonify(result), 200


@ai_radio_dj_bp.route('/api/ai/radio/station/<int:station_id>/config', methods=['GET'])
@jwt_required()
def get_station_dj_config(station_id):
    """Get AI DJ configuration for a station."""
    user_id = get_jwt_identity()
    station = RadioStation.query.get(station_id)

    if not station:
        return jsonify({"error": "Station not found"}), 404
    if str(station.user_id) != str(user_id):
        return jsonify({"error": "Unauthorized"}), 403

    # DJ config is stored in station's JSON fields
    dj_config = {}
    if hasattr(station, 'playlist_schedule') and station.playlist_schedule:
        dj_config = station.playlist_schedule.get("dj_config", {})

    return jsonify({
        "station_id": station_id,
        "station_name": station.name,
        "dj_enabled": dj_config.get("enabled", False),
        "persona": dj_config.get("persona", "auto_dj"),
        "schedule_rules": dj_config.get("rules", DEFAULT_SCHEDULE_RULES),
        "available_personas": list(DJ_PERSONAS.keys()),
    }), 200


@ai_radio_dj_bp.route('/api/ai/radio/station/<int:station_id>/config', methods=['PUT'])
@jwt_required()
def update_station_dj_config(station_id):
    """
    Enable/configure AI DJ for a station.

    JSON body:
    {
        "enabled": true,
        "persona": "dj_blaze",
        "rules": {
            "songs_between_breaks": 3,
            "station_id_interval_minutes": 30,
            ...
        }
    }
    """
    user_id = get_jwt_identity()
    station = RadioStation.query.get(station_id)

    if not station:
        return jsonify({"error": "Station not found"}), 404
    if str(station.user_id) != str(user_id):
        return jsonify({"error": "Unauthorized"}), 403

    data = request.get_json()

    # Update DJ config in playlist_schedule JSON
    current_schedule = station.playlist_schedule or {}
    current_schedule["dj_config"] = {
        "enabled": data.get("enabled", False),
        "persona": data.get("persona", "auto_dj"),
        "rules": data.get("rules", DEFAULT_SCHEDULE_RULES),
        "updated_at": datetime.utcnow().isoformat(),
    }

    station.playlist_schedule = current_schedule
    # Force SQLAlchemy to detect the change on JSON column
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(station, "playlist_schedule")
    db.session.commit()

    return jsonify({
        "message": f"🤖 AI DJ {'enabled' if data.get('enabled') else 'disabled'} for {station.name}",
        "config": current_schedule["dj_config"],
    }), 200


@ai_radio_dj_bp.route('/api/ai/radio/station/<int:station_id>/next-break', methods=['POST'])
@jwt_required()
def trigger_next_break(station_id):
    """
    Manually trigger the next DJ break for a station.
    Useful for testing or one-off breaks.

    The automation system calls this internally on a schedule,
    but creators can also trigger it from the dashboard.
    """
    user_id = get_jwt_identity()
    station = RadioStation.query.get(station_id)

    if not station:
        return jsonify({"error": "Station not found"}), 404
    if str(station.user_id) != str(user_id):
        return jsonify({"error": "Unauthorized"}), 403

    # Get DJ config
    dj_config = {}
    if station.playlist_schedule:
        dj_config = station.playlist_schedule.get("dj_config", {})

    persona_key = dj_config.get("persona", "auto_dj")

    # Get current and next track from playlist
    current_track = station.get_current_track() or {"title": "Unknown", "artist": "Unknown"}
    next_track_info = _get_next_track(station)

    if not next_track_info:
        return jsonify({"error": "No next track available"}), 400

    # Determine break type
    break_type = request.get_json().get("break_type", "song_intro") if request.get_json() else "song_intro"

    # Generate the break
    result = generate_break_segment(
        station_id=station_id,
        persona_key=persona_key,
        break_type=break_type,
        last_track_info=current_track,
        next_track_info=next_track_info,
        listener_count=station.followers_count or 0,
    )

    if not result:
        return jsonify({"error": "Failed to generate break"}), 500

    return jsonify({
        "message": f"🎙️ {DJ_PERSONAS.get(persona_key, {}).get('name', 'DJ')} break generated!",
        **result,
    }), 200


@ai_radio_dj_bp.route('/api/ai/radio/station/<int:station_id>/request', methods=['POST'])
@jwt_required()
def listener_request(station_id):
    """
    Submit a listener song request.

    JSON body:
    {
        "song_title": "Song Name",
        "artist": "Artist Name",
        "message": "Play this for my birthday!"
    }
    """
    user_id = get_jwt_identity()
    data = request.get_json()

    station = RadioStation.query.get(station_id)
    if not station:
        return jsonify({"error": "Station not found"}), 404

    # Store request in playlist_schedule metadata
    current_schedule = station.playlist_schedule or {}
    requests_list = current_schedule.get("listener_requests", [])
    requests_list.append({
        "user_id": user_id,
        "song_title": data.get("song_title", ""),
        "artist": data.get("artist", ""),
        "message": data.get("message", ""),
        "requested_at": datetime.utcnow().isoformat(),
        "fulfilled": False,
    })

    # Keep last 50 requests
    current_schedule["listener_requests"] = requests_list[-50:]
    station.playlist_schedule = current_schedule

    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(station, "playlist_schedule")
    db.session.commit()

    return jsonify({
        "message": "🎵 Request submitted! The DJ will get to it.",
        "request": requests_list[-1],
    }), 200


@ai_radio_dj_bp.route('/api/ai/radio/capabilities', methods=['GET'])
def get_ai_radio_capabilities():
    """Check what AI radio features are available based on API keys."""
    has_openai = bool(os.environ.get("OPENAI_API_KEY"))
    has_anthropic = bool(os.environ.get("ANTHROPIC_API_KEY"))
    has_elevenlabs = bool(os.environ.get("ELEVENLABS_API_KEY"))

    # Check FFmpeg
    has_ffmpeg = False
    try:
        result = subprocess.run(["ffmpeg", "-version"], capture_output=True, timeout=5)
        has_ffmpeg = result.returncode == 0
    except Exception:
        pass

    return jsonify({
        "ai_script_generation": has_openai or has_anthropic,
        "tts_openai": has_openai,
        "tts_elevenlabs": has_elevenlabs,
        "voice_cloning": has_elevenlabs,
        "audio_stitching": has_ffmpeg,
        "offline_tts": True,  # pyttsx3 fallback always possible
        "total_personas": len(DJ_PERSONAS),
        "total_break_types": len(BREAK_TYPES),
        "status": "ready" if (has_openai or has_anthropic) and has_ffmpeg else "limited",
    }), 200


# =====================================================
# VOICE CLONING — "Use My Voice" Feature
# =====================================================
# Creators upload a 1-3 minute voice sample.
# ElevenLabs clones their voice.
# All DJ breaks on their station use their real voice.
#
# Flow:
#   1. Creator records/uploads voice sample
#   2. POST /api/ai/radio/voice/clone → sends to ElevenLabs
#   3. Returns voice_id → saved to station dj_config
#   4. generate_tts_audio() checks for custom_voice_id first
#   5. Every break from now on sounds like the creator
# =====================================================


@ai_radio_dj_bp.route('/api/ai/radio/voice/clone', methods=['POST'])
@jwt_required()
def clone_voice():
    """
    Clone a creator's voice using ElevenLabs.

    Requires: multipart form with 'voice_sample' audio file.
    Optional: 'voice_name' (defaults to station name + "DJ")
              'station_id' (auto-saves to station config)

    The creator uploads 1-3 minutes of clear speech.
    ElevenLabs creates a voice clone in ~30 seconds.
    """
    user_id = get_jwt_identity()

    # Check ElevenLabs key
    elevenlabs_key = os.environ.get("ELEVENLABS_API_KEY")
    if not elevenlabs_key:
        return jsonify({
            "error": "Voice cloning not available yet",
            "message": "This feature will be enabled soon. Using preset DJ voices for now."
        }), 503

    # Get voice sample file
    if 'voice_sample' not in request.files:
        return jsonify({"error": "Please upload a voice sample (MP3, WAV, or M4A)"}), 400

    voice_file = request.files['voice_sample']
    if not voice_file.filename:
        return jsonify({"error": "No file selected"}), 400

    # Validate file type
    allowed_ext = {'.mp3', '.wav', '.m4a', '.flac', '.ogg', '.webm'}
    ext = os.path.splitext(voice_file.filename)[1].lower()
    if ext not in allowed_ext:
        return jsonify({"error": f"Unsupported format. Use: {', '.join(allowed_ext)}"}), 400

    # Get optional params
    station_id = request.form.get("station_id")
    voice_name = request.form.get("voice_name", "")

    # If station provided, verify ownership
    station = None
    if station_id:
        station = RadioStation.query.get(station_id)
        if not station:
            return jsonify({"error": "Station not found"}), 404
        if str(station.user_id) != str(user_id):
            return jsonify({"error": "Unauthorized"}), 403
        if not voice_name:
            voice_name = f"{station.name} DJ"

    if not voice_name:
        user = User.query.get(user_id)
        voice_name = f"{user.username}'s Voice" if user else "Custom DJ Voice"

    try:
        # Send to ElevenLabs for cloning
        response = requests.post(
            "https://api.elevenlabs.io/v1/voices/add",
            headers={"xi-api-key": elevenlabs_key},
            data={
                "name": voice_name,
                "description": f"Custom DJ voice for StreamPireX - {voice_name}",
            },
            files={
                "files": (voice_file.filename, voice_file.read(), voice_file.content_type or "audio/mpeg"),
            },
            timeout=60,
        )

        if response.status_code != 200:
            error_detail = response.json() if response.headers.get("content-type", "").startswith("application/json") else response.text
            print(f"❌ ElevenLabs clone failed: {error_detail}")
            return jsonify({
                "error": "Voice cloning failed",
                "detail": str(error_detail),
            }), 500

        clone_data = response.json()
        voice_id = clone_data.get("voice_id")

        if not voice_id:
            return jsonify({"error": "No voice ID returned from ElevenLabs"}), 500

        print(f"🎤 Voice cloned! ID: {voice_id}, Name: {voice_name}")

        # Auto-save to station config if station provided
        if station:
            current_schedule = station.playlist_schedule or {}
            dj_config = current_schedule.get("dj_config", {})
            dj_config["custom_voice_id"] = voice_id
            dj_config["custom_voice_name"] = voice_name
            dj_config["voice_cloned_at"] = datetime.utcnow().isoformat()
            dj_config["use_custom_voice"] = True
            current_schedule["dj_config"] = dj_config
            station.playlist_schedule = current_schedule

            from sqlalchemy.orm.attributes import flag_modified
            flag_modified(station, "playlist_schedule")
            db.session.commit()

        return jsonify({
            "message": f"🎤 Voice cloned successfully! '{voice_name}' is ready.",
            "voice_id": voice_id,
            "voice_name": voice_name,
            "station_id": station_id,
            "tip": "Your AI DJ will now use your voice for all talk breaks on this station.",
        }), 200

    except requests.Timeout:
        return jsonify({"error": "Voice cloning timed out. Try a shorter sample."}), 504
    except Exception as e:
        print(f"❌ Voice clone error: {e}")
        traceback.print_exc()
        return jsonify({"error": f"Voice cloning failed: {str(e)}"}), 500


@ai_radio_dj_bp.route('/api/ai/radio/voice/preview', methods=['POST'])
@jwt_required()
def preview_cloned_voice():
    """
    Preview a cloned voice by generating a short test phrase.

    JSON body:
    {
        "station_id": 1,
        "text": "What's up everybody, you're listening to my station!"
    }

    Uses the station's saved custom_voice_id to generate audio.
    """
    user_id = get_jwt_identity()
    data = request.get_json()

    station_id = data.get("station_id")
    station = RadioStation.query.get(station_id)

    if not station:
        return jsonify({"error": "Station not found"}), 404
    if str(station.user_id) != str(user_id):
        return jsonify({"error": "Unauthorized"}), 403

    # Get custom voice ID
    dj_config = {}
    if station.playlist_schedule:
        dj_config = station.playlist_schedule.get("dj_config", {})

    custom_voice_id = dj_config.get("custom_voice_id")
    if not custom_voice_id:
        return jsonify({"error": "No custom voice found. Clone your voice first."}), 400

    elevenlabs_key = os.environ.get("ELEVENLABS_API_KEY")
    if not elevenlabs_key:
        return jsonify({"error": "Voice preview not available"}), 503

    test_text = data.get("text", f"What's good everybody, you're listening to {station.name}. Stay tuned!")

    temp_dir = tempfile.mkdtemp()
    try:
        preview_path = os.path.join(temp_dir, "voice_preview.mp3")
        result = _tts_elevenlabs(test_text, custom_voice_id, preview_path, elevenlabs_key)

        if not result:
            return jsonify({"error": "Preview generation failed"}), 500

        # Upload preview to Cloudinary
        preview_filename = f"voice_preview_{station_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.mp3"
        with open(preview_path, "rb") as f:
            preview_url = uploadFile(f, preview_filename)

        return jsonify({
            "message": "🔊 Voice preview generated!",
            "audio_url": preview_url,
            "text": test_text,
            "voice_name": dj_config.get("custom_voice_name", "Custom Voice"),
        }), 200

    except Exception as e:
        print(f"❌ Voice preview error: {e}")
        return jsonify({"error": f"Preview failed: {str(e)}"}), 500
    finally:
        try:
            import shutil
            shutil.rmtree(temp_dir, ignore_errors=True)
        except Exception:
            pass


@ai_radio_dj_bp.route('/api/ai/radio/voice/remove', methods=['POST'])
@jwt_required()
def remove_cloned_voice():
    """
    Remove a cloned voice from a station and optionally delete from ElevenLabs.

    JSON body: { "station_id": 1, "delete_from_elevenlabs": true }
    """
    user_id = get_jwt_identity()
    data = request.get_json()

    station_id = data.get("station_id")
    station = RadioStation.query.get(station_id)

    if not station:
        return jsonify({"error": "Station not found"}), 404
    if str(station.user_id) != str(user_id):
        return jsonify({"error": "Unauthorized"}), 403

    # Get current voice ID before removing
    dj_config = {}
    if station.playlist_schedule:
        dj_config = station.playlist_schedule.get("dj_config", {})

    voice_id = dj_config.get("custom_voice_id")
    voice_name = dj_config.get("custom_voice_name", "Custom Voice")

    # Optionally delete from ElevenLabs
    if data.get("delete_from_elevenlabs") and voice_id:
        elevenlabs_key = os.environ.get("ELEVENLABS_API_KEY")
        if elevenlabs_key:
            try:
                requests.delete(
                    f"https://api.elevenlabs.io/v1/voices/{voice_id}",
                    headers={"xi-api-key": elevenlabs_key},
                    timeout=15,
                )
                print(f"🗑️ Voice deleted from ElevenLabs: {voice_id}")
            except Exception as e:
                print(f"⚠️ Failed to delete voice from ElevenLabs: {e}")

    # Remove from station config
    current_schedule = station.playlist_schedule or {}
    if "dj_config" in current_schedule:
        current_schedule["dj_config"].pop("custom_voice_id", None)
        current_schedule["dj_config"].pop("custom_voice_name", None)
        current_schedule["dj_config"].pop("voice_cloned_at", None)
        current_schedule["dj_config"]["use_custom_voice"] = False

    station.playlist_schedule = current_schedule
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(station, "playlist_schedule")
    db.session.commit()

    return jsonify({
        "message": f"🗑️ Custom voice '{voice_name}' removed. Station will use preset DJ voice.",
        "station_id": station_id,
    }), 200


# =====================================================
# HELPER FUNCTIONS
# =====================================================

def _get_next_track(station):
    """Get the next track in the station's playlist."""
    if not station.playlist_schedule:
        return None

    tracks = station.playlist_schedule.get("tracks", [])
    if not tracks:
        return None

    current = station.get_current_track()
    if not current:
        return tracks[0] if tracks else None

    # Find current track index and return next
    current_id = current.get("id")
    for i, track in enumerate(tracks):
        if track.get("id") == current_id:
            next_index = (i + 1) % len(tracks)
            return tracks[next_index]

    return tracks[0]