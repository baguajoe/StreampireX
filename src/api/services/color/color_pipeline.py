def build_color_pipeline(settings: dict):
    return {
        "lift": settings.get("lift", 0),
        "gamma": settings.get("gamma", 1),
        "gain": settings.get("gain", 1),
        "saturation": settings.get("saturation", 1),
        "lut": settings.get("lut")
    }
