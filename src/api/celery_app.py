import os
from celery import Celery

def make_celery():
    broker = os.environ.get("CELERY_BROKER_URL") or os.environ.get("REDIS_URL") or "redis://127.0.0.1:6379/0"
    backend = os.environ.get("CELERY_RESULT_BACKEND") or os.environ.get("REDIS_URL") or "redis://127.0.0.1:6379/0"

    celery = Celery(
        "streampirex_ai",
        broker=broker,
        backend=backend,
        include=["src.api.ai_background_tasks"]
    )

    celery.conf.update(
        task_serializer="json",
        accept_content=["json"],
        result_serializer="json",
        timezone="UTC",
        enable_utc=True,
        task_track_started=True,
        broker_connection_retry_on_startup=True,
    )
    return celery

celery = make_celery()
