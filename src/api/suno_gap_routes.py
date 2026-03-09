"""
suno_gap_routes.py
StreamPireX — Suno Gap Feature Backend Routes

Endpoints:
  POST /api/ai/text-to-song          — text prompt → full song (musicgen-stereo + optional ElevenLabs vocals)
  POST /api/ai/add-vocals            — beat upload → add AI vocals (ElevenLabs + ffmpeg mix)
  POST /api/ai/add-beat              — vocal upload → generate backing beat (musicgen-melody + ffmpeg)
  POST /api/ai/extend-song           — clip → AI continuation (musicgen continuation mode)
  POST /api/ai/analyze-audio         — detect BPM, key, duration from any audio file (used by all 4)

Requirements:
  pip install replicate elevenlabs librosa soundfile numpy pydub boto3 --break-system-packages
  ffmpeg must be installed (add to railway.toml nixpacks packages)

Env vars needed:
  REPLICATE_API_TOKEN
  ELEVENLABS_API_KEY
  R2_ENDPOINT_URL, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME
"""

import os
import io
import uuid
import json
import subprocess
import tempfile
import logging
from datetime import datetime

import boto3
from botocore.client import Config
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

logger = logging.getLogger(__name__)

suno_gap_bp = Blueprint('suno_gap', __name__)

# ─── R2 ──────────────────────────────────────────────────────────────────────
R2_ENDPOINT = os.environ.get('R2_ENDPOINT_URL', '')
R2_KEY      = os.environ.get('R2_ACCESS_KEY_ID', '')
R2_SECRET   = os.environ.get('R2_SECRET_ACCESS_KEY', '')
R2_BUCKET   = os.environ.get('R2_BUCKET_NAME', 'streampirex-media')

def get_s3():
    import boto3
    from botocore.client import Config
    return boto3.client("s3", endpoint_url=os.environ.get("R2_ENDPOINT_URL") or os.environ.get("R2_ENDPOINT",""), aws_access_key_id=os.environ.get("R2_ACCESS_KEY_ID",""), aws_secret_access_key=os.environ.get("R2_SECRET_ACCESS_KEY",""), config=Config(signature_version="s3v4"), region_name="auto"),
    region_name='auto',
)

def upload_to_r2(data: bytes, key: str, content_type: str = 'audio/mpeg') -> str:
    """Upload bytes to R2 and return a presigned URL."""
    get_s3().put_object(Bucket=R2_BUCKET, Key=key, Body=data, ContentType=content_type)
    return get_s3().generate_presigned_url(
        'get_object',
        Params={'Bucket': R2_BUCKET, 'Key': key},
        ExpiresIn=86400,
    )

def download_url_to_bytes(url: str) -> bytes:
    import urllib.request
    with urllib.request.urlopen(url, timeout=120) as r:
        return r.read()

