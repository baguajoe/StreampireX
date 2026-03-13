# =============================================================================
# Academy Models — add to src/api/models.py
# =============================================================================
# Place these classes inside models.py alongside existing models.
# Run: flask db migrate -m "add academy tables"
#      flask db upgrade
# =============================================================================

from datetime import datetime
from .models import db


class Course(db.Model):
    __tablename__ = "courses"

    id               = db.Column(db.Integer, primary_key=True)
    creator_id       = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    title            = db.Column(db.String(200), nullable=False)
    description      = db.Column(db.Text, default="")
    category         = db.Column(db.String(60), default="general")
    price            = db.Column(db.Float, default=0.0)       # 0 = free
    thumbnail_url    = db.Column(db.String(500), default="")
    tags             = db.Column(db.JSON, default=list)
    published        = db.Column(db.Boolean, default=False)
    enrollment_count = db.Column(db.Integer, default=0)
    avg_rating       = db.Column(db.Float, default=0.0)
    review_count     = db.Column(db.Integer, default=0)
    created_at       = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at       = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    lessons     = db.relationship("Lesson",       backref="course",  lazy=True, cascade="all, delete-orphan", order_by="Lesson.order")
    enrollments = db.relationship("Enrollment",   backref="course",  lazy=True, cascade="all, delete-orphan")
    reviews     = db.relationship("CourseReview", backref="course",  lazy=True, cascade="all, delete-orphan")
    creator     = db.relationship("User", foreign_keys=[creator_id])

    def serialize(self):
        return {
            "id":               self.id,
            "creator_id":       self.creator_id,
            "creator_name":     self.creator.username if self.creator else None,
            "creator_avatar":   getattr(self.creator, "profile_image", None),
            "title":            self.title,
            "description":      self.description,
            "category":         self.category,
            "price":            self.price,
            "thumbnail_url":    self.thumbnail_url,
            "tags":             self.tags or [],
            "published":        self.published,
            "enrollment_count": self.enrollment_count,
            "avg_rating":       self.avg_rating,
            "review_count":     self.review_count,
            "lesson_count":     len(self.lessons),
            "created_at":       self.created_at.isoformat() if self.created_at else None,
            "updated_at":       self.updated_at.isoformat() if self.updated_at else None,
        }

    def serialize_with_stats(self):
        data = self.serialize()
        paid_enrollments = [e for e in self.enrollments if e.paid]
        gross = sum(e.amount_paid or 0 for e in paid_enrollments)
        data["stats"] = {
            "students": len(paid_enrollments),
            "gross_revenue": gross,
            "net_revenue": round(gross * 0.9, 2),
        }
        return data


class Lesson(db.Model):
    __tablename__ = "lessons"

    id              = db.Column(db.Integer, primary_key=True)
    course_id       = db.Column(db.Integer, db.ForeignKey("courses.id"), nullable=False)
    title           = db.Column(db.String(200), nullable=False)
    description     = db.Column(db.Text, default="")
    video_url       = db.Column(db.String(500), default="")
    duration_secs   = db.Column(db.Integer, default=0)
    is_free_preview = db.Column(db.Boolean, default=False)
    order           = db.Column(db.Integer, default=1)
    content_type    = db.Column(db.String(20), default="video")  # video | text | audio | quiz
    text_content    = db.Column(db.Text, default="")
    created_at      = db.Column(db.DateTime, default=datetime.utcnow)

    def serialize(self):
        return {
            "id":               self.id,
            "course_id":        self.course_id,
            "title":            self.title,
            "description":      self.description,
            "video_url":        self.video_url,
            "duration_secs":    self.duration_secs,
            "is_free_preview":  self.is_free_preview,
            "order":            self.order,
            "content_type":     self.content_type,
            "text_content":     self.text_content,
        }

    def serialize_preview(self):
        """Safe version for unenrolled users — no video_url unless free preview."""
        d = self.serialize()
        if not self.is_free_preview:
            d.pop("video_url", None)
            d.pop("text_content", None)
        return d


class Enrollment(db.Model):
    __tablename__ = "enrollments"

    id                = db.Column(db.Integer, primary_key=True)
    course_id         = db.Column(db.Integer, db.ForeignKey("courses.id"), nullable=False)
    user_id           = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    paid              = db.Column(db.Boolean, default=False)
    amount_paid       = db.Column(db.Float, default=0.0)
    payment_intent_id = db.Column(db.String(100), nullable=True)
    progress_pct      = db.Column(db.Integer, default=0)
    completed_lessons = db.Column(db.JSON, default=list)
    enrolled_at       = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at      = db.Column(db.DateTime, nullable=True)

    student = db.relationship("User", foreign_keys=[user_id])

    def serialize(self):
        return {
            "id":                self.id,
            "course_id":         self.course_id,
            "user_id":           self.user_id,
            "paid":              self.paid,
            "amount_paid":       self.amount_paid,
            "progress_pct":      self.progress_pct,
            "completed_lessons": self.completed_lessons or [],
            "enrolled_at":       self.enrolled_at.isoformat() if self.enrolled_at else None,
            "completed_at":      self.completed_at.isoformat() if self.completed_at else None,
        }

    def serialize_with_course(self):
        data = self.serialize()
        data["course"] = self.course.serialize() if self.course else None
        return data


class CourseReview(db.Model):
    __tablename__ = "course_reviews"

    id         = db.Column(db.Integer, primary_key=True)
    course_id  = db.Column(db.Integer, db.ForeignKey("courses.id"), nullable=False)
    user_id    = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    rating     = db.Column(db.Integer, nullable=False)   # 1–5
    body       = db.Column(db.Text, default="")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    reviewer = db.relationship("User", foreign_keys=[user_id])

    def serialize(self):
        return {
            "id":          self.id,
            "course_id":   self.course_id,
            "user_id":     self.user_id,
            "username":    self.reviewer.username if self.reviewer else None,
            "avatar":      getattr(self.reviewer, "profile_image", None),
            "rating":      self.rating,
            "body":        self.body,
            "created_at":  self.created_at.isoformat() if self.created_at else None,
        }