# =============================================================================
# mic_simulator_routes.py - Mic Simulator Backend API
# =============================================================================
# Endpoints:
#   GET    /api/mic-sim/profiles          — List all built-in mic profiles
#   GET    /api/mic-sim/presets           — Get user's saved custom presets
#   POST   /api/mic-sim/presets           — Save a new custom preset
#   PUT    /api/mic-sim/presets/<id>      — Update a custom preset
#   DELETE /api/mic-sim/presets/<id>      — Delete a custom preset
#   POST   /api/mic-sim/recordings       — Upload a mic sim recording
#   GET    /api/mic-sim/recordings       — List user's mic sim recordings
#   DELETE /api/mic-sim/recordings/<id>  — Delete a recording
# =============================================================================

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
import cloudinary
import cloudinary.uploader
from src.api.extensions import db
from src.api.models import MicSimPreset, MicSimRecording, User

mic_simulator_bp = Blueprint('mic_simulator', __name__)

# =============================================================================
# BUILT-IN MIC PROFILES (reference data — matches frontend MicSimulator.js)
# =============================================================================

BUILTIN_PROFILES = [
    {
        "id": "flat",
        "name": "Flat / Bypass",
        "type": "reference",
        "description": "No coloration — transparent pass-through",
        "use_cases": ["Reference monitoring", "A/B comparison baseline"],
        "frequency_character": "Flat response across full spectrum"
    },
    {
        "id": "sm7b",
        "name": "Shure SM7B",
        "type": "dynamic",
        "description": "Industry-standard broadcast/podcast dynamic mic with warm midrange presence",
        "use_cases": ["Podcasting", "Vocals", "Broadcast", "Voiceover"],
        "frequency_character": "Bass roll-off below 200Hz, presence peak 2-6kHz, gentle HF roll-off"
    },
    {
        "id": "u87",
        "name": "Neumann U87",
        "type": "condenser",
        "description": "Legendary large-diaphragm condenser with detailed high-frequency air",
        "use_cases": ["Studio vocals", "Acoustic instruments", "Orchestral recording"],
        "frequency_character": "Slight LF warmth, detailed 8-12kHz presence, extended HF air"
    },
    {
        "id": "sm58",
        "name": "Shure SM58",
        "type": "dynamic",
        "description": "Rugged live vocal mic with built-in proximity bass boost",
        "use_cases": ["Live vocals", "Stage performance", "Rehearsal"],
        "frequency_character": "Proximity bass boost, mid presence peak 5-10kHz, HF roll-off above 12kHz"
    },
    {
        "id": "c414",
        "name": "AKG C414",
        "type": "condenser",
        "description": "Versatile large-diaphragm condenser — the studio workhorse",
        "use_cases": ["Vocals", "Overheads", "Acoustic guitar", "Room mics"],
        "frequency_character": "Flat low-end, subtle 3kHz presence, bright 10kHz shelf"
    },
    {
        "id": "nt1",
        "name": "Rode NT1",
        "type": "condenser",
        "description": "Ultra-quiet condenser with modern clarity",
        "use_cases": ["Home studio vocals", "ASMR", "Quiet sources"],
        "frequency_character": "Extended flat low-end, presence 5kHz, airy shimmer 12kHz+"
    },
    {
        "id": "vintage47",
        "name": "Vintage 47 (Tube)",
        "type": "tube_condenser",
        "description": "Classic tube condenser character — warm, rich, saturated",
        "use_cases": ["Vintage vocal sound", "Jazz", "R&B", "Analog character"],
        "frequency_character": "Warm LF saturation, smooth mids, gentle HF roll-off with tube harmonics"
    },
    {
        "id": "ribbon121",
        "name": "Ribbon 121",
        "type": "ribbon",
        "description": "Figure-8 ribbon mic — dark, smooth, natural",
        "use_cases": ["Guitar amps", "Brass", "Strings", "Room ambience"],
        "frequency_character": "Natural bass, smooth midrange, steep HF roll-off above 10kHz"
    },
    {
        "id": "telephone",
        "name": "Telephone",
        "type": "effect",
        "description": "Classic telephone bandpass effect — lo-fi vocal character",
        "use_cases": ["Lo-fi effect", "Vocal FX", "Retro sound design"],
        "frequency_character": "Bandpass 300Hz-3.4kHz, heavy roll-off both ends"
    },
    {
        "id": "fmradio",
        "name": "FM Radio",
        "type": "effect",
        "description": "FM broadcast chain — compressed, bright, present",
        "use_cases": ["Radio voice effect", "Broadcast simulation", "DJ drops"],
        "frequency_character": "HPF at 50Hz, strong 3-5kHz presence, LPF at 15kHz"
    }
]


# =============================================================================
# GET BUILT-IN PROFILES
# =============================================================================

