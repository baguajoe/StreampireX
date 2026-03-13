# =============================================================================
# sound_kit_routes.py — Sound Kit Management API
# =============================================================================
# Location: src/api/sound_kit_routes.py
# Endpoints:
#   POST   /api/soundkits                    — Create new kit
#   GET    /api/soundkits                    — List user's kits
#   GET    /api/soundkits/<id>               — Get kit with samples
#   PUT    /api/soundkits/<id>               — Update kit metadata
#   DELETE /api/soundkits/<id>               — Delete kit + samples
#   POST   /api/soundkits/<id>/samples       — Upload sample to kit
#   PUT    /api/soundkits/<id>/samples/<sid> — Update sample settings
#   DELETE /api/soundkits/<id>/samples/<sid> — Remove sample from kit
#   POST   /api/soundkits/<id>/samples/reorder — Reorder pad assignments
#   GET    /api/soundkits/community          — Browse public kits
#   POST   /api/soundkits/<id>/like          — Toggle like
#   POST   /api/soundkits/<id>/duplicate     — Copy kit to own library
#   GET    /api/soundkits/categories         — Get categories & genres
# =============================================================================

import os
import cloudinary
import cloudinary.uploader

# R2 primary storage
try:
    from api.r2_storage_setup import uploadFile as r2_upload
    _USE_R2 = True
except ImportError:
    _USE_R2 = False
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from api.extensions import db
from api.sound_kit_models import SoundKit, SoundKitSample, SoundKitLike

sound_kit_bp = Blueprint('sound_kit', __name__)


# ── Create new kit ──
@sound_kit_bp.route('/api/soundkits', methods=['POST'])
@jwt_required()
def create_kit():
    user_id = get_jwt_identity()
    data = request.get_json() or {}

    kit = SoundKit(
        user_id=user_id,
        name=data.get('name', 'Untitled Kit'),
        description=data.get('description', ''),
        category=data.get('category', 'General'),
        genre=data.get('genre', ''),
        tags=','.join(data.get('tags', [])) if isinstance(data.get('tags'), list) else data.get('tags', ''),
        is_public=data.get('is_public', False),
    )
    db.session.add(kit)
    db.session.commit()

    return jsonify({'msg': 'Kit created', 'kit': kit.serialize()}), 201


# ── List user's kits ──
@sound_kit_bp.route('/api/soundkits', methods=['GET'])
@jwt_required()
def list_kits():
    user_id = get_jwt_identity()
    category = request.args.get('category', '')
    
    query = SoundKit.query.filter_by(user_id=user_id)
    if category:
        query = query.filter_by(category=category)
    
    kits = query.order_by(SoundKit.updated_at.desc()).all()
    return jsonify({'kits': [k.serialize_short() for k in kits]}), 200


# ── Get kit with all samples ──
@sound_kit_bp.route('/api/soundkits/<int:kit_id>', methods=['GET'])
@jwt_required()
def get_kit(kit_id):
    user_id = get_jwt_identity()
    kit = SoundKit.query.get(kit_id)

    if not kit:
        return jsonify({'error': 'Kit not found'}), 404
    
    # Allow access if owner or if kit is public
    if kit.user_id != user_id and not kit.is_public:
        return jsonify({'error': 'Access denied'}), 403

    return jsonify({'kit': kit.serialize()}), 200


# ── Update kit metadata ──
@sound_kit_bp.route('/api/soundkits/<int:kit_id>', methods=['PUT'])
@jwt_required()
def update_kit(kit_id):
    user_id = get_jwt_identity()
    kit = SoundKit.query.get(kit_id)

    if not kit or kit.user_id != user_id:
        return jsonify({'error': 'Kit not found or access denied'}), 404

    data = request.get_json() or {}
    if 'name' in data: kit.name = data['name']
    if 'description' in data: kit.description = data['description']
    if 'category' in data: kit.category = data['category']
    if 'genre' in data: kit.genre = data['genre']
    if 'tags' in data:
        kit.tags = ','.join(data['tags']) if isinstance(data['tags'], list) else data['tags']
    if 'is_public' in data: kit.is_public = data['is_public']
    if 'cover_image_url' in data: kit.cover_image_url = data['cover_image_url']

    db.session.commit()
    return jsonify({'msg': 'Kit updated', 'kit': kit.serialize()}), 200


