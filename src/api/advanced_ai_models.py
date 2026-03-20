from datetime import datetime
from .models import db

class VideoCreditTransaction(db.Model):
    __tablename__ = "video_credit_transactions"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)
    amount = db.Column(db.Integer, nullable=False)  # positive add, negative deduct
    transaction_type = db.Column(db.String(50), nullable=False, index=True)  # purchase, deduct, refund, grant, monthly_reset
    feature = db.Column(db.String(50), nullable=True)  # ai_video, avatar_clip, hybrid_compose, course_audio
    reference_type = db.Column(db.String(50), nullable=True)  # generation, job, purchase, manual
    reference_id = db.Column(db.Integer, nullable=True)
    description = db.Column(db.String(255), nullable=True)
    balance_after = db.Column(db.Integer, nullable=True)
    metadata_json = db.Column(db.JSON, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    def serialize(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "amount": self.amount,
            "transaction_type": self.transaction_type,
            "feature": self.feature,
            "reference_type": self.reference_type,
            "reference_id": self.reference_id,
            "description": self.description,
            "balance_after": self.balance_after,
            "metadata_json": self.metadata_json or {},
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class AITaskJob(db.Model):
    __tablename__ = "ai_task_jobs"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)
    job_type = db.Column(db.String(50), nullable=False, index=True)  # text_video, avatar_clip, hybrid_compose
    status = db.Column(db.String(30), default="queued", index=True)  # queued, processing, completed, failed
    celery_task_id = db.Column(db.String(255), nullable=True, index=True)
    lesson_id = db.Column(db.Integer, nullable=True, index=True)
    course_id = db.Column(db.Integer, nullable=True, index=True)
    payload_json = db.Column(db.JSON, nullable=True)
    result_json = db.Column(db.JSON, nullable=True)
    output_url = db.Column(db.String(500), nullable=True)
    error_message = db.Column(db.Text, nullable=True)
    credits_used = db.Column(db.Integer, default=0)
    control_state = db.Column(db.String(30), default="active")  # active, paused, cancel_requested, cancelled
    progress_pct = db.Column(db.Integer, default=0)
    started_at = db.Column(db.DateTime, nullable=True)
    completed_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    def serialize(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "job_type": self.job_type,
            "status": self.status,
            "celery_task_id": self.celery_task_id,
            "lesson_id": self.lesson_id,
            "course_id": self.course_id,
            "payload_json": self.payload_json or {},
            "result_json": self.result_json or {},
            "output_url": self.output_url,
            "error_message": self.error_message,
            "credits_used": self.credits_used,
            "control_state": self.control_state,
            "progress_pct": self.progress_pct,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class LessonTimeline(db.Model):
    __tablename__ = "lesson_timelines"

    id = db.Column(db.Integer, primary_key=True)
    lesson_id = db.Column(db.Integer, db.ForeignKey("lessons.id"), nullable=False, unique=True, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)
    timeline_json = db.Column(db.JSON, nullable=False, default=list)
    composed_video_url = db.Column(db.String(500), nullable=True)
    thumbnail_urls = db.Column(db.JSON, nullable=True)
    preview_sprite_url = db.Column(db.String(500), nullable=True)
    last_job_id = db.Column(db.Integer, db.ForeignKey("ai_task_jobs.id"), nullable=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def serialize(self):
        return {
            "id": self.id,
            "lesson_id": self.lesson_id,
            "user_id": self.user_id,
            "timeline_json": self.timeline_json or [],
            "composed_video_url": self.composed_video_url,
            "thumbnail_urls": self.thumbnail_urls or [],
            "preview_sprite_url": self.preview_sprite_url,
            "last_job_id": self.last_job_id,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
