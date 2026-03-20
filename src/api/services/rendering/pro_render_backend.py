from datetime import datetime
from src.api.services.cache.job_store import save_job
from .render_worker import execute_render_job

def queue_backend_render(project: dict):
    job_id = f"render_{int(datetime.utcnow().timestamp())}"

    input_media = project.get("input_media")
    format_name = project.get("format", "mp4")

    job = {
        "id": job_id,
        "status": "queued",
        "created_at": datetime.utcnow().isoformat(),
        "input_media": input_media,
        "format": format_name,
        "project_name": project.get("name", "SPX Project")
    }

    save_job(job)

    # 🔥 immediate execution (can later move to async worker)
    execute_render_job(job_id)

    return job
