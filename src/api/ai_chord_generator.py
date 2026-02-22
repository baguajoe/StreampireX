# =============================================================================
# ai_chord_generator.py — AI Chord Progression Generator
# =============================================================================
# Location: src/api/ai_chord_generator.py
# Register: app.register_blueprint(ai_chord_generator_bp)
#
# Generates chord progressions based on key, scale, genre, and mood.
# Returns MIDI note arrays ready for the Piano Roll editor.
# Pure music theory — ZERO external API costs.
# =============================================================================

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
import random

ai_chord_generator_bp = Blueprint('ai_chord_generator', __name__)

# =============================================================================
# MUSIC THEORY CONSTANTS
# =============================================================================

NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

SCALES = {
    'major':            [0, 2, 4, 5, 7, 9, 11],
    'natural_minor':    [0, 2, 3, 5, 7, 8, 10],
    'harmonic_minor':   [0, 2, 3, 5, 7, 8, 11],
    'melodic_minor':    [0, 2, 3, 5, 7, 9, 11],
    'dorian':           [0, 2, 3, 5, 7, 9, 10],
    'mixolydian':       [0, 2, 4, 5, 7, 9, 10],
    'phrygian':         [0, 1, 3, 5, 7, 8, 10],
    'lydian':           [0, 2, 4, 6, 7, 9, 11],
    'pentatonic_major': [0, 2, 4, 7, 9],
    'pentatonic_minor': [0, 3, 5, 7, 10],
    'blues':            [0, 3, 5, 6, 7, 10],
}

CHORD_TYPES = {
    'maj':   [0, 4, 7],
    'min':   [0, 3, 7],
    'dim':   [0, 3, 6],
    'aug':   [0, 4, 8],
    'maj7':  [0, 4, 7, 11],
    'min7':  [0, 3, 7, 10],
    'dom7':  [0, 4, 7, 10],
    'dim7':  [0, 3, 6, 9],
    'hdim7': [0, 3, 6, 10],
    'sus2':  [0, 2, 7],
    'sus4':  [0, 5, 7],
    'add9':  [0, 4, 7, 14],
    'min9':  [0, 3, 7, 10, 14],
    'maj9':  [0, 4, 7, 11, 14],
    'dom9':  [0, 4, 7, 10, 14],
    '6':     [0, 4, 7, 9],
    'min6':  [0, 3, 7, 9],
}

DIATONIC_QUALITIES = {
    'major':          ['maj', 'min', 'min', 'maj', 'maj', 'min', 'dim'],
    'natural_minor':  ['min', 'dim', 'maj', 'min', 'min', 'maj', 'maj'],
    'harmonic_minor': ['min', 'dim', 'aug', 'min', 'maj', 'maj', 'dim'],
    'melodic_minor':  ['min', 'min', 'aug', 'maj', 'maj', 'dim', 'dim'],
    'dorian':         ['min', 'min', 'maj', 'maj', 'min', 'dim', 'maj'],
    'mixolydian':     ['maj', 'min', 'dim', 'maj', 'min', 'min', 'maj'],
    'phrygian':       ['min', 'maj', 'maj', 'min', 'dim', 'maj', 'min'],
    'lydian':         ['maj', 'maj', 'min', 'dim', 'maj', 'min', 'min'],
}

DIATONIC_7TH = {
    'major':          ['maj7', 'min7', 'min7', 'maj7', 'dom7', 'min7', 'hdim7'],
    'natural_minor':  ['min7', 'hdim7', 'maj7', 'min7', 'min7', 'maj7', 'dom7'],
    'harmonic_minor': ['min7', 'hdim7', 'maj7', 'min7', 'dom7', 'maj7', 'dim7'],
    'dorian':         ['min7', 'min7', 'maj7', 'dom7', 'min7', 'hdim7', 'maj7'],
    'mixolydian':     ['dom7', 'min7', 'hdim7', 'maj7', 'min7', 'min7', 'maj7'],
}

ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII']
ROMAN_LOWER = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii']

VOICING_STYLES = {
    'close':  {'spread': False, 'octave': 4, 'desc': 'Close voicing — compact'},
    'open':   {'spread': True,  'octave': 3, 'desc': 'Open voicing — spread across octaves'},
    'root':   {'spread': False, 'octave': 3, 'desc': 'Root position — bass register'},
    'high':   {'spread': False, 'octave': 5, 'desc': 'High voicing — bright treble'},
    'power':  {'spread': False, 'octave': 2, 'desc': 'Power chords — root + fifth'},
}

