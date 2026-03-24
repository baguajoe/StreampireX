import os, time, requests
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required

ai_fill_bp = Blueprint('ai_fill', __name__, url_prefix='/api/ai-fill')
REPLICATE_TOKEN = os.getenv('REPLICATE_API_TOKEN', '')
REPLICATE_API   = 'https://api.replicate.com/v1/predictions'
HEADERS = {'Authorization': f'Token {REPLICATE_TOKEN}', 'Content-Type': 'application/json'}

def _poll(pid, timeout=120):
    deadline = time.time() + timeout
    while time.time() < deadline:
        r = requests.get(f'{REPLICATE_API}/{pid}', headers=HEADERS, timeout=10).json()
        if r.get('status') == 'succeeded':
            out = r.get('output'); return out[0] if isinstance(out, list) else out
        if r.get('status') in ('failed','canceled'):
            raise RuntimeError(r.get('error'))
        time.sleep(2)
    raise TimeoutError('timed out')

def _uri(b64):
    return b64 if b64.startswith('data:') else f'data:image/png;base64,{b64}'

@ai_fill_bp.route('/inpaint', methods=['POST'])
@jwt_required()
def inpaint():
    body = request.get_json(force=True)
    image = body.get('image',''); mask = body.get('mask','')
    if not image or not mask:
        return jsonify({'error':'image and mask required'}), 400
    payload = {
        'version': 'c11bac5874e8f2673c6839bbacb87e59be04a092bb8bcc6434e7cd3a4a72b66b',
        'input': {
            'image': _uri(image), 'mask': _uri(mask),
            'prompt': body.get('prompt','seamless fill photorealistic'),
            'num_inference_steps': int(body.get('steps', 20)),
            'strength': float(body.get('strength', 0.85)),
            'guidance_scale': 7.5,
        }
    }
    try:
        r = requests.post(REPLICATE_API, json=payload, headers=HEADERS, timeout=15)
        r.raise_for_status()
        return jsonify({'url': _poll(r.json()['id'])})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@ai_fill_bp.route('/remove-bg', methods=['POST'])
@jwt_required()
def remove_bg():
    body = request.get_json(force=True)
    image = body.get('image','')
    if not image: return jsonify({'error':'image required'}), 400
    payload = {
        'version': '50adaf2d3ad20a6f911a8a9e3ccf777b263b8596fbd2c8fc26e8888f8a0edbb5',
        'input': {'image': _uri(image)}
    }
    try:
        r = requests.post(REPLICATE_API, json=payload, headers=HEADERS, timeout=15)
        r.raise_for_status()
        return jsonify({'url': _poll(r.json()['id'])})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
