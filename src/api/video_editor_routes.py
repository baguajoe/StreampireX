import os
import uuid
import subprocess
import tempfile
import json
import boto3
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from datetime import datetime

video_editor_bp = Blueprint('video_editor', __name__)

R2_ENDPOINT   = os.environ.get('R2_ENDPOINT_URL', '')
R2_ACCESS_KEY = os.environ.get('R2_ACCESS_KEY', '')
R2_SECRET_KEY = os.environ.get('R2_SECRET_KEY', '')
R2_BUCKET     = os.environ.get('R2_BUCKET_NAME', 'streampirex-media')
R2_PUBLIC_URL = os.environ.get('R2_PUBLIC_URL', 'https://pub-3a956be9429449469ec53b73495e.r2.dev')

ALLOWED_VIDEO = {'mp4', 'mov', 'avi', 'webm', 'mkv', 'wmv', 'flv', 'm4v'}
ALLOWED_AUDIO = {'mp3', 'wav', 'aac', 'ogg', 'm4a', 'flac'}
ALLOWED_IMAGE = {'jpg', 'jpeg', 'png', 'gif', 'webp'}


def get_r2_client():
    return boto3.client(
        's3',
        endpoint_url=R2_ENDPOINT,
        aws_access_key_id=R2_ACCESS_KEY,
        aws_secret_access_key=R2_SECRET_KEY,
        region_name='auto',
    )


def upload_to_r2(local_path, r2_key, content_type='video/mp4'):
    try:
        client = get_r2_client()
        with open(local_path, 'rb') as f:
            client.put_object(Bucket=R2_BUCKET, Key=r2_key, Body=f, ContentType=content_type)
        return f"{R2_PUBLIC_URL}/{r2_key}"
    except Exception as e:
        current_app.logger.error(f"R2 upload error: {e}")
        return None


def download_from_r2(r2_key, local_path):
    try:
        client = get_r2_client()
        client.download_file(R2_BUCKET, r2_key, local_path)
        return True
    except Exception as e:
        current_app.logger.error(f"R2 download error: {e}")
        return False


def run_ffmpeg(args, timeout=300):
    cmd = ['ffmpeg', '-y'] + args
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        return result.returncode == 0, result.stderr
    except subprocess.TimeoutExpired:
        return False, 'FFmpeg timed out'
    except FileNotFoundError:
        return False, 'FFmpeg not installed on server'


@video_editor_bp.route('/api/video-editor/upload', methods=['POST'])
@jwt_required()
def upload_asset():
    user_id = get_jwt_identity()
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    file = request.files['file']
    if not file.filename:
        return jsonify({'error': 'Empty filename'}), 400
    filename = secure_filename(file.filename)
    ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
    if ext in ALLOWED_VIDEO:
        media_type = 'video'
        content_type = f'video/{ext if ext != "mov" else "quicktime"}'
    elif ext in ALLOWED_AUDIO:
        media_type = 'audio'
        content_type = f'audio/{ext}'
    elif ext in ALLOWED_IMAGE:
        media_type = 'image'
        content_type = f'image/{ext if ext != "jpg" else "jpeg"}'
    else:
        return jsonify({'error': f'Unsupported file type: {ext}'}), 400
    uid = uuid.uuid4().hex[:12]
    r2_key = f'editor/{user_id}/{uid}_{filename}'
    with tempfile.NamedTemporaryFile(suffix=f'.{ext}', delete=False) as tmp:
        file.save(tmp.name)
        tmp_path = tmp.name
    try:
        duration = None
        if media_type in ('video', 'audio'):
            probe = subprocess.run(
                ['ffprobe', '-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', tmp_path],
                capture_output=True, text=True
            )
            if probe.returncode == 0:
                info = json.loads(probe.stdout)
                duration = float(info.get('format', {}).get('duration', 0))
        url = upload_to_r2(tmp_path, r2_key, content_type)
        if not url:
            return jsonify({'error': 'Upload to storage failed'}), 500
        return jsonify({
            'success': True,
            'asset': {
                'id': uid, 'r2_key': r2_key, 'url': url,
                'filename': filename, 'type': media_type,
                'duration': duration, 'uploaded_at': datetime.utcnow().isoformat(),
            }
        }), 200
    finally:
        try:
            os.unlink(tmp_path)
        except Exception:
            pass


