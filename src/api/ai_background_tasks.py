import os
import uuid
import json
import math
import time
import shutil
import subprocess
import tempfile
from pathlib import Path
from datetime import datetime

import requests
import numpy as np
import librosa
from PIL import Image, ImageDraw, ImageFont
from pydub import AudioSegment

from .celery_app import celery


def _get_app():
    from src.app import app
    return app


def _emit_job_event(job_id, payload):
    try:
        app = _get_app()
        socketio = getattr(app, "socketio", None)
        if socketio:
            socketio.emit("ai_job_update", {"job_id": job_id, **payload}, namespace="/ai-jobs")
    except Exception as e:
        print(f"socket emit failed: {e}")


def _safe_font(size=36):
    try:
        return ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", size)
    except Exception:
        return ImageFont.load_default()


def _upload_to_r2(file_bytes, filename, content_type="video/mp4", folder="ai-videos"):
    from .ai_video_generation_routes import upload_to_r2
    try:
        return upload_to_r2(file_bytes, filename, content_type, folder=folder)
    except TypeError:
        return upload_to_r2(file_bytes, f"{folder}/{filename}", content_type)


def _download_to(url, target_path):
    r = requests.get(url, timeout=180)
    r.raise_for_status()
    Path(target_path).write_bytes(r.content)


def _check_job_control(job):
    if job.control_state == "cancel_requested":
        raise RuntimeError("Job cancelled by user")
    while job.control_state == "paused":
        _emit_job_event(job.id, {"status": job.status, "control_state": "paused", "progress_pct": job.progress_pct})
        time.sleep(1)
        from .models import db
        db.session.refresh(job)
        if job.control_state == "cancel_requested":
            raise RuntimeError("Job cancelled by user")


def _extract_audio_levels(audio_path, fps=12):
    audio = AudioSegment.from_file(audio_path)
    samples = np.array(audio.get_array_of_samples()).astype(np.float32)
    if audio.channels > 1:
        samples = samples.reshape((-1, audio.channels)).mean(axis=1)
    max_val = np.max(np.abs(samples)) if len(samples) else 1.0
    if max_val == 0:
        max_val = 1.0
    samples = samples / max_val
    sr = audio.frame_rate
    chunk = max(1, int(sr / fps))
    levels = []
    for i in range(0, len(samples), chunk):
        seg = samples[i:i+chunk]
        if len(seg) == 0:
            continue
        rms = float(np.sqrt(np.mean(np.square(seg))))
        levels.append(max(0.0, min(1.0, rms * 2.2)))
    return levels, max(1, int(round(len(audio) / 1000.0)))


def _extract_visemes(audio_path, fps=12):
    y, sr = librosa.load(audio_path, sr=None, mono=True)
    hop_length = max(128, int(sr / fps))
    rms = librosa.feature.rms(y=y, hop_length=hop_length)[0]
    centroid = librosa.feature.spectral_centroid(y=y, sr=sr, hop_length=hop_length)[0]
    zcr = librosa.feature.zero_crossing_rate(y, hop_length=hop_length)[0]

    visemes = []
    max_rms = np.max(rms) if len(rms) else 1.0
    max_centroid = np.max(centroid) if len(centroid) else 1.0

    for i in range(len(rms)):
        e = rms[i] / max_rms if max_rms else 0
        c = centroid[i] / max_centroid if max_centroid else 0
        z = zcr[i] if i < len(zcr) else 0

        if e < 0.08:
            viseme = "closed"
        elif c < 0.28:
            viseme = "oo"
        elif c > 0.68 and z > 0.08:
            viseme = "ee"
        elif e > 0.45:
            viseme = "aa"
        else:
            viseme = "rest"

        visemes.append({
            "frame": i,
            "energy": float(e),
            "centroid": float(c),
            "zcr": float(z),
            "viseme": viseme
        })
    return visemes


