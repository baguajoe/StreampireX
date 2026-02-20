# src/api/ai_stem_separation.py
# =====================================================
# AI STEM SEPARATION — StreamPireX
# =====================================================
# Powered by Meta's Demucs (pre-trained, no custom training needed)
#
# Separates any audio track into 4 or 6 stems:
#   4-stem: Vocals, Drums, Bass, Other
#   6-stem: Vocals, Drums, Bass, Guitar, Piano, Other
#
# Pipeline:
#   1. User uploads or selects existing track
#   2. Demucs separates into stems
#   3. Each stem uploaded to cloud storage
#   4. StemSeparationJob record saved to database
#   5. User can download/preview individual stems
#
# Install: pip install demucs torch torchaudio
# Register: app.register_blueprint(ai_stem_separation_bp)
# =====================================================

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
import os
import json
import tempfile
import traceback
import shutil
import subprocess
import uuid

# Internal imports
from src.api.models import db, Audio, User, StemSeparationJob
from src.api.cloudinary_setup import uploadFile

ai_stem_separation_bp = Blueprint('ai_stem_separation', __name__)


# =====================================================
# CONFIGURATION
# =====================================================

DEMUCS_MODELS = {
    "htdemucs": {
        "name": "HT Demucs",
        "description": "Best quality. Hybrid Transformer model — Meta's latest and most accurate.",
        "stems": ["vocals", "drums", "bass", "other"],
        "quality": "high",
        "speed": "slower",
        "icon": "🧠",
    },
    "htdemucs_ft": {
        "name": "HT Demucs (Fine-Tuned)",
        "description": "Fine-tuned version with even better vocal separation. Best for music with complex vocals.",
        "stems": ["vocals", "drums", "bass", "other"],
        "quality": "highest",
        "speed": "slowest",
        "icon": "⭐",
    },
    "htdemucs_6s": {
        "name": "HT Demucs 6-Stem",
        "description": "Separates into 6 stems including Guitar and Piano. Best when you need individual instrument isolation.",
        "stems": ["vocals", "drums", "bass", "guitar", "piano", "other"],
        "quality": "high",
        "speed": "slower",
        "icon": "🎼",
    },
    "mdx_extra": {
        "name": "MDX Extra",
        "description": "Great balance of speed and quality. Good all-around choice.",
        "stems": ["vocals", "drums", "bass", "other"],
        "quality": "high",
        "speed": "medium",
        "icon": "⚡",
    },
    "mdx": {
        "name": "MDX",
        "description": "Fastest option. Good quality for quick separations.",
        "stems": ["vocals", "drums", "bass", "other"],
        "quality": "good",
        "speed": "fast",
        "icon": "🚀",
    },
}

DEFAULT_MODEL = "htdemucs"

STEM_INFO = {
    "vocals": {"name": "Vocals", "icon": "🎤", "color": "#FF6B6B"},
    "drums": {"name": "Drums", "icon": "🥁", "color": "#4ECDC4"},
    "bass": {"name": "Bass", "icon": "🎸", "color": "#45B7D1"},
    "guitar": {"name": "Guitar", "icon": "🪕", "color": "#F59E0B"},
    "piano": {"name": "Piano", "icon": "🎹", "color": "#A855F7"},
    "other": {"name": "Other / Instruments", "icon": "🎹", "color": "#96CEB4"},
}

MAX_FILE_SIZE = 100 * 1024 * 1024
ALLOWED_EXTENSIONS = {'.mp3', '.wav', '.flac', '.ogg', '.m4a', '.aac', '.wma'}


# =====================================================
# HELPERS
# =====================================================

def check_demucs_available():
    try:
        result = subprocess.run(
            ["python", "-c", "import demucs; print(demucs.__version__)"],
            capture_output=True, text=True, timeout=10
        )
        if result.returncode == 0:
            return True, result.stdout.strip()
    except Exception:
        pass
    try:
        result = subprocess.run(
            ["python", "-c", "from demucs.pretrained import get_model; print('ok')"],
            capture_output=True, text=True, timeout=10
        )
        if result.returncode == 0:
            return True, "available"
    except Exception:
        pass
    return False, None


def check_torch_available():
    try:
        result = subprocess.run(
            ["python", "-c", "import torch; print(f'{torch.__version__}|{torch.cuda.is_available()}')"],
            capture_output=True, text=True, timeout=10
        )
        if result.returncode == 0:
            parts = result.stdout.strip().split("|")
            return True, parts[0], parts[1] == "True"
    except Exception:
        pass
    return False, None, False


def get_audio_duration(file_path):
    try:
        result = subprocess.run(
            ["ffprobe", "-v", "quiet", "-show_entries", "format=duration",
             "-of", "default=noprint_wrappers=1:nokey=1", file_path],
            capture_output=True, text=True, timeout=30
        )
        if result.returncode == 0 and result.stdout.strip():
            return float(result.stdout.strip())
    except Exception:
        pass
    return None