# =============================================================================
# GENRE PROGRESSION TEMPLATES (degree 0-indexed, quality override or None)
# =============================================================================

GENRE_PROGRESSIONS = {
    'pop': [
        [(0,None),(4,None),(5,None),(3,None)],
        [(0,None),(3,None),(4,None),(4,None)],
        [(5,None),(3,None),(0,None),(4,None)],
        [(0,None),(5,None),(3,None),(4,None)],
        [(0,None),(3,None),(5,None),(4,None)],
    ],
    'hiphop': [
        [(0,None),(3,None),(4,None),(4,None)],
        [(0,None),(5,None),(4,None),(3,None)],
        [(0,None),(2,None),(3,None),(4,None)],
        [(0,None),(6,None),(5,None),(4,None)],
        [(0,None),(3,None),(6,None),(5,None)],
    ],
    'trap': [
        [(0,None),(5,None),(3,None),(4,None)],
        [(0,None),(2,None),(5,None),(4,None)],
        [(0,None),(6,None),(5,None),(3,None)],
        [(0,None),(3,None),(5,None),(6,None)],
        [(5,None),(4,None),(0,None),(0,None)],
    ],
    'rnb': [
        [(0,'maj7'),(1,'min7'),(2,'min7'),(4,'dom7')],
        [(0,'maj7'),(5,'min7'),(1,'min7'),(4,'dom7')],
        [(0,'maj9'),(3,'maj7'),(1,'min9'),(4,'dom9')],
        [(5,'min7'),(1,'min7'),(4,'dom7'),(0,'maj7')],
    ],
    'jazz': [
        [(1,'min7'),(4,'dom7'),(0,'maj7'),(0,'maj7')],
        [(1,'min7'),(4,'dom7'),(0,'maj7'),(5,'min7')],
        [(0,'maj7'),(5,'min7'),(1,'min7'),(4,'dom7')],
        [(0,'maj7'),(1,'hdim7'),(4,'dom7'),(0,'min7')],
    ],
    'lofi': [
        [(0,'maj7'),(1,'min7'),(2,'min7'),(3,'maj7')],
        [(0,'maj9'),(5,'min7'),(3,'maj7'),(4,'dom7')],
        [(5,'min7'),(1,'min7'),(4,'dom7'),(0,'maj7')],
        [(0,'maj7'),(3,'maj7'),(2,'min7'),(1,'min7')],
    ],
    'edm': [
        [(0,None),(3,None),(5,None),(4,None)],
        [(0,None),(4,None),(5,None),(3,None)],
        [(5,None),(3,None),(0,None),(4,None)],
        [(0,None),(2,None),(3,None),(4,None)],
    ],
    'rock': [
        [(0,None),(3,None),(4,None),(4,None)],
        [(0,None),(4,None),(3,None),(3,None)],
        [(0,None),(6,None),(3,None),(4,None)],
        [(0,None),(5,None),(3,None),(4,None)],
    ],
    'gospel': [
        [(0,'maj7'),(3,'maj7'),(4,'dom7'),(0,'maj7')],
        [(0,'maj7'),(1,'min7'),(4,'dom7'),(0,'maj7')],
        [(0,'maj7'),(0,'dom7'),(3,'maj7'),(3,'min7')],
        [(3,'maj7'),(0,'maj7'),(1,'min7'),(4,'dom7')],
    ],
    'reggaeton': [
        [(0,None),(3,None),(4,None),(5,None)],
        [(0,None),(5,None),(3,None),(4,None)],
        [(0,None),(6,None),(5,None),(4,None)],
    ],
    'country': [
        [(0,None),(3,None),(4,None),(0,None)],
        [(0,None),(4,None),(3,None),(0,None)],
        [(0,None),(5,None),(3,None),(4,None)],
    ],
}

GENRE_DEFAULT_SCALE = {
    'pop': 'major', 'hiphop': 'natural_minor', 'trap': 'natural_minor',
    'rnb': 'major', 'jazz': 'major', 'lofi': 'major', 'edm': 'major',
    'rock': 'major', 'gospel': 'major', 'reggaeton': 'natural_minor',
    'country': 'major',
}


# =============================================================================
# HELPERS
# =============================================================================

def midi_to_note_name(midi):
    return f"{NOTE_NAMES[midi % 12]}{(midi // 12) - 1}"

