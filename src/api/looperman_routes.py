# =============================================================================
# looperman_routes.py — Looperman API Proxy
# =============================================================================
# Location: src/api/looperman_routes.py
#
# Looperman has no CORS headers, so the frontend cannot call it directly.
# This Flask blueprint proxies requests server-side and returns JSON.
#
# Registration (in app.py or __init__.py):
#   from src.api.looperman_routes import looperman_bp
#   app.register_blueprint(looperman_bp)
#
# Looperman API base: https://www.looperman.com/api
# Docs: https://www.looperman.com/forum/thread/28820/looperman-api
# =============================================================================

from flask import Blueprint, request, jsonify
import requests

looperman_bp = Blueprint('looperman', __name__)

LOOPERMAN_BASE = 'https://www.looperman.com/api'

# Looperman genre IDs (from their API docs)
GENRE_MAP = {
    'hip hop':    1,
    'trap':       46,
    'r&b':        4,
    'electronic': 6,
    'house':      7,
    'techno':     8,
    'drum & bass':9,
    'reggae':     11,
    'jazz':       13,
    'soul':       4,
    'rock':       14,
    'pop':        15,
    'ambient':    18,
    'lo-fi':      46,
    'gospel':     22,
    'latin':      23,
    'afrobeats':  46,
    'drill':      46,
    'dancehall':  11,
}

@looperman_bp.route('/api/looperman/search', methods=['GET'])
def looperman_search():
    """
    Proxy Looperman search to bypass CORS.
    
    Query params:
        term       — search keyword
        genre      — genre name (mapped to Looperman genre ID)
        type       — 'loops' or 'acapellas'
        page       — page number (0-indexed, Looperman uses 0-based)
        bpm        — BPM to match (optional)
        bpmTolerance — BPM tolerance window (default 10)
        key        — musical key filter (optional)
    """
    try:
        term    = request.args.get('term', '')
        genre   = request.args.get('genre', '').lower()
        loop_type = request.args.get('type', 'loops')
        page    = int(request.args.get('page', 0))
        bpm     = request.args.get('bpm', '')
        bpm_tol = request.args.get('bpmTolerance', '10')
        key     = request.args.get('key', '')

        # Map genre name → genre ID
        genre_id = GENRE_MAP.get(genre, '') if genre else ''

        # Build Looperman params
        # Looperman API uses 'p' for type: 1=loops, 2=acapellas
        loop_type_id = '1' if loop_type == 'loops' else '2'

        params = {
            'term':    term,
            'page':    page,
            'limit':   20,
            'p':       loop_type_id,
        }
        if genre_id:
            params['genreid'] = genre_id
        if bpm:
            params['bpm']     = bpm
            params['bpmfrom'] = max(1, int(bpm) - int(bpm_tol))
            params['bpmto']   = int(bpm) + int(bpm_tol)
        if key and key != 'All':
            params['key'] = key

        headers = {
            'User-Agent': 'StreamPireX/1.0 (music creator platform)',
        }

        resp = requests.get(
            LOOPERMAN_BASE,
            params=params,
            headers=headers,
            timeout=10,
        )
        resp.raise_for_status()

        data = resp.json()

        # Normalize response shape regardless of API version
        loops = []
        if isinstance(data, list):
            loops = data
        elif isinstance(data, dict):
            loops = (
                data.get('loops') or
                data.get('acapellas') or
                data.get('results') or
                []
            )

        return jsonify({
            'results': loops,
            'page':    page,
            'count':   len(loops),
            'type':    loop_type,
        })

    except requests.exceptions.Timeout:
        return jsonify({'error': 'Looperman API timed out', 'results': []}), 504
    except requests.exceptions.HTTPError as e:
        return jsonify({'error': f'Looperman API error: {e}', 'results': []}), 502
    except Exception as e:
        return jsonify({'error': str(e), 'results': []}), 500


@looperman_bp.route('/api/looperman/genres', methods=['GET'])
def looperman_genres():
    """Return the genre list so the frontend can stay in sync."""
    return jsonify({'genres': list(GENRE_MAP.keys())})