# =====================================================
# CORE: Run Demucs Separation
# =====================================================

def run_demucs_separation(input_path, output_dir, model_name=DEFAULT_MODEL, device="cpu"):
    print(f"🎵 Starting stem separation with model: {model_name}")
    print(f"   Input: {input_path}")
    print(f"   Device: {device}")

    cmd = [
        "python", "-m", "demucs",
        "--name", model_name,
        "--out", output_dir,
        "--device", device,
        "--mp3",
        "--mp3-bitrate", "320",
        input_path
    ]

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
        if result.returncode != 0:
            print(f"❌ Demucs error: {result.stderr}")
            raise RuntimeError(f"Demucs failed: {result.stderr[:500]}")
        print(f"✅ Demucs completed successfully")
    except subprocess.TimeoutExpired:
        raise RuntimeError("Stem separation timed out. Try a shorter track or faster model.")

    # Find output stems
    input_filename = os.path.splitext(os.path.basename(input_path))[0]
    possible_dirs = [
        os.path.join(output_dir, model_name, input_filename),
        os.path.join(output_dir, "htdemucs", input_filename),
        os.path.join(output_dir, model_name),
    ]

    stems_dir = None
    for d in possible_dirs:
        if os.path.exists(d):
            stems_dir = d
            break

    if not stems_dir:
        for root, dirs, files in os.walk(output_dir):
            if any(f.startswith("vocals") for f in files):
                stems_dir = root
                break

    if not stems_dir:
        raise RuntimeError(f"Could not find Demucs output stems in {output_dir}")

    # Collect stem files
    model_stems = DEMUCS_MODELS.get(model_name, {}).get("stems", ["vocals", "drums", "bass", "other"])
    stems = {}
    for stem_name in model_stems:
        for ext in [".mp3", ".wav"]:
            stem_path = os.path.join(stems_dir, f"{stem_name}{ext}")
            if os.path.exists(stem_path):
                file_size = os.path.getsize(stem_path)
                stems[stem_name] = {
                    "path": stem_path,
                    "filename": f"{stem_name}{ext}",
                    "size_bytes": file_size,
                    "size_mb": round(file_size / (1024 * 1024), 2),
                }
                print(f"   ✅ Found {stem_name}: {file_size / 1024:.0f} KB")
                break

    return stems


def upload_stems_to_cloud(stems, title, job_id):
    stem_urls = {}
    stem_id = uuid.uuid4().hex[:8]
    timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')

    for stem_name, stem_data in stems.items():
        stem_filename = f"stem_{stem_name}_{job_id}_{stem_id}_{timestamp}.mp3"
        print(f"☁️ Uploading {stem_name} stem...")

        with open(stem_data["path"], 'rb') as f:
            stem_url = uploadFile(f, stem_filename)

        stem_urls[stem_name] = {
            "url": stem_url,
            "name": STEM_INFO.get(stem_name, {}).get("name", stem_name),
            "icon": STEM_INFO.get(stem_name, {}).get("icon", "🎵"),
            "color": STEM_INFO.get(stem_name, {}).get("color", "#888888"),
            "size_mb": stem_data["size_mb"],
        }
        print(f"   ✅ {stem_name}: {stem_url}")

    return stem_urls


def save_stem_job(user_id, audio_id, title, original_url, duration, model_name, device, stem_urls):
    job = StemSeparationJob(
        user_id=user_id,
        audio_id=audio_id,
        title=title,
        original_url=original_url,
        duration_seconds=round(duration, 2) if duration else None,
        model_used=model_name,
        device_used=device,
        stem_count=len(stem_urls),
        vocals_url=stem_urls.get("vocals", {}).get("url"),
        drums_url=stem_urls.get("drums", {}).get("url"),
        bass_url=stem_urls.get("bass", {}).get("url"),
        guitar_url=stem_urls.get("guitar", {}).get("url"),
        piano_url=stem_urls.get("piano", {}).get("url"),
        other_url=stem_urls.get("other", {}).get("url"),
        status='completed',
        created_at=datetime.utcnow(),
    )
    db.session.add(job)
    db.session.commit()
    return job


# =====================================================
# API ROUTES
# =====================================================

