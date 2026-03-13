# =============================================================================
# academy_routes.py — Creator Academy Full Backend
# =============================================================================
# Location: src/api/academy_routes.py
# Register in app.py:
#   from .academy_routes import academy_bp
#   app.register_blueprint(academy_bp)
# =============================================================================

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from .models import db, User
from .academy_models import Course, Lesson, Enrollment, CourseReview
from datetime import datetime
import uuid, os

academy_bp = Blueprint("academy", __name__, url_prefix="/api/academy")

# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────

def current_user():
    uid = get_jwt_identity()
    return User.query.get(uid)

def upload_to_r2(file, folder="academy"):
    """Reuse platform R2 upload helper or return Cloudinary fallback."""
    try:
        import boto3, uuid as _u
        s3 = boto3.client(
            "s3",
            endpoint_url=os.environ.get("R2_ENDPOINT_URL"),
            aws_access_key_id=os.environ.get("R2_ACCESS_KEY_ID"),
            aws_secret_access_key=os.environ.get("R2_SECRET_ACCESS_KEY"),
        )
        bucket = os.environ.get("R2_BUCKET_NAME", "streampirex-media")
        key = f"{folder}/{_u.uuid4().hex}_{file.filename}"
        s3.upload_fileobj(file, bucket, key, ExtraArgs={"ContentType": file.content_type})
        return f"{os.environ.get('R2_PUBLIC_URL', '')}/{key}"
    except Exception as e:
        current_app.logger.warning(f"R2 upload failed: {e}")
        return None

PLATFORM_CUT = 0.10  # 10% platform fee

# ─────────────────────────────────────────────
# COURSE CRUD
# ─────────────────────────────────────────────

@academy_bp.route("/courses", methods=["GET"])
def list_courses():
    """Public course marketplace — no auth required."""
    page     = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    category = request.args.get("category")
    query    = request.args.get("q", "")
    sort     = request.args.get("sort", "newest")  # newest | popular | price_asc | price_desc | free

    q = Course.query.filter_by(published=True)
    if category:
        q = q.filter_by(category=category)
    if query:
        q = q.filter(Course.title.ilike(f"%{query}%") | Course.description.ilike(f"%{query}%"))
    if sort == "popular":
        q = q.order_by(Course.enrollment_count.desc())
    elif sort == "price_asc":
        q = q.order_by(Course.price.asc())
    elif sort == "price_desc":
        q = q.order_by(Course.price.desc())
    elif sort == "free":
        q = q.filter_by(price=0)
    else:
        q = q.order_by(Course.created_at.desc())

    pagination = q.paginate(page=page, per_page=per_page, error_out=False)
    return jsonify({
        "courses": [c.serialize() for c in pagination.items],
        "total": pagination.total,
        "pages": pagination.pages,
        "page": page,
    })

@academy_bp.route("/courses/<int:course_id>", methods=["GET"])
def get_course(course_id):
    course = Course.query.get_or_404(course_id)
    if not course.published:
        return jsonify({"error": "Course not found"}), 404
    data = course.serialize()
    data["lessons"] = [l.serialize_preview() for l in course.lessons]
    data["reviews"]  = [r.serialize() for r in course.reviews[:10]]
    return jsonify(data)

@academy_bp.route("/courses", methods=["POST"])
@jwt_required()
def create_course():
    user = current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    data = request.get_json()
    course = Course(
        creator_id   = user.id,
        title        = data.get("title", "Untitled Course"),
        description  = data.get("description", ""),
        category     = data.get("category", "general"),
        price        = float(data.get("price", 0)),
        thumbnail_url= data.get("thumbnail_url", ""),
        tags         = data.get("tags", []),
        published    = False,
    )
    db.session.add(course)
    db.session.commit()
    return jsonify(course.serialize()), 201

@academy_bp.route("/courses/<int:course_id>", methods=["PUT"])
@jwt_required()
def update_course(course_id):
    user = current_user()
    course = Course.query.get_or_404(course_id)
    if course.creator_id != user.id:
        return jsonify({"error": "Forbidden"}), 403
    data = request.get_json()
    for field in ["title", "description", "category", "price", "thumbnail_url", "tags", "published"]:
        if field in data:
            setattr(course, field, data[field])
    course.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify(course.serialize())

@academy_bp.route("/courses/<int:course_id>", methods=["DELETE"])
@jwt_required()
def delete_course(course_id):
    user = current_user()
    course = Course.query.get_or_404(course_id)
    if course.creator_id != user.id:
        return jsonify({"error": "Forbidden"}), 403
    db.session.delete(course)
    db.session.commit()
    return jsonify({"message": "Course deleted"})