@mic_simulator_bp.route('/api/mic-sim/profiles', methods=['GET'])
def get_profiles():
    """Return all built-in mic profiles (public — no auth needed)"""
    return jsonify({
        'success': True,
        'profiles': BUILTIN_PROFILES,
        'count': len(BUILTIN_PROFILES)
    }), 200


# =============================================================================
# CUSTOM PRESETS — CRUD
# =============================================================================

@mic_simulator_bp.route('/api/mic-sim/presets', methods=['GET'])
@jwt_required()
def get_presets():
    """Get all custom mic presets for current user"""
    user_id = get_jwt_identity()

    presets = MicSimPreset.query.filter_by(user_id=user_id)\
        .order_by(MicSimPreset.updated_at.desc()).all()

    return jsonify({
        'success': True,
        'presets': [p.serialize() for p in presets],
        'count': len(presets)
    }), 200


@mic_simulator_bp.route('/api/mic-sim/presets', methods=['POST'])
@jwt_required()
def create_preset():
    """Save a new custom mic preset"""
    user_id = get_jwt_identity()
    data = request.get_json()

    if not data or not data.get('name'):
        return jsonify({'success': False, 'error': 'Preset name is required'}), 400

    # Check duplicate names for this user
    existing = MicSimPreset.query.filter_by(
        user_id=user_id, name=data['name']
    ).first()
    if existing:
        return jsonify({'success': False, 'error': 'A preset with that name already exists'}), 409

    preset = MicSimPreset(
        user_id=user_id,
        name=data['name'],
        description=data.get('description', ''),
        base_profile=data.get('base_profile', 'flat'),
        filters=data.get('filters', []),
        noise_gate_enabled=data.get('noise_gate_enabled', False),
        noise_gate_threshold=data.get('noise_gate_threshold', -40),
        input_gain=data.get('input_gain', 1.0),
        output_gain=data.get('output_gain', 1.0),
        is_public=data.get('is_public', False)
    )

    db.session.add(preset)
    db.session.commit()

    return jsonify({
        'success': True,
        'preset': preset.serialize(),
        'message': f'Preset "{preset.name}" saved'
    }), 201


@mic_simulator_bp.route('/api/mic-sim/presets/<int:preset_id>', methods=['PUT'])
@jwt_required()
def update_preset(preset_id):
    """Update an existing custom preset"""
    user_id = get_jwt_identity()
    data = request.get_json()

    preset = MicSimPreset.query.filter_by(id=preset_id, user_id=user_id).first()
    if not preset:
        return jsonify({'success': False, 'error': 'Preset not found'}), 404

    # Update fields
    if 'name' in data:
        preset.name = data['name']
    if 'description' in data:
        preset.description = data['description']
    if 'base_profile' in data:
        preset.base_profile = data['base_profile']
    if 'filters' in data:
        preset.filters = data['filters']
    if 'noise_gate_enabled' in data:
        preset.noise_gate_enabled = data['noise_gate_enabled']
    if 'noise_gate_threshold' in data:
        preset.noise_gate_threshold = data['noise_gate_threshold']
    if 'input_gain' in data:
        preset.input_gain = data['input_gain']
    if 'output_gain' in data:
        preset.output_gain = data['output_gain']
    if 'is_public' in data:
        preset.is_public = data['is_public']

    preset.updated_at = datetime.utcnow()
    db.session.commit()

    return jsonify({
        'success': True,
        'preset': preset.serialize(),
        'message': f'Preset "{preset.name}" updated'
    }), 200


@mic_simulator_bp.route('/api/mic-sim/presets/<int:preset_id>', methods=['DELETE'])
@jwt_required()
def delete_preset(preset_id):
    """Delete a custom preset"""
    user_id = get_jwt_identity()

    preset = MicSimPreset.query.filter_by(id=preset_id, user_id=user_id).first()
    if not preset:
        return jsonify({'success': False, 'error': 'Preset not found'}), 404

    name = preset.name
    db.session.delete(preset)
    db.session.commit()

    return jsonify({
        'success': True,
        'message': f'Preset "{name}" deleted'
    }), 200


# =============================================================================
# PUBLIC / COMMUNITY PRESETS
# =============================================================================