@video_editor_bp.route('/api/video-editor/trim', methods=['POST'])
@jwt_required()
def trim_video():
    user_id = get_jwt_identity()
    data = request.get_json()
    r2_key     = data.get('r2_key') or data.get('public_id', '')
    start      = float(data.get('start_time', 0))
    end        = float(data.get('end_time', 0))
    source_url = data.get('source_url', '')
    if not (r2_key or source_url):
        return jsonify({'error': 'r2_key or source_url required'}), 400
    if end <= start:
        return jsonify({'error': 'end_time must be greater than start_time'}), 400
    duration = end - start
    uid = uuid.uuid4().hex[:12]
    with tempfile.TemporaryDirectory() as tmpdir:
        input_path  = os.path.join(tmpdir, f'input_{uid}.mp4')
        output_path = os.path.join(tmpdir, f'trimmed_{uid}.mp4')
        if source_url:
            import requests as req
            r = req.get(source_url, timeout=120)
            with open(input_path, 'wb') as f:
                f.write(r.content)
        else:
            if not download_from_r2(r2_key, input_path):
                return jsonify({'error': 'Could not fetch source file'}), 500
        success, stderr = run_ffmpeg(['-ss', str(start), '-i', input_path, '-t', str(duration), '-c', 'copy', output_path])
        if not success:
            return jsonify({'error': f'Trim failed: {stderr[-300:]}'}), 500
        out_key = f'editor/{user_id}/trimmed_{uid}.mp4'
        url = upload_to_r2(output_path, out_key, 'video/mp4')
        if not url:
            return jsonify({'error': 'Upload failed after trim'}), 500
        return jsonify({'success': True, 'trimmed_url': url, 'r2_key': out_key}), 200


@video_editor_bp.route('/api/video-editor/transform', methods=['POST'])
@jwt_required()
def transform_video():
    user_id = get_jwt_identity()
    data = request.get_json()
    source_url = data.get('source_url', '')
    r2_key     = data.get('r2_key', '')
    width      = data.get('width')
    height     = data.get('height')
    rotate     = int(data.get('rotate', 0))
    flip_h     = data.get('flip_h', False)
    flip_v     = data.get('flip_v', False)
    if not (source_url or r2_key):
        return jsonify({'error': 'source_url or r2_key required'}), 400
    uid = uuid.uuid4().hex[:12]
    with tempfile.TemporaryDirectory() as tmpdir:
        input_path  = os.path.join(tmpdir, f'input_{uid}.mp4')
        output_path = os.path.join(tmpdir, f'transformed_{uid}.mp4')
        if source_url:
            import requests as req
            r = req.get(source_url, timeout=120)
            with open(input_path, 'wb') as f:
                f.write(r.content)
        else:
            if not download_from_r2(r2_key, input_path):
                return jsonify({'error': 'Could not fetch source file'}), 500
        filters = []
        if width and height:
            filters.append(f'scale={width}:{height}')
        if rotate == 90:
            filters.append('transpose=1')
        elif rotate == 180:
            filters.append('transpose=1,transpose=1')
        elif rotate == 270:
            filters.append('transpose=2')
        if flip_h:
            filters.append('hflip')
        if flip_v:
            filters.append('vflip')
        ffmpeg_args = ['-i', input_path]
        if filters:
            ffmpeg_args += ['-vf', ','.join(filters)]
        ffmpeg_args += ['-c:a', 'copy', output_path]
        success, stderr = run_ffmpeg(ffmpeg_args)
        if not success:
            return jsonify({'error': f'Transform failed: {stderr[-300:]}'}), 500
        out_key = f'editor/{user_id}/transformed_{uid}.mp4'
        url = upload_to_r2(output_path, out_key, 'video/mp4')
        if not url:
            return jsonify({'error': 'Upload failed after transform'}), 500
        return jsonify({'success': True, 'transformed_url': url, 'r2_key': out_key}), 200


