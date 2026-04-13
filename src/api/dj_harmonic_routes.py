from flask import Blueprint, request, jsonify
import numpy as np
import librosa
import mutagen
from mutagen.id3 import ID3, TBPM, TKEY, ID3NoHeaderError
from mutagen.flac import FLAC
from mutagen.mp4 import MP4
import tempfile, os, base64

dj_harmonic_bp = Blueprint("dj_harmonic", __name__)

CAMELOT = {
    "C major":"8B","A minor":"8A","G major":"9B","E minor":"9A",
    "D major":"10B","B minor":"10A","A major":"11B","F# minor":"11A",
    "E major":"12B","C# minor":"12A","B major":"1B","G# minor":"1A",
    "F# major":"2B","D# minor":"2A","C# major":"3B","A# minor":"3A",
    "G# major":"4B","F minor":"4A","D# major":"5B","C minor":"5A",
    "A# major":"6B","G minor":"6A","F major":"7B","D minor":"7A",
}

CAMELOT_NEIGHBORS = {
    "1A":["1A","1B","2A","12A"],"1B":["1B","1A","2B","12B"],
    "2A":["2A","2B","3A","1A"],"2B":["2B","2A","3B","1B"],
    "3A":["3A","3B","4A","2A"],"3B":["3B","3A","4B","2B"],
    "4A":["4A","4B","5A","3A"],"4B":["4B","4A","5B","3B"],
    "5A":["5A","5B","6A","4A"],"5B":["5B","5A","6B","4B"],
    "6A":["6A","6B","7A","5A"],"6B":["6B","6A","7B","5B"],
    "7A":["7A","7B","8A","6A"],"7B":["7B","7A","8B","6B"],
    "8A":["8A","8B","9A","7A"],"8B":["8B","8A","9B","7B"],
    "9A":["9A","9B","10A","8A"],"9B":["9B","9A","10B","8B"],
    "10A":["10A","10B","11A","9A"],"10B":["10B","10A","11B","9B"],
    "11A":["11A","11B","12A","10A"],"11B":["11B","11A","12B","10B"],
    "12A":["12A","12B","1A","11A"],"12B":["12B","12A","1B","11B"],
}

def load_audio(req):
    if "file" not in req.files:
        return None, None, None
    f = req.files["file"]
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(f.filename)[1])
    f.save(tmp.name); tmp.close()
    y, sr = librosa.load(tmp.name, sr=22050, mono=True, duration=120)
    return y, sr, tmp.name

def detect_key(y, sr):
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr).mean(axis=1)
    major_p = np.array([6.35,2.23,3.48,2.33,4.38,4.09,2.52,5.19,2.39,3.66,2.29,2.88])
    minor_p = np.array([6.33,2.68,3.52,5.38,2.60,3.53,2.54,4.75,3.98,2.69,3.34,3.17])
    notes = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"]
    best, bk, bm = -999, "C", "major"
    for i in range(12):
        s = np.roll(chroma, -i)
        sm = float(np.corrcoef(s, major_p)[0,1])
        sn = float(np.corrcoef(s, minor_p)[0,1])
        if sm > best: best=sm; bk=notes[i]; bm="major"
        if sn > best: best=sn; bk=notes[i]; bm="minor"
    fk = f"{bk} {bm}"
    return fk, CAMELOT.get(fk, "?")

def energy(y, sr):
    rms = float(np.sqrt(np.mean(y**2)))
    cent = float(np.mean(librosa.feature.spectral_centroid(y=y, sr=sr)))
    roll = float(np.mean(librosa.feature.spectral_rolloff(y=y, sr=sr, roll_percent=0.85)))
    zcr = float(np.mean(librosa.feature.zero_crossing_rate(y)))
    raw = min(rms/0.15,1)*0.5 + min(cent/4000,1)*0.25 + min(roll/8000,1)*0.15 + min(zcr/0.15,1)*0.1
    return max(1, min(10, round(raw*9+1)))

def cues(y, sr):
    dur = len(y)/sr
    onsets = librosa.onset.onset_detect(y=y, sr=sr, hop_length=512, units="time")
    labels = ["Intro","Verse","Build","Drop","Chorus","Breakdown","Bridge","Outro"]
    colors = ["#00ffc8","#FF6600","#ff00ff","#ff3333","#ffcc00","#00ccff","#99ff00","#ffffff"]
    positions = [0.0,0.12,0.25,0.38,0.50,0.62,0.75,0.88]
    result = []
    for i,(lbl,pos) in enumerate(zip(labels,positions)):
        t = pos*dur
        if len(onsets):
            c = float(onsets[np.argmin(np.abs(onsets-t))])
            t = c if abs(c-t)<8 else t
        result.append({"index":i,"label":lbl,"time":round(t,3),"color":colors[i]})
    return result

