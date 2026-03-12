import os
from celery import Celery

def make_celery():
    broker = os.environ.get("CELERY_BROKER_URL", os.environ.get("REDIS_URL", "redis://localhost:6379/0"))
    backend = os.environ.get("CELERY_RESULT_BACKEND", os.environ.get("REDIS_URL", "redis://localhost:6379/0"))

    celery = Celery(
        "streampirex",
        broker=broker,
        backend=backend,
        include=["src.api.tasks"],
    )

    celery.conf.update(
        task_serializer="json",
        accept_content=["json"],
        result_serializer="json",
        timezone="America/New_York",
        enable_utc=True,
        task_track_started=True,
        worker_prefetch_multiplier=1,
        task_acks_late=True,
    )
    return celery

celery = make_celery()
