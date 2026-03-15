# =============================================================================
# film_routes.py — Film & Series API Routes for StreamPireX
# =============================================================================
# Location: src/api/film_routes.py
#
# Register in app.py:
#   from api.film_routes import film_bp
#   app.register_blueprint(film_bp)
#
# Add to app.py imports of models:
#   from api.film_models import (Film, FilmCredit, FilmReview, Theatre,
#       TheatreFollow, Screening, ScreeningTicket, FilmPurchase,
#       FestivalSubmission, FestivalVote)
# =============================================================================

import os
import uuid
import json
import boto3
import stripe
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request
from api.extensions import db
from api.models import User
from api.film_models import (
    Film, FilmCredit, FilmReview, Theatre, TheatreFollow,
    Screening, ScreeningTicket, FilmPurchase,
    FestivalSubmission, FestivalVote
)

film_bp = Blueprint('film', __name__, url_prefix='/api/film')

stripe.api_key = os.environ.get('STRIPE_SECRET_KEY', '')

PLATFORM_CUT = 0.10  # 10% platform fee

# ─────────────────────────────────────────────────────────────────────────────
# R2 UPLOAD HELPER (matches existing pattern in video_editor_routes.py)
# ─────────────────────────────────────────────────────────────────────────────
R2_ENDPOINT   = os.environ.get('R2_ENDPOINT_URL', '')
R2_ACCESS_KEY = os.environ.get('R2_ACCESS_KEY', '')
R2_SECRET_KEY = os.environ.get('R2_SECRET_KEY', '')
R2_BUCKET     = os.environ.get('R2_BUCKET_NAME', 'streampirex-media')
R2_PUBLIC_URL = os.environ.get('R2_PUBLIC_URL', '')


def get_r2_client():
    return boto3.client(
        's3',
        endpoint_url=R2_ENDPOINT,
        aws_access_key_id=R2_ACCESS_KEY,
        aws_secret_access_key=R2_SECRET_KEY,
    )


def upload_to_r2(file_obj, folder, filename, content_type):
    """Upload a file object to R2 and return the public URL."""
    try:
        client = get_r2_client()
        key = f"{folder}/{uuid.uuid4().hex}_{filename}"
        client.upload_fileobj(
            file_obj,
            R2_BUCKET,
            key,
            ExtraArgs={'ContentType': content_type}
        )
        return f"{R2_PUBLIC_URL}/{key}"
    except Exception as e:
        current_app.logger.error(f"R2 upload error: {e}")
        return None


def optional_auth():
    """Try JWT auth but don't require it."""
    try:
        verify_jwt_in_request(optional=True)
        return get_jwt_identity()
    except Exception:
        return None


# =============================================================================
# THEATRE ROUTES
# =============================================================================

@film_bp.route('/theatre/my', methods=['GET'])
@jwt_required()
def get_my_theatre():
    """Get the current user's theatre."""
    user_id = get_jwt_identity()
    theatre = Theatre.query.filter_by(creator_id=user_id).first()
    if not theatre:
        return jsonify({'theatre': None}), 200
    return jsonify(theatre.serialize()), 200


@film_bp.route('/theatre', methods=['POST'])
@jwt_required()
def create_theatre():
    """Create a new theatre for the current user."""
    user_id = get_jwt_identity()
    existing = Theatre.query.filter_by(creator_id=user_id).first()
    if existing:
        return jsonify({'error': 'You already have a theatre'}), 400

    data = request.get_json()
    theatre = Theatre(
        creator_id=user_id,
        name=data.get('name', 'My Theatre'),
        tagline=data.get('tagline', ''),
        bio=data.get('bio', ''),
        website=data.get('website', ''),
        instagram=data.get('instagram', ''),
        twitter=data.get('twitter', ''),
        imdb_url=data.get('imdb_url', ''),
        is_sag=data.get('is_sag', False),
    )
    db.session.add(theatre)
    db.session.commit()
    return jsonify(theatre.serialize()), 201