@video_editor_bp.route('/api/video-editor/export', methods=['POST'])
@jwt_required()
def export_project():
    user_id = get_jwt_identity()
    data = request.get_json()
    timeline = data.get('timeline', {})
    settings = data.get('settings', {})
    resolution = settings.get('resolution', '1080p')
    fmt        = settings.get('format', 'mp4')
    fps        = int(settings.get('frameRate', 30))
    quality    = settings.get('quality', 'auto')
    res_map = {'480p': (854,480), '720p': (1280,720), '1080p': (1920,1080), '4k': (3840,2160)}
    w, h = res_map.get(resolution, (1920, 1080))
    crf_map = {'low': 28, 'auto': 23, 'high': 18}
    crf = crf_map.get(quality, 23)
    tracks = timeline.get('tracks', [])
    if not tracks:
        return jsonify({'error': 'No tracks in timeline'}), 400
    uid = uuid.uuid4().hex[:12]
    with tempfile.TemporaryDirectory() as tmpdir:
        clip_paths = {}
        for track in tracks:
            for clip in track.get('clips', []):
                clip_id = clip.get('public_id') or clip.get('id', '')
                src_url = clip.get('source_url', '')
                if not clip_id or clip_id in clip_paths:
                    continue
                local = os.path.join(tmpdir, f'clip_{uuid.uuid4().hex[:8]}.mp4')
                if src_url:
                    try:
                        import requests as req
                        r = req.get(src_url, timeout=120)
                        with open(local, 'wb') as f:
                            f.write(r.content)
                        clip_paths[clip_id] = local
                    except Exception as e:
                        current_app.logger.warning(f'Could not download clip {clip_id}: {e}')
                elif clip_id.startswith('editor/'):
                    if download_from_r2(clip_id, local):
                        clip_paths[clip_id] = local
        if not clip_paths:
            return jsonify({'error': 'No downloadable clips found in timeline'}), 400
        concat_list_path = os.path.join(tmpdir, 'concat.txt')
        video_clips = []
        for track in tracks:
            if track.get('type') != 'video':
                continue
            for clip in track.get('clips', []):
                clip_id = clip.get('public_id') or clip.get('id', '')
                if clip_id not in clip_paths:
                    continue
                src = clip_paths[clip_id]
                trim = clip.get('trim')
                if trim:
                    start = trim.get('start', 0)
                    end   = trim.get('end', 0)
                    if end > start:
                        trimmed = os.path.join(tmpdir, f'tc_{uuid.uuid4().hex[:8]}.mp4')
                        ok, _ = run_ffmpeg(['-ss', str(start), '-i', src, '-t', str(end-start), '-c', 'copy', trimmed])
                        if ok:
                            src = trimmed
                vol   = clip.get('audio', {}).get('volume', 100)
                muted = clip.get('audio', {}).get('muted', False)
                if muted or vol == 0:
                    no_audio = os.path.join(tmpdir, f'na_{uuid.uuid4().hex[:8]}.mp4')
                    ok, _ = run_ffmpeg(['-i', src, '-an', '-c:v', 'copy', no_audio])
                    if ok:
                        src = no_audio
                elif vol != 100:
                    vol_adj = os.path.join(tmpdir, f'va_{uuid.uuid4().hex[:8]}.mp4')
                    ok, _ = run_ffmpeg(['-i', src, '-af', f'volume={vol/100:.2f}', '-c:v', 'copy', vol_adj])
                    if ok:
                        src = vol_adj
                video_clips.append(src)
        if not video_clips:
            return jsonify({'error': 'No usable video clips to render'}), 400
        with open(concat_list_path, 'w') as f:
            for p in video_clips:
                f.write(f"file '{p}'\n")
        output_path = os.path.join(tmpdir, f'export_{uid}.{fmt}')
        success, stderr = run_ffmpeg([
            '-f', 'concat', '-safe', '0', '-i', concat_list_path,
            '-vf', f'scale={w}:{h}:force_original_aspect_ratio=decrease,pad={w}:{h}:(ow-iw)/2:(oh-ih)/2',
            '-r', str(fps), '-c:v', 'libx264', '-crf', str(crf), '-preset', 'fast',
            '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', output_path
        ], timeout=600)
        if not success:
            return jsonify({'error': f'Export render failed: {stderr[-500:]}'}), 500
        out_key = f'exports/{user_id}/export_{uid}.{fmt}'
        url = upload_to_r2(output_path, out_key, f'video/{fmt}')
        if not url:
            return jsonify({'error': 'Export upload to storage failed'}), 500
        return jsonify({
            'success': True, 'export_url': url, 'r2_key': out_key,
            'format': fmt, 'resolution': resolution,
            'file_size': os.path.getsize(output_path),
            'message': '🎬 Export complete!',
        }), 200