# ── Delete kit ──
@sound_kit_bp.route('/api/soundkits/<int:kit_id>', methods=['DELETE'])
@jwt_required()
def delete_kit(kit_id):
    user_id = get_jwt_identity()
    kit = SoundKit.query.get(kit_id)

    if not kit or kit.user_id != user_id:
        return jsonify({'error': 'Kit not found or access denied'}), 404

    # Delete Cloudinary assets for all samples
    for sample in kit.samples.all():
        if sample.cloudinary_public_id:
            try:
                cloudinary.uploader.destroy(sample.cloudinary_public_id, resource_type='video')
            except Exception:
                pass

    db.session.delete(kit)
    db.session.commit()
    return jsonify({'msg': 'Kit deleted'}), 200


# ── Upload sample to kit ──
@sound_kit_bp.route('/api/soundkits/<int:kit_id>/samples', methods=['POST'])
@jwt_required()
def upload_sample(kit_id):
    user_id = get_jwt_identity()
    kit = SoundKit.query.get(kit_id)

    if not kit or kit.user_id != user_id:
        return jsonify({'error': 'Kit not found or access denied'}), 404

    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file provided'}), 400

    audio_file = request.files['audio']
    if not audio_file.filename:
        return jsonify({'error': 'Empty filename'}), 400

    # Upload to R2 (primary) or Cloudinary (fallback)
    try:
        filename = f'soundkits/{user_id}/{kit_id}/sample_{kit.samples.count()}_{audio_file.filename}'
        if _USE_R2:
            audio_file.seek(0)
            audio_url = r2_upload(audio_file, filename)
            result = {'secure_url': audio_url, 'public_id': filename}
        else:
            result = cloudinary.uploader.upload(
                audio_file,
                resource_type='video',
                folder=f'streampirex/soundkits/{user_id}/{kit_id}',
                public_id=f'sample_{kit.samples.count()}_{audio_file.filename.rsplit(".", 1)[0][:30]}',
            )
    except Exception as e:
        return jsonify({'error': f'Upload failed: {str(e)}'}), 500

    # Parse form data
    pad_number = request.form.get('pad_number', -1, type=int)
    name = request.form.get('name', audio_file.filename.rsplit('.', 1)[0][:120])

    sample = SoundKitSample(
        kit_id=kit_id,
        audio_url=result.get('secure_url', ''),
        cloudinary_public_id=result.get('public_id', ''),
        name=name,
        original_filename=audio_file.filename[:255],
        pad_number=pad_number,
        midi_note=request.form.get('midi_note', -1, type=int),
        root_note=request.form.get('root_note', ''),
        duration=result.get('duration', 0),
        file_size=result.get('bytes', 0),
        file_type=audio_file.filename.rsplit('.', 1)[-1].lower() if '.' in audio_file.filename else 'wav',
        volume=request.form.get('volume', 1.0, type=float),
        pan=request.form.get('pan', 0.0, type=float),
        pitch=request.form.get('pitch', 0.0, type=float),
        is_one_shot=request.form.get('is_one_shot', 'true').lower() == 'true',
        is_loop=request.form.get('is_loop', 'false').lower() == 'true',
        color=request.form.get('color', '#FF6600'),
    )
    db.session.add(sample)
    db.session.commit()

    return jsonify({'msg': 'Sample uploaded', 'sample': sample.serialize()}), 201


