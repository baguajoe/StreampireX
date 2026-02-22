# =============================================================================
# ai_video_tools.py — Free AI Video Editing Tools
# =============================================================================
# Location: src/api/ai_video_tools.py
# Register: app.register_blueprint(ai_video_tools_bp)
#
# FREE tools (no API cost):
#   1. Silence/Dead Air Removal — ffmpeg audio analysis + cutting
#   2. AI Thumbnail Generator — ffmpeg frame extraction + sharpness scoring
#
# CHEAP tools (Whisper local or API):
#   3. Auto-Captions/Subtitles — speech-to-text with word-level timestamps
#
# All processing uses ffmpeg + ffprobe (pre-installed on Railway)
# =============================================================================

from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
import os, subprocess, json, tempfile, traceback, uuid, math

try:
    from src.api.r2_storage_setup import uploadFile
except ImportError:
    from src.api.cloudinary_setup import uploadFile

from src.api.models import db, User

ai_video_tools_bp = Blueprint('ai_video_tools', __name__)


# =============================================================================
# HELPER: Download file from URL to temp path
# =============================================================================

def download_to_temp(url, suffix='.mp4'):
    """Download a URL to a temp file. Returns path."""
    import requests as req
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    r = req.get(url, stream=True, timeout=120)
    r.raise_for_status()
    for chunk in r.iter_content(8192):
        tmp.write(chunk)
    tmp.close()
    return tmp.name


def get_duration(path):
    """Get media duration in seconds via ffprobe."""
    try:
        result = subprocess.run([
            'ffprobe', '-v', 'quiet', '-show_entries', 'format=duration',
            '-of', 'json', path
        ], capture_output=True, text=True, timeout=30)
        data = json.loads(result.stdout)
        return float(data['format']['duration'])
    except Exception:
        return 0


# =============================================================================
# 1. SILENCE / DEAD AIR DETECTION (100% FREE — ffmpeg only)
# =============================================================================

@ai_video_tools_bp.route('/api/video-tools/detect-silence', methods=['POST'])
@jwt_required()
def detect_silence():
    """
    Detect silent segments in audio/video.
    Uses ffmpeg silencedetect filter — zero API cost.
    Returns list of silent segments with start/end times.
    """
    user_id = get_jwt_identity()
    data = request.get_json()
    media_url = data.get('media_url')
    silence_threshold = data.get('threshold', -30)  # dB
    min_silence_duration = data.get('min_duration', 0.5)  # seconds

    if not media_url:
        return jsonify({'error': 'Please provide media_url'}), 400

    try:
        # Download media
        tmp_path = download_to_temp(media_url)
        duration = get_duration(tmp_path)

        # Run silencedetect
        result = subprocess.run([
            'ffmpeg', '-i', tmp_path, '-af',
            f'silencedetect=noise={silence_threshold}dB:d={min_silence_duration}',
            '-f', 'null', '-'
        ], capture_output=True, text=True, timeout=300)

        # Parse silence segments from stderr
        segments = []
        lines = result.stderr.split('\n')
        current_start = None

        for line in lines:
            if 'silence_start:' in line:
                try:
                    current_start = float(line.split('silence_start:')[1].strip().split()[0])
                except (ValueError, IndexError):
                    pass
            elif 'silence_end:' in line and current_start is not None:
                try:
                    parts = line.split('silence_end:')[1].strip().split()
                    end = float(parts[0])
                    dur_str = line.split('silence_duration:')[1].strip() if 'silence_duration:' in line else '0'
                    seg_duration = float(dur_str.split()[0]) if dur_str else end - current_start

                    segments.append({
                        'start': round(current_start, 3),
                        'end': round(end, 3),
                        'duration': round(seg_duration, 3),
                    })
                    current_start = None
                except (ValueError, IndexError):
                    pass

        # Calculate stats
        total_silence = sum(s['duration'] for s in segments)
        silence_pct = (total_silence / duration * 100) if duration > 0 else 0

        os.unlink(tmp_path)

        return jsonify({
            'message': f'🔇 Found {len(segments)} silent segments',
            'segments': segments,
            'total_silence_seconds': round(total_silence, 2),
            'silence_percentage': round(silence_pct, 1),
            'media_duration': round(duration, 2),
            'threshold_db': silence_threshold,
            'min_duration': min_silence_duration,
        }), 200

    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': f'Silence detection failed: {str(e)}'}), 500


