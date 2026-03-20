from datetime import datetime
from src.api.services.cache.job_store import update_job

def execute_render_job(job_id: str):
    update_job(job_id, {
        "status": "processing",
        "started_at": datetime.utcnow().isoformat()
    })

    update_job(job_id, {
        "status": "completed",
        "finished_at": datetime.utcnow().isoformat(),
        "output_path": f"uploads/render_jobs/{job_id}.mov"
    })

    return {"job_id": job_id, "status": "completed"}