@video_editor_bp.route('/api/video-editor/thumbnail', methods=['POST'])
@jwt_required()
def generate_thumbnail():
    user_id = get_jwt_identity()
    data = request.get_json()
    source_url = data.get('source_url', '')
    r2_key     = data.get('r2_key', data.get('public_id', ''))
    timestamp  = float(data.get('timestamp', 0))
    if not (source_url or r2_key):
        return jsonify({'error': 'source_url or r2_key required'}), 400
    uid = uuid.uuid4().hex[:12]
    with tempfile.TemporaryDirectory() as tmpdir:
        input_path = os.path.join(tmpdir, f'input_{uid}.mp4')
        thumb_path = os.path.join(tmpdir, f'thumb_{uid}.jpg')
        if source_url:
            import requests as req
            r = req.get(source_url, timeout=120)
            with open(input_path, 'wb') as f:
                f.write(r.content)
        else:
            if not download_from_r2(r2_key, input_path):
                return jsonify({'error': 'Could not fetch source file'}), 500
        success, stderr = run_ffmpeg(['-ss', str(timestamp), '-i', input_path, '-frames:v', '1', '-q:v', '2', thumb_path])
        if not success:
            return jsonify({'error': f'Thumbnail extraction failed: {stderr[-300:]}'}), 500
        out_key = f'editor/{user_id}/thumb_{uid}.jpg'
        url = upload_to_r2(thumb_path, out_key, 'image/jpeg')
        if not url:
            return jsonify({'error': 'Thumbnail upload failed'}), 500
        return jsonify({'success': True, 'thumbnail_url': url, 'r2_key': out_key}), 200


@video_editor_bp.route('/api/video-editor/add-text', methods=['POST'])
@jwt_required()
def add_text_overlay():
    user_id = get_jwt_identity()
    data = request.get_json()
    source_url = data.get('source_url', '')
    r2_key     = data.get('r2_key', data.get('public_id', ''))
    text       = data.get('text', '')
    font_size  = int(data.get('font_size', 40))
    color      = data.get('color', 'white')
    position   = data.get('position', 'bottom-left')
    if not text:
        return jsonify({'error': 'Text is required'}), 400
    if not (source_url or r2_key):
        return jsonify({'error': 'source_url or r2_key required'}), 400
    pos_map = {
        'top-left':     ('10', '10'),
        'top-right':    ('main_w-text_w-10', '10'),
        'bottom-left':  ('10', 'main_h-text_h-10'),
        'bottom-right': ('main_w-text_w-10', 'main_h-text_h-10'),
        'center':       ('(main_w-text_w)/2', '(main_h-text_h)/2'),
    }
    x, y = pos_map.get(position, ('10', 'main_h-text_h-10'))
    safe_text = text.replace("'", "\\'").replace(':', '\\:')
    uid = uuid.uuid4().hex[:12]
    with tempfile.TemporaryDirectory() as tmpdir:
        input_path  = os.path.join(tmpdir, f'input_{uid}.mp4')
        output_path = os.path.join(tmpdir, f'text_{uid}.mp4')
        if source_url:
            import requests as req
            r = req.get(source_url, timeout=120)
            with open(input_path, 'wb') as f:
                f.write(r.content)
        else:
            if not download_from_r2(r2_key, input_path):
                return jsonify({'error': 'Could not fetch source file'}), 500
        drawtext = (
            f"drawtext=text='{safe_text}':fontsize={font_size}"
            f":fontcolor={color}:x={x}:y={y}"
            f":box=1:boxcolor=black@0.4:boxborderw=5"
        )
        success, stderr = run_ffmpeg(['-i', input_path, '-vf', drawtext, '-c:a', 'copy', output_path])
        if not success:
            return jsonify({'error': f'Text overlay failed: {stderr[-300:]}'}), 500
        out_key = f'editor/{user_id}/text_{uid}.mp4'
        url = upload_to_r2(output_path, out_key, 'video/mp4')
        if not url:
            return jsonify({'error': 'Upload failed after text overlay'}), 500
        return jsonify({'success': True, 'text_overlay_url': url, 'r2_key': out_key}), 200