@academy_bp.route("/courses/<int:course_id>/thumbnail", methods=["POST"])
@jwt_required()
def upload_thumbnail(course_id):
    user = current_user()
    course = Course.query.get_or_404(course_id)
    if course.creator_id != user.id:
        return jsonify({"error": "Forbidden"}), 403
    file = request.files.get("thumbnail")
    if not file:
        return jsonify({"error": "No file"}), 400
    url = upload_to_r2(file, folder="academy/thumbnails")
    if url:
        course.thumbnail_url = url
        db.session.commit()
        return jsonify({"thumbnail_url": url})
    return jsonify({"error": "Upload failed"}), 500

# ─────────────────────────────────────────────
# LESSON CRUD
# ─────────────────────────────────────────────

@academy_bp.route("/courses/<int:course_id>/lessons", methods=["GET"])
@jwt_required()
def get_lessons(course_id):
    user = current_user()
    course = Course.query.get_or_404(course_id)
    # Only enrolled students or creator can see full lessons
    is_creator = course.creator_id == user.id
    is_enrolled = Enrollment.query.filter_by(course_id=course_id, user_id=user.id, paid=True).first() is not None
    if not is_creator and not is_enrolled:
        return jsonify({"error": "Enroll to access lessons"}), 403
    return jsonify([l.serialize() for l in course.lessons])

@academy_bp.route("/courses/<int:course_id>/lessons", methods=["POST"])
@jwt_required()
def add_lesson(course_id):
    user = current_user()
    course = Course.query.get_or_404(course_id)
    if course.creator_id != user.id:
        return jsonify({"error": "Forbidden"}), 403
    data = request.get_json()
    max_order = db.session.query(db.func.max(Lesson.order)).filter_by(course_id=course_id).scalar() or 0
    lesson = Lesson(
        course_id    = course_id,
        title        = data.get("title", "Lesson"),
        description  = data.get("description", ""),
        video_url    = data.get("video_url", ""),
        duration_secs= data.get("duration_secs", 0),
        is_free_preview = data.get("is_free_preview", False),
        order        = max_order + 1,
        content_type = data.get("content_type", "video"),  # video | text | audio | quiz
        text_content = data.get("text_content", ""),
    )
    db.session.add(lesson)
    db.session.commit()
    return jsonify(lesson.serialize()), 201

@academy_bp.route("/lessons/<int:lesson_id>", methods=["PUT"])
@jwt_required()
def update_lesson(lesson_id):
    user = current_user()
    lesson = Lesson.query.get_or_404(lesson_id)
    if lesson.course.creator_id != user.id:
        return jsonify({"error": "Forbidden"}), 403
    data = request.get_json()
    for f in ["title", "description", "video_url", "duration_secs", "is_free_preview", "order", "content_type", "text_content"]:
        if f in data:
            setattr(lesson, f, data[f])
    db.session.commit()
    return jsonify(lesson.serialize())

@academy_bp.route("/lessons/<int:lesson_id>", methods=["DELETE"])
@jwt_required()
def delete_lesson(lesson_id):
    user = current_user()
    lesson = Lesson.query.get_or_404(lesson_id)
    if lesson.course.creator_id != user.id:
        return jsonify({"error": "Forbidden"}), 403
    db.session.delete(lesson)
    db.session.commit()
    return jsonify({"message": "Lesson deleted"})

@academy_bp.route("/lessons/<int:lesson_id>/video", methods=["POST"])
@jwt_required()
def upload_lesson_video(lesson_id):
    user = current_user()
    lesson = Lesson.query.get_or_404(lesson_id)
    if lesson.course.creator_id != user.id:
        return jsonify({"error": "Forbidden"}), 403
    file = request.files.get("video")
    if not file:
        return jsonify({"error": "No file"}), 400
    url = upload_to_r2(file, folder="academy/videos")
    if url:
        lesson.video_url = url
        db.session.commit()
        return jsonify({"video_url": url})
    return jsonify({"error": "Upload failed"}), 500

@academy_bp.route("/lessons/<int:lesson_id>/reorder", methods=["POST"])
@jwt_required()
def reorder_lessons(lesson_id):
    user = current_user()
    lesson = Lesson.query.get_or_404(lesson_id)
    if lesson.course.creator_id != user.id:
        return jsonify({"error": "Forbidden"}), 403
    data = request.get_json()
    # Accepts {"order": [lesson_id1, lesson_id2, ...]}
    for i, lid in enumerate(data.get("order", [])):
        l = Lesson.query.get(lid)
        if l and l.course_id == lesson.course_id:
            l.order = i + 1
    db.session.commit()
    return jsonify({"message": "Reordered"})

