"""
reference_mastering_routes.py
StreamPireX — Reference Mastering API Routes

The frontend does Web Audio API analysis client-side for speed.
These backend routes handle:
  POST /api/mastering/reference-analyze   — server-side analysis via librosa (fallback)
  POST /api/mastering/session/snapshot    — save DAW session snapshot to R2
  GET  /api/mastering/session/snapshots   — list session snapshots
  DELETE /api/mastering/session/snapshot/<id> — delete snapshot

Requirements: pip install librosa numpy soundfile boto3
"""

import os
import io
import json
import uuid
import numpy as np
from datetime import datetime

import boto3
from botocore.client import Config
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

reference_mastering_bp = Blueprint('reference_mastering', __name__)

R2_ENDPOINT = os.environ.get('R2_ENDPOINT_URL', '')
R2_KEY      = os.environ.get('R2_ACCESS_KEY_ID', '')
R2_SECRET   = os.environ.get('R2_SECRET_ACCESS_KEY', '')
R2_BUCKET   = os.environ.get('R2_BUCKET_NAME', 'streampirex-media')

# s3 init moved to lazy loader
def get_s3():
    import os
    return boto3.client("s3", endpoint_url=os.environ.get("R2_ENDPOINT"), aws_access_key_id=os.environ.get("R2_ACCESS_KEY_ID"), aws_secret_access_key=os.environ.get("R2_SECRET_ACCESS_KEY"), region_name="auto"),
    region_name='auto',
)

def presign(key, expiry=3600):
    try:
        return s3.generate_presigned_url(
            'get_object',
            Params={'Bucket': R2_BUCKET, 'Key': key},
            ExpiresIn=expiry,
        )
    except Exception:
        return None


# ---------------------------------------------------------------------------
# POST /api/mastering/reference-analyze
# Body: multipart with 'mix' and 'reference' audio files
# Returns: LUFS, peak, dynamic range, stereo width, corrective EQ bands
# ---------------------------------------------------------------------------
@reference_mastering_bp.route('/api/mastering/reference-analyze', methods=['POST'])
@jwt_required()
def reference_analyze():
    mix_file = request.files.get('mix')
    ref_file = request.files.get('reference')

    if not mix_file or not ref_file:
        return jsonify({'error': 'Both mix and reference files are required'}), 400

    try:
        import librosa
        import soundfile as sf
    except ImportError:
        return jsonify({'error': 'librosa not installed — use client-side analysis'}), 501

    def analyze(audio_file):
        data, sr = sf.read(io.BytesIO(audio_file.read()))
        if data.ndim > 1:
            left  = data[:, 0]
            right = data[:, 1]
            mono  = (left + right) / 2
        else:
            left = right = mono = data

        # LUFS approximation (ITU-R BS.1770-4 simplified)
        block_size = int(sr * 0.4)
        hop        = block_size // 4
        blocks     = []
        for i in range(0, len(mono) - block_size, hop):
            block_rms = np.sqrt(np.mean(mono[i:i+block_size] ** 2))
            block_lufs = 10 * np.log10(max(block_rms ** 2, 1e-10)) - 0.691
            if block_lufs > -70:
                blocks.append(block_rms ** 2)

        lufs = (10 * np.log10(np.mean(blocks)) if blocks else -23)

        # Peak
        peak_db = 20 * np.log10(max(np.max(np.abs(mono)), 1e-10))

        # Dynamic range
        rms_db  = 20 * np.log10(max(np.sqrt(np.mean(mono ** 2)), 1e-10))
        dynamic_range = peak_db - rms_db

        # Stereo width
        if data.ndim > 1:
            mid  = (left + right) / 2
            side = (left - right) / 2
            mid_rms  = np.sqrt(np.mean(mid  ** 2))
            side_rms = np.sqrt(np.mean(side ** 2))
            stereo_width = min((side_rms / (mid_rms + 1e-10)) * 100, 100)
        else:
            stereo_width = 0

        # Frequency spectrum (mel spectrogram → per-band averages)
        S = np.abs(librosa.stft(mono, n_fft=4096))
        freqs = librosa.fft_frequencies(sr=sr, n_fft=4096)
        bands = [60, 120, 250, 500, 2000, 4000, 8000, 12000]
        freq_data = []
        for freq in bands:
            idx = np.argmin(np.abs(freqs - freq))
            avg_db = 20 * np.log10(max(np.mean(S[idx, :]), 1e-10))
            freq_data.append({'freq': freq, 'db': float(avg_db)})

        return {
            'lufs':          float(max(-60, min(0, lufs))),
            'peak':          float(peak_db),
            'dynamic_range': float(max(0, dynamic_range)),
            'stereo_width':  float(stereo_width),
            'freq_data':     freq_data,
            'duration':      float(len(mono) / sr),
        }

    mix_analysis = analyze(mix_file)
    ref_analysis = analyze(ref_file)

    # Compute corrective EQ
    corrections = []
    for m, r in zip(mix_analysis['freq_data'], ref_analysis['freq_data']):
        correction = max(-12, min(12, r['db'] - m['db']))
        corrections.append({
            'freq':       m['freq'],
            'my_db':      m['db'],
            'ref_db':     r['db'],
            'correction': correction,
        })

    gain_correction = ref_analysis['lufs'] - mix_analysis['lufs']

    return jsonify({
        'mix':             mix_analysis,
        'reference':       ref_analysis,
        'eq_corrections':  corrections,
        'gain_correction': float(max(-12, min(12, gain_correction))),
    }), 200