@video_editor_bp.route('/api/video-editor/assets', methods=['GET'])
@jwt_required()
def get_assets():
    user_id = get_jwt_identity()
    try:
        client = get_r2_client()
        prefix = f'editor/{user_id}/'
        resp = client.list_objects_v2(Bucket=R2_BUCKET, Prefix=prefix)
        assets = []
        for obj in resp.get('Contents', []):
            key = obj['Key']
            ext = key.rsplit('.', 1)[-1].lower() if '.' in key else ''
            media_type = (
                'video' if ext in ALLOWED_VIDEO else
                'audio' if ext in ALLOWED_AUDIO else
                'image' if ext in ALLOWED_IMAGE else 'other'
            )
            assets.append({
                'r2_key': key,
                'url': f"{R2_PUBLIC_URL}/{key}",
                'filename': key.split('/')[-1],
                'type': media_type,
                'size': obj['Size'],
                'last_modified': obj['LastModified'].isoformat(),
            })
        return jsonify({'success': True, 'assets': assets}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@video_editor_bp.route('/api/video-editor/effects', methods=['GET'])
def get_effects():
    return jsonify({
        'success': True,
        'effects': {
            'color': [
                {'id': 'brightness', 'name': 'Brightness', 'param': 'value', 'min': -1, 'max': 1},
                {'id': 'contrast',   'name': 'Contrast',   'param': 'value', 'min': -1, 'max': 1},
                {'id': 'saturation', 'name': 'Saturation', 'param': 'value', 'min': 0,  'max': 3},
                {'id': 'grayscale',  'name': 'Grayscale',  'param': None},
                {'id': 'sepia',      'name': 'Sepia',      'param': None},
            ],
            'blur':  [{'id': 'blur',  'name': 'Blur',  'param': 'radius', 'min': 1, 'max': 20}],
            'speed': [{'id': 'speed', 'name': 'Speed', 'param': 'factor', 'min': 0.25, 'max': 4}],
        }
    }), 200


@video_editor_bp.route('/api/video-editor/resolutions', methods=['GET'])
def get_resolutions():
    return jsonify({
        'success': True,
        'resolutions': [
            {'id': '480p',  'label': '480p SD',   'width': 854,  'height': 480},
            {'id': '720p',  'label': '720p HD',   'width': 1280, 'height': 720},
            {'id': '1080p', 'label': '1080p FHD', 'width': 1920, 'height': 1080},
            {'id': '4k',    'label': '4K UHD',    'width': 3840, 'height': 2160},
        ]
    }), 200


@video_editor_bp.route('/api/video-editor/save-project', methods=['POST'])
@jwt_required()
def save_project():
    user_id = get_jwt_identity()
    data = request.get_json()
    project_id   = data.get('project_id') or uuid.uuid4().hex[:16]
    project_data = json.dumps(data)
    r2_key = f'projects/{user_id}/{project_id}.json'
    try:
        client = get_r2_client()
        client.put_object(Bucket=R2_BUCKET, Key=r2_key, Body=project_data.encode('utf-8'), ContentType='application/json')
        return jsonify({'success': True, 'project_id': project_id, 'message': 'Project saved'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
