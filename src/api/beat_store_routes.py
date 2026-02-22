from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from datetime import datetime
import os, json, stripe

from src.api.models import db, User, Audio
from src.api.beat_store_models import Beat, BeatLicense, BeatPurchase, DEFAULT_LICENSE_TEMPLATES

try:
    from src.api.r2_storage_setup import uploadFile, getSignedUrl
except ImportError:
    from src.api.cloudinary_setup import uploadFile
    getSignedUrl = None

stripe.api_key = os.getenv('STRIPE_SECRET_KEY')
PLATFORM_CUT = 0.10

beat_store_bp = Blueprint('beat_store', __name__)


@beat_store_bp.route('/api/beats', methods=['GET'])
def browse_beats():
    try:
        query = Beat.query.filter(Beat.is_active == True, Beat.is_sold_exclusive == False)

        search = request.args.get('q', '').strip()
        if search:
            sf = f"%{search}%"
            query = query.join(User, Beat.producer_id == User.id).filter(
                db.or_(Beat.title.ilike(sf), Beat.genre.ilike(sf), Beat.mood.ilike(sf),
                       User.username.ilike(sf), Beat.tags.cast(db.String).ilike(sf)))

        genre = request.args.get('genre')
        if genre and genre != 'all':
            query = query.filter(Beat.genre.ilike(f"%{genre}%"))

        mood = request.args.get('mood')
        if mood and mood != 'all':
            query = query.filter(Beat.mood.ilike(f"%{mood}%"))

        bpm_min = request.args.get('bpm_min', type=int)
        bpm_max = request.args.get('bpm_max', type=int)
        if bpm_min: query = query.filter(Beat.bpm >= bpm_min)
        if bpm_max: query = query.filter(Beat.bpm <= bpm_max)

        key = request.args.get('key')
        if key: query = query.filter(Beat.key.ilike(f"%{key}%"))

        price_min = request.args.get('price_min', type=float)
        price_max = request.args.get('price_max', type=float)
        if price_min is not None: query = query.filter(Beat.base_price >= price_min)
        if price_max is not None: query = query.filter(Beat.base_price <= price_max)

        if request.args.get('free') == 'true':
            query = query.filter(Beat.is_free_download == True)

        producer_id = request.args.get('producer_id', type=int)
        if producer_id: query = query.filter(Beat.producer_id == producer_id)

        sort = request.args.get('sort', 'newest')
        if sort == 'popular': query = query.order_by(Beat.plays.desc())
        elif sort == 'price_low': query = query.order_by(Beat.base_price.asc())
        elif sort == 'price_high': query = query.order_by(Beat.base_price.desc())
        elif sort == 'best_selling': query = query.order_by(Beat.total_sales.desc())
        else: query = query.order_by(Beat.created_at.desc())

        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 50)
        paginated = query.paginate(page=page, per_page=per_page, error_out=False)

        return jsonify({
            "beats": [b.serialize_card() for b in paginated.items],
            "total": paginated.total, "page": page,
            "per_page": per_page, "pages": paginated.pages,
            "has_next": paginated.has_next,
        }), 200
    except Exception as e:
        return jsonify({"error": f"Failed to fetch beats: {str(e)}"}), 500


@beat_store_bp.route('/api/beats/<int:beat_id>', methods=['GET'])
def get_beat_detail(beat_id):
    beat = Beat.query.get(beat_id)
    if not beat or not beat.is_active:
        return jsonify({"error": "Beat not found"}), 404
    beat.plays = (beat.plays or 0) + 1
    db.session.commit()
    return jsonify(beat.serialize()), 200


@beat_store_bp.route('/api/beats/genres', methods=['GET'])
def get_beat_genres():
    genres = db.session.query(Beat.genre).filter(Beat.is_active == True, Beat.genre.isnot(None)).distinct().all()
    return jsonify([g[0] for g in genres if g[0]]), 200


@beat_store_bp.route('/api/beats/trending', methods=['GET'])
def get_trending_beats():
    limit = request.args.get('limit', 10, type=int)
    beats = Beat.query.filter(Beat.is_active == True, Beat.is_sold_exclusive == False).order_by(Beat.plays.desc()).limit(min(limit, 20)).all()
    return jsonify([b.serialize_card() for b in beats]), 200