# ─────────────────────────────────────────────
# ENROLLMENT + PURCHASE
# ─────────────────────────────────────────────

@academy_bp.route("/courses/<int:course_id>/enroll", methods=["POST"])
@jwt_required()
def enroll(course_id):
    user = current_user()
    course = Course.query.get_or_404(course_id)
    if not course.published:
        return jsonify({"error": "Course not available"}), 400

    existing = Enrollment.query.filter_by(course_id=course_id, user_id=user.id).first()
    if existing:
        return jsonify({"message": "Already enrolled", "enrollment": existing.serialize()})

    # Free course — enroll immediately
    if course.price == 0:
        enrollment = Enrollment(
            course_id = course_id,
            user_id   = user.id,
            paid      = True,
            amount_paid = 0,
            enrolled_at = datetime.utcnow(),
        )
        db.session.add(enrollment)
        course.enrollment_count = (course.enrollment_count or 0) + 1
        db.session.commit()
        return jsonify({"message": "Enrolled (free)", "enrollment": enrollment.serialize()}), 201

    # Paid course — return Stripe checkout intent
    try:
        import stripe
        stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")
        creator = User.query.get(course.creator_id)
        creator_share = round(course.price * (1 - PLATFORM_CUT), 2)

        # Create a payment intent
        intent = stripe.PaymentIntent.create(
            amount   = int(course.price * 100),  # cents
            currency = "usd",
            metadata = {
                "course_id": course_id,
                "buyer_id":  user.id,
                "creator_id": course.creator_id,
                "creator_share": creator_share,
                "type": "academy_course",
            },
            description = f"StreamPireX Academy: {course.title}",
        )
        return jsonify({"client_secret": intent.client_secret, "amount": course.price})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@academy_bp.route("/courses/<int:course_id>/confirm-payment", methods=["POST"])
