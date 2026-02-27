# =============================================================================
# PHASE 1 BACKEND: AI Transcription, Text-Based Editing, Progressive Upload
# =============================================================================
# Location: src/api/podcast_studio_ai_routes.py
# Register: app.register_blueprint(podcast_ai_bp)
#
# Endpoints:
#   POST /api/podcast-studio/transcribe       — AI transcription with word timestamps
#   POST /api/podcast-studio/apply-text-edits  — Cut audio based on transcript edits
#   POST /api/podcast-studio/upload-chunk      — Progressive chunk upload during recording
#   POST /api/podcast-studio/magic-audio       — AI audio enhancement (noise, levels, EQ)
#   POST /api/podcast-studio/generate-show-notes — AI show notes, chapters, SEO
# =============================================================================

import os
import json
import tempfile
import subprocess
import requests
from io import BytesIO
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime

podcast_ai_bp = Blueprint('podcast_ai', __name__)

# ---------------------------------------------------------------------------
# CONFIG
# ---------------------------------------------------------------------------
DEEPGRAM_API_KEY = os.environ.get('DEEPGRAM_API_KEY', '')
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', '')
ANTHROPIC_API_KEY = os.environ.get('ANTHROPIC_API_KEY', '')

# Chunk storage directory (R2 or local)
CHUNK_STORAGE = os.environ.get('CHUNK_STORAGE_PATH', '/tmp/podcast_chunks')
os.makedirs(CHUNK_STORAGE, exist_ok=True)


# =============================================================================
# 1. AI TRANSCRIPTION — Word-level timestamps via Deepgram Nova-2
# =============================================================================

@podcast_ai_bp.route('/api/podcast-studio/transcribe', methods=['POST'])
@jwt_required()
def transcribe_audio():
    """
    Transcribe audio with word-level timestamps.
    Supports both URL-based and file upload transcription.
    Uses Deepgram Nova-2 (primary) or OpenAI Whisper (fallback).
    """
    user_id = get_jwt_identity()
    data = request.get_json()
    audio_url = data.get('audio_url')
    episode_id = data.get('episode_id')

    if not audio_url:
        return jsonify({"error": "audio_url required"}), 400

    try:
        # --- Deepgram Nova-2 (preferred: word timestamps + speaker diarization) ---
        if DEEPGRAM_API_KEY:
            result = _transcribe_deepgram(audio_url)
        # --- Fallback: OpenAI Whisper ---
        elif OPENAI_API_KEY:
            result = _transcribe_whisper(audio_url)
        else:
            return jsonify({"error": "No transcription API key configured"}), 500

        # Save transcript to database if episode_id provided
        if episode_id:
            from src.api.models import db, PodcastEpisode
            episode = PodcastEpisode.query.filter_by(
                id=episode_id, user_id=user_id
            ).first()
            if episode:
                episode.transcript = result['full_text']
                episode.transcript_words = json.dumps(result['words'])
                db.session.commit()

        return jsonify(result), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


def _transcribe_deepgram(audio_url):
    """Deepgram Nova-2 transcription with word-level timestamps."""
    headers = {
        'Authorization': f'Token {DEEPGRAM_API_KEY}',
        'Content-Type': 'application/json'
    }
    payload = {
        'url': audio_url
    }
    params = {
        'model': 'nova-2',
        'smart_format': 'true',
        'diarize': 'true',       # Speaker detection
        'paragraphs': 'true',
        'punctuate': 'true',
        'utterances': 'true',
        'filler_words': 'true',  # Detect um, uh, etc.
    }

    res = requests.post(
        'https://api.deepgram.com/v1/listen',
        headers=headers,
        params=params,
        json=payload,
        timeout=300  # 5 min timeout for long recordings
    )
    res.raise_for_status()
    data = res.json()

    channel = data['results']['channels'][0]
    alternative = channel['alternatives'][0]

    words = []
    for w in alternative.get('words', []):
        words.append({
            'word': w.get('punctuated_word', w.get('word', '')),
            'start': w.get('start', 0),
            'end': w.get('end', 0),
            'confidence': w.get('confidence', 0),
            'speaker': w.get('speaker', 0)
        })

    return {
        'full_text': alternative.get('transcript', ''),
        'words': words,
        'speakers': data['results'].get('utterances', []),
        'paragraphs': alternative.get('paragraphs', {}).get('paragraphs', []),
        'duration': data.get('metadata', {}).get('duration', 0),
        'model': 'deepgram-nova-2'
    }


