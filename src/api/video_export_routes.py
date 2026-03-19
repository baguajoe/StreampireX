from flask import Blueprint, request, jsonify
import os
import tempfile
import subprocess
from datetime import datetime

video_export_bp = Blueprint("video_export_bp", __name__)

@video_export_bp.route("/api/video-export/render", methods=["POST"])
def render_video_export():
    data = request.get_json() or {}

    project_name = data.get("projectName", "node-compositor-export")
    width = int(data.get("width", 1280))
    height = int(data.get("height", 720))
    fps = int(data.get("fps", 30))
    duration = float(data.get("duration", 5))

    # Placeholder scaffold:
    # Later you can replace this with real frame rendering + ffmpeg image sequence assembly.
    out_dir = tempfile.mkdtemp(prefix="spx_export_")
    output_path = os.path.join(out_dir, f"{project_name}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.mp4")

    try:
        # Creates a black silent MP4 placeholder using ffmpeg color source
        cmd = [
            "ffmpeg",
            "-y",
            "-f", "lavfi",
            "-i", f"color=c=black:s={width}x{height}:d={duration}:r={fps}",
            "-pix_fmt", "yuv420p",
            output_path
        ]
        subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

        return jsonify({
            "success": True,
            "message": "Video export completed",
            "video_url": output_path,
            "project_name": project_name
        }), 200
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500
