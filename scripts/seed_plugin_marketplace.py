from datetime import datetime
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from flask import Flask
from api.extensions import db
from api.models import User
from api.plugin_marketplace_routes import Plugin

app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = (
    "postgresql://" + __import__("os").environ["POSTGRES_USER"] + ":" +
    __import__("os").environ["POSTGRES_PASSWORD"] + "@" +
    __import__("os").environ.get("POSTGRES_HOST", "localhost") + ":" +
    __import__("os").environ.get("POSTGRES_PORT", "5432") + "/" +
    __import__("os").environ["POSTGRES_DB"]
    if __import__("os").environ.get("POSTGRES_USER")
    else __import__("os").environ.get("SQLALCHEMY_DATABASE_URI", __import__("os").environ.get("DATABASE_URL", "sqlite:///app.db"))
)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
db.init_app(app)

SAMPLES = [
    {
        "name": "ForgeRack WAM Channel Strip",
        "plugin_type": "audio",
        "category": "Channel Strip",
        "format_type": "WAM",
        "version": "1.0.0",
        "os_support": "Browser",
        "host_support": "StreamPireX Web Studio",
        "price": 19.99,
        "short_description": "Browser-ready Web Audio Module channel strip.",
        "description": "A lightweight WAM channel strip for in-browser mixing inside StreamPireX.",
        "tags": "wam,web audio,browser,mix,channel strip"
    },
    {
        "name": "ForgeVerb X",
        "plugin_type": "audio",
        "category": "Reverb",
        "format_type": "VST3",
        "version": "1.0.0",
        "os_support": "Windows, macOS",
        "host_support": "Ableton Live, FL Studio, Logic Pro, Studio One",
        "price": 49.99,
        "short_description": "Cinematic reverb plugin for vocals, pads, and spatial FX.",
        "description": "ForgeVerb X is a rich spatial reverb plugin designed for modern hip-hop, R&B, cinematic scoring, and ambient production.",
        "tags": "reverb,space,cinematic,vocals,mix"
    },
    {
        "name": "MotionBlade Transitions",
        "plugin_type": "video",
        "category": "Transitions",
        "format_type": "Premiere Pro",
        "version": "1.0.0",
        "os_support": "Windows, macOS",
        "host_support": "Premiere Pro",
        "price": 39.99,
        "short_description": "Premium transition pack for trailers, music videos, and social edits.",
        "description": "MotionBlade Transitions includes fast-cut wipes, zooms, glitch transitions, and cinematic impact transitions for editors.",
        "tags": "video,premiere,transitions,editing,motion"
    },
    {
        "name": "CineFlare Overlay Pack",
        "plugin_type": "video",
        "category": "Overlays",
        "format_type": "Premiere Pro",
        "version": "1.0.0",
        "os_support": "Windows, macOS",
        "host_support": "Premiere Pro, After Effects",
        "price": 34.99,
        "short_description": "Cinematic overlays with flares, leaks, and texture FX.",
        "description": "A premium overlay pack for music videos, trailers, brand promos, and social edits.",
        "tags": "overlays,vfx,light leaks,cinematic,premiere"
    },
    {
        "name": "HyperCut Transition Pack",
        "plugin_type": "video",
        "category": "Transition Pack",
        "format_type": "After Effects",
        "version": "1.0.0",
        "os_support": "Windows, macOS",
        "host_support": "After Effects, Premiere Pro",
        "price": 44.99,
        "short_description": "Fast-cut transitions for music videos and social reels.",
        "description": "Includes zooms, whip pans, glitches, impacts, and energetic cut transitions.",
        "tags": "transitions,vfx,after effects,editing,glitch"
    },
    {
        "name": "NeoTitle Motion Kit",
        "plugin_type": "video",
        "category": "Title Animations",
        "format_type": "Motion Graphics",
        "version": "1.0.0",
        "os_support": "Windows, macOS",
        "host_support": "Premiere Pro, After Effects, DaVinci Resolve",
        "price": 39.99,
        "short_description": "Animated title pack for trailers, promos, and visual branding.",
        "description": "A polished title animation system for modern creators and video editors.",
        "tags": "titles,motion graphics,branding,vfx,templates"
    },
    {
        "name": "ColorForge LUT Vault",
        "plugin_type": "video",
        "category": "Color",
        "format_type": "DaVinci Resolve",
        "version": "1.0.0",
        "os_support": "Windows, macOS",
        "host_support": "DaVinci Resolve, Premiere Pro, Final Cut",
        "price": 29.99,
        "short_description": "Color pack for moody, commercial, and music video looks.",
        "description": "A curated LUT collection built for creators cutting music visuals, promo reels, indie films, and social ads.",
        "tags": "lut,color,resolve,video,grading"
    }
]

with app.app_context():
    creator = User.query.first()
    if not creator:
        print("No users found. Create a user first.")
        raise SystemExit(1)

    created = 0
    for item in SAMPLES:
        exists = Plugin.query.filter_by(name=item["name"], creator_id=creator.id).first()
        if exists:
            continue
        plugin = Plugin(
            creator_id=creator.id,
            name=item["name"],
            slug=item["name"].lower().replace(" ", "-"),
            plugin_type=item["plugin_type"],
            category=item["category"],
            format_type=item["format_type"],
            version=item["version"],
            os_support=item["os_support"],
            host_support=item["host_support"],
            price=item["price"],
            short_description=item["short_description"],
            description=item["description"],
            tags=item["tags"],
            is_active=True,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.session.add(plugin)
        created += 1

    db.session.commit()
    print(f"Seed complete. Created {created} plugins.")