def _transcribe_whisper(audio_url):
    """OpenAI Whisper fallback — download audio then transcribe."""
    # Download audio
    audio_response = requests.get(audio_url, timeout=120)
    audio_data = audio_response.content

    # Write to temp file
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
        f.write(audio_data)
        temp_path = f.name

    try:
        headers = {'Authorization': f'Bearer {OPENAI_API_KEY}'}
        with open(temp_path, 'rb') as audio_file:
            res = requests.post(
                'https://api.openai.com/v1/audio/transcriptions',
                headers=headers,
                files={'file': audio_file},
                data={
                    'model': 'whisper-1',
                    'response_format': 'verbose_json',
                    'timestamp_granularities[]': 'word'
                },
                timeout=300
            )
        res.raise_for_status()
        data = res.json()

        words = []
        for w in data.get('words', []):
            words.append({
                'word': w.get('word', ''),
                'start': w.get('start', 0),
                'end': w.get('end', 0),
                'confidence': 1.0,  # Whisper doesn't return confidence
                'speaker': 0
            })

        return {
            'full_text': data.get('text', ''),
            'words': words,
            'speakers': [],
            'paragraphs': [],
            'duration': data.get('duration', 0),
            'model': 'whisper-1'
        }
    finally:
        os.unlink(temp_path)


# =============================================================================
# 2. TEXT-BASED EDITING — Apply edit decisions to audio
# =============================================================================

