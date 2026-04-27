# =============================================================================
# song_log_routes.py — Auto Song Logging + PRO Export (BMI/ASCAP/SESAC)
# =============================================================================
# Add to app.py:
#   from api.song_log_routes import song_log_bp
#   app.register_blueprint(song_log_bp)
# =============================================================================

import os, csv, io
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, Response
from api.models import db, RadioStation, User, RadioPlaylist, Audio
import jwt as pyjwt

song_log_bp = Blueprint("song_log", __name__)

# ── Helper ────────────────────────────────────────────────────────────────────
def get_user_from_token():
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "): return None
    try:
        data = pyjwt.decode(auth.split(" ")[1], os.environ.get("FLASK_APP_KEY", "secret"), algorithms=["HS256"])
        return User.query.get(data.get("sub") or data.get("id"))
    except: return None

def assert_station_owned(station_id, user):
    """Returns (station, None) if user owns the station, otherwise (None, error_response)."""
    station = RadioStation.query.filter_by(id=station_id, user_id=user.id).first()
    if not station:
        return None, (jsonify({"error": "Station not found or access denied"}), 404)
    return station, None

# ── Song Log Model (in-memory for beta, move to DB for production) ─────────────
# We store logs in the existing RadioPlaylist model with extra fields
# Full DB model to add to models.py:
SONG_LOG_SQL = """
CREATE TABLE IF NOT EXISTS station_song_log (
    id SERIAL PRIMARY KEY,
    station_id INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    artist VARCHAR(255) NOT NULL,
    composer VARCHAR(255),
    publisher VARCHAR(255),
    duration_seconds INTEGER DEFAULT 0,
    listener_count INTEGER DEFAULT 0,
    played_at TIMESTAMP DEFAULT NOW(),
    source VARCHAR(50) DEFAULT 'auto_dj',
    is_live BOOLEAN DEFAULT FALSE,
    show_title VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);
"""

# ── Log a song play ────────────────────────────────────────────────────────────
@song_log_bp.route("/api/radio/<int:station_id>/log-song", methods=["POST"])
def log_song_play(station_id):
    """
    Called automatically when:
    - Auto DJ plays a track
    - Host manually queues a track during live show
    - DJ Mixer plays a track while broadcasting
    """
    user = get_user_from_token()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    station, err = assert_station_owned(station_id, user)
    if err:
        return err

    data = request.get_json() or {}
    title = data.get("title", "Unknown Title")
    artist = data.get("artist", "Unknown Artist")
    composer = data.get("composer", "")
    publisher = data.get("publisher", "")
    duration = data.get("duration_seconds", 0)
    listener_count = data.get("listener_count", 0)
    source = data.get("source", "auto_dj")  # auto_dj | live_show | dj_mixer
    is_live = data.get("is_live", False)
    show_title = data.get("show_title", "")

    try:
        db.session.execute(db.text("""
            INSERT INTO station_song_log
            (station_id, title, artist, composer, publisher, duration_seconds,
             listener_count, played_at, source, is_live, show_title)
            VALUES (:station_id, :title, :artist, :composer, :publisher, :duration,
                    :listeners, NOW(), :source, :is_live, :show_title)
        """), {
            "station_id": station_id, "title": title, "artist": artist,
            "composer": composer, "publisher": publisher, "duration": duration,
            "listeners": listener_count, "source": source,
            "is_live": is_live, "show_title": show_title
        })
        db.session.commit()
        return jsonify({"success": True})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

# ── Get song log ───────────────────────────────────────────────────────────────
@song_log_bp.route("/api/radio/<int:station_id>/song-log", methods=["GET"])
def get_song_log(station_id):
    user = get_user_from_token()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    station, err = assert_station_owned(station_id, user)
    if err:
        return err

    days = request.args.get("days", 30, type=int)
    since = datetime.utcnow() - timedelta(days=days)

    try:
        rows = db.session.execute(db.text("""
            SELECT id, title, artist, composer, publisher, duration_seconds,
                   listener_count, played_at, source, is_live, show_title
            FROM station_song_log
            WHERE station_id = :station_id AND played_at >= :since
            ORDER BY played_at DESC
            LIMIT 1000
        """), {"station_id": station_id, "since": since}).fetchall()

        return jsonify([{
            "id": r[0], "title": r[1], "artist": r[2], "composer": r[3] or "",
            "publisher": r[4] or "", "duration_seconds": r[5], "listener_count": r[6],
            "played_at": r[7].isoformat() if r[7] else "", "source": r[8],
            "is_live": r[9], "show_title": r[10] or ""
        } for r in rows])
    except:
        return jsonify([])