@mic_simulator_bp.route('/api/mic-sim/presets/community', methods=['GET'])
@jwt_required()
def get_community_presets():
    """Browse public presets shared by other users"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    search = request.args.get('search', '', type=str)
    base_profile = request.args.get('base_profile', '', type=str)

    query = MicSimPreset.query.filter_by(is_public=True)

    if search:
        query = query.filter(
            db.or_(
                MicSimPreset.name.ilike(f'%{search}%'),
                MicSimPreset.description.ilike(f'%{search}%')
            )
        )
    if base_profile:
        query = query.filter_by(base_profile=base_profile)

    paginated = query.order_by(MicSimPreset.updated_at.desc())\
        .paginate(page=page, per_page=per_page, error_out=False)

    presets_data = []
    for p in paginated.items:
        data = p.serialize()
        creator = User.query.get(p.user_id)
        data['creator'] = {
            'id': creator.id,
            'username': creator.username,
            'profile_picture': getattr(creator, 'profile_picture', None)
        } if creator else None
        presets_data.append(data)

    return jsonify({
        'success': True,
        'presets': presets_data,
        'total': paginated.total,
        'page': paginated.page,
        'pages': paginated.pages
    }), 200


# =============================================================================
# RECORDINGS — Upload / List / Delete
# =============================================================================

@mic_simulator_bp.route('/api/mic-sim/recordings', methods=['POST'])
@jwt_required()
def upload_recording():
    """Upload a mic simulator recording to Cloudinary"""
    user_id = get_jwt_identity()

    if 'audio' not in request.files:
        return jsonify({'success': False, 'error': 'No audio file provided'}), 400

    audio_file = request.files['audio']
    mic_profile = request.form.get('mic_profile', 'flat')
    name = request.form.get('name', f'Mic Sim Recording - {mic_profile.upper()}')
    preset_id = request.form.get('preset_id', None, type=int)

    try:
        # Upload to Cloudinary
        result = cloudinary.uploader.upload(
            audio_file,
            resource_type="auto",
            folder=f"streampirex/mic_sim/{user_id}",
            public_id=f"micsim_{user_id}_{int(datetime.utcnow().timestamp())}",
            tags=["mic_sim", f"profile_{mic_profile}", f"user_{user_id}"]
        )

        recording = MicSimRecording(
            user_id=user_id,
            name=name,
            mic_profile=mic_profile,
            preset_id=preset_id,
            audio_url=result['secure_url'],
            cloudinary_public_id=result['public_id'],
            duration=result.get('duration', 0),
            file_size=result.get('bytes', 0),
            format=result.get('format', 'wav'),
            sample_rate=int(request.form.get('sample_rate', 44100))
        )

        db.session.add(recording)
        db.session.commit()

        return jsonify({
            'success': True,
            'recording': recording.serialize(),
            'message': f'Recording saved as "{name}"'
        }), 201

    except Exception as e:
        db.session.rollback()
        print(f"❌ Mic sim upload error: {e}")
        return jsonify({'success': False, 'error': f'Upload failed: {str(e)}'}), 500


@mic_simulator_bp.route('/api/mic-sim/recordings', methods=['GET'])
@jwt_required()
def get_recordings():
    """List user's mic simulator recordings"""
    user_id = get_jwt_identity()
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    mic_profile = request.args.get('mic_profile', '', type=str)

    query = MicSimRecording.query.filter_by(user_id=user_id)

    if mic_profile:
        query = query.filter_by(mic_profile=mic_profile)

    paginated = query.order_by(MicSimRecording.created_at.desc())\
        .paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'success': True,
        'recordings': [r.serialize() for r in paginated.items],
        'total': paginated.total,
        'page': paginated.page,
        'pages': paginated.pages
    }), 200


@mic_simulator_bp.route('/api/mic-sim/recordings/<int:recording_id>', methods=['GET'])
@jwt_required()
def get_recording(recording_id):
    """Get a single recording"""
    user_id = get_jwt_identity()

    recording = MicSimRecording.query.filter_by(
        id=recording_id, user_id=user_id
    ).first()

    if not recording:
        return jsonify({'success': False, 'error': 'Recording not found'}), 404

    return jsonify({
        'success': True,
        'recording': recording.serialize()
    }), 200


@mic_simulator_bp.route('/api/mic-sim/recordings/<int:recording_id>', methods=['PUT'])
@jwt_required()
def update_recording(recording_id):
    """Rename a recording"""
    user_id = get_jwt_identity()
    data = request.get_json()

    recording = MicSimRecording.query.filter_by(
        id=recording_id, user_id=user_id
    ).first()

    if not recording:
        return jsonify({'success': False, 'error': 'Recording not found'}), 404

    if 'name' in data:
        recording.name = data['name']

    db.session.commit()

    return jsonify({
        'success': True,
        'recording': recording.serialize()
    }), 200


@mic_simulator_bp.route('/api/mic-sim/recordings/<int:recording_id>', methods=['DELETE'])
@jwt_required()
def delete_recording(recording_id):
    """Delete a recording and its Cloudinary asset"""
    user_id = get_jwt_identity()

    recording = MicSimRecording.query.filter_by(
        id=recording_id, user_id=user_id
    ).first()

    if not recording:
        return jsonify({'success': False, 'error': 'Recording not found'}), 404

    # Delete from Cloudinary
    try:
        if recording.cloudinary_public_id:
            cloudinary.uploader.destroy(
                recording.cloudinary_public_id,
                resource_type="video"  # Cloudinary uses "video" for audio
            )
    except Exception as e:
        print(f"⚠️ Cloudinary delete warning: {e}")

    name = recording.name
    db.session.delete(recording)
    db.session.commit()

    return jsonify({
        'success': True,
        'message': f'Recording "{name}" deleted'
    }), 200