@ai_stem_separation_bp.route('/api/ai/stems/capabilities', methods=['GET'])
def get_stem_capabilities():
    demucs_available, demucs_version = check_demucs_available()
    torch_available, torch_version, gpu_available = check_torch_available()

    has_ffprobe = False
    try:
        result = subprocess.run(["ffprobe", "-version"], capture_output=True, timeout=5)
        has_ffprobe = result.returncode == 0
    except Exception:
        pass

    return jsonify({
        "demucs_available": demucs_available,
        "demucs_version": demucs_version,
        "torch_available": torch_available,
        "torch_version": torch_version,
        "gpu_available": gpu_available,
        "device": "cuda" if gpu_available else "cpu",
        "ffprobe_available": has_ffprobe,
        "models": {k: {
            "name": v["name"],
            "description": v["description"],
            "quality": v["quality"],
            "speed": v["speed"],
            "icon": v["icon"],
            "stems": v["stems"],
        } for k, v in DEMUCS_MODELS.items()},
        "default_model": DEFAULT_MODEL,
        "max_file_size_mb": MAX_FILE_SIZE / (1024 * 1024),
        "allowed_formats": list(ALLOWED_EXTENSIONS),
        "status": "ready" if demucs_available else "not_installed",
    }), 200


@ai_stem_separation_bp.route('/api/ai/stems/separate', methods=['POST'])
@jwt_required()
def separate_stems():
    """Separate an existing track or uploaded file into stems."""
    user_id = get_jwt_identity()

    try:
        demucs_available, _ = check_demucs_available()
        if not demucs_available:
            return jsonify({
                "error": "Stem separation is not available yet. Demucs needs to be installed.",
                "install_hint": "pip install demucs torch torchaudio"
            }), 503

        model_name = request.form.get('model', DEFAULT_MODEL)
        if model_name not in DEMUCS_MODELS:
            model_name = DEFAULT_MODEL

        _, _, gpu_available = check_torch_available()
        device = "cuda" if gpu_available else "cpu"

        temp_dir = tempfile.mkdtemp()
        input_path = None
        audio_id = None
        original_url = None
        title = request.form.get('title', 'Untitled')

        # Option 1: Existing track
        if request.form.get('audio_id'):
            audio_id = int(request.form.get('audio_id'))
            audio = Audio.query.get(audio_id)

            if not audio:
                return jsonify({"error": "Track not found"}), 404
            if str(audio.user_id) != str(user_id):
                return jsonify({"error": "Unauthorized"}), 403

            title = audio.title or title
            original_url = audio.file_url

            import requests as req
            url = audio.file_url
            url_path = url.split('?')[0]
            input_ext = os.path.splitext(url_path)[1] or '.mp3'
            input_path = os.path.join(temp_dir, f"input{input_ext}")

            response = req.get(url, stream=True, timeout=120)
            response.raise_for_status()
            with open(input_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)

        # Option 2: Upload
        elif request.files.get('file'):
            file = request.files['file']
            from werkzeug.utils import secure_filename
            filename = secure_filename(file.filename)

            ext = os.path.splitext(filename)[1].lower()
            if ext not in ALLOWED_EXTENSIONS:
                return jsonify({"error": f"Unsupported format: {ext}"}), 400

            file.seek(0, 2)
            file_size = file.tell()
            file.seek(0)
            if file_size > MAX_FILE_SIZE:
                return jsonify({"error": f"File too large. Maximum is {MAX_FILE_SIZE // (1024*1024)}MB."}), 400

            input_path = os.path.join(temp_dir, filename)
            file.save(input_path)
            title = request.form.get('title', filename.rsplit('.', 1)[0])
        else:
            return jsonify({"error": "Provide either audio_id or upload a file"}), 400

        duration = get_audio_duration(input_path)
        if duration and duration > 900:
            return jsonify({"error": "Track too long. Maximum duration is 15 minutes."}), 400

        # Run Demucs
        output_dir = os.path.join(temp_dir, "output")
        os.makedirs(output_dir, exist_ok=True)
        stems = run_demucs_separation(input_path, output_dir, model_name, device)

        if not stems:
            return jsonify({"error": "Stem separation produced no output."}), 500

        # Upload & save
        stem_urls = upload_stems_to_cloud(stems, title, "direct")
        job = save_stem_job(user_id, audio_id, title, original_url, duration, model_name, device, stem_urls)

        try:
            shutil.rmtree(temp_dir, ignore_errors=True)
        except Exception:
            pass

        return jsonify({
            "message": "🎵 Stems separated successfully!",
            "job_id": job.id,
            "title": title,
            "model": {"id": model_name, "name": DEMUCS_MODELS[model_name]["name"], "quality": DEMUCS_MODELS[model_name]["quality"]},
            "device": device,
            "duration_seconds": round(duration, 2) if duration else None,
            "stems": stem_urls,
            "stem_count": len(stem_urls),
            "audio_id": audio_id,
        }), 200

    except RuntimeError as e:
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        print(f"❌ Stem separation error: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": f"Stem separation failed: {str(e)}"}), 500


