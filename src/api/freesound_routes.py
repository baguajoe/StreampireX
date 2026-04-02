# freesound_routes.py — Freesound.org API Proxy
# SPX Beat Lab | StreamPireX
# Add to app.py:
#   from api.freesound_routes import freesound_bp
#   app.register_blueprint(freesound_bp)

import os, requests
from flask import Blueprint, request, jsonify, Response

freesound_bp = Blueprint('freesound', __name__)

FREESOUND_BASE = 'https://freesound.org/apiv2'
API_KEY = os.environ.get('FREESOUND_API_KEY', '')

@freesound_bp.route('/api/freesound/search', methods=['GET'])
def freesound_search():
    if not API_KEY:
        return jsonify({'error': 'FREESOUND_API_KEY not set in environment'}), 500

    query       = request.args.get('query', '')
    page        = int(request.args.get('page', 0))
    page_size   = min(int(request.args.get('page_size', 15)), 30)
    sort        = request.args.get('sort', 'score')
    max_dur     = request.args.get('max_duration', '30')
    fields      = request.args.get('fields', 'id,name,username,duration,previews,license,tags,avg_rating,num_downloads')

    params = {
        'query':    query,
        'page':     page + 1,  # freesound is 1-indexed
        'page_size': page_size,
        'sort':     sort,
        'fields':   fields,
        'filter':   f'duration:[0 TO {max_dur}] license:("Creative Commons 0" OR "Attribution" OR "Attribution Noncommercial")',
        'token':    API_KEY,
    }

    try:
        res = requests.get(f'{FREESOUND_BASE}/search/text/', params=params, timeout=10)
        res.raise_for_status()
        data = res.json()
        return jsonify({
            'count':   data.get('count', 0),
            'results': data.get('results', []),
            'next':    data.get('next'),
            'previous': data.get('previous'),
        })
    except requests.RequestException as e:
        return jsonify({'error': str(e)}), 502


@freesound_bp.route('/api/freesound/download', methods=['GET'])
def freesound_download():
    if not API_KEY:
        return jsonify({'error': 'FREESOUND_API_KEY not set'}), 500

    sound_id = request.args.get('sound_id')
    if not sound_id:
        return jsonify({'error': 'sound_id required'}), 400

    try:
        # Get sound details to find preview URL
        res = requests.get(
            f'{FREESOUND_BASE}/sounds/{sound_id}/',
            params={'token': API_KEY, 'fields': 'previews,name'},
            timeout=10
        )
        res.raise_for_status()
        sound = res.json()

        # Use HQ preview (MP3) — doesn't require OAuth
        preview_url = sound.get('previews', {}).get('preview-hq-mp3') or \
                      sound.get('previews', {}).get('preview-lq-mp3')

        if not preview_url:
            return jsonify({'error': 'No preview available'}), 404

        # Stream the audio back to client
        audio_res = requests.get(preview_url, timeout=15, stream=True)
        audio_res.raise_for_status()

        return Response(
            audio_res.iter_content(chunk_size=8192),
            content_type=audio_res.headers.get('Content-Type', 'audio/mpeg'),
            headers={'Content-Disposition': f'attachment; filename="{sound.get("name", "sample")}.mp3"'}
        )
    except requests.RequestException as e:
        return jsonify({'error': str(e)}), 502


@freesound_bp.route('/api/freesound/sound/<int:sound_id>', methods=['GET'])
def freesound_sound_info(sound_id):
    if not API_KEY:
        return jsonify({'error': 'FREESOUND_API_KEY not set'}), 500
    try:
        res = requests.get(
            f'{FREESOUND_BASE}/sounds/{sound_id}/',
            params={'token': API_KEY},
            timeout=10
        )
        return jsonify(res.json())
    except requests.RequestException as e:
        return jsonify({'error': str(e)}), 502
