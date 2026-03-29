# =============================================================================
# score_routes.py — MIDI Score / Video Scoring Backend
# =============================================================================
# Register in app.py:
#   from api.score_routes import score_bp
#   app.register_blueprint(score_bp)
#
# Endpoints:
#   POST /api/score/export-video   — merge scored audio onto video (FFmpeg)
#   POST /api/score/midi-to-audio  — render MIDI notes to WAV (basic sine synth)
# =============================================================================

import os
import json
import math
import struct
import subprocess
import tempfile
import wave
from flask import Blueprint, request, jsonify

score_bp = Blueprint('score', __name__)

# ── sample rate for audio render ──────────────────────────────────────────────
SAMPLE_RATE = 44100

# ── MIDI note → frequency ─────────────────────────────────────────────────────
def midi_to_freq(midi: int) -> float:
    return 440.0 * (2 ** ((midi - 69) / 12))

# ── render notes to raw PCM (16-bit mono) ─────────────────────────────────────
def notes_to_pcm(notes: list, bpm: float, duration_secs: float) -> bytes:
    total_samples = int(SAMPLE_RATE * duration_secs) + SAMPLE_RATE
    buf = [0.0] * total_samples

    for note in notes:
        freq        = midi_to_freq(note['midi'])
        start_beat  = note['startBeat']
        dur_beats   = note['duration']
        velocity    = note.get('velocity', 100) / 127.0

        start_sec   = (start_beat / bpm) * 60.0
        dur_sec     = (dur_beats / bpm) * 60.0
        start_smp   = int(start_sec * SAMPLE_RATE)
        dur_smp     = int(dur_sec * SAMPLE_RATE)

        # simple sine with ADSR envelope
        attack  = int(0.01 * SAMPLE_RATE)
        release = int(0.05 * SAMPLE_RATE)

        for i in range(dur_smp):
            t   = i / SAMPLE_RATE
            env = 1.0
            if i < attack:
                env = i / attack
            elif i > dur_smp - release:
                env = (dur_smp - i) / release
            sample = math.sin(2 * math.pi * freq * t) * env * velocity * 0.3
            idx    = start_smp + i
            if 0 <= idx < len(buf):
                buf[idx] += sample

    # clamp + convert to 16-bit
    pcm_bytes = bytearray()
    for s in buf:
        clamped = max(-1.0, min(1.0, s))
        val = int(clamped * 32767)
        pcm_bytes += struct.pack('<h', val)

    return bytes(pcm_bytes)

# ── write PCM to WAV file ─────────────────────────────────────────────────────
def write_wav(pcm: bytes, path: str):
    with wave.open(path, 'wb') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(pcm)

# =============================================================================
# POST /api/score/export-video
# =============================================================================
@score_bp.route('/api/score/export-video', methods=['POST'])
def export_video_with_score():
    """
    Accepts:
      - video file (multipart)
      - notes (JSON string)
      - bpm (float)
      - time_signature (JSON string, e.g. [4,4])

    Returns:
      - { url: <cloudinary_or_local_url> }
    """
    if 'video' not in request.files:
        return jsonify({'error': 'No video file'}), 400

    video_file = request.files['video']
    notes_raw  = request.form.get('notes', '[]')
    bpm_raw    = request.form.get('bpm', '120')

    try:
        notes = json.loads(notes_raw)
        bpm   = float(bpm_raw)
    except Exception as e:
        return jsonify({'error': f'Parse error: {e}'}), 400

    with tempfile.TemporaryDirectory() as tmpdir:
        video_path  = os.path.join(tmpdir, 'input.mp4')
        audio_path  = os.path.join(tmpdir, 'score.wav')
        output_path = os.path.join(tmpdir, 'output.mp4')

        video_file.save(video_path)

        # get video duration via ffprobe
        try:
            probe = subprocess.run(
                ['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                 '-of', 'default=noprint_wrappers=1:nokey=1', video_path],
                capture_output=True, text=True, timeout=30
            )
            video_dur = float(probe.stdout.strip())
        except Exception:
            video_dur = 60.0  # fallback

        # render score audio
        pcm = notes_to_pcm(notes, bpm, video_dur)
        write_wav(pcm, audio_path)

        # merge with ffmpeg: replace/mix audio
        cmd = [
            'ffmpeg', '-y',
            '-i', video_path,
            '-i', audio_path,
            '-filter_complex', '[0:a][1:a]amix=inputs=2:duration=first[aout]',
            '-map', '0:v',
            '-map', '[aout]',
            '-c:v', 'copy',
            '-c:a', 'aac',
            '-b:a', '192k',
            output_path
        ]

        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
            if result.returncode != 0:
                # fallback: score audio only (no original audio)
                cmd_fallback = [
                    'ffmpeg', '-y',
                    '-i', video_path,
                    '-i', audio_path,
                    '-map', '0:v',
                    '-map', '1:a',
                    '-c:v', 'copy',
                    '-c:a', 'aac',
                    '-shortest',
                    output_path
                ]
                subprocess.run(cmd_fallback, capture_output=True, timeout=120)
        except subprocess.TimeoutExpired:
            return jsonify({'error': 'FFmpeg timeout'}), 500

        if not os.path.exists(output_path):
            return jsonify({'error': 'FFmpeg failed to produce output'}), 500

        # ── upload to Cloudinary (optional) or return base64 ──────────────
        try:
            import cloudinary.uploader as cu
            upload_result = cu.upload(
                output_path,
                resource_type='video',
                folder='spx_scored_videos',
            )
            return jsonify({'url': upload_result['secure_url']})
        except Exception:
            # if cloudinary not configured — return local file as base64
            import base64
            with open(output_path, 'rb') as f:
                data = base64.b64encode(f.read()).decode()
            return jsonify({
                'url': f'data:video/mp4;base64,{data}',
                'note': 'base64 — configure Cloudinary for proper URL'
            })


# =============================================================================
# POST /api/score/midi-to-audio
# =============================================================================
@score_bp.route('/api/score/midi-to-audio', methods=['POST'])
def midi_to_audio():
    """
    Render MIDI notes to WAV for preview / download.
    Body JSON: { notes, bpm, duration }
    """
    data     = request.get_json(force=True) or {}
    notes    = data.get('notes', [])
    bpm      = float(data.get('bpm', 120))
    duration = float(data.get('duration', 30))

    pcm = notes_to_pcm(notes, bpm, duration)

    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
        wav_path = f.name
    write_wav(pcm, wav_path)

    try:
        import cloudinary.uploader as cu
        result = cu.upload(wav_path, resource_type='raw', folder='spx_score_audio')
        os.unlink(wav_path)
        return jsonify({'url': result['secure_url']})
    except Exception:
        import base64
        with open(wav_path, 'rb') as f:
            data_b64 = base64.b64encode(f.read()).decode()
        os.unlink(wav_path)
        return jsonify({'url': f'data:audio/wav;base64,{data_b64}'})
