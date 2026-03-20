from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime

from .models import db, AIVideoGeneration
from .academy_models import Lesson
from .ai_video_credits_routes import get_user_tier

academy_ai_bp = Blueprint("academy_ai", __name__, url_prefix="/api/academy")

AVATAR_CATALOG = [
    {"id": "ava_neo_m1",   "name": "Neo Mentor",    "tier": "starter", "style": "Business",  "gender": "Male",    "thumb": "🧑🏽‍💼"},
    {"id": "ava_neo_f1",   "name": "Nova Coach",    "tier": "starter", "style": "Business",  "gender": "Female",  "thumb": "👩🏽‍💼"},
    {"id": "ava_edu_n1",   "name": "Echo Teacher",  "tier": "starter", "style": "Educator",  "gender": "Neutral", "thumb": "🧑🏿‍🏫"},
    {"id": "ava_host_m2",  "name": "Atlas Host",    "tier": "creator", "style": "Presenter", "gender": "Male",    "thumb": "🧔🏻"},
    {"id": "ava_host_f2",  "name": "Lyra Host",     "tier": "creator", "style": "Presenter", "gender": "Female",  "thumb": "👩🏻"},
    {"id": "ava_fit_m1",   "name": "Pulse Trainer", "tier": "creator", "style": "Fitness",   "gender": "Male",    "thumb": "🏋🏽‍♂️"},
    {"id": "ava_fit_f1",   "name": "Zen Coach",     "tier": "creator", "style": "Fitness",   "gender": "Female",  "thumb": "🧘🏽‍♀️"},
    {"id": "ava_tech_n1",  "name": "Byte Guide",    "tier": "creator", "style": "Tech",      "gender": "Neutral", "thumb": "🧑🏾‍💻"},
    {"id": "ava_corp_m1",  "name": "Summit Exec",   "tier": "pro",     "style": "Corporate", "gender": "Male",    "thumb": "🕴🏽"},
    {"id": "ava_corp_f1",  "name": "Sage Director", "tier": "pro",     "style": "Corporate", "gender": "Female",  "thumb": "👩🏾‍💼"},
    {"id": "ava_stage_m1", "name": "Stage Speaker", "tier": "pro",     "style": "Stage",     "gender": "Male",    "thumb": "🎤"},
    {"id": "ava_stage_f1", "name": "Spotlight Pro", "tier": "pro",     "style": "Stage",     "gender": "Female",  "thumb": "🎙️"},
]

TIER_RANK = {"free": 0, "starter": 1, "creator": 2, "pro": 3, "studio": 4, "enterprise": 5}

@academy_ai_bp.route("/avatar-options", methods=["GET"])
@jwt_required()
def get_avatar_options():
    user_id = get_jwt_identity()
    tier = (get_user_tier(user_id) or "starter").lower()
    current_rank = TIER_RANK.get(tier, 1)
    avatars = [a for a in AVATAR_CATALOG if TIER_RANK.get(a["tier"], 99) <= current_rank]

    return jsonify({
        "success": True,
        "tier": tier,
        "count": len(avatars),
        "avatars": avatars
    }), 200


@academy_ai_bp.route("/lessons/<int:lesson_id>/script", methods=["PUT"])
@jwt_required()
def save_lesson_script(lesson_id):
    user_id = get_jwt_identity()
    lesson = Lesson.query.get_or_404(lesson_id)

    if lesson.course.creator_id != user_id:
        return jsonify({"error": "Unauthorized"}), 403

    data = request.get_json() or {}
    lesson.script_text = data.get("script_text", lesson.script_text or "")
    lesson.avatar_id = data.get("avatar_id", lesson.avatar_id)
    lesson.source_mode = data.get("source_mode", lesson.source_mode or "manual_upload")
    lesson.generation_status = data.get("generation_status", lesson.generation_status or "idle")
    if hasattr(lesson, "updated_at"):
        lesson.updated_at = datetime.utcnow()

    db.session.commit()
    return jsonify({
        "success": True,
        "lesson": lesson.serialize()
    }), 200


@academy_ai_bp.route("/lessons/<int:lesson_id>/attach-ai-video", methods=["POST"])
@jwt_required()
def attach_ai_video_to_lesson(lesson_id):
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    generation_id = data.get("generation_id")
    avatar_choice = data.get("avatar_choice")

    if not generation_id:
        return jsonify({"error": "generation_id is required"}), 400

    lesson = Lesson.query.get_or_404(lesson_id)
    if lesson.course.creator_id != user_id:
        return jsonify({"error": "Unauthorized"}), 403

    generation = AIVideoGeneration.query.filter_by(
        id=generation_id,
        user_id=user_id,
        status="completed"
    ).first()

    if not generation or not getattr(generation, "video_url", None):
        return jsonify({"error": "Generated AI video not found"}), 404

    lesson.video_url = generation.video_url
    lesson.ai_video_url = generation.video_url
    lesson.ai_generation_id = generation.id
    lesson.avatar_id = avatar_choice or lesson.avatar_id
    lesson.source_mode = "ai_video"
    lesson.generation_status = "completed"
    if hasattr(lesson, "content_type"):
        lesson.content_type = "video"
    if hasattr(lesson, "updated_at"):
        lesson.updated_at = datetime.utcnow()

    db.session.commit()

    return jsonify({
        "success": True,
        "lesson": lesson.serialize(),
        "attached_generation_id": generation.id,
        "avatar_choice": avatar_choice,
        "message": "AI video attached to lesson"
    }), 200


@academy_ai_bp.route("/lessons/<int:lesson_id>/attach-ai-audio", methods=["POST"])
@jwt_required()
def attach_ai_audio_to_lesson(lesson_id):
    user_id = get_jwt_identity()
    lesson = Lesson.query.get_or_404(lesson_id)

    if lesson.course.creator_id != user_id:
        return jsonify({"error": "Unauthorized"}), 403

    data = request.get_json() or {}
    audio_url = data.get("audio_url")
    script_text = data.get("script_text", "")
    avatar_choice = data.get("avatar_choice")

    if not audio_url:
        return jsonify({"error": "audio_url is required"}), 400

    lesson.video_url = audio_url
    lesson.ai_audio_url = audio_url
    lesson.script_text = script_text or lesson.script_text
    lesson.avatar_id = avatar_choice or lesson.avatar_id
    lesson.source_mode = "audio_lesson"
    lesson.generation_status = "completed"
    if hasattr(lesson, "content_type"):
        lesson.content_type = "audio"
    if hasattr(lesson, "updated_at"):
        lesson.updated_at = datetime.utcnow()

    db.session.commit()

    return jsonify({
        "success": True,
        "lesson": lesson.serialize(),
        "message": "AI audio attached to lesson"
    }), 200