@dj_harmonic_bp.route("/api/dj/analyze", methods=["POST"])
def analyze():
    y,sr,tmp = load_audio(request)
    if y is None: return jsonify({"error":"No file"}),400
    try:
        bt = librosa.beat.beat_track(y=y, sr=sr)
        bpm = float(bt[0]) if not hasattr(bt[0],"__len__") else float(bt[0][0])
        fk, cam = detect_key(y, sr)
        e = energy(y, sr)
        c = cues(y, sr)
        return jsonify({"bpm":round(bpm,1),"key":fk,"camelot":cam,"energy":e,"cues":c,"duration":round(len(y)/sr,2)})
    finally:
        os.unlink(tmp)

@dj_harmonic_bp.route("/api/dj/energy", methods=["POST"])
def energy_route():
    y,sr,tmp = load_audio(request)
    if y is None: return jsonify({"error":"No file"}),400
    try: return jsonify({"energy":energy(y,sr)})
    finally: os.unlink(tmp)

@dj_harmonic_bp.route("/api/dj/cues", methods=["POST"])
def cues_route():
    y,sr,tmp = load_audio(request)
    if y is None: return jsonify({"error":"No file"}),400
    try: return jsonify({"cues":cues(y,sr)})
    finally: os.unlink(tmp)

@dj_harmonic_bp.route("/api/dj/shift-key", methods=["POST"])
def shift_key():
    y,sr,tmp = load_audio(request)
    if y is None: return jsonify({"error":"No file"}),400
    sem = float(request.form.get("semitones",0))
    out = tmp.replace(os.path.splitext(tmp)[1],"_shifted.wav")
    try:
        shifted = librosa.effects.pitch_shift(y=y, sr=sr, n_steps=sem)
        import soundfile as sf
        sf.write(out, shifted, sr)
        with open(out,"rb") as f: b64 = base64.b64encode(f.read()).decode()
        fk, cam = detect_key(shifted, sr)
        return jsonify({"audio_b64":b64,"key":fk,"camelot":cam,"semitones":sem})
    finally:
        os.unlink(tmp)
        if os.path.exists(out): os.unlink(out)

@dj_harmonic_bp.route("/api/dj/mashup-suggest", methods=["POST"])
def mashup_suggest():
    data = request.get_json()
    cam = data.get("camelot",""); bpm = float(data.get("bpm",120))
    library = data.get("library",[])
    neighbors = CAMELOT_NEIGHBORS.get(cam,[cam])
    out = []
    for t in library:
        tc = t.get("camelot",""); tb = float(t.get("bpm") or 0)
        if tc not in neighbors: continue
        compat = 100 if tc==cam else (95 if tc[:-1]==cam[:-1] else 85)
        bdiff = abs(tb-bpm) if tb else 999
        if bdiff<=8: compat=min(100,compat+5)
        else: compat=max(60,compat-20)
        out.append({**t,"compatibility":compat,"bpm_diff":round(bdiff,1)})
    out.sort(key=lambda x:-x["compatibility"])
    return jsonify({"suggestions":out[:20]})