@ai_stem_separation_bp.route('/api/ai/stems/separate-upload', methods=['POST'])
@jwt_required()
def upload_and_separate():
    """Upload a new track AND separate stems in one request."""
    user_id = get_jwt_identity()

    try:
        file = request.files.get('file')
        if not file:
            return jsonify({"error": "No audio file provided"}), 400

        title = request.form.get('title', file.filename.rsplit('.', 1)[0])
        model_name = request.form.get('model', DEFAULT_MODEL)
        if model_name not in DEMUCS_MODELS:
            model_name = DEFAULT_MODEL

        from werkzeug.utils import secure_filename
        filename = secure_filename(file.filename)

        ext = os.path.splitext(filename)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            return jsonify({"error": f"Unsupported format: {ext}"}), 400

        file.seek(0, 2)
        file_size = file.tell()
        file.seek(0)
        if file_size > MAX_FILE_SIZE:
            return jsonify({"error": f"File too large. Maximum is {MAX_FILE_SIZE // (1024*1024)}MB."}), 400

        # Upload original
        original_url = uploadFile(file, filename)

        # Save to Audio table
        new_audio = Audio(
            user_id=user_id,
            title=title,
            file_url=original_url,
            processing_status='separating',
            uploaded_at=datetime.utcnow()
        )
        db.session.add(new_audio)
        db.session.commit()

        # Save locally for processing
        file.seek(0)
        temp_dir = tempfile.mkdtemp()
        input_path = os.path.join(temp_dir, filename)
        file.save(input_path)

        duration = get_audio_duration(input_path)
        if duration and duration > 900:
            new_audio.processing_status = 'error'
            db.session.commit()
            return jsonify({"error": "Track too long. Maximum 15 minutes."}), 400

        demucs_available, _ = check_demucs_available()
        if not demucs_available:
            new_audio.processing_status = 'uploaded'
            db.session.commit()
            return jsonify({
                "error": "Stem separation not available yet. Track saved.",
                "audio_id": new_audio.id,
                "original_url": original_url,
            }), 503

        _, _, gpu_available = check_torch_available()
        device = "cuda" if gpu_available else "cpu"

        output_dir = os.path.join(temp_dir, "output")
        os.makedirs(output_dir, exist_ok=True)
        stems = run_demucs_separation(input_path, output_dir, model_name, device)

        if not stems:
            new_audio.processing_status = 'error'
            db.session.commit()
            return jsonify({"error": "Stem separation produced no output."}), 500

        stem_urls = upload_stems_to_cloud(stems, title, new_audio.id)
        job = save_stem_job(user_id, new_audio.id, title, original_url, duration, model_name, device, stem_urls)

        new_audio.processing_status = 'separated'
        new_audio.last_processed_at = datetime.utcnow()
        db.session.commit()

        try:
            shutil.rmtree(temp_dir, ignore_errors=True)
        except Exception:
            pass

        return jsonify({
            "message": "🎵 Track uploaded and stems separated!",
            "job_id": job.id,
            "audio_id": new_audio.id,
            "title": title,
            "original_url": original_url,
            "model": {"id": model_name, "name": DEMUCS_MODELS[model_name]["name"]},
            "device": device,
            "duration_seconds": round(duration, 2) if duration else None,
            "stems": stem_urls,
            "stem_count": len(stem_urls),
        }), 201

    except Exception as e:
        print(f"❌ Upload & separate error: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": f"Failed: {str(e)}"}), 500


@ai_stem_separation_bp.route('/api/ai/stems/history', methods=['GET'])
@jwt_required()
def get_separation_history():
    """Get user's stem separation job history."""
    user_id = get_jwt_identity()

    try:
        jobs = StemSeparationJob.query.filter_by(
            user_id=user_id
        ).order_by(StemSeparationJob.created_at.desc()).limit(50).all()

        return jsonify({
            "jobs": [job.serialize() for job in jobs],
            "count": len(jobs),
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@ai_stem_separation_bp.route('/api/ai/stems/job/<int:job_id>', methods=['GET'])
@jwt_required()
def get_stem_job(job_id):
    """Get a specific stem separation job."""
    user_id = get_jwt_identity()

    try:
        job = StemSeparationJob.query.get(job_id)
        if not job:
            return jsonify({"error": "Job not found"}), 404
        if str(job.user_id) != str(user_id):
            return jsonify({"error": "Unauthorized"}), 403

        return jsonify(job.serialize()), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@ai_stem_separation_bp.route('/api/ai/stems/job/<int:job_id>', methods=['DELETE'])
@jwt_required()
def delete_stem_job(job_id):
    """Delete a stem separation job."""
    user_id = get_jwt_identity()

    try:
        job = StemSeparationJob.query.get(job_id)
        if not job:
            return jsonify({"error": "Job not found"}), 404
        if str(job.user_id) != str(user_id):
            return jsonify({"error": "Unauthorized"}), 403

        db.session.delete(job)
        db.session.commit()

        return jsonify({"message": "Job deleted successfully"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500