@film_bp.route('/theatre/<int:theatre_id>', methods=['GET'])
def get_theatre(theatre_id):
    """Get a theatre by ID (public)."""
    theatre = Theatre.query.get_or_404(theatre_id)
    data = theatre.serialize()
    # Include films
    films = Film.query.filter_by(theatre_id=theatre_id, is_published=True).order_by(Film.created_at.desc()).all()
    data['films'] = [f.serialize() for f in films]
    # Include upcoming screenings
    upcoming = Screening.query.filter_by(theatre_id=theatre_id, is_complete=False)\
        .filter(Screening.scheduled_at >= datetime.utcnow())\
        .order_by(Screening.scheduled_at.asc()).limit(5).all()
    data['upcoming_screenings'] = [s.serialize() for s in upcoming]
    return jsonify(data), 200


@film_bp.route('/theatre/by-creator/<int:creator_id>', methods=['GET'])
def get_theatre_by_creator(creator_id):
    """Get a theatre by creator user ID (public)."""
    theatre = Theatre.query.filter_by(creator_id=creator_id).first()
    if not theatre:
        return jsonify({'error': 'No theatre found'}), 404
    data = theatre.serialize()
    films = Film.query.filter_by(theatre_id=theatre.id, is_published=True).order_by(Film.created_at.desc()).all()
    data['films'] = [f.serialize() for f in films]
    return jsonify(data), 200


@film_bp.route('/theatre/<int:theatre_id>', methods=['PUT'])
@jwt_required()
def update_theatre(theatre_id):
    """Update theatre profile."""
    user_id = get_jwt_identity()
    theatre = Theatre.query.filter_by(id=theatre_id, creator_id=user_id).first_or_404()
    data = request.get_json()

    fields = ['name', 'tagline', 'bio', 'logo_url', 'banner_url', 'trailer_url',
              'website', 'instagram', 'twitter', 'imdb_url', 'is_sag']
    for field in fields:
        if field in data:
            setattr(theatre, field, data[field])

    if 'awards' in data:
        theatre.awards_json = json.dumps(data['awards'])

    theatre.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify(theatre.serialize()), 200


@film_bp.route('/theatre/<int:theatre_id>/upload-logo', methods=['POST'])
@jwt_required()
def upload_theatre_logo(theatre_id):
    """Upload theatre logo to R2."""
    user_id = get_jwt_identity()
    theatre = Theatre.query.filter_by(id=theatre_id, creator_id=user_id).first_or_404()
    file = request.files.get('file')
    if not file:
        return jsonify({'error': 'No file provided'}), 400
    url = upload_to_r2(file, 'theatre/logos', file.filename, file.content_type)
    if not url:
        return jsonify({'error': 'Upload failed'}), 500
    theatre.logo_url = url
    db.session.commit()
    return jsonify({'url': url}), 200


@film_bp.route('/theatre/<int:theatre_id>/upload-banner', methods=['POST'])
@jwt_required()
def upload_theatre_banner(theatre_id):
    """Upload theatre banner to R2."""
    user_id = get_jwt_identity()
    theatre = Theatre.query.filter_by(id=theatre_id, creator_id=user_id).first_or_404()
    file = request.files.get('file')
    if not file:
        return jsonify({'error': 'No file provided'}), 400
    url = upload_to_r2(file, 'theatre/banners', file.filename, file.content_type)
    if not url:
        return jsonify({'error': 'Upload failed'}), 500
    theatre.banner_url = url
    db.session.commit()
    return jsonify({'url': url}), 200


@film_bp.route('/theatre/<int:theatre_id>/follow', methods=['POST'])
@jwt_required()
def follow_theatre(theatre_id):
    """Follow or unfollow a theatre."""
    user_id = get_jwt_identity()
    theatre = Theatre.query.get_or_404(theatre_id)
    existing = TheatreFollow.query.filter_by(theatre_id=theatre_id, user_id=user_id).first()

    if existing:
        db.session.delete(existing)
        theatre.follower_count = max(0, theatre.follower_count - 1)
        db.session.commit()
        return jsonify({'following': False, 'follower_count': theatre.follower_count}), 200
    else:
        follow = TheatreFollow(theatre_id=theatre_id, user_id=user_id)
        db.session.add(follow)
        theatre.follower_count += 1
        db.session.commit()
        return jsonify({'following': True, 'follower_count': theatre.follower_count}), 200