# ── Update sample settings ──
@sound_kit_bp.route('/api/soundkits/<int:kit_id>/samples/<int:sample_id>', methods=['PUT'])
@jwt_required()
def update_sample(kit_id, sample_id):
    user_id = get_jwt_identity()
    kit = SoundKit.query.get(kit_id)

    if not kit or kit.user_id != user_id:
        return jsonify({'error': 'Access denied'}), 403

    sample = SoundKitSample.query.get(sample_id)
    if not sample or sample.kit_id != kit_id:
        return jsonify({'error': 'Sample not found'}), 404

    data = request.get_json() or {}
    for field in ['name', 'pad_number', 'midi_note', 'root_note', 'volume', 'pan',
                  'pitch', 'start_time', 'end_time', 'is_loop', 'is_one_shot', 'color']:
        if field in data:
            setattr(sample, field, data[field])

    db.session.commit()
    return jsonify({'msg': 'Sample updated', 'sample': sample.serialize()}), 200


# ── Delete sample ──
@sound_kit_bp.route('/api/soundkits/<int:kit_id>/samples/<int:sample_id>', methods=['DELETE'])
@jwt_required()
def delete_sample(kit_id, sample_id):
    user_id = get_jwt_identity()
    kit = SoundKit.query.get(kit_id)

    if not kit or kit.user_id != user_id:
        return jsonify({'error': 'Access denied'}), 403

    sample = SoundKitSample.query.get(sample_id)
    if not sample or sample.kit_id != kit_id:
        return jsonify({'error': 'Sample not found'}), 404

    # Delete from Cloudinary
    if sample.cloudinary_public_id:
        try:
            cloudinary.uploader.destroy(sample.cloudinary_public_id, resource_type='video')
        except Exception:
            pass

    db.session.delete(sample)
    db.session.commit()
    return jsonify({'msg': 'Sample deleted'}), 200


# ── Reorder pad assignments ──
@sound_kit_bp.route('/api/soundkits/<int:kit_id>/samples/reorder', methods=['POST'])
@jwt_required()
def reorder_samples(kit_id):
    user_id = get_jwt_identity()
    kit = SoundKit.query.get(kit_id)

    if not kit or kit.user_id != user_id:
        return jsonify({'error': 'Access denied'}), 403

    data = request.get_json() or {}
    # Expects: { "order": [{ "sample_id": 1, "pad_number": 0 }, ...] }
    order = data.get('order', [])

    for item in order:
        sample = SoundKitSample.query.get(item.get('sample_id'))
        if sample and sample.kit_id == kit_id:
            sample.pad_number = item.get('pad_number', -1)

    db.session.commit()
    return jsonify({'msg': 'Samples reordered'}), 200


# ── Community: browse public kits ──
@sound_kit_bp.route('/api/soundkits/community', methods=['GET'])
@jwt_required()
def community_kits():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    category = request.args.get('category', '')
    genre = request.args.get('genre', '')
    search = request.args.get('q', '')
    sort = request.args.get('sort', 'newest')  # newest, popular, downloads

    query = SoundKit.query.filter_by(is_public=True)

    if category:
        query = query.filter_by(category=category)
    if genre:
        query = query.filter_by(genre=genre)
    if search:
        query = query.filter(
            db.or_(
                SoundKit.name.ilike(f'%{search}%'),
                SoundKit.tags.ilike(f'%{search}%'),
                SoundKit.description.ilike(f'%{search}%'),
            )
        )

    if sort == 'popular':
        query = query.order_by(SoundKit.like_count.desc())
    elif sort == 'downloads':
        query = query.order_by(SoundKit.download_count.desc())
    else:
        query = query.order_by(SoundKit.created_at.desc())

    pagination = query.paginate(page=page, per_page=min(per_page, 50), error_out=False)

    return jsonify({
        'kits': [k.serialize_short() for k in pagination.items],
        'total': pagination.total,
        'page': pagination.page,
        'pages': pagination.pages,
    }), 200


# ── Like / unlike kit ──
@sound_kit_bp.route('/api/soundkits/<int:kit_id>/like', methods=['POST'])
@jwt_required()
def toggle_like(kit_id):
    user_id = get_jwt_identity()
    kit = SoundKit.query.get(kit_id)

    if not kit:
        return jsonify({'error': 'Kit not found'}), 404

    existing = SoundKitLike.query.filter_by(user_id=user_id, kit_id=kit_id).first()

    if existing:
        db.session.delete(existing)
        kit.like_count = max(0, kit.like_count - 1)
        db.session.commit()
        return jsonify({'msg': 'Unliked', 'liked': False, 'like_count': kit.like_count}), 200
    else:
        like = SoundKitLike(user_id=user_id, kit_id=kit_id)
        db.session.add(like)
        kit.like_count += 1
        db.session.commit()
        return jsonify({'msg': 'Liked', 'liked': True, 'like_count': kit.like_count}), 200


