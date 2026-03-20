from datetime import datetime
from src.api.services.cache.job_store import update_job, load_job
from .ffmpeg_renderer import run_ffmpeg_render

def execute_render_job(job_id: str):
    job = load_job(job_id)
    if not job:
        return {"error": "job_not_found"}

    update_job(job_id, {
        "status": "processing",
        "started_at": datetime.utcnow().isoformat()
    })

    input_media = job.get("input_media")
    format_name = job.get("format", "mp4")

    result = run_ffmpeg_render(input_media, job_id, format_name)

    if result["status"] == "success":
        update_job(job_id, {
            "status": "completed",
            "finished_at": datetime.utcnow().isoformat(),
            "output_path": result["output"]
        })
    else:
        update_job(job_id, {
            "status": "failed",
            "error": result["error"]
        })

    return result