@jwt_required()
def confirm_payment(course_id):
    user = current_user()
    course = Course.query.get_or_404(course_id)
    data = request.get_json()
    payment_intent_id = data.get("payment_intent_id")

    # Verify with Stripe
    try:
        import stripe
        stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")
        intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        if intent.status != "succeeded":
            return jsonify({"error": "Payment not confirmed"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    existing = Enrollment.query.filter_by(course_id=course_id, user_id=user.id).first()
    if not existing:
        enrollment = Enrollment(
            course_id   = course_id,
            user_id     = user.id,
            paid        = True,
            amount_paid = course.price,
            payment_intent_id = payment_intent_id,
            enrolled_at = datetime.utcnow(),
        )
        db.session.add(enrollment)
        course.enrollment_count = (course.enrollment_count or 0) + 1
        db.session.commit()
        return jsonify({"message": "Enrolled", "enrollment": enrollment.serialize()}), 201

    return jsonify({"message": "Already enrolled", "enrollment": existing.serialize()})

@academy_bp.route("/my-enrollments", methods=["GET"])
@jwt_required()
def my_enrollments():
    user = current_user()
    enrollments = Enrollment.query.filter_by(user_id=user.id, paid=True).all()
    return jsonify([e.serialize_with_course() for e in enrollments])

# ─────────────────────────────────────────────
# PROGRESS TRACKING
# ─────────────────────────────────────────────

@academy_bp.route("/lessons/<int:lesson_id>/complete", methods=["POST"])
@jwt_required()
def mark_complete(lesson_id):
    user = current_user()
    lesson = Lesson.query.get_or_404(lesson_id)
    enrollment = Enrollment.query.filter_by(course_id=lesson.course_id, user_id=user.id, paid=True).first()
    if not enrollment:
        return jsonify({"error": "Not enrolled"}), 403

    completed = set(enrollment.completed_lessons or [])
    completed.add(lesson_id)
    enrollment.completed_lessons = list(completed)

    # Calculate overall progress
    total = Lesson.query.filter_by(course_id=lesson.course_id).count()
    enrollment.progress_pct = round((len(completed) / total) * 100) if total else 0
    if enrollment.progress_pct == 100:
        enrollment.completed_at = datetime.utcnow()

    db.session.commit()
    return jsonify({"progress_pct": enrollment.progress_pct, "completed_lessons": list(completed)})

@academy_bp.route("/courses/<int:course_id>/progress", methods=["GET"])
@jwt_required()
def get_progress(course_id):
    user = current_user()
    enrollment = Enrollment.query.filter_by(course_id=course_id, user_id=user.id, paid=True).first()
    if not enrollment:
        return jsonify({"enrolled": False})
    return jsonify({
        "enrolled": True,
        "progress_pct": enrollment.progress_pct or 0,
        "completed_lessons": enrollment.completed_lessons or [],
        "completed_at": enrollment.completed_at.isoformat() if enrollment.completed_at else None,
    })

# ─────────────────────────────────────────────
# REVIEWS
# ─────────────────────────────────────────────

@academy_bp.route("/courses/<int:course_id>/reviews", methods=["POST"])
@jwt_required()
def add_review(course_id):
    user = current_user()
    enrollment = Enrollment.query.filter_by(course_id=course_id, user_id=user.id, paid=True).first()
    if not enrollment:
        return jsonify({"error": "Must be enrolled to review"}), 403
    if CourseReview.query.filter_by(course_id=course_id, user_id=user.id).first():
        return jsonify({"error": "Already reviewed"}), 409

    data = request.get_json()
    review = CourseReview(
        course_id = course_id,
        user_id   = user.id,
        rating    = max(1, min(5, int(data.get("rating", 5)))),
        body      = data.get("body", ""),
    )
    db.session.add(review)

    # Update course avg rating
    course = Course.query.get(course_id)
    all_ratings = [r.rating for r in course.reviews] + [review.rating]
    course.avg_rating = round(sum(all_ratings) / len(all_ratings), 1)
    course.review_count = len(all_ratings)
    db.session.commit()
    return jsonify(review.serialize()), 201

# ─────────────────────────────────────────────
# CREATOR DASHBOARD
# ─────────────────────────────────────────────

@academy_bp.route("/my-courses", methods=["GET"])
@jwt_required()
def my_courses():
    user = current_user()
    courses = Course.query.filter_by(creator_id=user.id).order_by(Course.created_at.desc()).all()
    return jsonify([c.serialize_with_stats() for c in courses])

@academy_bp.route("/earnings", methods=["GET"])
@jwt_required()
def earnings():
    user = current_user()
    courses = Course.query.filter_by(creator_id=user.id).all()
    course_ids = [c.id for c in courses]
    enrollments = Enrollment.query.filter(Enrollment.course_id.in_(course_ids), Enrollment.paid == True).all()
    gross = sum(e.amount_paid or 0 for e in enrollments)
    net   = round(gross * (1 - PLATFORM_CUT), 2)
    by_course = {}
    for c in courses:
        course_enrollments = [e for e in enrollments if e.course_id == c.id]
        by_course[c.id] = {
            "title": c.title,
            "students": len(course_enrollments),
            "gross": sum(e.amount_paid or 0 for e in course_enrollments),
            "net": round(sum(e.amount_paid or 0 for e in course_enrollments) * (1 - PLATFORM_CUT), 2),
        }
    return jsonify({
        "gross_total": gross,
        "net_total": net,
        "platform_cut_pct": PLATFORM_CUT * 100,
        "total_students": len(enrollments),
        "by_course": by_course,
    })

# ─────────────────────────────────────────────
# CATEGORIES
# ─────────────────────────────────────────────

@academy_bp.route("/categories", methods=["GET"])
def get_categories():
    categories = [
        {"id": "music-production",   "label": "Music Production",   "icon": "🎹"},
        {"id": "podcasting",         "label": "Podcasting",         "icon": "🎙️"},
        {"id": "live-streaming",     "label": "Live Streaming",     "icon": "📡"},
        {"id": "beat-making",        "label": "Beat Making",        "icon": "🥁"},
        {"id": "mixing-mastering",   "label": "Mixing & Mastering", "icon": "🎚️"},
        {"id": "video-editing",      "label": "Video Editing",      "icon": "🎬"},
        {"id": "content-strategy",   "label": "Content Strategy",   "icon": "📱"},
        {"id": "music-business",     "label": "Music Business",     "icon": "💰"},
        {"id": "songwriting",        "label": "Songwriting",        "icon": "✍️"},
        {"id": "social-media",       "label": "Social Media",       "icon": "📲"},
        {"id": "distribution",       "label": "Distribution",       "icon": "🌍"},
        {"id": "branding",           "label": "Artist Branding",    "icon": "🎨"},
    ]
    return jsonify(categories)