# ── Duplicate kit to own library ──
@sound_kit_bp.route('/api/soundkits/<int:kit_id>/duplicate', methods=['POST'])
@jwt_required()
def duplicate_kit(kit_id):
    user_id = get_jwt_identity()
    original = SoundKit.query.get(kit_id)

    if not original:
        return jsonify({'error': 'Kit not found'}), 404

    # Must be public or owned by user
    if original.user_id != user_id and not original.is_public:
        return jsonify({'error': 'Access denied'}), 403

    # Create copy
    new_kit = SoundKit(
        user_id=user_id,
        name=f"{original.name} (Copy)",
        description=original.description,
        category=original.category,
        genre=original.genre,
        tags=original.tags,
        is_public=False,  # Copies start as private
    )
    db.session.add(new_kit)
    db.session.flush()  # Get new_kit.id

    # Copy samples (reference same audio URLs — no re-upload needed)
    for sample in original.samples.all():
        new_sample = SoundKitSample(
            kit_id=new_kit.id,
            audio_url=sample.audio_url,
            cloudinary_public_id='',  # Don't copy — owner manages originals
            name=sample.name,
            original_filename=sample.original_filename,
            pad_number=sample.pad_number,
            midi_note=sample.midi_note,
            root_note=sample.root_note,
            duration=sample.duration,
            sample_rate=sample.sample_rate,
            channels=sample.channels,
            file_size=sample.file_size,
            file_type=sample.file_type,
            volume=sample.volume,
            pan=sample.pan,
            pitch=sample.pitch,
            start_time=sample.start_time,
            end_time=sample.end_time,
            is_loop=sample.is_loop,
            is_one_shot=sample.is_one_shot,
            color=sample.color,
        )
        db.session.add(new_sample)

    # Increment download count on original
    original.download_count += 1
    db.session.commit()

    return jsonify({'msg': 'Kit duplicated', 'kit': new_kit.serialize()}), 201


# ── Categories & genres list ──
@sound_kit_bp.route('/api/soundkits/categories', methods=['GET'])
def kit_categories():
    categories = [
        {'name': 'Drums', 'emoji': '🥁', 'description': 'Kick, snare, hi-hat, percussion kits'},
        {'name': 'Bass', 'emoji': '🎸', 'description': '808s, sub bass, bass guitar samples'},
        {'name': 'Synth', 'emoji': '🎹', 'description': 'Synth leads, pads, stabs, arps'},
        {'name': 'Vocals', 'emoji': '🎤', 'description': 'Vocal chops, ad-libs, choir'},
        {'name': 'FX', 'emoji': '✨', 'description': 'Risers, impacts, sweeps, transitions'},
        {'name': 'Guitar', 'emoji': '🎻', 'description': 'Guitar loops, chords, riffs'},
        {'name': 'Keys', 'emoji': '🎵', 'description': 'Piano, organ, rhodes, clavinet'},
        {'name': 'Loops', 'emoji': '🔁', 'description': 'Full drum loops, melodic loops'},
        {'name': 'One Shots', 'emoji': '💥', 'description': 'Single-hit samples'},
        {'name': 'General', 'emoji': '📦', 'description': 'Mixed sample collections'},
    ]
    genres = [
        'Trap', 'Boom Bap', 'Lo-Fi', 'House', 'Techno', 'Drill', 'Reggaeton',
        'R&B', 'Pop', 'EDM', 'Drum & Bass', 'Jazz', 'Afrobeats', 'Dancehall',
        'Phonk', 'Latin', 'Rock', 'Gospel', 'Synthwave', 'Ambient', 'Cinematic',
    ]
    return jsonify({'categories': categories, 'genres': genres}), 200