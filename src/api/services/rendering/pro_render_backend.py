from datetime import datetime
from .node_pass_processor import process_node_passes
from src.api.services.cache.job_store import save_job

def queue_backend_render(project: dict, format_name: str = "png"):
    job_id = f"render_{int(datetime.utcnow().timestamp())}"
    pass_data = process_node_passes(project.get("nodes", []), project.get("edges", []))

    job = {
        "id": job_id,
        "status": "queued",
        "format": format_name,
        "created_at": datetime.utcnow().isoformat(),
        "project_name": project.get("name", "SPX Compositor"),
        "pass_data": pass_data,
        "backend_required": format_name in ["exr", "prores"],
        "persistent_cache": True
    }
    save_job(job)
    return job
