def interpolate_points(points_a, points_b, t: float):
    if len(points_a) != len(points_b):
        return points_a
    out = []
    for a, b in zip(points_a, points_b):
        out.append({
            "x": a["x"] + (b["x"] - a["x"]) * t,
            "y": a["y"] + (b["y"] - a["y"]) * t
        })
    return out

def build_roto_timeline(keyframes: list, total_frames: int):
    if not keyframes:
        return []

    keyframes = sorted(keyframes, key=lambda k: k["frame"])
    timeline = []

    for i in range(len(keyframes) - 1):
        a = keyframes[i]
        b = keyframes[i + 1]
        start = a["frame"]
        end = b["frame"]
        span = max(1, end - start)

        for f in range(start, end):
            t = (f - start) / span
            timeline.append({
                "frame": f,
                "points": interpolate_points(a["points"], b["points"], t)
            })

    timeline.append({
        "frame": keyframes[-1]["frame"],
        "points": keyframes[-1]["points"]
    })

    return [item for item in timeline if item["frame"] < total_frames]
