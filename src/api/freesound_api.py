# =============================================================================
# freesound_api.py — Freesound.org API Proxy Blueprint
# =============================================================================
# Location: src/api/freesound_api.py
# Purpose: Server-side proxy for Freesound API to avoid exposing API key
#          and to handle CORS. Supports search, sound details, and download.
# Setup:
#   1. Register at https://freesound.org/apiv2/apply/
#   2. Set env var: FREESOUND_API_KEY=your_client_id
#   3. Register blueprint in app.py:
#      from api.freesound_api import freesound_bp
#      app.register_blueprint(freesound_bp)
# =============================================================================

import os
import requests
from flask import Blueprint, request, jsonify, Response

freesound_bp = Blueprint('freesound', __name__)

FREESOUND_BASE = 'https://freesound.org/apiv2'
API_KEY = os.environ.get('FREESOUND_API_KEY', '')

def get_headers():
    return {'Authorization': f'Token {API_KEY}'}


# ── Search sounds ──
# GET /api/freesound/search?q=kick+drum&page=1&page_size=15&filter=duration:[0+TO+10]
@freesound_bp.route('/api/freesound/search', methods=['GET'])
def search_sounds():
    if not API_KEY:
        return jsonify({'error': 'Freesound API key not configured'}), 500

    q = request.args.get('q', '')
    page = request.args.get('page', '1')
    page_size = request.args.get('page_size', '15')
    sort = request.args.get('sort', 'score')  # score, duration_asc, duration_desc, created_desc, rating_desc, downloads_desc
    filter_param = request.args.get('filter', '')

    # Optional: limit duration for samples (e.g., under 30 seconds)
    if not filter_param:
        filter_param = 'duration:[0 TO 30]'

    params = {
        'query': q,
        'page': page,
        'page_size': min(int(page_size), 30),  # Cap at 30
        'sort': sort,
        'filter': filter_param,
        'fields': 'id,name,description,tags,duration,avg_rating,num_ratings,num_downloads,username,license,previews,images,type,filesize,samplerate,bitdepth,channels',
    }

    try:
        resp = requests.get(
            f'{FREESOUND_BASE}/search/text/',
            params=params,
            headers=get_headers(),
            timeout=10
        )
        resp.raise_for_status()
        data = resp.json()

        # Simplify results for frontend
        results = []
        for sound in data.get('results', []):
            previews = sound.get('previews', {})
            images = sound.get('images', {})
            results.append({
                'id': sound.get('id'),
                'name': sound.get('name', ''),
                'description': (sound.get('description', '') or '')[:200],
                'tags': (sound.get('tags', []) or [])[:8],
                'duration': round(sound.get('duration', 0), 2),
                'rating': round(sound.get('avg_rating', 0), 1),
                'num_ratings': sound.get('num_ratings', 0),
                'downloads': sound.get('num_downloads', 0),
                'username': sound.get('username', ''),
                'license': sound.get('license', ''),
                'type': sound.get('type', ''),
                'filesize': sound.get('filesize', 0),
                'samplerate': sound.get('samplerate', 0),
                'channels': sound.get('channels', 0),
                # Preview URLs (low quality for preview, high quality for download)
                'preview_hq_mp3': previews.get('preview-hq-mp3', ''),
                'preview_lq_mp3': previews.get('preview-lq-mp3', ''),
                'preview_hq_ogg': previews.get('preview-hq-ogg', ''),
                # Waveform image
                'waveform_m': images.get('waveform_m', ''),
                'spectral_m': images.get('spectral_m', ''),
            })

        return jsonify({
            'count': data.get('count', 0),
            'page': int(page),
            'page_size': int(page_size),
            'num_pages': (data.get('count', 0) + int(page_size) - 1) // int(page_size),
            'results': results,
        })

    except requests.exceptions.Timeout:
        return jsonify({'error': 'Freesound API timeout'}), 504
    except requests.exceptions.HTTPError as e:
        return jsonify({'error': f'Freesound API error: {e.response.status_code}'}), e.response.status_code
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── Get sound details ──
# GET /api/freesound/sound/<id>
@freesound_bp.route('/api/freesound/sound/<int:sound_id>', methods=['GET'])
def get_sound(sound_id):
    if not API_KEY:
        return jsonify({'error': 'Freesound API key not configured'}), 500

    try:
        resp = requests.get(
            f'{FREESOUND_BASE}/sounds/{sound_id}/',
            params={'fields': 'id,name,description,tags,duration,avg_rating,num_downloads,username,license,previews,images,type,filesize,samplerate,bitdepth,channels,download'},
            headers=get_headers(),
            timeout=10
        )
        resp.raise_for_status()
        return jsonify(resp.json())
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── Download / proxy audio file ──
# GET /api/freesound/download/<id>
# Returns the preview audio file (no OAuth needed for previews)
@freesound_bp.route('/api/freesound/download/<int:sound_id>', methods=['GET'])
def download_sound(sound_id):
    if not API_KEY:
        return jsonify({'error': 'Freesound API key not configured'}), 500

    quality = request.args.get('quality', 'hq')  # hq or lq

    try:
        # First get the sound details to find preview URL
        resp = requests.get(
            f'{FREESOUND_BASE}/sounds/{sound_id}/',
            params={'fields': 'previews,name'},
            headers=get_headers(),
            timeout=10
        )
        resp.raise_for_status()
        data = resp.json()
        previews = data.get('previews', {})

        # Use HQ MP3 preview (no OAuth needed)
        preview_url = previews.get(f'preview-{quality}-mp3', '') or previews.get('preview-hq-mp3', '')
        if not preview_url:
            return jsonify({'error': 'No preview available'}), 404

        # Stream the audio file back
        audio_resp = requests.get(preview_url, stream=True, timeout=15)
        audio_resp.raise_for_status()

        return Response(
            audio_resp.iter_content(chunk_size=8192),
            content_type='audio/mpeg',
            headers={
                'Content-Disposition': f'attachment; filename="freesound_{sound_id}.mp3"',
                'Content-Length': audio_resp.headers.get('Content-Length', ''),
            }
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── Similar sounds ──
# GET /api/freesound/similar/<id>
@freesound_bp.route('/api/freesound/similar/<int:sound_id>', methods=['GET'])
def similar_sounds(sound_id):
    if not API_KEY:
        return jsonify({'error': 'Freesound API key not configured'}), 500

    try:
        resp = requests.get(
            f'{FREESOUND_BASE}/sounds/{sound_id}/similar/',
            params={'fields': 'id,name,duration,tags,previews,avg_rating,num_downloads,username'},
            headers=get_headers(),
            timeout=10
        )
        resp.raise_for_status()
        return jsonify(resp.json())
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── Popular tags / categories for quick browse ──
@freesound_bp.route('/api/freesound/categories', methods=['GET'])
def get_categories():
    """Return curated sample categories for quick browsing."""
    categories = [
        {'name': 'Drums & Percussion', 'query': 'drum percussion', 'emoji': '🥁', 'tags': ['kick', 'snare', 'hihat', 'cymbal', 'tom', 'clap', 'shaker']},
        {'name': 'Bass', 'query': 'bass synth', 'emoji': '🎸', 'tags': ['808', 'sub bass', 'bass guitar', 'bass synth']},
        {'name': 'Synth & Keys', 'query': 'synthesizer keyboard', 'emoji': '🎹', 'tags': ['pad', 'lead', 'arp', 'chord', 'piano', 'organ']},
        {'name': 'Vocals & Chops', 'query': 'vocal chop', 'emoji': '🎤', 'tags': ['vocal', 'voice', 'choir', 'adlib', 'chop']},
        {'name': 'Guitar & Strings', 'query': 'guitar strings', 'emoji': '🎻', 'tags': ['acoustic guitar', 'electric guitar', 'violin', 'cello']},
        {'name': 'FX & Risers', 'query': 'sound effect riser', 'emoji': '✨', 'tags': ['riser', 'impact', 'sweep', 'whoosh', 'transition']},
        {'name': 'Loops & Beats', 'query': 'loop beat', 'emoji': '🔁', 'tags': ['loop', 'breakbeat', 'drum loop', 'groove']},
        {'name': 'Ambient & Texture', 'query': 'ambient texture', 'emoji': '🌊', 'tags': ['ambient', 'drone', 'atmosphere', 'texture', 'noise']},
        {'name': 'Brass & Winds', 'query': 'brass trumpet horn', 'emoji': '🎺', 'tags': ['trumpet', 'saxophone', 'flute', 'horn']},
        {'name': 'One Shots', 'query': 'one shot sample', 'emoji': '💥', 'tags': ['one shot', 'stab', 'hit', 'stinger']},
    ]
    return jsonify({'categories': categories})