import cv2
import numpy as np

def solve_simple_track(video_path: str, start_x: int, start_y: int, max_frames: int = 180):
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return {"error": "cannot_open_video"}

    ok, frame = cap.read()
    if not ok:
        cap.release()
        return {"error": "cannot_read_first_frame"}

    prev_gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    p0 = np.array([[[float(start_x), float(start_y)]]], dtype=np.float32)
    results = [{"frame": 0, "x": float(start_x), "y": float(start_y)}]
    lk_params = dict(winSize=(21, 21), maxLevel=3)

    frame_idx = 1
    while frame_idx < max_frames:
        ok, frame = cap.read()
        if not ok:
            break
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        p1, st, _ = cv2.calcOpticalFlowPyrLK(prev_gray, gray, p0, None, **lk_params)
        if p1 is None or st is None or st[0][0] != 1:
            break
        x, y = p1[0][0]
        results.append({"frame": frame_idx, "x": float(x), "y": float(y)})
        prev_gray = gray
        p0 = p1
        frame_idx += 1

    cap.release()
    return {"track": results}
