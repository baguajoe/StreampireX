from datetime import datetime
from src.celery_app import celery

@celery.task(bind=True)
def run_ai_job(self, job_id, feature, payload=None):
    """
    Placeholder worker task.
    Replace this with real provider logic later.
    """
    payload = payload or {}

    return {
        "job_id": job_id,
        "feature": feature,
        "status": "completed",
        "output_url": None,
        "provider": payload.get("provider", "stub"),
        "completed_at": datetime.utcnow().isoformat(),
    }