def get_scale_notes(root_name, scale_name):
    root_pc = NOTE_NAMES.index(root_name)
    intervals = SCALES.get(scale_name, SCALES['major'])
    notes = []
    for octave in range(0, 10):
        for iv in intervals:
            midi = (octave + 1) * 12 + root_pc + iv
            if 0 <= midi <= 127:
                notes.append(midi)
    return sorted(set(notes))

def build_chord_midi(root_midi, quality, voicing='close'):
    intervals = CHORD_TYPES.get(quality, CHORD_TYPES['maj'])
    if voicing == 'power':
        return [root_midi, root_midi + 7]
    notes = [root_midi + iv for iv in intervals]
    if voicing == 'open' and len(notes) >= 3:
        opened = [notes[0]]
        for i, n in enumerate(notes[1:], 1):
            opened.append(n + 12 if i % 2 == 1 else n)
        notes = sorted(opened)
    return [n for n in notes if 0 <= n <= 127]

def progression_to_midi(root_name, scale_name, template, voicing='close',
                        octave=4, use_7ths=False, beats_per_chord=4, bpm=120):
    intervals = SCALES.get(scale_name, SCALES['major'])
    root_pc = NOTE_NAMES.index(root_name)
    result = []
    beat = 0

    for degree, quality_override in template:
        if degree >= len(intervals):
            degree = degree % len(intervals)
        chord_root_pc = (root_pc + intervals[degree]) % 12

        if quality_override:
            quality = quality_override
        elif use_7ths and scale_name in DIATONIC_7TH:
            quality = DIATONIC_7TH[scale_name][degree]
        elif scale_name in DIATONIC_QUALITIES:
            quality = DIATONIC_QUALITIES[scale_name][degree]
        else:
            quality = 'maj'

        vs = VOICING_STYLES.get(voicing, VOICING_STYLES['close'])
        base_oct = vs.get('octave', octave)
        chord_root_midi = (base_oct + 1) * 12 + chord_root_pc
        midi_notes = build_chord_midi(chord_root_midi, quality, voicing=voicing)

        roman = ROMAN_LOWER[degree] if quality in ('min','min7','min9','min6','hdim7','dim','dim7') else ROMAN[degree]
        suffix = '' if quality == 'maj' else ('m' if quality == 'min' else quality)
        chord_label = f"{NOTE_NAMES[chord_root_pc]}{suffix}"

        secs_per_beat = 60.0 / bpm
        result.append({
            'degree': degree, 'roman': roman, 'chord_name': chord_label,
            'quality': quality, 'root_note': chord_root_pc,
            'root_name': NOTE_NAMES[chord_root_pc],
            'midi_notes': midi_notes,
            'note_names': [midi_to_note_name(n) for n in midi_notes],
            'start_beat': beat, 'duration_beats': beats_per_chord,
            'start_time': round(beat * secs_per_beat, 4),
            'duration_time': round(beats_per_chord * secs_per_beat, 4),
            'velocity': random.randint(85, 110),
        })
        beat += beats_per_chord
    return result


# =============================================================================
# API ENDPOINTS
# =============================================================================

@ai_chord_generator_bp.route('/api/chords/generate', methods=['POST'])
@jwt_required()
def generate_progression():
    data = request.get_json()
    root = data.get('root', 'C')
    scale = data.get('scale', 'major')
    genre = data.get('genre', 'pop')
    voicing = data.get('voicing', 'close')
    use_7ths = data.get('use_7ths', False)
    bars = data.get('bars', 4)
    beats_per_chord = data.get('beats_per_chord', 4)
    bpm = data.get('bpm', 120)
    octave = data.get('octave', 4)

    if root not in NOTE_NAMES:
        return jsonify({'error': f'Invalid root note: {root}'}), 400
    if scale not in SCALES:
        return jsonify({'error': f'Invalid scale: {scale}'}), 400

    if scale == 'auto':
        scale = GENRE_DEFAULT_SCALE.get(genre, 'major')

    templates = GENRE_PROGRESSIONS.get(genre, GENRE_PROGRESSIONS['pop'])
    template = random.choice(templates)
    while len(template) < bars:
        template = template + template
    template = template[:bars]

    chords = progression_to_midi(root, scale, template, voicing, octave, use_7ths, beats_per_chord, bpm)
    label = ' → '.join(c['roman'] for c in chords)
    total_beats = sum(c['duration_beats'] for c in chords)

    return jsonify({
        'message': f'🎹 Generated {genre} progression in {root} {scale}',
        'progression': label, 'chords': chords,
        'key': root, 'scale': scale, 'genre': genre, 'voicing': voicing,
        'bpm': bpm, 'total_beats': total_beats,
        'total_bars': total_beats // beats_per_chord,
    }), 200


