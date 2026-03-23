from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity

from .models import db
from .academy_models import Lesson
from .advanced_ai_models import VideoCreditTransaction, AITaskJob, LessonTimeline
from .ai_video_credits_routes import deduct_user_credits
try:
    from .ai_background_tasks import process_avatar_clip_job, process_hybrid_compose_job
except Exception as e:
    process_avatar_clip_job = None
    process_hybrid_compose_job = None
    print(f'⚠ Advanced AI background tasks unavailable: {e}')


advanced_ai_bp = Blueprint("advanced_ai", __name__, url_prefix="/api/advanced-ai")

AVATAR_PRESETS = [
    {"id": "ava_neo_m1", "name": "Neo Mentor", "subtitle": "Business Educator", "accent": "#00ffc8"},
    {"id": "ava_neo_f1", "name": "Nova Coach", "subtitle": "Creator Mentor", "accent": "#ff7a59"},
    {"id": "ava_edu_n1", "name": "Echo Teacher", "subtitle": "Hybrid Presenter", "accent": "#8b5cf6"},
    {"id": "ava_stage_m1", "name": "Stage Speaker", "subtitle": "Launch Presenter", "accent": "#fbbf24"},
]

def log_tx(user_id, amount, transaction_type, feature=None, reference_type=None, reference_id=None, description=None, balance_after=None, metadata_json=None):
    tx = VideoCreditTransaction(
        user_id=user_id,
        amount=amount,
        transaction_type=transaction_type,
        feature=feature,
        reference_type=reference_type,
        reference_id=reference_id,
        description=description,
        balance_after=balance_after,
        metadata_json=metadata_json or {}
    )
    db.session.add(tx)
    return tx

@advanced_ai_bp.route("/credit-transactions", methods=["GET"])
@jwt_required()
def get_credit_transactions():
    user_id = get_jwt_identity()
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 25, type=int), 200)
    tx_type = request.args.get("type")
    feature = request.args.get("feature")

    q = VideoCreditTransaction.query.filter_by(user_id=user_id)
    if tx_type:
        q = q.filter_by(transaction_type=tx_type)
    if feature:
        q = q.filter_by(feature=feature)

    rows = q.order_by(VideoCreditTransaction.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        "success": True,
        "transactions": [r.serialize() for r in rows.items],
        "page": page,
        "pages": rows.pages,
        "total": rows.total
    }), 200

@advanced_ai_bp.route("/jobs/<int:job_id>", methods=["GET"])
@jwt_required()
def get_job(job_id):
    user_id = get_jwt_identity()
    job = AITaskJob.query.filter_by(id=job_id, user_id=user_id).first()
    if not job:
        return jsonify({"error": "Job not found"}), 404
    return jsonify({"success": True, "job": job.serialize()}), 200

@advanced_ai_bp.route("/avatar-options", methods=["GET"])
@jwt_required()
def avatar_options():
    return jsonify({"success": True, "avatars": AVATAR_PRESETS}), 200

@advanced_ai_bp.route("/avatar-render", methods=["POST"])
@jwt_required()
def avatar_render():
    user_id = get_jwt_identity()
    data = request.get_json() or {}

    lesson_id = data.get("lesson_id")
    avatar_id = data.get("avatar_id")
    subtitle = data.get("subtitle", "Course Segment")
    audio_url = data.get("audio_url")
    duration_secs = int(data.get("duration_secs", 8))

    if not lesson_id:
        return jsonify({"error": "lesson_id is required"}), 400

    lesson = Lesson.query.get_or_404(lesson_id)
    if lesson.course.creator_id != user_id:
        return jsonify({"error": "Unauthorized"}), 403

    preset = next((a for a in AVATAR_PRESETS if a["id"] == avatar_id), None)
    if not preset:
        return jsonify({"error": "Invalid avatar_id"}), 400

    # idempotent active-job check
    existing = AITaskJob.query.filter_by(
        user_id=user_id,
        lesson_id=lesson_id,
        job_type="avatar_clip",
        status="processing"
    ).first()
    if existing:
        return jsonify({"success": True, "job": existing.serialize(), "message": "Existing avatar job already processing"}), 200

    credit_cost = 5
    ok, credit, error = deduct_user_credits(user_id, credit_cost)
    if not ok:
        return jsonify(error), 402

    job = AITaskJob(
        user_id=user_id,
        job_type="avatar_clip",
        lesson_id=lesson_id,
        course_id=lesson.course_id,
        status="queued",
        payload_json={
            "avatar_id": avatar_id,
            "avatar_name": preset["name"],
            "subtitle": subtitle or preset["subtitle"],
            "accent": preset["accent"],
            "audio_url": audio_url,
            "duration_secs": duration_secs
        },
        credits_used=credit_cost
    )
    db.session.add(job)
    db.session.commit()

    async_result = process_avatar_clip_job.delay(job.id)
    job.celery_task_id = async_result.id
    lesson.generation_status = "processing"
    lesson.source_mode = "ai_avatar"
    lesson.avatar_id = avatar_id

    log_tx(
        user_id=user_id,
        amount=-credit_cost,
        transaction_type="deduct",
        feature="avatar_clip",
        reference_type="job",
        reference_id=job.id,
        description=f"Avatar render job #{job.id}",
        balance_after=credit.balance,
        metadata_json={"lesson_id": lesson_id, "avatar_id": avatar_id}
    )
    db.session.commit()

    return jsonify({
        "success": True,
        "job": job.serialize(),
        "credits_remaining": credit.balance
    }), 202