@podcast_ai_bp.route('/api/podcast-studio/apply-text-edits', methods=['POST'])
@jwt_required()
def apply_text_edits():
    """
    Takes an edit decision list (EDL) of time ranges to KEEP,
    and concatenates those segments into a new audio file.
    Uses ffmpeg for precise audio cutting.
    """
    user_id = get_jwt_identity()
    data = request.get_json()
    audio_url = data.get('audio_url')
    edl = data.get('edit_decision_list', [])  # [{start, end}, ...]
    episode_id = data.get('episode_id')
    updated_words = data.get('words', [])

    if not audio_url or not edl:
        return jsonify({"error": "audio_url and edit_decision_list required"}), 400

    try:
        # Download source audio
        audio_response = requests.get(audio_url, timeout=120)

        with tempfile.TemporaryDirectory() as tmpdir:
            source_path = os.path.join(tmpdir, 'source.wav')
            output_path = os.path.join(tmpdir, 'edited.wav')

            with open(source_path, 'wb') as f:
                f.write(audio_response.content)

            # Build ffmpeg filter to extract and concatenate segments
            filter_parts = []
            for i, segment in enumerate(edl):
                start = segment['start']
                end = segment['end']
                # Add small crossfade padding (10ms) to avoid clicks
                filter_parts.append(
                    f"[0:a]atrim=start={start}:end={end},asetpts=PTS-STARTPTS[s{i}]"
                )

            # Concatenate all segments
            concat_inputs = ''.join(f'[s{i}]' for i in range(len(edl)))
            filter_parts.append(
                f"{concat_inputs}concat=n={len(edl)}:v=0:a=1[out]"
            )

            filter_complex = ';'.join(filter_parts)

            cmd = [
                'ffmpeg', '-y',
                '-i', source_path,
                '-filter_complex', filter_complex,
                '-map', '[out]',
                '-c:a', 'pcm_s24le',  # Keep WAV quality
                '-ar', '48000',
                output_path
            ]

            result = subprocess.run(cmd, capture_output=True, timeout=300)

            if result.returncode != 0:
                return jsonify({
                    "error": "FFmpeg processing failed",
                    "details": result.stderr.decode()
                }), 500

            # Upload edited file to storage
            edited_url = _upload_to_storage(
                output_path, f'podcast_edited_{episode_id}_{int(datetime.utcnow().timestamp())}.wav'
            )

            # Update transcript in database
            if episode_id:
                from src.api.models import db, PodcastEpisode
                episode = PodcastEpisode.query.filter_by(
                    id=episode_id, user_id=user_id
                ).first()
                if episode:
                    new_transcript = ' '.join(w['word'] for w in updated_words)
                    episode.transcript = new_transcript
                    episode.audio_url = edited_url
                    db.session.commit()

            return jsonify({
                "edited_audio_url": edited_url,
                "transcript": ' '.join(w['word'] for w in updated_words),
                "segments_kept": len(edl),
                "original_duration": edl[-1]['end'] if edl else 0,
                "edited_duration": sum(s['end'] - s['start'] for s in edl)
            }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =============================================================================
# 3. PROGRESSIVE CHUNK UPLOAD
# =============================================================================

@podcast_ai_bp.route('/api/podcast-studio/upload-chunk', methods=['POST'])
@jwt_required()
def upload_chunk():
    """
    Receives audio chunks during recording (every ~30 seconds).
    Stores them temporarily. When final upload arrives, chunks are
    already available for fast assembly.
    """
    user_id = get_jwt_identity()
    session_id = request.form.get('session_id')
    track_id = request.form.get('track_id')
    chunk_index = request.form.get('chunk_index', 0)
    duration = request.form.get('duration', 0)

    if 'chunk' not in request.files:
        return jsonify({"error": "No chunk file"}), 400

    chunk_file = request.files['chunk']

    # Store chunk
    chunk_dir = os.path.join(CHUNK_STORAGE, session_id, track_id)
    os.makedirs(chunk_dir, exist_ok=True)
    chunk_path = os.path.join(chunk_dir, f'chunk_{chunk_index}.wav')
    chunk_file.save(chunk_path)

    return jsonify({
        "status": "ok",
        "chunk_index": int(chunk_index),
        "session_id": session_id,
        "track_id": track_id,
        "duration": float(duration)
    }), 200


# =============================================================================
# 4. MAGIC AUDIO — AI Audio Enhancement
# =============================================================================

@podcast_ai_bp.route('/api/podcast-studio/magic-audio', methods=['POST'])
@jwt_required()
def magic_audio():
    """
    AI-powered audio enhancement:
    - Noise reduction (adaptive spectral gating)
    - Level normalization (LUFS targeting)
    - EQ optimization (voice presence boost)
    - De-essing (sibilance reduction)
    - Compression (dynamic range control)

    Uses ffmpeg audio filters for processing.
    """
    user_id = get_jwt_identity()
    data = request.get_json()
    audio_url = data.get('audio_url')
    preset = data.get('preset', 'podcast')  # podcast, interview, solo, music
    episode_id = data.get('episode_id')

    if not audio_url:
        return jsonify({"error": "audio_url required"}), 400

    # Preset configurations
    presets = {
        'podcast': {
            'target_lufs': -16,
            'noise_reduction': 0.21,
            'highpass': 80,
            'lowpass': 16000,
            'compressor_threshold': -20,
            'compressor_ratio': 4,
            'eq_presence_boost': 3,  # dB boost at 2-5kHz
            'de_ess_freq': 6000,
            'de_ess_amount': 6,
        },
        'interview': {
            'target_lufs': -16,
            'noise_reduction': 0.25,
            'highpass': 100,
            'lowpass': 14000,
            'compressor_threshold': -18,
            'compressor_ratio': 3,
            'eq_presence_boost': 2,
            'de_ess_freq': 6000,
            'de_ess_amount': 4,
        },
        'solo': {
            'target_lufs': -14,
            'noise_reduction': 0.18,
            'highpass': 60,
            'lowpass': 18000,
            'compressor_threshold': -22,
            'compressor_ratio': 3,
            'eq_presence_boost': 4,
            'de_ess_freq': 7000,
            'de_ess_amount': 5,
        },
        'music': {
            'target_lufs': -14,
            'noise_reduction': 0.1,
            'highpass': 30,
            'lowpass': 20000,
            'compressor_threshold': -24,
            'compressor_ratio': 2,
            'eq_presence_boost': 1,
            'de_ess_freq': 8000,
            'de_ess_amount': 2,
        }
    }

    config = presets.get(preset, presets['podcast'])

    try:
        audio_response = requests.get(audio_url, timeout=120)

        with tempfile.TemporaryDirectory() as tmpdir:
            source_path = os.path.join(tmpdir, 'source.wav')
            output_path = os.path.join(tmpdir, 'enhanced.wav')

            with open(source_path, 'wb') as f:
                f.write(audio_response.content)

            # Build ffmpeg filter chain
            filters = []

            # 1. High-pass filter (remove rumble)
            filters.append(f"highpass=f={config['highpass']}")

            # 2. Low-pass filter (remove hiss)
            filters.append(f"lowpass=f={config['lowpass']}")

            # 3. Noise gate (remove background noise between speech)
            filters.append(
                f"agate=threshold=0.01:ratio=2:attack=25:release=150"
            )

            # 4. Adaptive noise reduction via afftdn
            filters.append(
                f"afftdn=nf=-25:nt=w:om=o"
            )

            # 5. De-esser (reduce sibilance)
            filters.append(
                f"equalizer=f={config['de_ess_freq']}:t=q:w=2:g=-{config['de_ess_amount']}"
            )

            # 6. Presence/clarity EQ boost (2-5kHz)
            filters.append(
                f"equalizer=f=3000:t=q:w=1.5:g={config['eq_presence_boost']}"
            )

            # 7. Warmth (slight low-mid boost)
            filters.append(f"equalizer=f=250:t=q:w=1:g=1.5")

            # 8. Compression
            filters.append(
                f"acompressor=threshold={config['compressor_threshold']}dB"
                f":ratio={config['compressor_ratio']}"
                f":attack=10:release=100:makeup=2"
            )

            # 9. Loudness normalization (LUFS)
            filters.append(
                f"loudnorm=I={config['target_lufs']}:TP=-1.5:LRA=11"
            )

            # 10. Limiter (prevent clipping)
            filters.append("alimiter=limit=0.95:attack=5:release=50")

            filter_string = ','.join(filters)

            cmd = [
                'ffmpeg', '-y',
                '-i', source_path,
                '-af', filter_string,
                '-c:a', 'pcm_s24le',
                '-ar', '48000',
                output_path
            ]

            result = subprocess.run(cmd, capture_output=True, timeout=300)

            if result.returncode != 0:
                return jsonify({
                    "error": "Audio enhancement failed",
                    "details": result.stderr.decode()
                }), 500

            enhanced_url = _upload_to_storage(
                output_path,
                f'podcast_enhanced_{episode_id}_{preset}_{int(datetime.utcnow().timestamp())}.wav'
            )

            # Update episode if provided
            if episode_id:
                from src.api.models import db, PodcastEpisode
                episode = PodcastEpisode.query.filter_by(
                    id=episode_id, user_id=user_id
                ).first()
                if episode:
                    episode.audio_url = enhanced_url
                    episode.enhanced = True
                    db.session.commit()

            return jsonify({
                "enhanced_audio_url": enhanced_url,
                "preset": preset,
                "processing": {
                    "noise_reduction": True,
                    "normalization": f"{config['target_lufs']} LUFS",
                    "compression": f"{config['compressor_ratio']}:1",
                    "eq": "voice optimized",
                    "de_essing": True,
                    "limiting": True
                }
            }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =============================================================================
# 5. AI SHOW NOTES GENERATOR
# =============================================================================

@podcast_ai_bp.route('/api/podcast-studio/generate-show-notes', methods=['POST'])
@jwt_required()
def generate_show_notes():
    """
    Generate AI-powered show notes from transcript:
    - Episode summary
    - Chapter markers with timestamps
    - Key topics / bullet points
    - SEO-optimized description
    - Social media posts
    - Tags
    """
    user_id = get_jwt_identity()
    data = request.get_json()
    episode_id = data.get('episode_id')
    transcript = data.get('transcript', '')

    # If no transcript provided, fetch from database
    if not transcript and episode_id:
        from src.api.models import PodcastEpisode
        episode = PodcastEpisode.query.filter_by(
            id=episode_id, user_id=user_id
        ).first()
        if episode and episode.transcript:
            transcript = episode.transcript

    if not transcript:
        return jsonify({"error": "No transcript available. Transcribe first."}), 400

    try:
        # Use Anthropic Claude for high-quality generation
        if ANTHROPIC_API_KEY:
            result = _generate_notes_anthropic(transcript)
        elif OPENAI_API_KEY:
            result = _generate_notes_openai(transcript)
        else:
            return jsonify({"error": "No AI API key configured"}), 500

        # Save to database
        if episode_id:
            from src.api.models import db, PodcastEpisode, PodcastChapter
            episode = PodcastEpisode.query.filter_by(
                id=episode_id, user_id=user_id
            ).first()
            if episode:
                episode.summary = result.get('summary', '')
                episode.show_notes = result.get('show_notes', '')
                episode.seo_description = result.get('seo_description', '')
                episode.tags = json.dumps(result.get('tags', []))

                # Save chapters
                for ch in result.get('chapters', []):
                    chapter = PodcastChapter(
                        episode_id=episode.id,
                        title=ch.get('title', ''),
                        timestamp=ch.get('timestamp', 0),
                        description=ch.get('description', '')
                    )
                    db.session.add(chapter)

                db.session.commit()

        return jsonify(result), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


def _generate_notes_anthropic(transcript):
    """Use Claude to generate show notes."""
    # Truncate transcript if too long (keep first and last portions)
    max_chars = 15000
    if len(transcript) > max_chars:
        half = max_chars // 2
        transcript = transcript[:half] + "\n\n[...middle portion omitted...]\n\n" + transcript[-half:]

    headers = {
        'x-api-key': ANTHROPIC_API_KEY,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
    }

    prompt = f"""Analyze this podcast episode transcript and generate structured metadata.

TRANSCRIPT:
{transcript}

Return a JSON object with these fields:
1. "summary" — 2-3 paragraph episode overview (engaging, not dry)
2. "show_notes" — 5-8 key bullet points covering main topics discussed
3. "chapters" — Array of chapter markers, each with "title" (string), "timestamp" (seconds as number), "description" (one sentence). Estimate timestamps from transcript position.
4. "seo_description" — 2-3 sentences optimized for podcast directory search (Apple Podcasts, Spotify)
5. "tags" — Array of 5-8 relevant tags/keywords
6. "social_posts" — Object with "twitter" (280 chars max), "instagram" (caption with hashtags), "linkedin" (professional tone, 2-3 sentences)
7. "key_quotes" — Array of 3-5 notable/shareable quotes from the episode (actual quotes from transcript)
8. "guest_bio" — Brief bio if guests are mentioned (null if solo episode)

Return ONLY valid JSON, no markdown formatting or backticks."""

    res = requests.post(
        'https://api.anthropic.com/v1/messages',
        headers=headers,
        json={
            'model': 'claude-sonnet-4-5-20250929',
            'max_tokens': 2000,
            'messages': [{'role': 'user', 'content': prompt}]
        },
        timeout=60
    )
    res.raise_for_status()
    data = res.json()

    text = data['content'][0]['text']
    # Clean up potential markdown fencing
    text = text.strip().removeprefix('```json').removeprefix('```').removesuffix('```').strip()
    return json.loads(text)


def _generate_notes_openai(transcript):
    """Fallback: OpenAI GPT for show notes."""
    max_chars = 12000
    if len(transcript) > max_chars:
        half = max_chars // 2
        transcript = transcript[:half] + "\n\n[...]\n\n" + transcript[-half:]

    headers = {
        'Authorization': f'Bearer {OPENAI_API_KEY}',
        'Content-Type': 'application/json'
    }

    res = requests.post(
        'https://api.openai.com/v1/chat/completions',
        headers=headers,
        json={
            'model': 'gpt-4o',
            'messages': [
                {'role': 'system', 'content': 'You are a podcast production assistant. Return only valid JSON.'},
                {'role': 'user', 'content': f'Generate show notes for this transcript: {transcript}\n\nReturn JSON with: summary, show_notes (array), chapters (array with title/timestamp/description), seo_description, tags (array), social_posts (twitter/instagram/linkedin), key_quotes (array)'}
            ],
            'max_tokens': 2000,
            'response_format': {'type': 'json_object'}
        },
        timeout=60
    )
    res.raise_for_status()
    data = res.json()
    return json.loads(data['choices'][0]['message']['content'])


# =============================================================================
# STORAGE HELPER
# =============================================================================

def _upload_to_storage(file_path, filename):
    """Upload to R2 (primary) or Cloudinary (fallback)."""
    try:
        # Try R2 first
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
            key = f'podcasts/audio/{filename}'
            s3.upload_file(file_path, r2_bucket, key)
            public_url = f"{os.environ.get('R2_PUBLIC_URL', r2_endpoint)}/{key}"
            return public_url
    except Exception as e:
        print(f"R2 upload failed, trying Cloudinary: {e}")

    # Fallback: Cloudinary
    try:
        import cloudinary.uploader
        result = cloudinary.uploader.upload(
            file_path,
            resource_type='auto',
            folder='podcasts/audio',
            public_id=filename.rsplit('.', 1)[0]
        )
        return result['secure_url']
    except Exception as e:
        print(f"Cloudinary upload also failed: {e}")
        raise