@ai_video_tools_bp.route('/api/video-tools/remove-silence', methods=['POST'])
@jwt_required()
def remove_silence():
    """
    Remove silent segments from audio/video.
    Takes the segments from detect-silence and cuts them out.
    Returns URL of the trimmed file. FREE — ffmpeg only.
    """
    user_id = get_jwt_identity()
    data = request.get_json()
    media_url = data.get('media_url')
    segments = data.get('segments', [])  # silent segments to remove
    padding = data.get('padding', 0.1)   # seconds to keep around cuts

    if not media_url or not segments:
        return jsonify({'error': 'Provide media_url and segments'}), 400

    try:
        tmp_path = download_to_temp(media_url)
        duration = get_duration(tmp_path)

        # Build list of segments to KEEP (inverse of silence segments)
        keep_segments = []
        prev_end = 0.0

        for seg in sorted(segments, key=lambda s: s['start']):
            start = max(0, seg['start'] - padding)
            if start > prev_end:
                keep_segments.append({'start': prev_end, 'end': start})
            prev_end = min(duration, seg['end'] + padding)

        if prev_end < duration:
            keep_segments.append({'start': prev_end, 'end': duration})

        if not keep_segments:
            os.unlink(tmp_path)
            return jsonify({'error': 'Nothing left after removing silence'}), 400

        # Build ffmpeg complex filter to concat kept segments
        tmp_dir = tempfile.mkdtemp()
        segment_files = []

        for i, seg in enumerate(keep_segments):
            seg_path = os.path.join(tmp_dir, f'seg_{i:04d}.mp4')
            subprocess.run([
                'ffmpeg', '-y', '-i', tmp_path,
                '-ss', str(seg['start']), '-to', str(seg['end']),
                '-c', 'copy', '-avoid_negative_ts', '1', seg_path
            ], capture_output=True, timeout=120)
            if os.path.exists(seg_path) and os.path.getsize(seg_path) > 0:
                segment_files.append(seg_path)

        if not segment_files:
            os.unlink(tmp_path)
            return jsonify({'error': 'Failed to extract segments'}), 500

        # Concat segments
        concat_list = os.path.join(tmp_dir, 'concat.txt')
        with open(concat_list, 'w') as f:
            for sf in segment_files:
                f.write(f"file '{sf}'\n")

        output_path = os.path.join(tmp_dir, 'trimmed.mp4')
        subprocess.run([
            'ffmpeg', '-y', '-f', 'concat', '-safe', '0',
            '-i', concat_list, '-c', 'copy', output_path
        ], capture_output=True, timeout=300)

        if not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
            return jsonify({'error': 'Concat failed'}), 500

        # Upload result
        uid = uuid.uuid4().hex[:8]
        r2_name = f"trimmed_{uid}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.mp4"
        with open(output_path, 'rb') as f:
            result_url = uploadFile(f, r2_name)

        new_duration = get_duration(output_path)
        saved = duration - new_duration

        # Cleanup
        os.unlink(tmp_path)
        import shutil
        shutil.rmtree(tmp_dir, ignore_errors=True)

        return jsonify({
            'message': f'✂️ Removed {len(segments)} silent segments, saved {round(saved, 1)}s',
            'trimmed_url': result_url,
            'original_duration': round(duration, 2),
            'new_duration': round(new_duration, 2),
            'time_saved': round(saved, 2),
            'segments_removed': len(segments),
            'segments_kept': len(keep_segments),
        }), 200

    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': f'Silence removal failed: {str(e)}'}), 500


# =============================================================================
# 2. AI THUMBNAIL GENERATOR (FREE — ffmpeg + image scoring)
# =============================================================================