@dj_harmonic_bp.route("/api/dj/set-order", methods=["POST"])
def set_order():
    tracks = request.get_json().get("tracks",[])
    for t in tracks:
        if not t.get("energy"): t["energy"]=5
    s = sorted(tracks, key=lambda x:x.get("energy",5))
    n = len(s)
    if n<=3: arc=s
    else:
        w=s[:max(1,n//4)]; pk=sorted(s,key=lambda x:-x.get("energy",5))[:max(1,n//3)]
        rest=[t for t in s if t not in w and t not in pk]
        cd=rest[-max(1,n//4):]; mid=rest[:-max(1,n//4)] if len(rest)>1 else []
        arc=w+sorted(mid,key=lambda x:x.get("energy",5))+pk+cd[::-1]
    return jsonify({"order":arc})

@dj_harmonic_bp.route("/api/dj/tag-write", methods=["POST"])
def tag_write():
    if "file" not in request.files: return jsonify({"error":"No file"}),400
    f=request.files["file"]; ext=os.path.splitext(f.filename)[1].lower()
    bpm=request.form.get("bpm",""); camelot=request.form.get("camelot",""); key=request.form.get("key","")
    tmp=tempfile.NamedTemporaryFile(delete=False,suffix=ext); f.save(tmp.name); tmp.close()
    try:
        if ext==".mp3":
            try: tags=ID3(tmp.name)
            except ID3NoHeaderError: from mutagen.id3 import ID3; tags=ID3()
            if bpm: tags["TBPM"]=TBPM(encoding=3,text=str(round(float(bpm))))
            if camelot or key: tags["TKEY"]=TKEY(encoding=3,text=camelot or key)
            tags.save(tmp.name)
        elif ext==".flac":
            audio=FLAC(tmp.name)
            if bpm: audio["bpm"]=str(round(float(bpm)))
            if camelot: audio["initialkey"]=camelot
            audio.save()
        elif ext in [".m4a",".aac"]:
            audio=MP4(tmp.name)
            if bpm: audio["tmpo"]=[int(float(bpm))]
            audio.save()
        with open(tmp.name,"rb") as rf: b64=base64.b64encode(rf.read()).decode()
        return jsonify({"success":True,"file_b64":b64,"filename":f.filename})
    except Exception as e: return jsonify({"error":str(e)}),500
    finally: os.unlink(tmp.name)

@dj_harmonic_bp.route("/api/dj/tag-clean", methods=["POST"])
def tag_clean():
    if "file" not in request.files: return jsonify({"error":"No file"}),400
    f=request.files["file"]; ext=os.path.splitext(f.filename)[1].lower()
    tmp=tempfile.NamedTemporaryFile(delete=False,suffix=ext); f.save(tmp.name); tmp.close()
    removed=[]
    try:
        if ext==".mp3":
            try:
                tags=ID3(tmp.name); keep={"TIT2","TPE1","TALB","TRCK","TDRC","TBPM","TKEY","TCON"}
                for k in list(tags.keys()):
                    if k not in keep and not k.startswith("APIC"): del tags[k]; removed.append(k)
                tags.save(tmp.name)
            except: pass
        with open(tmp.name,"rb") as rf: b64=base64.b64encode(rf.read()).decode()
        return jsonify({"success":True,"removed":removed,"file_b64":b64,"filename":f.filename})
    finally: os.unlink(tmp.name)

@dj_harmonic_bp.route("/api/dj/export/rekordbox", methods=["POST"])
def export_rekordbox():
    tracks=request.get_json().get("tracks",[])
    lines=['<?xml version="1.0" encoding="UTF-8"?>','<DJ_PLAYLISTS Version="1.0.0">','  <COLLECTION>']
    for i,t in enumerate(tracks):
        lines.append(f'    <TRACK TrackID="{i+1}" Name="{t.get("title","")}" Artist="{t.get("artist","")}" TotalTime="{t.get("duration",0)}" Tonality="{t.get("camelot","")}" AverageBpm="{t.get("bpm",0)}">')
        for c in t.get("cues",[]):
            lines.append(f'      <POSITION_MARK Name="{c["label"]}" Type="0" Start="{c["time"]}" Num="{c["index"]}"/>')
        lines.append("    </TRACK>")
    lines+=["  </COLLECTION>","</DJ_PLAYLISTS>"]
    return jsonify({"xml":"\n".join(lines)})

@dj_harmonic_bp.route("/api/dj/export/traktor", methods=["POST"])
def export_traktor():
    tracks=request.get_json().get("tracks",[])
    lines=['<?xml version="1.0" encoding="UTF-8" standalone="yes"?>','<NML VERSION="19">',f'  <COLLECTION ENTRIES="{len(tracks)}">']
    for t in tracks:
        lines.append(f'    <ENTRY TITLE="{t.get("title","")}" ARTIST="{t.get("artist","")}">')
        lines.append(f'      <TEMPO BPM="{t.get("bpm",0)}" BPM_QUALITY="100"/>')
        lines.append(f'      <MUSICAL_KEY VALUE="{t.get("camelot","0A")}"/>')
        for c in t.get("cues",[]):
            lines.append(f'      <CUE_V2 NAME="{c["label"]}" DISPL_ORDER="{c["index"]}" TYPE="0" START="{int(c["time"]*1000)}" LEN="0" HOTCUE="{c["index"]}"/>')
        lines.append("    </ENTRY>")
    lines+=["  </COLLECTION>","</NML>"]
    return jsonify({"nml":"\n".join(lines)})