# ─── Audio Analysis ───────────────────────────────────────────────────────────
def analyze_audio_bytes(audio_bytes: bytes, filename: str = 'audio.mp3') -> dict:
    """Use librosa to detect BPM, key, duration from audio bytes."""
    try:
        import librosa, soundfile as sf, numpy as np
        with tempfile.NamedTemporaryFile(suffix=os.path.splitext(filename)[-1] or '.mp3', delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name
        try:
            y, sr = librosa.load(tmp_path, sr=None, mono=True)
            duration = len(y) / sr

            # BPM
            tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
            bpm = round(float(tempo[0]) if hasattr(tempo, '__len__') else float(tempo))

            # Key detection
            chroma  = librosa.feature.chroma_cqt(y=y, sr=sr)
            chroma_mean = chroma.mean(axis=1)
            key_idx = int(chroma_mean.argmax())
            KEYS    = ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B']
            key     = KEYS[key_idx % 12]

            # Major/minor
            chroma_norm = chroma_mean / (chroma_mean.sum() + 1e-10)
            minor_idx   = (key_idx + 9) % 12
            scale       = 'Minor' if chroma_norm[minor_idx] > chroma_norm[(key_idx + 4) % 12] else 'Major'

            return {'bpm': bpm, 'key': key, 'scale': scale, 'duration': round(duration, 1)}
        finally:
            os.unlink(tmp_path)
    except Exception as e:
        logger.warning(f"Audio analysis failed: {e}")
        return {'bpm': None, 'key': None, 'scale': None, 'duration': None}


# ─── Replicate helpers ────────────────────────────────────────────────────────
def run_musicgen(prompt: str, duration: int = 30, conditioning_url: str = None) -> bytes:
    """
    Run MusicGen on Replicate.
    If conditioning_url is provided, uses musicgen-melody for audio conditioning.
    Returns raw MP3/WAV bytes.
    """
    import replicate

    if conditioning_url:
        # musicgen-melody: conditions generation on an existing audio clip
        output = replicate.run(
            "meta/musicgen:671ac645ce5e552cc63a54a2bbff63fcf798043055d2dac5fc9e36a837eedcfb",
            input={
                "prompt":          prompt,
                "model_version":   "melody",
                "input_audio":     conditioning_url,
                "duration":        min(duration, 30),  # melody model max 30s per pass
                "output_format":   "mp3",
                "normalization_strategy": "loudness",
            }
        )
    else:
        output = replicate.run(
            "meta/musicgen:671ac645ce5e552cc63a54a2bbff63fcf798043055d2dac5fc9e36a837eedcfb",
            input={
                "prompt":        prompt,
                "model_version": "stereo-large",
                "duration":      min(duration, 30),
                "output_format": "mp3",
                "normalization_strategy": "loudness",
            }
        )

    # Output is a URL or file-like
    if hasattr(output, 'read'):
        return output.read()
    return download_url_to_bytes(str(output))


def run_elevenlabs_tts(text: str, voice_style: str = 'female_rnb') -> bytes:
    """
    Generate sung/spoken vocal performance via ElevenLabs.
    Maps voice_style to an ElevenLabs voice ID.
    """
    from elevenlabs.client import ElevenLabs

    VOICE_MAP = {
        'male_rap':    'pNInz6obpgDQGcFmaJgB',  # Adam
        'female_rap':  'EXAVITQu4vr4xnSDxMaL',  # Bella
        'male_rnb':    'VR6AewLTigWG4xSOukaG',  # Arnold
        'female_rnb':  'ThT5KcBeYPX3keUQqHPh',  # Dorothy (soft)
        'pop_female':  'AZnzlk1XvdvUeBnXmlld',  # Domi
        'pop_male':    'MF3mGyEYCl7XYWbV9V6O',  # Elli
        'autotune':    'EXAVITQu4vr4xnSDxMaL',  # Bella
        'choir':       'ThT5KcBeYPX3keUQqHPh',
        'spoken':      'pNInz6obpgDQGcFmaJgB',
        'afrobeats_f': 'EXAVITQu4vr4xnSDxMaL',
        'gospel':      'VR6AewLTigWG4xSOukaG',
        'country_male':'pNInz6obpgDQGcFmaJgB',
    }
    voice_id = VOICE_MAP.get(voice_style, 'EXAVITQu4vr4xnSDxMaL')

    client = ElevenLabs(api_key=os.environ.get('ELEVENLABS_API_KEY', ''))
    audio  = client.generate(
        text=text[:2500],   # ElevenLabs limit
        voice=voice_id,
        model="eleven_turbo_v2_5",
    )
    return b''.join(audio)


def mix_audio_ffmpeg(instrumental_bytes: bytes, vocal_bytes: bytes,
                     vocal_level: float = 0.75, reverb: str = 'studio',
                     out_format: str = 'mp3') -> bytes:
    """
    Mix instrumental + vocals using ffmpeg.
    Returns mixed audio bytes.
    """
    with tempfile.TemporaryDirectory() as tmp:
        inst_path  = os.path.join(tmp, 'instrumental.mp3')
        vocal_path = os.path.join(tmp, 'vocals.mp3')
        out_path   = os.path.join(tmp, f'mixed.{out_format}')

        with open(inst_path,  'wb') as f: f.write(instrumental_bytes)
        with open(vocal_path, 'wb') as f: f.write(vocal_bytes)

        # Build reverb filter
        reverb_filters = {
            'dry':    '',
            'small':  ',aecho=0.8:0.8:20:0.3',
            'studio': ',aecho=0.8:0.85:50:0.4',
            'large':  ',aecho=0.8:0.9:100:0.5',
        }
        reverb_fx = reverb_filters.get(reverb, '')

        cmd = [
            'ffmpeg', '-y',
            '-i', inst_path,
            '-i', vocal_path,
            '-filter_complex',
            f'[1:a]volume={vocal_level}{reverb_fx}[v];[0:a][v]amix=inputs=2:duration=first',
            '-c:a', 'libmp3lame', '-b:a', '192k',
            out_path,
        ]
        result = subprocess.run(cmd, capture_output=True, timeout=120)
        if result.returncode != 0:
            raise RuntimeError(f"ffmpeg mix failed: {result.stderr.decode()}")

        with open(out_path, 'rb') as f:
            return f.read()


# ═══════════════════════════════════════════════════════════════════════════════
# POST /api/ai/analyze-audio
# ═══════════════════════════════════════════════════════════════════════════════
@suno_gap_bp.route('/api/ai/analyze-audio', methods=['POST'])
@jwt_required()
def analyze_audio():
    """
    Detect BPM, key, scale, duration from uploaded audio.
    Used by all 4 frontends for the "auto-detect" step.
    """
    audio_file = request.files.get('file')
    if not audio_file:
        return jsonify({'error': 'No file provided'}), 400

    audio_bytes = audio_file.read()
    info = analyze_audio_bytes(audio_bytes, audio_file.filename or 'audio.mp3')
    return jsonify(info), 200


# ═══════════════════════════════════════════════════════════════════════════════
# POST /api/ai/text-to-song
# ═══════════════════════════════════════════════════════════════════════════════
@suno_gap_bp.route('/api/ai/text-to-song', methods=['POST'])
@jwt_required()
def text_to_song():
    """
    Generate a full song from a text prompt.
    Optionally adds AI vocals via ElevenLabs on top.
    Credits must be deducted BEFORE calling this endpoint (handled by frontend).
    """
    user_id = get_jwt_identity()
    data    = request.get_json() or {}

    prompt      = data.get('prompt', '').strip()
    genre       = data.get('genre', '')
    mood        = data.get('mood', '')
    bpm         = data.get('bpm', 90)
    key         = data.get('key', 'C')
    duration    = min(int(data.get('duration', 30)), 480)
    with_vocals = bool(data.get('with_vocals', False))
    voice_style = data.get('voice_style', 'female_rnb')
    lyrics      = data.get('lyrics', '') or ''

    if not prompt:
        return jsonify({'error': 'Prompt is required'}), 400

    # Build musicgen prompt
    musicgen_prompt = f"{genre} {mood} music, {bpm} BPM, key of {key}. {prompt}".strip()

    song_id = str(uuid.uuid4())

    try:
        # 1. Generate instrumental
        # For durations > 30s, we make multiple passes and stitch
        if duration <= 30:
            inst_bytes = run_musicgen(musicgen_prompt, duration=duration)
        else:
            # Generate in 30s chunks and concatenate with ffmpeg
            chunks = []
            remaining = duration
            while remaining > 0:
                chunk_dur = min(remaining, 30)
                chunk = run_musicgen(musicgen_prompt, duration=chunk_dur)
                chunks.append(chunk)
                remaining -= chunk_dur

            # Concatenate
            with tempfile.TemporaryDirectory() as tmp:
                chunk_paths = []
                for i, c in enumerate(chunks):
                    p = os.path.join(tmp, f'chunk_{i}.mp3')
                    with open(p, 'wb') as f: f.write(c)
                    chunk_paths.append(p)

                list_file = os.path.join(tmp, 'list.txt')
                with open(list_file, 'w') as f:
                    for p in chunk_paths:
                        f.write(f"file '{p}'\n")

                out_path = os.path.join(tmp, 'concat.mp3')
                subprocess.run(
                    ['ffmpeg', '-y', '-f', 'concat', '-safe', '0', '-i', list_file,
                     '-c', 'copy', out_path],
                    check=True, capture_output=True, timeout=120
                )
                with open(out_path, 'rb') as f:
                    inst_bytes = f.read()

        # 2. Upload instrumental to R2
        inst_key = f'ai-songs/{user_id}/{song_id}/instrumental.mp3'
        inst_url = upload_to_r2(inst_bytes, inst_key)

        # 3. Add vocals if requested
        if with_vocals:
            vocal_text = lyrics if lyrics else f"A {genre} song about {prompt}. Verse: [ad-lib flowing to the beat]. Chorus: Feel the rhythm, let it go."
            vocal_bytes = run_elevenlabs_tts(vocal_text, voice_style)
            mixed_bytes = mix_audio_ffmpeg(inst_bytes, vocal_bytes, vocal_level=0.7, reverb='studio')
            mixed_key = f'ai-songs/{user_id}/{song_id}/mixed.mp3'
            song_url  = upload_to_r2(mixed_bytes, mixed_key)
        else:
            song_url = inst_url

        # 4. Generate title
        title_words = prompt[:50].replace(',','').split()
        title = ' '.join(w.capitalize() for w in title_words[:4]) or f'{genre} Track'

        return jsonify({
            'song_id':    song_id,
            'url':        song_url,
            'inst_url':   inst_url,
            'title':      title,
            'duration':   duration,
            'has_vocals': with_vocals,
        }), 200

    except Exception as e:
        logger.error(f"text-to-song error: {e}")
        return jsonify({'error': str(e)}), 500


# ═══════════════════════════════════════════════════════════════════════════════
# POST /api/ai/add-vocals
# ═══════════════════════════════════════════════════════════════════════════════
@suno_gap_bp.route('/api/ai/add-vocals', methods=['POST'])
@jwt_required()
def add_vocals_to_beat():
    """
    Upload an instrumental beat, AI sings over it via ElevenLabs.
    Returns mixed track URL + isolated vocal URL.
    """
    user_id   = get_jwt_identity()
    beat_file = request.files.get('beat')
    if not beat_file:
        return jsonify({'error': 'No beat file provided'}), 400

    vocal_style = request.form.get('vocal_style', 'female_rnb')
    placement   = request.form.get('placement', 'center')
    reverb      = request.form.get('reverb', 'studio')
    vocal_level = float(request.form.get('vocal_level', 75)) / 100
    harmonies   = request.form.get('harmonies', 'false').lower() == 'true'
    auto_lyrics = request.form.get('auto_lyrics', 'true').lower() == 'true'
    lyrics      = request.form.get('lyrics', '')
    lyrics_prompt = request.form.get('lyrics_prompt', '')
    bpm         = request.form.get('bpm', '')
    key_name    = request.form.get('key', '')

    beat_bytes = beat_file.read()
    gen_id     = str(uuid.uuid4())

    try:
        # 1. Analyze beat if we don't have info
        if not bpm or not key_name:
            info     = analyze_audio_bytes(beat_bytes, beat_file.filename or 'beat.mp3')
            bpm      = bpm or str(info.get('bpm', 90))
            key_name = key_name or info.get('key', 'C')

        # 2. Generate lyrics text if auto
        if auto_lyrics:
            lyrics_text = (
                f"A {vocal_style.replace('_',' ')} performance "
                f"at {bpm} BPM in key of {key_name}. "
                f"{lyrics_prompt or 'Heartfelt, melodic, relatable.'} "
                "Keep it natural and flowing."
            )
        else:
            lyrics_text = lyrics or f"Singing over this {key_name} beat at {bpm} BPM."

        # 3. Generate vocal bytes
        vocal_bytes = run_elevenlabs_tts(lyrics_text, vocal_style)

        # 4. Mix
        mixed_bytes = mix_audio_ffmpeg(
            beat_bytes, vocal_bytes,
            vocal_level=vocal_level,
            reverb=reverb,
        )

        # 5. Upload both to R2
        vocal_key  = f'ai-vocals/{user_id}/{gen_id}/vocals.mp3'
        mixed_key  = f'ai-vocals/{user_id}/{gen_id}/mixed.mp3'
        vocal_url  = upload_to_r2(vocal_bytes, vocal_key)
        mixed_url  = upload_to_r2(mixed_bytes, mixed_key)

        title = f"AI Vocals ({vocal_style.replace('_',' ').title()}) + {beat_file.filename or 'Your Beat'}"

        return jsonify({
            'gen_id':    gen_id,
            'vocal_url': vocal_url,
            'mixed_url': mixed_url,
            'title':     title,
        }), 200

    except Exception as e:
        logger.error(f"add-vocals error: {e}")
        return jsonify({'error': str(e)}), 500


# ═══════════════════════════════════════════════════════════════════════════════
# POST /api/ai/add-beat
# ═══════════════════════════════════════════════════════════════════════════════
@suno_gap_bp.route('/api/ai/add-beat', methods=['POST'])
@jwt_required()
def add_beat_to_vocals():
    """
    Upload a vocal recording, AI generates a matching backing beat.
    Uses musicgen-melody which conditions on the vocal melody.
    Returns mixed track URL + isolated beat URL.
    """
    user_id    = get_jwt_identity()
    vocal_file = request.files.get('vocal')
    if not vocal_file:
        return jsonify({'error': 'No vocal file provided'}), 400

    genre      = request.form.get('genre', 'hip_hop')
    feel       = request.form.get('feel', 'dark')
    instruments= request.form.get('instruments', 'standard')
    auto_tempo = request.form.get('auto_tempo', 'true').lower() == 'true'
    custom_bpm = request.form.get('bpm', '')

    vocal_bytes = vocal_file.read()
    gen_id      = str(uuid.uuid4())

    try:
        # 1. Analyze vocals to get BPM/key
        info     = analyze_audio_bytes(vocal_bytes, vocal_file.filename or 'vocal.mp3')
        detected_bpm = info.get('bpm', 90)
        detected_key = info.get('key', 'C')

        bpm      = int(custom_bpm) if custom_bpm and not auto_tempo else detected_bpm
        key_name = detected_key

        # 2. Upload vocal to R2 for Replicate conditioning URL
        vocal_r2_key = f'ai-beats/{user_id}/{gen_id}/source_vocal.mp3'
        vocal_url    = upload_to_r2(vocal_bytes, vocal_r2_key)

        # 3. Build musicgen prompt
        GENRE_PROMPTS = {
            'hip_hop':    'hip hop beat with samples',
            'trap':       'trap beat with heavy 808s and hi-hats',
            'rnb':        'smooth R&B beat with live drums and chords',
            'pop':        'pop production with punchy drums',
            'afrobeats':  'Afrobeats with percussion and guitar',
            'gospel':     'gospel music with choir pads and live drums',
            'drill':      'UK drill beat with sliding 808s',
            'lofi':       'lo-fi hip hop with vinyl texture',
            'dancehall':  'dancehall riddim with one-drop pattern',
            'soul':       'soul music with live band feel',
            'country':    'country music with acoustic guitar and twang',
            'house':      'house music with four-on-the-floor kick',
        }
        FEEL_PROMPTS = {
            'dark':       'dark and moody',
            'uplifting':  'bright and uplifting',
            'aggressive': 'aggressive and hard-hitting',
            'chill':      'chill and laid back',
            'romantic':   'romantic and smooth',
            'epic':       'cinematic and epic',
        }
        INSTR_PROMPTS = {
            'minimal':    'minimal production, drums and bass only',
            'standard':   'full production with drums, bass, chords, and melody',
            'full':       'full band with strings and horns',
            'acoustic':   'acoustic production with guitar and piano',
            'electronic': 'electronic production with synthesizers',
        }

        prompt = (
            f"{GENRE_PROMPTS.get(genre,'beat')}, "
            f"{FEEL_PROMPTS.get(feel,'')}, "
            f"{INSTR_PROMPTS.get(instruments,'')}, "
            f"{bpm} BPM, key of {key_name}, "
            "no vocals, instrumental only"
        )

        # 4. Generate beat conditioned on vocal melody
        beat_bytes = run_musicgen(prompt, duration=min(int(info.get('duration',30)), 30), conditioning_url=vocal_url)

        # 5. Mix vocal + beat
        mixed_bytes = mix_audio_ffmpeg(beat_bytes, vocal_bytes, vocal_level=0.85, reverb='studio')

        # 6. Upload
        beat_key  = f'ai-beats/{user_id}/{gen_id}/beat.mp3'
        mixed_key = f'ai-beats/{user_id}/{gen_id}/mixed.mp3'
        beat_url  = upload_to_r2(beat_bytes, beat_key)
        mixed_url = upload_to_r2(mixed_bytes, mixed_key)

        return jsonify({
            'gen_id':    gen_id,
            'beat_url':  beat_url,
            'mixed_url': mixed_url,
            'bpm':       bpm,
            'key':       key_name,
            'title':     f"{GENRE_PROMPTS.get(genre,'Beat').split(' ')[0].title()} Beat + Your Vocal",
        }), 200

    except Exception as e:
        logger.error(f"add-beat error: {e}")
        return jsonify({'error': str(e)}), 500


# ═══════════════════════════════════════════════════════════════════════════════
# POST /api/ai/extend-song
# ═══════════════════════════════════════════════════════════════════════════════
@suno_gap_bp.route('/api/ai/extend-song', methods=['POST'])
@jwt_required()
def extend_song():
    """
    Extend an existing audio clip.
    Accepts either a file upload or a clip_url pointing to an R2 object.
    Uses musicgen with the original clip as conditioning (continuation).
    Returns the full extended track (original + extension stitched).
    """
    user_id       = get_jwt_identity()
    target_dur    = min(int(request.form.get('target_duration', 30)), 480)
    ext_style     = request.form.get('style', 'seamless')
    prompt_guide  = request.form.get('prompt_guide', '')
    clip_url      = request.form.get('clip_url', '')

    clip_file = request.files.get('clip')
    gen_id    = str(uuid.uuid4())

    try:
        # 1. Get original clip bytes
        if clip_file:
            orig_bytes = clip_file.read()
            filename   = clip_file.filename or 'clip.mp3'
        elif clip_url:
            orig_bytes = download_url_to_bytes(clip_url)
            filename   = 'clip.mp3'
        else:
            return jsonify({'error': 'Provide either a clip file or clip_url'}), 400

        # 2. Analyze original
        info = analyze_audio_bytes(orig_bytes, filename)

        # 3. Upload original to R2 for Replicate conditioning
        orig_r2_key = f'ai-extend/{user_id}/{gen_id}/original.mp3'
        orig_url    = upload_to_r2(orig_bytes, orig_r2_key)

        # 4. Build style-specific prompt
        STYLE_PROMPTS = {
            'seamless':   'continue this music seamlessly, same style and energy',
            'build':      'build energy and add more layers, bigger and fuller',
            'breakdown':  'strip back to minimal, then gradually rebuild',
            'bridge':     'introduce a new melodic section, different chord progression',
            'outro':      'wind down gently, fade the energy for a natural ending',
            'variation':  'slight variation in feel, keep the core groove',
        }

        style_desc = STYLE_PROMPTS.get(ext_style, 'continue this music')
        bpm_str    = f"{info['bpm']} BPM" if info.get('bpm') else ''
        key_str    = f"key of {info['key']}" if info.get('key') else ''
        base_prompt = f"Music continuation: {style_desc}. {bpm_str} {key_str}. {prompt_guide}".strip()

        # 5. Generate extension in 30s chunks
        ext_chunks = []
        remaining  = target_dur
        while remaining > 0:
            chunk_dur = min(remaining, 30)
            chunk     = run_musicgen(base_prompt, duration=chunk_dur, conditioning_url=orig_url)
            ext_chunks.append(chunk)
            remaining -= chunk_dur

        # 6. Stitch: original + all extension chunks with crossfade
        with tempfile.TemporaryDirectory() as tmp:
            orig_path  = os.path.join(tmp, 'original.mp3')
            with open(orig_path, 'wb') as f: f.write(orig_bytes)

            chunk_paths = [orig_path]
            for i, c in enumerate(ext_chunks):
                p = os.path.join(tmp, f'ext_{i}.mp3')
                with open(p, 'wb') as f: f.write(c)
                chunk_paths.append(p)

            list_file = os.path.join(tmp, 'list.txt')
            with open(list_file, 'w') as f:
                for p in chunk_paths:
                    f.write(f"file '{p}'\n")

            out_path = os.path.join(tmp, 'extended.mp3')
            subprocess.run(
                ['ffmpeg', '-y', '-f', 'concat', '-safe', '0',
                 '-i', list_file, '-c:a', 'libmp3lame', '-b:a', '192k', out_path],
                check=True, capture_output=True, timeout=180
            )
            with open(out_path, 'rb') as f:
                extended_bytes = f.read()

        # 7. Upload extended track
        ext_key = f'ai-extend/{user_id}/{gen_id}/extended.mp3'
        ext_url = upload_to_r2(extended_bytes, ext_key)

        orig_duration = info.get('duration', 0) or 0
        return jsonify({
            'gen_id':          gen_id,
            'url':             ext_url,
            'original_duration': round(orig_duration, 1),
            'added_duration':    target_dur,
            'total_duration':    round(orig_duration + target_dur, 1),
            'style':           ext_style,
        }), 200

    except Exception as e:
        logger.error(f"extend-song error: {e}")
        return jsonify({'error': str(e)}), 500