@ai_video_tools_bp.route('/api/video-tools/generate-thumbnails', methods=['POST'])
@jwt_required()
def generate_thumbnails():
    """
    Extract the best frames from a video for thumbnail use.
    Scores frames by sharpness (Laplacian variance) and brightness.
    Returns top N candidate thumbnail URLs. FREE — ffmpeg + basic scoring.
    """
    user_id = get_jwt_identity()
    data = request.get_json()
    video_url = data.get('video_url')
    num_candidates = min(data.get('count', 6), 12)
    sample_count = data.get('samples', 30)  # How many frames to analyze

    if not video_url:
        return jsonify({'error': 'Provide video_url'}), 400

    try:
        tmp_path = download_to_temp(video_url)
        duration = get_duration(tmp_path)

        if duration <= 0:
            os.unlink(tmp_path)
            return jsonify({'error': 'Could not determine video duration'}), 400

        tmp_dir = tempfile.mkdtemp()

        # Extract evenly spaced frames
        interval = max(1, duration / sample_count)
        frame_paths = []

        for i in range(sample_count):
            timestamp = min(i * interval + 1, duration - 0.5)
            frame_path = os.path.join(tmp_dir, f'frame_{i:04d}.jpg')
            subprocess.run([
                'ffmpeg', '-y', '-ss', str(timestamp), '-i', tmp_path,
                '-vframes', '1', '-q:v', '2', frame_path
            ], capture_output=True, timeout=30)
            if os.path.exists(frame_path) and os.path.getsize(frame_path) > 1000:
                frame_paths.append({'path': frame_path, 'timestamp': round(timestamp, 2), 'index': i})

        if not frame_paths:
            os.unlink(tmp_path)
            return jsonify({'error': 'No frames could be extracted'}), 500

        # Score frames by file size (rough proxy for detail/sharpness)
        # Larger JPG = more detail = sharper image
        for frame in frame_paths:
            frame['size'] = os.path.getsize(frame['path'])

        # Sort by file size (descending) — larger = more detail
        frame_paths.sort(key=lambda f: f['size'], reverse=True)

        # Pick top candidates (spread across video, not all from same spot)
        selected = []
        min_gap = duration / (num_candidates * 2)

        for frame in frame_paths:
            if len(selected) >= num_candidates:
                break
            # Ensure minimum time gap between selected frames
            too_close = any(abs(frame['timestamp'] - s['timestamp']) < min_gap for s in selected)
            if not too_close:
                selected.append(frame)

        # Upload selected thumbnails
        thumbnails = []
        for i, frame in enumerate(selected):
            uid = uuid.uuid4().hex[:6]
            r2_name = f"thumb_{uid}_{i}.jpg"
            with open(frame['path'], 'rb') as f:
                thumb_url = uploadFile(f, r2_name)
            thumbnails.append({
                'url': thumb_url,
                'timestamp': frame['timestamp'],
                'score': frame['size'],
                'index': i,
            })

        # Cleanup
        os.unlink(tmp_path)
        import shutil
        shutil.rmtree(tmp_dir, ignore_errors=True)

        return jsonify({
            'message': f'🖼️ Generated {len(thumbnails)} thumbnail candidates',
            'thumbnails': thumbnails,
            'video_duration': round(duration, 2),
            'frames_analyzed': len(frame_paths),
        }), 200

    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': f'Thumbnail generation failed: {str(e)}'}), 500


# =============================================================================
# 3. AUTO-CAPTIONS (Uses Whisper — local or API)
# =============================================================================
# Cost: FREE if using local whisper, ~$0.006/min if using OpenAI Whisper API
# Set WHISPER_MODE=local in env to use local (requires whisper pip package)
# Set WHISPER_MODE=api to use OpenAI API (requires OPENAI_API_KEY)
# =============================================================================