# ---------------------------------------------------------------------------
# POST /api/session/snapshot
# ---------------------------------------------------------------------------
@reference_mastering_bp.route('/api/session/snapshot', methods=['POST'])
@jwt_required()
def save_snapshot():
    user_id = get_jwt_identity()
    data = request.get_json()

    session_id = data.get('session_id', 'default')
    label      = data.get('label', f'Snapshot {datetime.utcnow().isoformat()}')
    snap_data  = data.get('data', {})

    snap_id    = str(uuid.uuid4())
    r2_key     = f'sessions/{user_id}/{session_id}/snapshots/{snap_id}.json'
    payload    = json.dumps({
        'id':         snap_id,
        'label':      label,
        'session_id': session_id,
        'user_id':    user_id,
        'created_at': datetime.utcnow().isoformat(),
        'data':       snap_data,
    })

    try:
        s3.put_object(
            Bucket=R2_BUCKET,
            Key=r2_key,
            Body=payload.encode('utf-8'),
            ContentType='application/json',
        )
    except Exception as e:
        return jsonify({'error': f'Save failed: {str(e)}'}), 500

    size_kb = len(payload) // 1024

    return jsonify({
        'message':    'Snapshot saved',
        'snapshot_id': snap_id,
        'label':       label,
        'size_kb':     size_kb,
        'r2_key':      r2_key,
    }), 201


# ---------------------------------------------------------------------------
# GET /api/session/snapshots?session_id=<id>
# ---------------------------------------------------------------------------
@reference_mastering_bp.route('/api/session/snapshots', methods=['GET'])
@jwt_required()
def list_snapshots():
    user_id    = get_jwt_identity()
    session_id = request.args.get('session_id', 'default')
    prefix     = f'sessions/{user_id}/{session_id}/snapshots/'

    try:
        response = s3.list_objects_v2(Bucket=R2_BUCKET, Prefix=prefix)
        objects  = response.get('Contents', [])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

    snapshots = []
    for obj in sorted(objects, key=lambda x: x['LastModified'], reverse=True):
        try:
            body = s3.get_object(Bucket=R2_BUCKET, Key=obj['Key'])['Body'].read()
            snap = json.loads(body)
            snap['size_kb'] = obj['Size'] // 1024
            snapshots.append(snap)
        except Exception:
            continue

    return jsonify({'snapshots': snapshots, 'total': len(snapshots)}), 200


# ---------------------------------------------------------------------------
# DELETE /api/session/snapshot/<snapshot_id>
# ---------------------------------------------------------------------------
@reference_mastering_bp.route('/api/session/snapshot/<snapshot_id>', methods=['DELETE'])
@jwt_required()
def delete_snapshot(snapshot_id):
    user_id    = get_jwt_identity()
    session_id = request.args.get('session_id', 'default')
    r2_key     = f'sessions/{user_id}/{session_id}/snapshots/{snapshot_id}.json'

    try:
        s3.delete_object(Bucket=R2_BUCKET, Key=r2_key)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

    return jsonify({'message': 'Snapshot deleted', 'snapshot_id': snapshot_id}), 200