def _draw_waveform(draw, levels, x1, y1, x2, y2, accent="#00ffc8"):
    width = x2 - x1
    height = y2 - y1
    if not levels:
        levels = [0.1] * 32
    bar_w = max(2, width // max(1, len(levels)))
    for i, lv in enumerate(levels[: width // bar_w]):
        bar_h = max(4, int(height * lv))
        bx1 = x1 + i * bar_w
        by1 = y2 - bar_h
        bx2 = bx1 + max(1, bar_w - 1)
        draw.rounded_rectangle([bx1, by1, bx2, y2], radius=2, fill=accent)


def _draw_viseme_face(draw, cx, viseme, accent="#00ffc8"):
    eye = "#243447"
    draw.ellipse([cx-38, 155, cx-16, 168], fill=eye)
    draw.ellipse([cx+16, 155, cx+38, 168], fill=eye)

    if viseme == "closed":
        draw.rounded_rectangle([cx-22, 220, cx+22, 228], radius=4, fill=eye)
    elif viseme == "oo":
        draw.ellipse([cx-16, 214, cx+16, 248], fill=eye)
    elif viseme == "ee":
        draw.rounded_rectangle([cx-34, 220, cx+34, 234], radius=4, fill=eye)
    elif viseme == "aa":
        draw.ellipse([cx-24, 212, cx+24, 260], fill=eye)
    else:
        draw.rounded_rectangle([cx-26, 218, cx+26, 232], radius=4, fill=eye)


def _make_avatar_frame(output_png, avatar_name="Avatar", subtitle="Presenter", accent="#00ffc8", width=1280, height=720, viseme="rest", waveform_levels=None, speaker_glow=0.0):
    img = Image.new("RGB", (width, height), "#0b1220")
    draw = ImageDraw.Draw(img)

    draw.rectangle([0, 0, width, height], fill="#0b1220")
    draw.rounded_rectangle([60, 60, width-60, height-60], radius=42, fill="#111b2a", outline=accent, width=4)

    panel_x1, panel_y1, panel_x2, panel_y2 = 90, 120, 540, 640
    draw.rounded_rectangle([panel_x1, panel_y1, panel_x2, panel_y2], radius=36, fill="#162235")

    cx = (panel_x1 + panel_x2) // 2
    head_r = 84
    draw.ellipse([cx-head_r, 180-head_r, cx+head_r, 180+head_r], fill="#d8dee8")
    draw.rounded_rectangle([cx-120, 280, cx+120, 540], radius=40, fill="#d8dee8")

    _draw_viseme_face(draw, cx, viseme, accent=accent)

    title_font = _safe_font(54)
    body_font = _safe_font(28)
    small_font = _safe_font(22)

    draw.text((620, 140), "AI Avatar Presenter", fill="#ffffff", font=title_font)
    draw.text((620, 230), avatar_name, fill=accent, font=_safe_font(46))
    draw.text((620, 300), subtitle, fill="#d8e6ef", font=body_font)
    draw.text((620, 610), "StreamPireX Creators Academy", fill="#7fa0b6", font=small_font)

    _draw_waveform(draw, waveform_levels or [], 620, 520, 1140, 590, accent=accent)
    img.save(output_png, "PNG")


def _generate_thumbnails(video_path, out_dir, count=5):
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    thumbs = []
    for i in range(count):
        out = out_dir / f"thumb_{i:02d}.jpg"
        t = i * 2
        cmd = [
            "ffmpeg", "-y", "-ss", str(t), "-i", str(video_path),
            "-frames:v", "1", "-q:v", "2",
            str(out)
        ]
        subprocess.run(cmd, capture_output=True)
        if out.exists():
            thumbs.append(out)
    return thumbs


@celery.task(bind=True)
def process_avatar_clip_job(self, job_id):
    app = _get_app()
    with app.app_context():
        from .models import db
        from .advanced_ai_models import AITaskJob
        from .academy_models import Lesson

        job = AITaskJob.query.get(job_id)
        if not job:
            return {"error": "job not found"}

        if job.status == "completed" and job.output_url:
            return {"output_url": job.output_url}
        if job.status == "processing" and job.celery_task_id and job.celery_task_id != self.request.id:
            return {"status": "already-processing"}

        job.status = "processing"
        job.started_at = job.started_at or datetime.utcnow()
        if not job.celery_task_id:
            job.celery_task_id = self.request.id
        db.session.commit()
        _emit_job_event(job.id, {"status": "processing", "progress_pct": job.progress_pct})

        payload = job.payload_json or {}
        user_id = job.user_id
        avatar_name = payload.get("avatar_name", "Avatar Presenter")
        subtitle = payload.get("subtitle", "Course Segment")
        accent = payload.get("accent", "#00ffc8")
        audio_url = payload.get("audio_url")
        lesson_id = job.lesson_id

        try:
            if shutil.which("ffmpeg") is None:
                raise RuntimeError("ffmpeg is not installed or not on PATH")

            with tempfile.TemporaryDirectory() as td:
                td = Path(td)
                out_mp4 = td / "avatar_clip.mp4"

                if audio_url:
                    audio_path = td / "audio.mp3"
                    _download_to(audio_url, audio_path)
                    visemes = _extract_visemes(audio_path, fps=12)
                    levels, _ = _extract_audio_levels(audio_path, fps=12)

                    frames_dir = td / "frames"
                    frames_dir.mkdir(parents=True, exist_ok=True)
                    total = max(1, len(visemes))

                    for i, frame in enumerate(visemes):
                        _check_job_control(job)
                        frame_path = frames_dir / f"frame_{i:05d}.png"
                        lv = frame["energy"]
                        start = max(0, i - 12)
                        end = min(len(levels), i + 12)
                        waveform = levels[start:end]
                        _make_avatar_frame(
                            str(frame_path),
                            avatar_name=avatar_name,
                            subtitle=subtitle,
                            accent=accent,
                            viseme=frame["viseme"],
                            waveform_levels=waveform,
                            speaker_glow=min(1.0, lv * 1.5)
                        )
                        pct = int((i + 1) / total * 90)
                        if pct != job.progress_pct:
                            job.progress_pct = pct
                            db.session.commit()
                            _emit_job_event(job.id, {"status": "processing", "progress_pct": pct})

                    cmd = [
                        "ffmpeg", "-y",
                        "-framerate", "12",
                        "-i", str(frames_dir / "frame_%05d.png"),
                        "-i", str(audio_path),
                        "-c:v", "libx264",
                        "-pix_fmt", "yuv420p",
                        "-c:a", "aac",
                        "-shortest",
                        str(out_mp4)
                    ]
                else:
                    duration_secs = int(payload.get("duration_secs", 8))
                    frames_dir = td / "frames"
                    frames_dir.mkdir(parents=True, exist_ok=True)
                    total = max(1, duration_secs * 12)
                    viseme_cycle = ["rest", "ee", "aa", "oo", "closed"]

                    for i in range(total):
                        _check_job_control(job)
                        frame_path = frames_dir / f"frame_{i:05d}.png"
                        viseme = viseme_cycle[i % len(viseme_cycle)]
                        waveform = [0.2 + 0.15 * np.sin((i+j)/4.0) for j in range(24)]
                        _make_avatar_frame(
                            str(frame_path),
                            avatar_name=avatar_name,
                            subtitle=subtitle,
                            accent=accent,
                            viseme=viseme,
                            waveform_levels=waveform,
                            speaker_glow=0.4
                        )
                        pct = int((i + 1) / total * 90)
                        if pct != job.progress_pct:
                            job.progress_pct = pct
                            db.session.commit()
                            _emit_job_event(job.id, {"status": "processing", "progress_pct": pct})

                    cmd = [
                        "ffmpeg", "-y",
                        "-framerate", "12",
                        "-i", str(frames_dir / "frame_%05d.png"),
                        "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
                        "-t", str(duration_secs),
                        "-c:v", "libx264",
                        "-c:a", "aac",
                        "-pix_fmt", "yuv420p",
                        "-shortest",
                        str(out_mp4)
                    ]

                subprocess.run(cmd, check=True, capture_output=True)
                output_bytes = out_mp4.read_bytes()
                filename = f"{user_id}_{uuid.uuid4().hex[:12]}_avatar_clip.mp4"
                output_url = _upload_to_r2(output_bytes, filename, "video/mp4", folder="ai-avatar-clips")

                job.status = "completed"
                job.progress_pct = 100
                job.completed_at = datetime.utcnow()
                job.output_url = output_url
                job.result_json = {"output_url": output_url, "lip_sync": "viseme_mvp"}

                if lesson_id:
                    lesson = Lesson.query.get(lesson_id)
                    if lesson:
                        lesson.video_url = output_url
                        lesson.ai_video_url = output_url
                        lesson.source_mode = "ai_avatar"
                        lesson.generation_status = "completed"
                        lesson.avatar_id = payload.get("avatar_id", lesson.avatar_id)

                db.session.commit()
                _emit_job_event(job.id, {"status": "completed", "progress_pct": 100, "output_url": output_url})
                return {"output_url": output_url}

        except Exception as e:
            if "cancelled" in str(e).lower():
                job.status = "failed"
                job.error_message = "Cancelled by user"
            else:
                job.status = "failed"
                job.error_message = str(e)
            job.completed_at = datetime.utcnow()
            db.session.commit()
            _emit_job_event(job.id, {"status": "failed", "error_message": job.error_message})
            raise


@celery.task(bind=True)
def process_hybrid_compose_job(self, job_id):
    app = _get_app()
    with app.app_context():
        from .models import db
        from .advanced_ai_models import AITaskJob, LessonTimeline
        from .academy_models import Lesson

        job = AITaskJob.query.get(job_id)
        if not job:
            return {"error": "job not found"}

        if job.status == "completed" and job.output_url:
            return {"output_url": job.output_url}
        if job.status == "processing" and job.celery_task_id and job.celery_task_id != self.request.id:
            return {"status": "already-processing"}

        job.status = "processing"
        job.started_at = job.started_at or datetime.utcnow()
        if not job.celery_task_id:
            job.celery_task_id = self.request.id
        db.session.commit()
        _emit_job_event(job.id, {"status": "processing", "progress_pct": job.progress_pct})

        payload = job.payload_json or {}
        lesson_id = job.lesson_id
        segments = payload.get("segments", [])

        try:
            if shutil.which("ffmpeg") is None:
                raise RuntimeError("ffmpeg is not installed or not on PATH")

            with tempfile.TemporaryDirectory() as td:
                td = Path(td)
                normalized = []

                total = max(1, len(segments))
                for idx, seg in enumerate(segments):
                    _check_job_control(job)
                    seg_url = seg.get("url")
                    if not seg_url:
                        continue

                    local_src = td / f"src_{idx}.mp4"
                    local_norm = td / f"norm_{idx}.mp4"
                    _download_to(seg_url, local_src)

                    start_at = float(seg.get("start_at", 0) or 0)
                    end_at = seg.get("end_at")
                    trim_args = []
                    if start_at > 0:
                        trim_args += ["-ss", str(start_at)]
                    if end_at not in (None, "", False):
                        trim_args += ["-to", str(float(end_at))]

                    cmd = ["ffmpeg", "-y"] + trim_args + [
                        "-i", str(local_src),
                        "-vf", "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,format=yuv420p",
                        "-c:v", "libx264",
                        "-c:a", "aac",
                        "-movflags", "+faststart",
                        str(local_norm)
                    ]
                    subprocess.run(cmd, check=True, capture_output=True)
                    normalized.append({"path": local_norm, "transition": seg.get("transition", "none")})

                    pct = int((idx + 1) / total * 70)
                    if pct != job.progress_pct:
                        job.progress_pct = pct
                        db.session.commit()
                        _emit_job_event(job.id, {"status": "processing", "progress_pct": pct})

                if not normalized:
                    raise RuntimeError("No valid segment URLs found in timeline")

                out_mp4 = td / "hybrid_lesson.mp4"

                if len(normalized) == 1:
                    shutil.copyfile(normalized[0]["path"], out_mp4)
                else:
                    inputs = []
                    filter_parts = []
                    current_v = "[0:v]"
                    current_a = "[0:a]"
                    input_offset = 1

                    for seg in normalized:
                        inputs += ["-i", str(seg["path"])]

                    # simple xfade chain
                    offset_sec = 0
                    for i in range(len(normalized) - 1):
                        trans = normalized[i + 1]["transition"]
                        duration = 0.5 if trans == "fade" else 0.01
                        outv = f"[v{i+1}]"
                        outa = f"[a{i+1}]"
                        filter_parts.append(
                            f"{current_v}[{i+1}:v]xfade=transition=fade:duration={duration}:offset={max(0, offset_sec)}{outv}"
                        )
                        filter_parts.append(
                            f"{current_a}[{i+1}:a]acrossfade=d={duration}{outa}"
                        )
                        current_v = outv
                        current_a = outa
                        offset_sec += 2

                    filter_complex = ";".join(filter_parts)

                    if filter_complex:
                        cmd = ["ffmpeg", "-y"] + inputs + [
                            "-filter_complex", filter_complex,
                            "-map", current_v,
                            "-map", current_a,
                            "-c:v", "libx264",
                            "-c:a", "aac",
                            "-pix_fmt", "yuv420p",
                            str(out_mp4)
                        ]
                        try:
                            subprocess.run(cmd, check=True, capture_output=True)
                        except Exception:
                            concat_file = td / "concat.txt"
                            concat_file.write_text("".join([f"file '{seg['path'].as_posix()}'\n" for seg in normalized]))
                            cmd = [
                                "ffmpeg", "-y",
                                "-f", "concat", "-safe", "0",
                                "-i", str(concat_file),
                                "-c:v", "libx264",
                                "-c:a", "aac",
                                "-pix_fmt", "yuv420p",
                                str(out_mp4)
                            ]
                            subprocess.run(cmd, check=True, capture_output=True)
                    else:
                        concat_file = td / "concat.txt"
                        concat_file.write_text("".join([f"file '{seg['path'].as_posix()}'\n" for seg in normalized]))
                        cmd = [
                            "ffmpeg", "-y",
                            "-f", "concat", "-safe", "0",
                            "-i", str(concat_file),
                            "-c:v", "libx264",
                            "-c:a", "aac",
                            "-pix_fmt", "yuv420p",
                            str(out_mp4)
                        ]
                        subprocess.run(cmd, check=True, capture_output=True)

                thumb_dir = td / "thumbs"
                thumbs = _generate_thumbnails(out_mp4, thumb_dir, count=5)
                thumb_urls = []
                for t in thumbs:
                    thumb_urls.append(_upload_to_r2(t.read_bytes(), f"{uuid.uuid4().hex[:10]}_{t.name}", "image/jpeg", folder="ai-hybrid-thumbs"))

                output_bytes = out_mp4.read_bytes()
                filename = f"{job.user_id}_{uuid.uuid4().hex[:12]}_hybrid_lesson.mp4"
                output_url = _upload_to_r2(output_bytes, filename, "video/mp4", folder="ai-hybrid-lessons")

                job.status = "completed"
                job.progress_pct = 100
                job.completed_at = datetime.utcnow()
                job.output_url = output_url
                job.result_json = {"output_url": output_url, "thumbnail_urls": thumb_urls}

                timeline = LessonTimeline.query.filter_by(lesson_id=lesson_id, user_id=job.user_id).first()
                if timeline:
                    timeline.composed_video_url = output_url
                    timeline.last_job_id = job.id
                    timeline.thumbnail_urls = thumb_urls

                lesson = Lesson.query.get(lesson_id)
                if lesson:
                    lesson.video_url = output_url
                    lesson.ai_video_url = output_url
                    lesson.source_mode = "hybrid"
                    lesson.generation_status = "completed"

                db.session.commit()
                _emit_job_event(job.id, {"status": "completed", "progress_pct": 100, "output_url": output_url, "thumbnail_urls": thumb_urls})
                return {"output_url": output_url}

        except Exception as e:
            if "cancelled" in str(e).lower():
                job.status = "failed"
                job.error_message = "Cancelled by user"
            else:
                job.status = "failed"
                job.error_message = str(e)
            job.completed_at = datetime.utcnow()
            db.session.commit()
            _emit_job_event(job.id, {"status": "failed", "error_message": job.error_message})
            raise
