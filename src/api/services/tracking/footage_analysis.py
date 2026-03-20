from pathlib import Path
import cv2

def analyze_footage(video_path: str, max_frames: int = 120):
    p = Path(video_path)
    if not p.exists():
        return {"error": "file_not_found", "path": video_path}

    cap = cv2.VideoCapture(str(p))
    if not cap.isOpened():
        return {"error": "cannot_open_video"}

    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)
    fps = float(cap.get(cv2.CAP_PROP_FPS) or 0.0)
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)

    sampled = []
    i = 0
    step = max(1, frame_count // max_frames) if frame_count > max_frames else 1

    while i < min(frame_count, max_frames * step):
        cap.set(cv2.CAP_PROP_POS_FRAMES, i)
        ok, frame = cap.read()
        if not ok:
            break
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        corners = cv2.goodFeaturesToTrack(gray, 100, 0.01, 8)
        sampled.append({
            "frame": i,
            "feature_count": 0 if corners is None else int(len(corners))
        })
        i += step

    cap.release()
    return {
        "width": width,
        "height": height,
        "fps": fps,
        "frame_count": frame_count,
        "samples": sampled
    }