@advanced_ai_bp.route("/lesson-timeline/<int:lesson_id>", methods=["GET"])
@jwt_required()
def get_lesson_timeline(lesson_id):
    user_id = get_jwt_identity()
    lesson = Lesson.query.get_or_404(lesson_id)
    if lesson.course.creator_id != user_id:
        return jsonify({"error": "Unauthorized"}), 403

    timeline = LessonTimeline.query.filter_by(lesson_id=lesson_id, user_id=user_id).first()
    if not timeline:
        return jsonify({"success": True, "timeline": {"lesson_id": lesson_id, "timeline_json": [], "composed_video_url": None}}), 200

    return jsonify({"success": True, "timeline": timeline.serialize()}), 200

@advanced_ai_bp.route("/lesson-timeline/<int:lesson_id>", methods=["PUT"])
@jwt_required()
def save_lesson_timeline(lesson_id):
    user_id = get_jwt_identity()
    lesson = Lesson.query.get_or_404(lesson_id)
    if lesson.course.creator_id != user_id:
        return jsonify({"error": "Unauthorized"}), 403

    data = request.get_json() or {}
    timeline_json = data.get("timeline_json", [])

    timeline = LessonTimeline.query.filter_by(lesson_id=lesson_id, user_id=user_id).first()
    if not timeline:
        timeline = LessonTimeline(lesson_id=lesson_id, user_id=user_id, timeline_json=timeline_json)
        db.session.add(timeline)
    else:
        timeline.timeline_json = timeline_json

    lesson.source_mode = "hybrid"
    db.session.commit()

    return jsonify({"success": True, "timeline": timeline.serialize()}), 200

@advanced_ai_bp.route("/lesson-timeline/<int:lesson_id>/compose", methods=["POST"])
@jwt_required()
def compose_lesson_timeline(lesson_id):
    user_id = get_jwt_identity()
    lesson = Lesson.query.get_or_404(lesson_id)
    if lesson.course.creator_id != user_id:
        return jsonify({"error": "Unauthorized"}), 403

    timeline = LessonTimeline.query.filter_by(lesson_id=lesson_id, user_id=user_id).first()
    if not timeline or not timeline.timeline_json:
        return jsonify({"error": "Timeline is empty"}), 400

    existing = AITaskJob.query.filter_by(
        user_id=user_id,
        lesson_id=lesson_id,
        job_type="hybrid_compose",
        status="processing"
    ).first()
    if existing:
        return jsonify({"success": True, "job": existing.serialize(), "message": "Existing compose job already processing"}), 200

    credit_cost = 3
    ok, credit, error = deduct_user_credits(user_id, credit_cost)
    if not ok:
        return jsonify(error), 402

    job = AITaskJob(
        user_id=user_id,
        job_type="hybrid_compose",
        lesson_id=lesson_id,
        course_id=lesson.course_id,
        status="queued",
        payload_json={"segments": timeline.timeline_json},
        credits_used=credit_cost
    )
    db.session.add(job)
    db.session.commit()

    async_result = process_hybrid_compose_job.delay(job.id)
    job.celery_task_id = async_result.id
    lesson.generation_status = "processing"
    timeline.last_job_id = job.id

    log_tx(
        user_id=user_id,
        amount=-credit_cost,
        transaction_type="deduct",
        feature="hybrid_compose",
        reference_type="job",
        reference_id=job.id,
        description=f"Hybrid timeline compose job #{job.id}",
        balance_after=credit.balance,
        metadata_json={"lesson_id": lesson_id}
    )
    db.session.commit()

    return jsonify({
        "success": True,
        "job": job.serialize(),
        "credits_remaining": credit.balance
    }), 202


@advanced_ai_bp.route("/jobs/<int:job_id>/pause", methods=["POST"])
@jwt_required()
def pause_job(job_id):
    user_id = get_jwt_identity()
    job = AITaskJob.query.filter_by(id=job_id, user_id=user_id).first()
    if not job:
        return jsonify({"error": "Job not found"}), 404
    if job.status not in ["queued", "processing"]:
        return jsonify({"error": "Only queued or processing jobs can be paused"}), 400
    job.control_state = "paused"
    db.session.commit()
    return jsonify({"success": True, "job": job.serialize()}), 200


@advanced_ai_bp.route("/jobs/<int:job_id>/resume", methods=["POST"])
@jwt_required()
def resume_job(job_id):
    user_id = get_jwt_identity()
    job = AITaskJob.query.filter_by(id=job_id, user_id=user_id).first()
    if not job:
        return jsonify({"error": "Job not found"}), 404
    if job.control_state != "paused":
        return jsonify({"error": "Job is not paused"}), 400
    job.control_state = "active"
    db.session.commit()
    return jsonify({"success": True, "job": job.serialize()}), 200


@advanced_ai_bp.route("/jobs/<int:job_id>/cancel", methods=["POST"])
@jwt_required()
def cancel_job(job_id):
    user_id = get_jwt_identity()
    job = AITaskJob.query.filter_by(id=job_id, user_id=user_id).first()
    if not job:
        return jsonify({"error": "Job not found"}), 404
    if job.status in ["completed", "failed"]:
        return jsonify({"error": "Finished jobs cannot be cancelled"}), 400
    job.control_state = "cancel_requested"
    db.session.commit()
    return jsonify({"success": True, "job": job.serialize()}), 200
