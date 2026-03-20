import json
from pathlib import Path
from threading import Lock

BASE = Path("uploads/render_jobs")
BASE.mkdir(parents=True, exist_ok=True)
_lock = Lock()

def _job_path(job_id: str) -> Path:
    return BASE / f"{job_id}.json"

def save_job(job: dict):
    with _lock:
        _job_path(job["id"]).write_text(json.dumps(job, indent=2))

def load_job(job_id: str):
    p = _job_path(job_id)
    if not p.exists():
        return None
    return json.loads(p.read_text())

def list_jobs():
    jobs = []
    for p in BASE.glob("*.json"):
        try:
            jobs.append(json.loads(p.read_text()))
        except Exception:
            continue
    return sorted(jobs, key=lambda x: x.get("created_at", ""), reverse=True)

def update_job(job_id: str, patch: dict):
    job = load_job(job_id)
    if not job:
        return None
    job.update(patch)
    save_job(job)
    return job