# ── PRO Export — BMI/ASCAP/SESAC CSV ─────────────────────────────────────────
@song_log_bp.route("/api/radio/<int:station_id>/pro-export", methods=["GET"])
def export_pro_report(station_id):
    """
    Export song log in BMI/ASCAP-compatible CSV format.
    BMI Online Music Report format:
    Date | Time | Title | Artist | Composer | Publisher | Duration | Listeners
    """
    user = get_user_from_token()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    station, err = assert_station_owned(station_id, user)
    if err:
        return err

    station = RadioStation.query.filter_by(id=station_id, user_id=user.id).first()
    if not station:
        return jsonify({"error": "Station not found"}), 404

    days = request.args.get("days", 30, type=int)
    pro_type = request.args.get("pro", "bmi").lower()  # bmi | ascap | sesac
    since = datetime.utcnow() - timedelta(days=days)

    try:
        rows = db.session.execute(db.text("""
            SELECT title, artist, composer, publisher, duration_seconds,
                   listener_count, played_at, source, show_title
            FROM station_song_log
            WHERE station_id = :station_id AND played_at >= :since
            ORDER BY played_at ASC
        """), {"station_id": station_id, "since": since}).fetchall()
    except:
        rows = []

    output = io.StringIO()
    writer = csv.writer(output)

    if pro_type == "bmi":
        # BMI Internet Music Performance Report format
        writer.writerow([
            "Report Period", "Station Name", "Station ID",
            "Date", "Time (UTC)", "Song Title", "Artist Name",
            "Composer/Writer", "Publisher", "Duration (MM:SS)",
            "Listener Count", "Source", "Show Title"
        ])
        writer.writerow([
            f"Last {days} days", station.name, station.id,
            "", "", "", "", "", "", "", "", "", ""
        ])
        for r in rows:
            played_at = r[6] if r[6] else datetime.utcnow()
            duration_secs = r[4] or 0
            duration_fmt = f"{duration_secs//60}:{str(duration_secs%60).zfill(2)}"
            writer.writerow([
                "", "",  "",
                played_at.strftime("%Y-%m-%d"),
                played_at.strftime("%H:%M:%S"),
                r[0], r[1], r[2] or r[1], r[3] or "Unknown Publisher",
                duration_fmt, r[5] or 0, r[7] or "auto_dj", r[8] or ""
            ])

    elif pro_type == "ascap":
        # ASCAP ACE format
        writer.writerow([
            "Broadcast Date", "Broadcast Time", "Duration", "Title",
            "Composer", "Publisher", "Artist", "Listeners", "Station"
        ])
        for r in rows:
            played_at = r[6] if r[6] else datetime.utcnow()
            duration_secs = r[4] or 0
            duration_fmt = f"{duration_secs//60}:{str(duration_secs%60).zfill(2)}"
            writer.writerow([
                played_at.strftime("%m/%d/%Y"),
                played_at.strftime("%I:%M %p"),
                duration_fmt, r[0], r[2] or r[1],
                r[3] or "Unknown Publisher", r[1], r[5] or 0, station.name
            ])

    else:
        # Generic SESAC/other format
        writer.writerow([
            "Date", "Time", "Title", "Artist", "Duration", "Listeners", "Station"
        ])
        for r in rows:
            played_at = r[6] if r[6] else datetime.utcnow()
            duration_secs = r[4] or 0
            writer.writerow([
                played_at.strftime("%Y-%m-%d"), played_at.strftime("%H:%M:%S"),
                r[0], r[1], duration_secs, r[5] or 0, station.name
            ])

    output.seek(0)
    filename = f"{station.name.replace(' ','_')}_{pro_type}_report_{datetime.utcnow().strftime('%Y%m%d')}.csv"

    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# ── Stats summary ─────────────────────────────────────────────────────────────
@song_log_bp.route("/api/radio/<int:station_id>/song-log/stats", methods=["GET"])
def get_song_log_stats(station_id):
    user = get_user_from_token()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    station, err = assert_station_owned(station_id, user)
    if err:
        return err

    days = request.args.get("days", 30, type=int)
    since = datetime.utcnow() - timedelta(days=days)

    try:
        total = db.session.execute(db.text(
            "SELECT COUNT(*) FROM station_song_log WHERE station_id=:sid AND played_at>=:since"
        ), {"sid": station_id, "since": since}).scalar() or 0

        unique_artists = db.session.execute(db.text(
            "SELECT COUNT(DISTINCT artist) FROM station_song_log WHERE station_id=:sid AND played_at>=:since"
        ), {"sid": station_id, "since": since}).scalar() or 0

        top_songs = db.session.execute(db.text("""
            SELECT title, artist, COUNT(*) as plays
            FROM station_song_log
            WHERE station_id=:sid AND played_at>=:since
            GROUP BY title, artist ORDER BY plays DESC LIMIT 10
        """), {"sid": station_id, "since": since}).fetchall()

        return jsonify({
            "total_plays": total,
            "unique_artists": unique_artists,
            "top_songs": [{"title": r[0], "artist": r[1], "plays": r[2]} for r in top_songs],
            "period_days": days
        })
    except:
        return jsonify({"total_plays": 0, "unique_artists": 0, "top_songs": [], "period_days": days})