@beat_store_bp.route('/api/beats', methods=['POST'])
@jwt_required()
def create_beat():
    user_id = get_jwt_identity()
    try:
        title = request.form.get('title', '').strip()
        if not title:
            return jsonify({"error": "Beat title is required"}), 400

        tags_raw = request.form.get('tags', '[]')
        try:
            tags = json.loads(tags_raw) if tags_raw else []
        except json.JSONDecodeError:
            tags = [t.strip() for t in tags_raw.split(',') if t.strip()]

        preview_url = mp3_url = wav_url = stems_url = artwork_url = None

        if 'preview_file' in request.files:
            f = request.files['preview_file']
            if f and f.filename: preview_url = uploadFile(f, secure_filename(f.filename))

        if not preview_url and 'audio_file' in request.files:
            f = request.files['audio_file']
            if f and f.filename: preview_url = uploadFile(f, secure_filename(f.filename))

        if not preview_url:
            return jsonify({"error": "Preview audio file is required"}), 400

        if 'mp3_file' in request.files:
            f = request.files['mp3_file']
            if f and f.filename: mp3_url = uploadFile(f, secure_filename(f.filename))

        if 'wav_file' in request.files:
            f = request.files['wav_file']
            if f and f.filename: wav_url = uploadFile(f, secure_filename(f.filename))

        if 'stems_file' in request.files:
            f = request.files['stems_file']
            if f and f.filename: stems_url = uploadFile(f, secure_filename(f.filename))

        if 'artwork' in request.files:
            f = request.files['artwork']
            if f and f.filename: artwork_url = uploadFile(f, secure_filename(f.filename))

        beat = Beat(
            producer_id=user_id, title=title,
            description=request.form.get('description', '').strip(),
            genre=request.form.get('genre', ''), sub_genre=request.form.get('sub_genre', ''),
            mood=request.form.get('mood', ''), tags=tags,
            bpm=request.form.get('bpm', type=int), key=request.form.get('key', ''),
            duration=request.form.get('duration', ''),
            preview_url=preview_url, mp3_url=mp3_url or preview_url,
            wav_url=wav_url, stems_url=stems_url, artwork_url=artwork_url,
            source=request.form.get('source', 'upload'),
            audio_id=request.form.get('audio_id', type=int),
        )
        db.session.add(beat)
        db.session.flush()

        licenses_raw = request.form.get('licenses')
        if licenses_raw:
            try:
                for lic in json.loads(licenses_raw):
                    db.session.add(BeatLicense(
                        beat_id=beat.id, license_type=lic.get('license_type', 'basic'),
                        name=lic.get('name', 'Lease'), price=float(lic.get('price', 29.99)),
                        file_format=lic.get('file_format', 'mp3'),
                        includes_stems=lic.get('includes_stems', False),
                        distribution_limit=lic.get('distribution_limit'),
                        streaming_limit=lic.get('streaming_limit'),
                        music_video=lic.get('music_video', False),
                        radio_broadcasting=lic.get('radio_broadcasting', False),
                        live_performance=lic.get('live_performance', True),
                        is_exclusive=lic.get('is_exclusive', False),
                        credit_required=lic.get('credit_required', True),
                        custom_terms=lic.get('custom_terms'),
                    ))
            except (json.JSONDecodeError, TypeError):
                pass
        else:
            _create_default_licenses(beat)

        beat.base_price = _get_lowest_price(beat.id)
        db.session.commit()
        return jsonify({"message": "Beat listed successfully!", "beat": beat.serialize()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to create beat: {str(e)}"}), 500


@beat_store_bp.route('/api/beats/<int:beat_id>', methods=['PUT'])
@jwt_required()
def update_beat(beat_id):
    user_id = get_jwt_identity()
    beat = Beat.query.filter_by(id=beat_id, producer_id=user_id).first()
    if not beat: return jsonify({"error": "Beat not found or unauthorized"}), 404

    data = request.get_json() or {}
    for field in ['title', 'description', 'genre', 'sub_genre', 'mood', 'bpm',
                  'key', 'tags', 'is_active', 'is_free_download', 'allow_offers']:
        if field in data: setattr(beat, field, data[field])

    db.session.commit()
    return jsonify({"message": "Beat updated", "beat": beat.serialize()}), 200


@beat_store_bp.route('/api/beats/<int:beat_id>', methods=['DELETE'])
@jwt_required()
def delete_beat(beat_id):
    user_id = get_jwt_identity()
    beat = Beat.query.filter_by(id=beat_id, producer_id=user_id).first()
    if not beat: return jsonify({"error": "Beat not found or unauthorized"}), 404
    beat.is_active = False
    db.session.commit()
    return jsonify({"message": "Beat removed from store"}), 200


@beat_store_bp.route('/api/beats/my-beats', methods=['GET'])
@jwt_required()
def get_my_beats():
    user_id = get_jwt_identity()
    beats = Beat.query.filter_by(producer_id=user_id).order_by(Beat.created_at.desc()).all()
    return jsonify({
        "beats": [b.serialize() for b in beats],
        "stats": {
            "total_beats": len(beats),
            "active_beats": sum(1 for b in beats if b.is_active and not b.is_sold_exclusive),
            "total_sales": sum(b.total_sales or 0 for b in beats),
            "total_revenue": round(sum(b.total_revenue or 0 for b in beats), 2)
        }
    }), 200


@beat_store_bp.route('/api/beats/<int:beat_id>/licenses', methods=['GET'])
def get_beat_licenses(beat_id):
    licenses = BeatLicense.query.filter_by(beat_id=beat_id, is_active=True).order_by(BeatLicense.price.asc()).all()
    return jsonify([l.serialize() for l in licenses]), 200


@beat_store_bp.route('/api/beats/<int:beat_id>/licenses', methods=['POST'])
@jwt_required()
def add_license(beat_id):
    user_id = get_jwt_identity()
    beat = Beat.query.filter_by(id=beat_id, producer_id=user_id).first()
    if not beat: return jsonify({"error": "Beat not found or unauthorized"}), 404

    data = request.get_json()
    license_obj = BeatLicense(
        beat_id=beat.id, license_type=data.get('license_type', 'basic'),
        name=data.get('name', 'Lease'), price=float(data.get('price', 29.99)),
        file_format=data.get('file_format', 'mp3'),
        includes_stems=data.get('includes_stems', False),
        distribution_limit=data.get('distribution_limit'),
        streaming_limit=data.get('streaming_limit'),
        music_video=data.get('music_video', False),
        radio_broadcasting=data.get('radio_broadcasting', False),
        live_performance=data.get('live_performance', True),
        is_exclusive=data.get('is_exclusive', False),
        credit_required=data.get('credit_required', True),
        custom_terms=data.get('custom_terms'),
    )
    db.session.add(license_obj)
    beat.base_price = _get_lowest_price(beat.id)
    db.session.commit()
    return jsonify({"message": "License added", "license": license_obj.serialize()}), 201


@beat_store_bp.route('/api/beat-licenses/<int:license_id>', methods=['PUT'])
@jwt_required()
def update_license(license_id):
    user_id = get_jwt_identity()
    license_obj = BeatLicense.query.get(license_id)
    if not license_obj: return jsonify({"error": "License not found"}), 404

    beat = Beat.query.get(license_obj.beat_id)
    if not beat or beat.producer_id != user_id: return jsonify({"error": "Unauthorized"}), 403

    data = request.get_json()
    for field in ['name', 'price', 'file_format', 'includes_stems', 'distribution_limit',
                  'streaming_limit', 'music_video', 'radio_broadcasting', 'live_performance',
                  'credit_required', 'custom_terms', 'is_active']:
        if field in data: setattr(license_obj, field, data[field])

    beat.base_price = _get_lowest_price(beat.id)
    db.session.commit()
    return jsonify({"message": "License updated", "license": license_obj.serialize()}), 200


@beat_store_bp.route('/api/beats/license-templates', methods=['GET'])
def get_license_templates():
    return jsonify(DEFAULT_LICENSE_TEMPLATES), 200


@beat_store_bp.route('/api/beats/<int:beat_id>/purchase', methods=['POST'])
@jwt_required()
def purchase_beat(beat_id):
    user_id = get_jwt_identity()
    data = request.get_json()
    license_id = data.get('license_id')
    if not license_id: return jsonify({"error": "license_id is required"}), 400

    beat = Beat.query.get(beat_id)
    if not beat or not beat.is_active: return jsonify({"error": "Beat not found"}), 404
    if beat.is_sold_exclusive: return jsonify({"error": "Beat sold exclusively"}), 400
    if beat.producer_id == user_id: return jsonify({"error": "Cannot purchase your own beat"}), 400

    license_obj = BeatLicense.query.filter_by(id=license_id, beat_id=beat_id, is_active=True).first()
    if not license_obj: return jsonify({"error": "License not found"}), 404

    if license_obj.is_exclusive:
        existing = BeatPurchase.query.filter_by(beat_id=beat_id, is_exclusive=True, payment_status='completed').first()
        if existing: return jsonify({"error": "Exclusive rights already sold"}), 400

    price = license_obj.price
    platform_cut = round(price * PLATFORM_CUT, 2)
    producer_earnings = round(price - platform_cut, 2)

    try:
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'usd',
                    'product_data': {
                        'name': f"{beat.title} - {license_obj.name}",
                        'description': f"Producer: {beat.producer.username} | {license_obj.file_format.upper()}",
                        'images': [beat.artwork_url] if beat.artwork_url and beat.artwork_url.startswith('http') else []
                    },
                    'unit_amount': int(price * 100),
                },
                'quantity': 1,
            }],
            mode='payment',
            success_url=f"{os.getenv('FRONTEND_URL')}/beats/purchase-success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{os.getenv('FRONTEND_URL')}/beats/{beat_id}",
            metadata={
                'type': 'beat_purchase', 'beat_id': str(beat_id),
                'license_id': str(license_id), 'buyer_id': str(user_id),
                'producer_id': str(beat.producer_id),
                'platform_cut': str(platform_cut), 'producer_earnings': str(producer_earnings),
            }
        )

        purchase = BeatPurchase(
            beat_id=beat_id, buyer_id=user_id, license_id=license_id,
            amount_paid=price, platform_cut=platform_cut, producer_earnings=producer_earnings,
            stripe_session_id=checkout_session.id, payment_status='pending',
            license_type=license_obj.license_type, license_name=license_obj.name,
            file_format=license_obj.file_format, distribution_limit=license_obj.distribution_limit,
            streaming_limit=license_obj.streaming_limit, includes_stems=license_obj.includes_stems,
            is_exclusive=license_obj.is_exclusive,
        )
        db.session.add(purchase)
        db.session.commit()
        return jsonify({"checkout_url": checkout_session.url, "session_id": checkout_session.id, "purchase_id": purchase.id}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Checkout failed: {str(e)}"}), 500


@beat_store_bp.route('/api/beats/confirm-purchase', methods=['POST'])
@jwt_required()
def confirm_beat_purchase():
    user_id = get_jwt_identity()
    session_id = request.get_json().get('session_id')
    if not session_id: return jsonify({"error": "session_id required"}), 400

    purchase = BeatPurchase.query.filter_by(stripe_session_id=session_id, buyer_id=user_id).first()
    if not purchase: return jsonify({"error": "Purchase not found"}), 404
    if purchase.payment_status == 'completed':
        return jsonify({"message": "Already confirmed", "purchase": purchase.serialize()}), 200

    try:
        session = stripe.checkout.Session.retrieve(session_id)
        if session.payment_status == 'paid':
            purchase.payment_status = 'completed'
            purchase.stripe_payment_id = session.payment_intent
            purchase.contract_signed_at = datetime.utcnow()

            beat = Beat.query.get(purchase.beat_id)
            if beat:
                beat.total_sales = (beat.total_sales or 0) + 1
                beat.total_revenue = (beat.total_revenue or 0) + purchase.producer_earnings
                if purchase.is_exclusive: beat.is_sold_exclusive = True

            purchase.contract_url = f"/api/beats/purchases/{purchase.id}/contract"
            db.session.commit()
            return jsonify({
                "message": "Purchase confirmed!", "purchase": purchase.serialize(),
                "downloads": _get_download_info(purchase, beat), "contract_url": purchase.contract_url
            }), 200
        else:
            return jsonify({"error": "Payment not yet completed"}), 402
    except Exception as e:
        return jsonify({"error": f"Confirmation failed: {str(e)}"}), 500


@beat_store_bp.route('/api/beats/purchases/<int:purchase_id>/download', methods=['GET'])
@jwt_required()
def download_beat(purchase_id):
    user_id = get_jwt_identity()
    purchase = BeatPurchase.query.filter_by(id=purchase_id, buyer_id=user_id, payment_status='completed').first()
    if not purchase: return jsonify({"error": "Purchase not found"}), 404

    beat = Beat.query.get(purchase.beat_id)
    if not beat: return jsonify({"error": "Beat no longer available"}), 404

    purchase.download_count = (purchase.download_count or 0) + 1
    purchase.last_downloaded_at = datetime.utcnow()
    db.session.commit()
    return jsonify(_get_download_info(purchase, beat)), 200


@beat_store_bp.route('/api/beats/my-purchases', methods=['GET'])
@jwt_required()
def get_my_purchases():
    user_id = get_jwt_identity()
    purchases = BeatPurchase.query.filter_by(buyer_id=user_id, payment_status='completed').order_by(BeatPurchase.purchased_at.desc()).all()
    return jsonify([p.serialize() for p in purchases]), 200


@beat_store_bp.route('/api/beats/my-sales', methods=['GET'])
@jwt_required()
def get_my_sales():
    user_id = get_jwt_identity()
    beat_ids = [b.id for b in Beat.query.filter_by(producer_id=user_id).all()]
    if not beat_ids:
        return jsonify({"sales": [], "stats": {"total_sales": 0, "total_revenue": 0}}), 200

    sales = BeatPurchase.query.filter(
        BeatPurchase.beat_id.in_(beat_ids), BeatPurchase.payment_status == 'completed'
    ).order_by(BeatPurchase.purchased_at.desc()).all()
    total = sum(s.producer_earnings for s in sales)

    return jsonify({
        "sales": [s.serialize() for s in sales],
        "stats": {"total_sales": len(sales), "total_revenue": round(total, 2),
                  "avg_sale": round(total / len(sales), 2) if sales else 0}
    }), 200


@beat_store_bp.route('/api/beats/purchases/<int:purchase_id>/contract', methods=['GET'])
@jwt_required()
def get_license_contract(purchase_id):
    user_id = get_jwt_identity()
    purchase = BeatPurchase.query.filter_by(id=purchase_id).first()
    if not purchase: return jsonify({"error": "Purchase not found"}), 404

    beat = Beat.query.get(purchase.beat_id)
    if not beat: return jsonify({"error": "Beat not found"}), 404
    if user_id != purchase.buyer_id and user_id != beat.producer_id:
        return jsonify({"error": "Unauthorized"}), 403

    return jsonify({
        "contract": _generate_license_agreement(purchase, beat),
        "purchase_id": purchase.id,
        "signed_at": purchase.contract_signed_at.isoformat() if purchase.contract_signed_at else None,
    }), 200


@beat_store_bp.route('/api/beats/from-audio/<int:audio_id>', methods=['POST'])
@jwt_required()
def list_audio_as_beat(audio_id):
    user_id = get_jwt_identity()
    audio = Audio.query.filter_by(id=audio_id, user_id=user_id).first()
    if not audio: return jsonify({"error": "Audio not found or unauthorized"}), 404

    existing = Beat.query.filter_by(audio_id=audio_id).first()
    if existing: return jsonify({"error": "Already listed", "beat_id": existing.id}), 400

    data = request.get_json() or {}
    beat = Beat(
        producer_id=user_id, title=data.get('title', audio.title),
        description=data.get('description', audio.description or ''),
        genre=data.get('genre', audio.genre or ''), mood=data.get('mood', ''),
        bpm=data.get('bpm'), key=data.get('key', ''), duration=audio.duration,
        tags=data.get('tags', []), preview_url=audio.file_url, mp3_url=audio.file_url,
        wav_url=data.get('wav_url'), stems_url=data.get('stems_url'),
        artwork_url=audio.artwork_url or data.get('artwork_url'),
        source='beat_maker', audio_id=audio_id,
    )
    db.session.add(beat)
    db.session.flush()
    _create_default_licenses(beat)
    beat.base_price = _get_lowest_price(beat.id)
    db.session.commit()
    return jsonify({"message": "Track listed as beat!", "beat": beat.serialize()}), 201


def _create_default_licenses(beat):
    db.session.add(BeatLicense(beat_id=beat.id, **DEFAULT_LICENSE_TEMPLATES['basic'].copy()))
    if beat.wav_url:
        db.session.add(BeatLicense(beat_id=beat.id, **DEFAULT_LICENSE_TEMPLATES['premium'].copy()))
        db.session.add(BeatLicense(beat_id=beat.id, **DEFAULT_LICENSE_TEMPLATES['unlimited'].copy()))
    if beat.stems_url:
        db.session.add(BeatLicense(beat_id=beat.id, **DEFAULT_LICENSE_TEMPLATES['stems'].copy()))
    exclusive = DEFAULT_LICENSE_TEMPLATES['exclusive'].copy()
    if beat.wav_url:
        exclusive['file_format'] = 'wav+stems' if beat.stems_url else 'wav'
    else:
        exclusive['file_format'] = 'mp3'
        exclusive['includes_stems'] = bool(beat.stems_url)
    db.session.add(BeatLicense(beat_id=beat.id, **exclusive))


def _get_lowest_price(beat_id):
    lowest = BeatLicense.query.filter_by(beat_id=beat_id, is_active=True).order_by(BeatLicense.price.asc()).first()
    return lowest.price if lowest else 29.99


def _get_download_info(purchase, beat):
    downloads = {}
    if purchase.file_format == 'mp3':
        if beat.mp3_url: downloads['mp3'] = _signed(beat.mp3_url)
    elif purchase.file_format == 'wav':
        if beat.wav_url: downloads['wav'] = _signed(beat.wav_url)
        if beat.mp3_url: downloads['mp3'] = _signed(beat.mp3_url)
    elif purchase.file_format == 'wav+stems':
        if beat.wav_url: downloads['wav'] = _signed(beat.wav_url)
        if beat.mp3_url: downloads['mp3'] = _signed(beat.mp3_url)
        if beat.stems_url: downloads['stems'] = _signed(beat.stems_url)
    return downloads


def _signed(url):
    return getSignedUrl(url, expires_in=86400) if getSignedUrl else url


def _generate_license_agreement(purchase, beat):
    producer = User.query.get(beat.producer_id)
    buyer = User.query.get(purchase.buyer_id)
    p_name = producer.username if producer else "Producer"
    b_name = purchase.buyer_legal_name or (buyer.username if buyer else "Buyer")
    b_artist = purchase.buyer_artist_name or b_name
    dist = f"{purchase.distribution_limit:,}" if purchase.distribution_limit else "Unlimited"
    streams = f"{purchase.streaming_limit:,}" if purchase.streaming_limit else "Unlimited"
    date = purchase.purchased_at.strftime('%B %d, %Y') if purchase.purchased_at else 'N/A'
    exc = purchase.is_exclusive

    return f"""BEAT LICENSE AGREEMENT — StreamPireX
Agreement ID: SPX-{purchase.id:06d} | Date: {date}

LICENSOR (Producer): {p_name}
LICENSEE (Buyer): {b_name} (Artist: {b_artist})

BEAT: "{beat.title}" | BPM: {beat.bpm or 'N/A'} | Key: {beat.key or 'N/A'} | Genre: {beat.genre or 'N/A'}

LICENSE: {purchase.license_name} ({purchase.license_type.upper()})
Amount Paid: ${purchase.amount_paid:.2f} | Format: {purchase.file_format.upper()} | Stems: {"Yes" if purchase.includes_stems else "No"}

USAGE RIGHTS:
- Distribution Copies: {dist}
- Audio Streams: {streams}
- Music Video: {"Yes" if purchase.license_type in ('premium','unlimited','stems','exclusive') else "No"}
- Radio: {"Yes" if purchase.license_type in ('unlimited','stems','exclusive') else "No"}
- Live Performance: Yes
- {"EXCLUSIVE — Full ownership transferred. Beat removed from store." if exc else "NON-EXCLUSIVE — Other artists may also license this beat."}

TERMS:
1. Licensee may use this beat in one (1) new musical composition.
2. {"No credit required." if exc else f'Credit required: "Prod. by {p_name}" in all distributions.'}
3. {"All rights transferred to Licensee." if exc else "Licensor retains ownership. Usage rights only."}
4. Licensee may NOT resell the beat itself without a new song.
5. Licensee keeps 100% of revenue from songs made with this beat.
6. {"License is perpetual and irrevocable." if exc else "License is perpetual, subject to usage limits above."}

REVENUE: Producer received ${purchase.producer_earnings:.2f} (90%). StreamPireX retained ${purchase.platform_cut:.2f} (10%).

Licensor: {p_name} (via StreamPireX account)
Licensee: {b_name} (via Stripe payment on {date})
Transaction: {purchase.stripe_payment_id or purchase.stripe_session_id or 'Pending'}

Generated by StreamPireX. Both parties agreed at time of purchase."""