@ai_chord_generator_bp.route('/api/chords/suggest-next', methods=['POST'])
@jwt_required()
def suggest_next_chord():
    data = request.get_json()
    root = data.get('root', 'C')
    scale = data.get('scale', 'major')
    current_degrees = data.get('current_degrees', [])
    use_7ths = data.get('use_7ths', False)
    octave = data.get('octave', 4)

    if root not in NOTE_NAMES:
        return jsonify({'error': f'Invalid root: {root}'}), 400

    intervals = SCALES.get(scale, SCALES['major'])
    num_deg = len(intervals)
    root_pc = NOTE_NAMES.index(root)

    TENDENCY = {
        0: [3,4,5,1], 1: [4,0,5], 2: [5,3,1], 3: [4,0,1,5],
        4: [0,5,3], 5: [1,3,4,2], 6: [0,2,5],
    }

    last = current_degrees[-1] if current_degrees else 0
    tends = TENDENCY.get(last % num_deg, list(range(num_deg)))
    suggestions = []

    for deg in tends[:4]:
        if deg >= num_deg:
            continue
        cpc = (root_pc + intervals[deg]) % 12
        if use_7ths and scale in DIATONIC_7TH:
            q = DIATONIC_7TH[scale][deg]
        elif scale in DIATONIC_QUALITIES:
            q = DIATONIC_QUALITIES[scale][deg]
        else:
            q = 'maj'

        midi_notes = build_chord_midi((octave + 1) * 12 + cpc, q)
        roman = ROMAN_LOWER[deg] if q in ('min','min7','min9','min6','hdim7','dim') else ROMAN[deg]
        suggestions.append({
            'degree': deg, 'roman': roman, 'chord_name': NOTE_NAMES[cpc],
            'quality': q, 'midi_notes': midi_notes,
            'note_names': [midi_to_note_name(n) for n in midi_notes],
            'strength': round(1.0 - tends.index(deg) * 0.2, 2),
        })

    return jsonify({'suggestions': suggestions, 'context': {'key': root, 'scale': scale, 'last': last}}), 200


@ai_chord_generator_bp.route('/api/chords/scales', methods=['GET'])
def get_scales():
    return jsonify({
        'scales': list(SCALES.keys()), 'genres': list(GENRE_PROGRESSIONS.keys()),
        'voicings': {k: v['desc'] for k, v in VOICING_STYLES.items()},
        'notes': NOTE_NAMES, 'chord_types': list(CHORD_TYPES.keys()),
    }), 200


@ai_chord_generator_bp.route('/api/chords/scale-notes', methods=['POST'])
@jwt_required()
def scale_notes_endpoint():
    data = request.get_json()
    root = data.get('root', 'C')
    scale = data.get('scale', 'major')
    if root not in NOTE_NAMES or scale not in SCALES:
        return jsonify({'error': 'Invalid root or scale'}), 400
    notes = get_scale_notes(root, scale)
    root_pc = NOTE_NAMES.index(root)
    pcs = [(root_pc + iv) % 12 for iv in SCALES[scale]]
    return jsonify({
        'key': root, 'scale': scale, 'midi_notes': notes,
        'pitch_classes': pcs, 'pitch_class_names': [NOTE_NAMES[pc] for pc in pcs],
    }), 200


@ai_chord_generator_bp.route('/api/chords/identify', methods=['POST'])
@jwt_required()
def identify_chord():
    data = request.get_json()
    midi_notes = data.get('midi_notes', [])
    if len(midi_notes) < 2:
        return jsonify({'error': 'Need at least 2 notes'}), 400
    pcs = sorted(set(n % 12 for n in midi_notes))
    matches = []
    for rpc in pcs:
        for name, intervals in CHORD_TYPES.items():
            cpcs = sorted(set((rpc + iv) % 12 for iv in intervals))
            if cpcs == pcs:
                matches.append({'root': NOTE_NAMES[rpc], 'quality': name,
                    'chord_name': f"{NOTE_NAMES[rpc]}{name if name != 'maj' else ''}"})
    return jsonify({'input_notes': midi_notes, 'matches': matches, 'best_match': matches[0] if matches else None}), 200