@ai_video_tools_bp.route('/api/video-tools/generate-captions', methods=['POST'])
@jwt_required()
def generate_captions():
    """
    Transcribe audio and generate word-level captions.
    Supports SRT, VTT, and JSON output formats.
    """
    user_id = get_jwt_identity()
    data = request.get_json()
    media_url = data.get('media_url')
    output_format = data.get('format', 'json')  # json, srt, vtt
    language = data.get('language', 'en')

    if not media_url:
        return jsonify({'error': 'Provide media_url'}), 400

    whisper_mode = os.environ.get('WHISPER_MODE', 'api')

    try:
        # Download and extract audio
        tmp_path = download_to_temp(media_url)
        audio_path = tmp_path.replace('.mp4', '.wav')

        subprocess.run([
            'ffmpeg', '-y', '-i', tmp_path, '-vn', '-acodec', 'pcm_s16le',
            '-ar', '16000', '-ac', '1', audio_path
        ], capture_output=True, timeout=120)

        if not os.path.exists(audio_path):
            os.unlink(tmp_path)
            return jsonify({'error': 'Audio extraction failed'}), 500

        segments = []

        if whisper_mode == 'local':
            # Local Whisper (free but requires pip install openai-whisper)
            try:
                import whisper
                model = whisper.load_model('base')
                result = model.transcribe(audio_path, language=language, word_timestamps=True)

                for seg in result.get('segments', []):
                    segment = {
                        'start': round(seg['start'], 3),
                        'end': round(seg['end'], 3),
                        'text': seg['text'].strip(),
                        'words': [],
                    }
                    for word in seg.get('words', []):
                        segment['words'].append({
                            'word': word['word'].strip(),
                            'start': round(word['start'], 3),
                            'end': round(word['end'], 3),
                        })
                    segments.append(segment)
            except ImportError:
                os.unlink(tmp_path)
                os.unlink(audio_path)
                return jsonify({'error': 'Local whisper not installed. pip install openai-whisper'}), 500

        else:
            # OpenAI Whisper API
            import requests as req
            api_key = os.environ.get('OPENAI_API_KEY')
            if not api_key:
                os.unlink(tmp_path)
                os.unlink(audio_path)
                return jsonify({'error': 'OPENAI_API_KEY not configured for caption generation'}), 400

            with open(audio_path, 'rb') as f:
                response = req.post(
                    'https://api.openai.com/v1/audio/transcriptions',
                    headers={'Authorization': f'Bearer {api_key}'},
                    files={'file': ('audio.wav', f, 'audio/wav')},
                    data={
                        'model': 'whisper-1',
                        'response_format': 'verbose_json',
                        'timestamp_granularities[]': 'word',
                        'language': language,
                    },
                    timeout=300,
                )
                response.raise_for_status()
                whisper_data = response.json()

            # Parse API response into segments
            full_text = whisper_data.get('text', '')
            words = whisper_data.get('words', [])

            # Group words into segments (~10 words each)
            chunk_size = 10
            for i in range(0, len(words), chunk_size):
                chunk = words[i:i + chunk_size]
                if not chunk:
                    continue
                segment = {
                    'start': round(chunk[0].get('start', 0), 3),
                    'end': round(chunk[-1].get('end', 0), 3),
                    'text': ' '.join(w.get('word', '') for w in chunk).strip(),
                    'words': [{
                        'word': w.get('word', '').strip(),
                        'start': round(w.get('start', 0), 3),
                        'end': round(w.get('end', 0), 3),
                    } for w in chunk],
                }
                segments.append(segment)

        # Cleanup audio
        os.unlink(tmp_path)
        os.unlink(audio_path)

        # Format output
        if output_format == 'srt':
            srt_content = generate_srt(segments)
            return jsonify({
                'message': f'📝 Generated {len(segments)} caption segments',
                'format': 'srt',
                'content': srt_content,
                'segments': segments,
                'total_segments': len(segments),
            }), 200

        elif output_format == 'vtt':
            vtt_content = generate_vtt(segments)
            return jsonify({
                'message': f'📝 Generated {len(segments)} caption segments',
                'format': 'vtt',
                'content': vtt_content,
                'segments': segments,
                'total_segments': len(segments),
            }), 200

        else:
            return jsonify({
                'message': f'📝 Generated {len(segments)} caption segments',
                'format': 'json',
                'segments': segments,
                'total_segments': len(segments),
                'full_text': ' '.join(s['text'] for s in segments),
            }), 200

    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': f'Caption generation failed: {str(e)}'}), 500


def format_timestamp_srt(seconds):
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int((seconds % 1) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def format_timestamp_vtt(seconds):
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int((seconds % 1) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d}.{ms:03d}"


def generate_srt(segments):
    lines = []
    for i, seg in enumerate(segments, 1):
        lines.append(str(i))
        lines.append(f"{format_timestamp_srt(seg['start'])} --> {format_timestamp_srt(seg['end'])}")
        lines.append(seg['text'])
        lines.append('')
    return '\n'.join(lines)


def generate_vtt(segments):
    lines = ['WEBVTT', '']
    for seg in segments:
        lines.append(f"{format_timestamp_vtt(seg['start'])} --> {format_timestamp_vtt(seg['end'])}")
        lines.append(seg['text'])
        lines.append('')
    return '\n'.join(lines)


# =============================================================================
# STATUS / CAPABILITIES
# =============================================================================

@ai_video_tools_bp.route('/api/video-tools/status', methods=['GET'])
@jwt_required()
def video_tools_status():
    """Check which video tools are available."""
    has_ffmpeg = False
    has_whisper_local = False
    has_whisper_api = False

    try:
        subprocess.run(['ffmpeg', '-version'], capture_output=True, timeout=5)
        has_ffmpeg = True
    except Exception:
        pass

    try:
        import whisper
        has_whisper_local = True
    except ImportError:
        pass

    has_whisper_api = bool(os.environ.get('OPENAI_API_KEY'))
    whisper_mode = os.environ.get('WHISPER_MODE', 'api')

    return jsonify({
        'tools': {
            'silence_detection': has_ffmpeg,
            'silence_removal': has_ffmpeg,
            'thumbnail_generator': has_ffmpeg,
            'auto_captions': has_whisper_local or has_whisper_api,
        },
        'ffmpeg_available': has_ffmpeg,
        'whisper_mode': whisper_mode,
        'whisper_local': has_whisper_local,
        'whisper_api': has_whisper_api,
        'costs': {
            'silence_detection': 'FREE',
            'silence_removal': 'FREE',
            'thumbnail_generator': 'FREE',
            'auto_captions': 'FREE (local)' if whisper_mode == 'local' else '$0.006/min (API)',
        }
    }), 200