@film_bp.route('/theatre/<int:theatre_id>/follow-status', methods=['GET'])
@jwt_required()
def follow_status(theatre_id):
    """Check if current user follows this theatre."""
    user_id = get_jwt_identity()
    following = TheatreFollow.query.filter_by(theatre_id=theatre_id, user_id=user_id).first() is not None
    return jsonify({'following': following}), 200


@film_bp.route('/theatre/feed', methods=['GET'])
@jwt_required()
def theatre_feed():
    """Get films from theatres the user follows."""
    user_id = get_jwt_identity()
    followed = TheatreFollow.query.filter_by(user_id=user_id).all()
    theatre_ids = [f.theatre_id for f in followed]
    films = Film.query.filter(Film.theatre_id.in_(theatre_ids), Film.is_published == True)\
        .order_by(Film.created_at.desc()).limit(30).all()
    return jsonify([f.serialize() for f in films]), 200


# =============================================================================
# FILM ROUTES
# =============================================================================

@film_bp.route('/films', methods=['GET'])
def browse_films():
    """Browse all published films (public)."""
    film_type  = request.args.get('type')        # feature | short | documentary | etc
    genre      = request.args.get('genre')
    search     = request.args.get('q', '')
    sort       = request.args.get('sort', 'newest')  # newest | popular | rating
    featured   = request.args.get('featured')
    page       = request.args.get('page', 1, type=int)
    per_page   = request.args.get('per_page', 20, type=int)

    q = Film.query.filter_by(is_published=True)

    if film_type:
        q = q.filter_by(film_type=film_type)
    if genre:
        q = q.filter_by(genre=genre)
    if featured:
        q = q.filter_by(is_featured=True)
    if search:
        q = q.filter(
            Film.title.ilike(f'%{search}%') |
            Film.synopsis.ilike(f'%{search}%')
        )

    if sort == 'popular':
        q = q.order_by(Film.views.desc())
    elif sort == 'rating':
        q = q.order_by(Film.likes.desc())
    else:
        q = q.order_by(Film.created_at.desc())

    pagination = q.paginate(page=page, per_page=per_page, error_out=False)
    return jsonify({
        'films': [f.serialize() for f in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
        'page':  page,
    }), 200


@film_bp.route('/films/shorts', methods=['GET'])
def browse_shorts():
    """Browse short films specifically."""
    genre  = request.args.get('genre')
    sort   = request.args.get('sort', 'newest')
    page   = request.args.get('page', 1, type=int)

    q = Film.query.filter_by(is_published=True, film_type='short')
    if genre:
        q = q.filter_by(genre=genre)
    if sort == 'popular':
        q = q.order_by(Film.views.desc())
    else:
        q = q.order_by(Film.created_at.desc())

    pagination = q.paginate(page=page, per_page=20, error_out=False)
    return jsonify({
        'films': [f.serialize() for f in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
    }), 200


@film_bp.route('/films/trending', methods=['GET'])
def trending_films():
    """Get trending films by views in last 30 days."""
    films = Film.query.filter_by(is_published=True)\
        .order_by(Film.views.desc()).limit(20).all()
    return jsonify([f.serialize() for f in films]), 200


@film_bp.route('/films/featured', methods=['GET'])
def featured_films():
    """Get staff-picked featured films."""
    films = Film.query.filter_by(is_published=True, is_featured=True)\
        .order_by(Film.created_at.desc()).limit(10).all()
    return jsonify([f.serialize() for f in films]), 200


@film_bp.route('/films/my', methods=['GET'])
@jwt_required()
def my_films():
    """Get all films by the current user."""
    user_id = get_jwt_identity()
    films = Film.query.filter_by(creator_id=user_id)\
        .order_by(Film.created_at.desc()).all()
    return jsonify([f.serialize(include_credits=True) for f in films]), 200


@film_bp.route('/films/<int:film_id>', methods=['GET'])
def get_film(film_id):
    """Get a single film with full details."""
    user_id = optional_auth()
    film = Film.query.get_or_404(film_id)

    if not film.is_published:
        if film.creator_id != user_id:
            return jsonify({'error': 'Not found'}), 404

    # Increment view count
    if film.is_published:
        film.views += 1
        db.session.commit()

    data = film.serialize(include_credits=True)
    data['reviews'] = [r.serialize() for r in film.reviews[:10]]

    # Check if user has access
    if user_id:
        data['has_access'] = _check_film_access(film, user_id)
    else:
        data['has_access'] = film.pricing_model == 'free'

    # Theatre info
    if film.theatre:
        data['theatre'] = film.theatre.serialize()

    return jsonify(data), 200


@film_bp.route('/films', methods=['POST'])
@jwt_required()
def create_film():
    """Create a new film entry."""
    user_id = get_jwt_identity()
    data = request.get_json()

    # Auto-attach to user's theatre if they have one
    theatre = Theatre.query.filter_by(creator_id=user_id).first()

    film = Film(
        creator_id=user_id,
        theatre_id=theatre.id if theatre else None,
        title=data.get('title', 'Untitled Film'),
        tagline=data.get('tagline', ''),
        synopsis=data.get('synopsis', ''),
        film_type=data.get('film_type', 'short'),
        genre=data.get('genre', ''),
        rating=data.get('rating', 'NR'),
        runtime_minutes=data.get('runtime_minutes'),
        language=data.get('language', 'English'),
        country=data.get('country', ''),
        release_year=data.get('release_year', datetime.utcnow().year),
        tags_json=json.dumps(data.get('tags', [])),
        poster_url=data.get('poster_url', ''),
        banner_url=data.get('banner_url', ''),
        trailer_url=data.get('trailer_url', ''),
        film_url=data.get('film_url', ''),
        subtitle_url=data.get('subtitle_url', ''),
        pricing_model=data.get('pricing_model', 'free'),
        rent_price=data.get('rent_price', 0.0),
        buy_price=data.get('buy_price', 0.0),
        is_sag=data.get('is_sag', False),
        production_company=data.get('production_company', ''),
        distribution_rights=data.get('distribution_rights', ''),
        laurels_json=json.dumps(data.get('laurels', [])),
        is_published=data.get('is_published', False),
    )
    db.session.add(film)
    db.session.commit()
    return jsonify(film.serialize()), 201


@film_bp.route('/films/<int:film_id>', methods=['PUT'])
@jwt_required()
def update_film(film_id):
    """Update a film."""
    user_id = get_jwt_identity()
    film = Film.query.filter_by(id=film_id, creator_id=user_id).first_or_404()
    data = request.get_json()

    fields = ['title', 'tagline', 'synopsis', 'film_type', 'genre', 'rating',
              'runtime_minutes', 'language', 'country', 'release_year',
              'poster_url', 'banner_url', 'trailer_url', 'film_url', 'subtitle_url',
              'pricing_model', 'rent_price', 'buy_price', 'is_sag',
              'production_company', 'distribution_rights', 'is_published']
    for field in fields:
        if field in data:
            setattr(film, field, data[field])

    if 'tags' in data:
        film.tags_json = json.dumps(data['tags'])
    if 'laurels' in data:
        film.laurels_json = json.dumps(data['laurels'])

    film.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify(film.serialize()), 200


@film_bp.route('/films/<int:film_id>', methods=['DELETE'])
@jwt_required()
def delete_film(film_id):
    """Delete a film."""
    user_id = get_jwt_identity()
    film = Film.query.filter_by(id=film_id, creator_id=user_id).first_or_404()
    db.session.delete(film)
    db.session.commit()
    return jsonify({'message': 'Film deleted'}), 200


# ── Film Media Uploads ────────────────────────────────────────────────────────

@film_bp.route('/films/<int:film_id>/upload-poster', methods=['POST'])
@jwt_required()
def upload_poster(film_id):
    user_id = get_jwt_identity()
    film = Film.query.filter_by(id=film_id, creator_id=user_id).first_or_404()
    file = request.files.get('file')
    if not file:
        return jsonify({'error': 'No file'}), 400
    url = upload_to_r2(file, 'films/posters', file.filename, file.content_type)
    if not url:
        return jsonify({'error': 'Upload failed'}), 500
    film.poster_url = url
    db.session.commit()
    return jsonify({'url': url}), 200


@film_bp.route('/films/<int:film_id>/upload-banner', methods=['POST'])
@jwt_required()
def upload_film_banner(film_id):
    user_id = get_jwt_identity()
    film = Film.query.filter_by(id=film_id, creator_id=user_id).first_or_404()
    file = request.files.get('file')
    if not file:
        return jsonify({'error': 'No file'}), 400
    url = upload_to_r2(file, 'films/banners', file.filename, file.content_type)
    if not url:
        return jsonify({'error': 'Upload failed'}), 500
    film.banner_url = url
    db.session.commit()
    return jsonify({'url': url}), 200


@film_bp.route('/films/<int:film_id>/upload-trailer', methods=['POST'])
@jwt_required()
def upload_trailer(film_id):
    user_id = get_jwt_identity()
    film = Film.query.filter_by(id=film_id, creator_id=user_id).first_or_404()
    file = request.files.get('file')
    if not file:
        return jsonify({'error': 'No file'}), 400
    url = upload_to_r2(file, 'films/trailers', file.filename, 'video/mp4')
    if not url:
        return jsonify({'error': 'Upload failed'}), 500
    film.trailer_url = url
    db.session.commit()
    return jsonify({'url': url}), 200


@film_bp.route('/films/<int:film_id>/upload-film', methods=['POST'])
@jwt_required()
def upload_film_file(film_id):
    user_id = get_jwt_identity()
    film = Film.query.filter_by(id=film_id, creator_id=user_id).first_or_404()
    file = request.files.get('file')
    if not file:
        return jsonify({'error': 'No file'}), 400
    url = upload_to_r2(file, 'films/full', file.filename, 'video/mp4')
    if not url:
        return jsonify({'error': 'Upload failed'}), 500
    film.film_url = url
    db.session.commit()
    return jsonify({'url': url}), 200


@film_bp.route('/films/<int:film_id>/upload-subtitles', methods=['POST'])
@jwt_required()
def upload_subtitles(film_id):
    user_id = get_jwt_identity()
    film = Film.query.filter_by(id=film_id, creator_id=user_id).first_or_404()
    file = request.files.get('file')
    if not file:
        return jsonify({'error': 'No file'}), 400
    url = upload_to_r2(file, 'films/subtitles', file.filename, 'text/vtt')
    if not url:
        return jsonify({'error': 'Upload failed'}), 500
    film.subtitle_url = url
    db.session.commit()
    return jsonify({'url': url}), 200


@film_bp.route('/films/<int:film_id>/like', methods=['POST'])
@jwt_required()
def like_film(film_id):
    """Like a film."""
    film = Film.query.get_or_404(film_id)
    film.likes += 1
    db.session.commit()
    return jsonify({'likes': film.likes}), 200


# =============================================================================
# FILM CREDITS ROUTES
# =============================================================================

@film_bp.route('/films/<int:film_id>/credits', methods=['GET'])
def get_credits(film_id):
    Film.query.get_or_404(film_id)
    credits = FilmCredit.query.filter_by(film_id=film_id).order_by(FilmCredit.order).all()
    return jsonify([c.serialize() for c in credits]), 200


@film_bp.route('/films/<int:film_id>/credits', methods=['POST'])
@jwt_required()
def add_credit(film_id):
    user_id = get_jwt_identity()
    film = Film.query.filter_by(id=film_id, creator_id=user_id).first_or_404()
    data = request.get_json()

    credit = FilmCredit(
        film_id=film_id,
        role=data.get('role', 'Other'),
        name=data.get('name', ''),
        character_name=data.get('character_name', ''),
        is_lead=data.get('is_lead', False),
        is_sag_member=data.get('is_sag_member', False),
        headshot_url=data.get('headshot_url', ''),
        imdb_url=data.get('imdb_url', ''),
        order=data.get('order', 0),
    )
    db.session.add(credit)
    db.session.commit()
    return jsonify(credit.serialize()), 201


@film_bp.route('/films/<int:film_id>/credits/<int:credit_id>', methods=['PUT'])
@jwt_required()
def update_credit(film_id, credit_id):
    user_id = get_jwt_identity()
    Film.query.filter_by(id=film_id, creator_id=user_id).first_or_404()
    credit = FilmCredit.query.filter_by(id=credit_id, film_id=film_id).first_or_404()
    data = request.get_json()
    for field in ['role', 'name', 'character_name', 'is_lead', 'is_sag_member',
                  'headshot_url', 'imdb_url', 'order']:
        if field in data:
            setattr(credit, field, data[field])
    db.session.commit()
    return jsonify(credit.serialize()), 200


@film_bp.route('/films/<int:film_id>/credits/<int:credit_id>', methods=['DELETE'])
@jwt_required()
def delete_credit(film_id, credit_id):
    user_id = get_jwt_identity()
    Film.query.filter_by(id=film_id, creator_id=user_id).first_or_404()
    credit = FilmCredit.query.filter_by(id=credit_id, film_id=film_id).first_or_404()
    db.session.delete(credit)
    db.session.commit()
    return jsonify({'message': 'Credit deleted'}), 200


# =============================================================================
# FILM REVIEWS ROUTES
# =============================================================================

@film_bp.route('/films/<int:film_id>/reviews', methods=['GET'])
def get_reviews(film_id):
    Film.query.get_or_404(film_id)
    reviews = FilmReview.query.filter_by(film_id=film_id)\
        .order_by(FilmReview.created_at.desc()).all()
    return jsonify([r.serialize() for r in reviews]), 200


@film_bp.route('/films/<int:film_id>/reviews', methods=['POST'])
@jwt_required()
def add_review(film_id):
    user_id = get_jwt_identity()
    Film.query.get_or_404(film_id)

    existing = FilmReview.query.filter_by(film_id=film_id, user_id=user_id).first()
    if existing:
        return jsonify({'error': 'You already reviewed this film'}), 400

    data = request.get_json()
    rating = data.get('rating', 5)
    if not 1 <= rating <= 5:
        return jsonify({'error': 'Rating must be 1-5'}), 400

    review = FilmReview(
        film_id=film_id,
        user_id=user_id,
        rating=rating,
        review_text=data.get('review_text', ''),
    )
    db.session.add(review)
    db.session.commit()
    return jsonify(review.serialize()), 201


# =============================================================================
# FILM ACCESS / PURCHASE ROUTES
# =============================================================================

def _check_film_access(film, user_id):
    """Check if a user has access to watch a film."""
    if film.pricing_model == 'free':
        return True
    if film.creator_id == user_id:
        return True
    purchase = FilmPurchase.query.filter_by(film_id=film.id, user_id=user_id).first()
    if not purchase:
        return False
    if purchase.purchase_type == 'buy':
        return True
    if purchase.purchase_type == 'rent':
        return purchase.expires_at and purchase.expires_at > datetime.utcnow()
    return False


@film_bp.route('/films/<int:film_id>/access', methods=['GET'])
@jwt_required()
def check_access(film_id):
    user_id = get_jwt_identity()
    film = Film.query.get_or_404(film_id)
    return jsonify({'has_access': _check_film_access(film, user_id)}), 200


@film_bp.route('/films/<int:film_id>/purchase', methods=['POST'])
@jwt_required()
def purchase_film(film_id):
    """Create a Stripe checkout session to rent or buy a film."""
    user_id = get_jwt_identity()
    film = Film.query.get_or_404(film_id)
    data = request.get_json()
    purchase_type = data.get('type', 'buy')  # rent | buy

    if film.pricing_model == 'free':
        return jsonify({'error': 'This film is free'}), 400

    price = film.rent_price if purchase_type == 'rent' else film.buy_price
    if price <= 0:
        return jsonify({'error': 'Invalid price'}), 400

    frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')

    try:
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'usd',
                    'product_data': {
                        'name': f"{'Rent' if purchase_type == 'rent' else 'Buy'}: {film.title}",
                        'images': [film.poster_url] if film.poster_url else [],
                    },
                    'unit_amount': int(price * 100),
                },
                'quantity': 1,
            }],
            mode='payment',
            success_url=f"{frontend_url}/film/{film_id}?purchase=success&type={purchase_type}",
            cancel_url=f"{frontend_url}/film/{film_id}",
            metadata={
                'film_id': film_id,
                'user_id': user_id,
                'purchase_type': purchase_type,
            }
        )
        return jsonify({'checkout_url': session.url}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@film_bp.route('/films/purchase/webhook', methods=['POST'])
def purchase_webhook():
    """Stripe webhook for film purchases."""
    payload = request.get_data()
    sig_header = request.headers.get('Stripe-Signature')
    webhook_secret = os.environ.get('STRIPE_FILM_WEBHOOK_SECRET', '')

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
    except Exception as e:
        return jsonify({'error': str(e)}), 400

    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        meta = session.get('metadata', {})
        film_id = int(meta.get('film_id', 0))
        user_id = int(meta.get('user_id', 0))
        purchase_type = meta.get('purchase_type', 'buy')

        film = Film.query.get(film_id)
        if film and user_id:
            expires_at = None
            if purchase_type == 'rent':
                expires_at = datetime.utcnow() + timedelta(hours=film.rent_duration_hours)

            purchase = FilmPurchase(
                film_id=film_id,
                user_id=user_id,
                purchase_type=purchase_type,
                amount_paid=session.get('amount_total', 0) / 100,
                stripe_session_id=session.get('id'),
                expires_at=expires_at,
            )
            db.session.add(purchase)
            db.session.commit()

    return jsonify({'received': True}), 200


# =============================================================================
# SCREENING ROUTES
# =============================================================================

@film_bp.route('/screenings', methods=['GET'])
def browse_screenings():
    """Browse upcoming screenings (public)."""
    screenings = Screening.query.filter(
        Screening.scheduled_at >= datetime.utcnow(),
        Screening.is_complete == False
    ).order_by(Screening.scheduled_at.asc()).limit(20).all()
    return jsonify([s.serialize() for s in screenings]), 200


@film_bp.route('/screenings/my', methods=['GET'])
@jwt_required()
def my_screenings():
    """Get all screenings by the current user."""
    user_id = get_jwt_identity()
    screenings = Screening.query.filter_by(creator_id=user_id)\
        .order_by(Screening.scheduled_at.desc()).all()
    return jsonify([s.serialize() for s in screenings]), 200


@film_bp.route('/screenings/<int:screening_id>', methods=['GET'])
def get_screening(screening_id):
    screening = Screening.query.get_or_404(screening_id)
    data = screening.serialize()
    film = Film.query.get(screening.film_id)
    if film:
        data['film'] = film.serialize()
    return jsonify(data), 200


@film_bp.route('/screenings', methods=['POST'])
@jwt_required()
def create_screening():
    """Schedule a new screening."""
    user_id = get_jwt_identity()
    data = request.get_json()

    theatre = Theatre.query.filter_by(creator_id=user_id).first()
    scheduled_at = datetime.fromisoformat(data.get('scheduled_at'))

    screening = Screening(
        film_id=data.get('film_id'),
        theatre_id=theatre.id if theatre else None,
        creator_id=user_id,
        title=data.get('title', 'Screening'),
        description=data.get('description', ''),
        scheduled_at=scheduled_at,
        duration_minutes=data.get('duration_minutes'),
        ticket_price=data.get('ticket_price', 0.0),
        capacity=data.get('capacity'),
        has_qa=data.get('has_qa', False),
    )
    db.session.add(screening)
    db.session.commit()
    return jsonify(screening.serialize()), 201


@film_bp.route('/screenings/<int:screening_id>', methods=['PUT'])
@jwt_required()
def update_screening(screening_id):
    user_id = get_jwt_identity()
    screening = Screening.query.filter_by(id=screening_id, creator_id=user_id).first_or_404()
    data = request.get_json()

    for field in ['title', 'description', 'ticket_price', 'capacity', 'has_qa',
                  'is_live', 'is_complete', 'recording_url']:
        if field in data:
            setattr(screening, field, data[field])

    if 'scheduled_at' in data:
        screening.scheduled_at = datetime.fromisoformat(data['scheduled_at'])

    db.session.commit()
    return jsonify(screening.serialize()), 200


@film_bp.route('/screenings/<int:screening_id>/ticket', methods=['POST'])
@jwt_required()
def buy_ticket(screening_id):
    """Buy a ticket to a screening via Stripe."""
    user_id = get_jwt_identity()
    screening = Screening.query.get_or_404(screening_id)

    if screening.capacity and screening.sold_count >= screening.capacity:
        return jsonify({'error': 'Screening is sold out'}), 400

    existing = ScreeningTicket.query.filter_by(
        screening_id=screening_id, user_id=user_id
    ).first()
    if existing:
        return jsonify({'error': 'You already have a ticket'}), 400

    # Free screening
    if screening.ticket_price == 0:
        ticket = ScreeningTicket(
            screening_id=screening_id,
            user_id=user_id,
            amount_paid=0.0,
        )
        db.session.add(ticket)
        screening.sold_count += 1
        db.session.commit()
        return jsonify({'ticket': ticket.serialize(), 'free': True}), 200

    # Paid screening via Stripe
    frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
    film = Film.query.get(screening.film_id)
    try:
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'usd',
                    'product_data': {
                        'name': f"Ticket: {screening.title or film.title if film else 'Screening'}",
                    },
                    'unit_amount': int(screening.ticket_price * 100),
                },
                'quantity': 1,
            }],
            mode='payment',
            success_url=f"{frontend_url}/screening/{screening_id}?ticket=success",
            cancel_url=f"{frontend_url}/screening/{screening_id}",
            metadata={
                'screening_id': screening_id,
                'user_id': user_id,
            }
        )
        return jsonify({'checkout_url': session.url}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@film_bp.route('/screenings/<int:screening_id>/has-ticket', methods=['GET'])
@jwt_required()
def has_ticket(screening_id):
    user_id = get_jwt_identity()
    ticket = ScreeningTicket.query.filter_by(
        screening_id=screening_id, user_id=user_id
    ).first()
    return jsonify({'has_ticket': ticket is not None}), 200


# =============================================================================
# FESTIVAL ROUTES
# =============================================================================

@film_bp.route('/festival/current', methods=['GET'])
def current_festival():
    """Get the current month's festival submissions."""
    month = datetime.utcnow().strftime('%Y-%m')
    submissions = FestivalSubmission.query.filter_by(festival_month=month)\
        .order_by(FestivalSubmission.votes.desc()).all()

    # Group by category
    categories = {}
    for sub in submissions:
        film = Film.query.get(sub.film_id)
        if not film:
            continue
        if sub.category not in categories:
            categories[sub.category] = []
        entry = sub.serialize()
        entry['film'] = film.serialize()
        categories[sub.category].append(entry)

    return jsonify({
        'month': month,
        'categories': categories,
        'total_submissions': len(submissions),
    }), 200


@film_bp.route('/festival/submit', methods=['POST'])
@jwt_required()
def submit_to_festival():
    """Submit a short film to the monthly festival."""
    user_id = get_jwt_identity()
    data = request.get_json()
    film_id = data.get('film_id')
    category = data.get('category', 'Best Short')
    month = datetime.utcnow().strftime('%Y-%m')

    film = Film.query.filter_by(id=film_id, creator_id=user_id).first_or_404()

    # Only shorts can be submitted
    if film.film_type not in ['short', 'animation', 'experimental']:
        return jsonify({'error': 'Only short films can be submitted to the festival'}), 400

    existing = FestivalSubmission.query.filter_by(
        film_id=film_id, festival_month=month
    ).first()
    if existing:
        return jsonify({'error': 'This film is already submitted this month'}), 400

    submission = FestivalSubmission(
        film_id=film_id,
        creator_id=user_id,
        festival_month=month,
        category=category,
    )
    db.session.add(submission)
    db.session.commit()
    return jsonify(submission.serialize()), 201


@film_bp.route('/festival/vote/<int:submission_id>', methods=['POST'])
@jwt_required()
def vote_for_film(submission_id):
    """Vote for a festival submission."""
    user_id = get_jwt_identity()
    submission = FestivalSubmission.query.get_or_404(submission_id)

    existing = FestivalVote.query.filter_by(
        submission_id=submission_id, user_id=user_id
    ).first()
    if existing:
        return jsonify({'error': 'You already voted for this film'}), 400

    vote = FestivalVote(submission_id=submission_id, user_id=user_id)
    submission.votes += 1
    db.session.add(vote)
    db.session.commit()
    return jsonify({'votes': submission.votes}), 200


@film_bp.route('/festival/my-submissions', methods=['GET'])
@jwt_required()
def my_festival_submissions():
    user_id = get_jwt_identity()
    submissions = FestivalSubmission.query.filter_by(creator_id=user_id)\
        .order_by(FestivalSubmission.created_at.desc()).all()
    return jsonify([s.serialize() for s in submissions]), 200
