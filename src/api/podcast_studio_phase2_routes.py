# =============================================================================
# PHASE 2 BACKEND: Magic Clips, Async Recording, Studio Branding, Video
# =============================================================================
# Location: src/api/podcast_studio_phase2_routes.py
# Register: app.register_blueprint(podcast_phase2_bp)
# =============================================================================

import os
import json
import uuid
import tempfile
import subprocess
import requests
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

podcast_phase2_bp = Blueprint('podcast_phase2', __name__)

ANTHROPIC_API_KEY = os.environ.get('ANTHROPIC_API_KEY', '')
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', '')


# =============================================================================
# 1. MAGIC CLIPS — AI-Powered Highlight Detection
# =============================================================================

@podcast_phase2_bp.route('/api/podcast-studio/magic-clips', methods=['POST'])
@jwt_required()
def generate_magic_clips():
    """
    Analyze podcast episode for most engaging moments.
    Uses LLM transcript analysis + audio energy scoring.
    """
    user_id = get_jwt_identity()
    data = request.get_json()
    audio_url = data.get('audio_url')
    transcript = data.get('transcript', '')
    max_clips = data.get('max_clips', 5)
    target_duration = data.get('target_duration', 60)
    episode_id = data.get('episode_id')

    if not transcript and episode_id:
        from src.api.models import PodcastEpisode
        episode = PodcastEpisode.query.filter_by(id=episode_id, user_id=user_id).first()
        if episode and episode.transcript:
            transcript = episode.transcript

    if not transcript:
        return jsonify({"error": "Transcript required. Transcribe first."}), 400

    try:
        clips = _find_clips_with_llm(transcript, max_clips, target_duration)
        clips.sort(key=lambda c: c.get('engagement_score', 0), reverse=True)

        return jsonify({
            "clips": clips[:max_clips],
            "total_found": len(clips),
            "episode_id": episode_id
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


def _find_clips_with_llm(transcript, max_clips, target_duration):
    """Use Claude to find engaging clip-worthy moments."""
    max_chars = 15000
    if len(transcript) > max_chars:
        half = max_chars // 2
        transcript = transcript[:half] + "\n[...]\n" + transcript[-half:]

    prompt = f"""Analyze this podcast transcript and find the {max_clips * 2} most engaging,
shareable, or viral-worthy moments. Each clip should be about {target_duration} seconds
(roughly {target_duration // 5} words).

TRANSCRIPT:
{transcript}

For each clip, return JSON array of objects with:
- "start_word_index": approximate word position where clip starts
- "end_word_index": approximate word position where clip ends
- "transcript_snippet": actual text of the clip (30-80 words)
- "engagement_score": 0.0 to 1.0
- "reason": one of "hook", "insight", "emotion", "humor", "controversial", "story", "quote"
- "has_hook": boolean
- "has_emotion": boolean
- "has_insight": boolean
- "title": catchy title (5-8 words)
- "hashtags": array of 3-5 hashtags

Return ONLY valid JSON array."""

    if ANTHROPIC_API_KEY:
        res = requests.post(
            'https://api.anthropic.com/v1/messages',
            headers={
                'x-api-key': ANTHROPIC_API_KEY,
                'Content-Type': 'application/json',
                'anthropic-version': '2023-06-01'
            },
            json={
                'model': 'claude-sonnet-4-5-20250929',
                'max_tokens': 3000,
                'messages': [{'role': 'user', 'content': prompt}]
            },
            timeout=60
        )
        res.raise_for_status()
        text = res.json()['content'][0]['text']
    elif OPENAI_API_KEY:
        res = requests.post(
            'https://api.openai.com/v1/chat/completions',
            headers={
                'Authorization': f'Bearer {OPENAI_API_KEY}',
                'Content-Type': 'application/json'
            },
            json={
                'model': 'gpt-4o',
                'messages': [{'role': 'user', 'content': prompt}],
                'max_tokens': 3000
            },
            timeout=60
        )
        res.raise_for_status()
        text = res.json()['choices'][0]['message']['content']
    else:
        return []

    text = text.strip().removeprefix('```json').removeprefix('```').removesuffix('```').strip()
    clips = json.loads(text)

    # Estimate timestamps from word positions (~2.5 words/sec for speech)
    wps = 2.5
    for i, clip in enumerate(clips):
        clip['id'] = f'clip_{i}'
        clip['start'] = clip.get('start_word_index', 0) / wps
        clip['end'] = clip.get('end_word_index', clip.get('start_word_index', 0) + 150) / wps
        clip['preview_text'] = clip.get('transcript_snippet', '')

    return clips


# =============================================================================
# 2. EXPORT CLIP — Generate video/audio clip with captions
# =============================================================================

@podcast_phase2_bp.route('/api/podcast-studio/export-clip', methods=['POST'])
@jwt_required()
def export_clip():
    """
    Export a clip segment with optional animated captions.
    For audio-only: generates a waveform/branded video with captions.
    For video: trims video and adds caption overlay.
    """
    user_id = get_jwt_identity()
    data = request.get_json()
    clip = data.get('clip', {})
    audio_url = data.get('audio_url')
    video_url = data.get('video_url')
    caption_style = data.get('caption_style', 'bold')
    aspect_ratio = data.get('aspect_ratio', '9:16')

    start = clip.get('start', 0)
    end = clip.get('end', 60)
    caption_text = clip.get('preview_text', '')

    # Aspect ratio dimensions
    dimensions = {
        '9:16': (1080, 1920),
        '1:1': (1080, 1080),
        '16:9': (1920, 1080)
    }
    width, height = dimensions.get(aspect_ratio, (1080, 1920))

    # Caption style configs
    caption_configs = {
        'bold': {
            'fontsize': 56, 'fontcolor': 'white',
            'borderw': 3, 'shadowcolor': 'black@0.8', 'shadowx': 2, 'shadowy': 2
        },
        'minimal': {
            'fontsize': 42, 'fontcolor': 'white@0.9',
            'borderw': 0, 'shadowcolor': 'black@0.4', 'shadowx': 1, 'shadowy': 1
        },
        'colorful': {
            'fontsize': 52, 'fontcolor': '#00ffc8',
            'borderw': 2, 'shadowcolor': 'black@0.7', 'shadowx': 2, 'shadowy': 2
        },
        'karaoke': {
            'fontsize': 58, 'fontcolor': 'yellow',
            'borderw': 3, 'shadowcolor': 'black@0.9', 'shadowx': 2, 'shadowy': 2
        }
    }
    cc = caption_configs.get(caption_style, caption_configs['bold'])

    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            output_path = os.path.join(tmpdir, 'clip.mp4')

            if video_url:
                # --- VIDEO CLIP: trim + caption overlay ---
                source_path = os.path.join(tmpdir, 'source_video.mp4')
                vid_response = requests.get(video_url, timeout=120)
                with open(source_path, 'wb') as f:
                    f.write(vid_response.content)

                # Escape caption text for ffmpeg drawtext
                safe_caption = caption_text.replace("'", "\\'").replace(":", "\\:")
                # Split into lines of ~30 chars for readability
                lines = []
                words = safe_caption.split()
                current_line = ""
                for w in words:
                    if len(current_line) + len(w) + 1 > 30:
                        lines.append(current_line.strip())
                        current_line = w
                    else:
                        current_line += " " + w
                if current_line.strip():
                    lines.append(current_line.strip())
                caption_display = "\\n".join(lines[:4])  # Max 4 lines

                # Build ffmpeg command
                filter_str = (
                    f"scale={width}:{height}:force_original_aspect_ratio=decrease,"
                    f"pad={width}:{height}:(ow-iw)/2:(oh-ih)/2:black,"
                    f"drawtext=text='{caption_display}'"
                    f":fontsize={cc['fontsize']}"
                    f":fontcolor={cc['fontcolor']}"
                    f":borderw={cc['borderw']}"
                    f":shadowcolor={cc['shadowcolor']}"
                    f":shadowx={cc['shadowx']}:shadowy={cc['shadowy']}"
                    f":x=(w-text_w)/2:y=h-th-120"
                    f":font=Arial"
                )

                cmd = [
                    'ffmpeg', '-y',
                    '-i', source_path,
                    '-ss', str(start), '-to', str(end),
                    '-vf', filter_str,
                    '-c:v', 'libx264', '-preset', 'fast',
                    '-c:a', 'aac', '-b:a', '192k',
                    output_path
                ]

            else:
                # --- AUDIO-ONLY: generate branded background video with captions ---
                source_path = os.path.join(tmpdir, 'source_audio.wav')
                aud_response = requests.get(audio_url, timeout=120)
                with open(source_path, 'wb') as f:
                    f.write(aud_response.content)

                safe_caption = caption_text.replace("'", "\\'").replace(":", "\\:")
                lines = []
                words_list = safe_caption.split()
                current_line = ""
                for w in words_list:
                    if len(current_line) + len(w) + 1 > 30:
                        lines.append(current_line.strip())
                        current_line = w
                    else:
                        current_line += " " + w
                if current_line.strip():
                    lines.append(current_line.strip())
                caption_display = "\\n".join(lines[:4])

                duration = end - start

                # Generate dark background with waveform visualization + captions
                filter_str = (
                    f"color=c=0x0d0d0d:s={width}x{height}:d={duration},"
                    f"drawtext=text='{caption_display}'"
                    f":fontsize={cc['fontsize']}"
                    f":fontcolor={cc['fontcolor']}"
                    f":borderw={cc['borderw']}"
                    f":shadowcolor={cc['shadowcolor']}"
                    f":shadowx={cc['shadowx']}:shadowy={cc['shadowy']}"
                    f":x=(w-text_w)/2:y=(h-th)/2"
                    f":font=Arial"
                )

                cmd = [
                    'ffmpeg', '-y',
                    '-i', source_path,
                    '-ss', str(start), '-to', str(end),
                    '-filter_complex',
                    f"{filter_str}[v];[0:a]atrim=start={start}:end={end},asetpts=PTS-STARTPTS[a]",
                    '-map', '[v]', '-map', '[a]',
                    '-c:v', 'libx264', '-preset', 'fast',
                    '-c:a', 'aac', '-b:a', '192k',
                    '-shortest',
                    output_path
                ]

            result = subprocess.run(cmd, capture_output=True, timeout=300)

            if result.returncode != 0:
                return jsonify({
                    "error": "Clip export failed",
                    "details": result.stderr.decode()[:500]
                }), 500

            # Upload to storage
            clip_url = _upload_to_storage(
                output_path,
                f'clip_{user_id}_{clip.get("id", "0")}_{int(datetime.utcnow().timestamp())}.mp4'
            )

            return jsonify({
                "clip_url": clip_url,
                "clip_id": clip.get('id'),
                "aspect_ratio": aspect_ratio,
                "caption_style": caption_style,
                "duration": end - start
            }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =============================================================================
# 3. ASYNC RECORDING
# =============================================================================

@podcast_phase2_bp.route('/api/podcast-studio/create-async-link', methods=['POST'])
@jwt_required()
def create_async_link():
    """Create a recording link that a guest can use on their own time."""
    user_id = get_jwt_identity()
    data = request.get_json()

    from src.api.models import db, User

    user = User.query.get(user_id)
    link_id = str(uuid.uuid4())[:12]

    # Store in database
    from src.api.models import AsyncRecordingLink
    link = AsyncRecordingLink(
        id=link_id,
        user_id=user_id,
        guest_name=data.get('guest_name', 'Guest'),
        prompt=data.get('prompt', ''),
        max_duration_seconds=data.get('max_duration_seconds', 300),
        deadline=datetime.fromisoformat(data['deadline']) if data.get('deadline') else None,
        status='pending',
        created_at=datetime.utcnow()
    )
    db.session.add(link)
    db.session.commit()

    base_url = os.environ.get('APP_URL', 'https://streampirex.com')

    return jsonify({
        "id": link_id,
        "url": f"{base_url}/podcast-async/{link_id}",
        "guest_name": link.guest_name,
        "prompt": link.prompt,
        "max_duration_seconds": link.max_duration_seconds,
        "deadline": link.deadline.isoformat() if link.deadline else None,
        "status": "pending",
        "host_name": user.username if user else "Host",
        "show_name": data.get('show_name', '')
    }), 201


@podcast_phase2_bp.route('/api/podcast-studio/async-link/<link_id>', methods=['GET'])
def get_async_link(link_id):
    """Get async recording link details (public — no auth needed for guest)."""
    from src.api.models import AsyncRecordingLink, User

    link = AsyncRecordingLink.query.get(link_id)
    if not link:
        return jsonify({"error": "Link not found"}), 404

    # Check if expired
    if link.deadline and datetime.utcnow() > link.deadline:
        return jsonify({"error": "This recording link has expired"}), 410

    host = User.query.get(link.user_id)

    return jsonify({
        "id": link.id,
        "guest_name": link.guest_name,
        "prompt": link.prompt,
        "max_duration_seconds": link.max_duration_seconds,
        "deadline": link.deadline.isoformat() if link.deadline else None,
        "status": link.status,
        "host_name": host.username if host else "Host",
        "show_name": link.show_name or ''
    }), 200


@podcast_phase2_bp.route('/api/podcast-studio/upload-async-recording', methods=['POST'])
def upload_async_recording():
    """Guest uploads their async recording (no auth — uses link_id)."""
    link_id = request.form.get('link_id')
    duration = request.form.get('duration', 0)

    if 'audio' not in request.files:
        return jsonify({"error": "No audio file"}), 400

    from src.api.models import db, AsyncRecordingLink

    link = AsyncRecordingLink.query.get(link_id)
    if not link:
        return jsonify({"error": "Invalid link"}), 404

    audio_file = request.files['audio']

    try:
        # Save temporarily then upload to storage
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
            audio_file.save(f.name)
            temp_path = f.name

        audio_url = _upload_to_storage(
            temp_path,
            f'async_{link_id}_{link.guest_name}_{int(datetime.utcnow().timestamp())}.wav'
        )
        os.unlink(temp_path)

        # Update link status
        link.status = 'completed'
        link.audio_url = audio_url
        link.duration = float(duration)
        link.completed_at = datetime.utcnow()
        db.session.commit()

        return jsonify({
            "status": "uploaded",
            "audio_url": audio_url,
            "duration": float(duration)
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =============================================================================
# 4. STUDIO BRANDING
# =============================================================================

@podcast_phase2_bp.route('/api/podcast-studio/save-branding', methods=['POST'])
@jwt_required()
def save_branding():
    """Save studio branding settings."""
    user_id = get_jwt_identity()
    data = request.get_json()

    from src.api.models import db, StudioBranding as StudioBrandingModel

    branding = StudioBrandingModel.query.filter_by(user_id=user_id).first()
    if not branding:
        branding = StudioBrandingModel(user_id=user_id)
        db.session.add(branding)

    branding.logo_url = data.get('logo_url')
    branding.primary_color = data.get('primary_color', '#00ffc8')
    branding.secondary_color = data.get('secondary_color', '#FF6600')
    branding.intro_audio_url = data.get('intro_audio_url')
    branding.outro_audio_url = data.get('outro_audio_url')
    branding.background_url = data.get('background_url')
    branding.show_name = data.get('show_name', '')
    branding.watermark_position = data.get('watermark_position', 'bottom-right')
    branding.updated_at = datetime.utcnow()

    db.session.commit()

    return jsonify({"status": "saved", "branding": branding.to_dict()}), 200


@podcast_phase2_bp.route('/api/podcast-studio/branding', methods=['GET'])
@jwt_required()
def get_branding():
    """Get studio branding settings."""
    user_id = get_jwt_identity()

    from src.api.models import StudioBranding as StudioBrandingModel
    branding = StudioBrandingModel.query.filter_by(user_id=user_id).first()

    if not branding:
        return jsonify({"branding": None}), 200

    return jsonify({"branding": branding.to_dict()}), 200


@podcast_phase2_bp.route('/api/podcast-studio/upload-brand-asset', methods=['POST'])
@jwt_required()
def upload_brand_asset():
    """Upload a branding asset (logo, intro, outro, background)."""
    user_id = get_jwt_identity()
    asset_type = request.form.get('type', 'logo')  # logo, intro, outro, background

    if 'file' not in request.files:
        return jsonify({"error": "No file"}), 400

    file = request.files['file']

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as f:
            file.save(f.name)
            temp_path = f.name

        url = _upload_to_storage(
            temp_path,
            f'branding/{user_id}/{asset_type}_{int(datetime.utcnow().timestamp())}{os.path.splitext(file.filename)[1]}'
        )
        os.unlink(temp_path)

        return jsonify({"url": url, "type": asset_type}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =============================================================================
# 5. VIDEO TRACK UPLOAD
# =============================================================================

@podcast_phase2_bp.route('/api/podcast-studio/upload-video-track', methods=['POST'])
@jwt_required()
def upload_video_track():
    """Upload a video recording track from a podcast session."""
    user_id = get_jwt_identity()
    session_id = request.form.get('session_id')
    track_id = request.form.get('track_id')
    participant_name = request.form.get('participant_name', 'Host')

    if 'video' not in request.files:
        return jsonify({"error": "No video file"}), 400

    video_file = request.files['video']

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix='.webm') as f:
            video_file.save(f.name)
            temp_path = f.name

        video_url = _upload_to_storage(
            temp_path,
            f'podcast_video/{session_id}/{track_id}_{participant_name}_{int(datetime.utcnow().timestamp())}.webm'
        )
        os.unlink(temp_path)

        # Store track reference in session
        from src.api.models import db, PodcastRecordingTrack
        track = PodcastRecordingTrack(
            session_record_id=session_id,
            track_id=track_id,
            track_type='video',
            guest_name=participant_name,
            audio_url=video_url,  # Reusing field — could rename to media_url
            uploaded_at=datetime.utcnow()
        )
        db.session.add(track)
        db.session.commit()

        return jsonify({
            "video_url": video_url,
            "track_id": track_id,
            "session_id": session_id
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =============================================================================
# STORAGE HELPER (same as Phase 1 — shared utility)
# =============================================================================

def _upload_to_storage(file_path, filename):
    """Upload to R2 (primary) or Cloudinary (fallback)."""
    try:
        import boto3
        r2_endpoint = os.environ.get('R2_ENDPOINT')
        r2_access_key = os.environ.get('R2_ACCESS_KEY')
        r2_secret_key = os.environ.get('R2_SECRET_KEY')
        r2_bucket = os.environ.get('R2_BUCKET', 'streampirex')

        if r2_endpoint and r2_access_key:
            s3 = boto3.client('s3',
                endpoint_url=r2_endpoint,
                aws_access_key_id=r2_access_key,
                aws_secret_access_key=r2_secret_key
            )
            key = f'podcasts/{filename}'
            s3.upload_file(file_path, r2_bucket, key)
            public_url = f"{os.environ.get('R2_PUBLIC_URL', r2_endpoint)}/{key}"
            return public_url
    except Exception as e:
        print(f"R2 upload failed: {e}")

    try:
        import cloudinary.uploader
        result = cloudinary.uploader.upload(
            file_path,
            resource_type='auto',
            folder='podcasts',
            public_id=filename.rsplit('.', 1)[0]
        )
        return result['secure_url']
    except Exception as e:
        raise Exception(f"All storage uploads failed: {e}")