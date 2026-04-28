"""SP-5: Tournament + Leaderboard routes.

Endpoints (all under /api/gaming):
  GET    /tournaments                          - list, filterable by status/game
  POST   /tournaments                          - create (JWT)
  GET    /tournaments/<id>                     - detail with bracket + entries
  POST   /tournaments/<id>/join                - join (free OR Stripe PaymentIntent)
  POST   /tournaments/<id>/start               - organizer starts bracket
  POST   /tournaments/<id>/cancel              - organizer cancels (refunds entries)
  POST   /tournaments/<id>/matches/<mid>/report  - winner reports score
  POST   /tournaments/<id>/matches/<mid>/dispute - loser disputes
  POST   /tournaments/<id>/matches/<mid>/resolve - organizer rules dispute
  GET    /leaderboard?game=&period=            - leaderboard query

Stripe entry-fee flow:
  - On /join with entry_fee_cents > 0:
      Create PaymentIntent via stripe_helpers.build_payment_intent_destination_kwargs
      Entry row created with payment_status='pending'
      Return client_secret to frontend
  - On webhook payment_intent.succeeded:
      Flip entry to payment_status='paid'
      Increment tournament.prize_pool_cents by 90%
      Increment tournament.platform_fee_collected_cents by 10%
  - Webhook handler is registered separately in routes.py /api/webhook/stripe
    Helper handle_tournament_payment_succeeded() is exposed for that wiring.

Leaderboard scoring (per match/tournament completion):
  +10 per match win
  +50 for tournament 1st place
  +25 for 2nd, +15 for 3rd
  +5 for participating in any completed tournament

Recalc updates 4 leaderboard rows per affected user:
  (game, all_time), (game, current_monthly), (game, current_weekly),
  (__all__, all_time)
"""
import os
import math
import random
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any

import stripe
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from api.models import (
    db, User,
    Tournament, TournamentEntry, TournamentMatch, MatchDispute,
    Season, LeaderboardEntry,
)
from api.stripe_helpers import (
    PLATFORM_CUT,
    get_creator_destination,
    build_payment_intent_destination_kwargs,
)

stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")

tournament_bp = Blueprint("tournament", __name__)

# ── Constants ────────────────────────────────────────────────────────────────
VALID_FORMATS = {"Single Elimination", "Double Elimination", "Round Robin", "Swiss"}
VALID_SIZES = {4, 8, 16, 32, 64}
DISPUTE_WINDOW_HOURS = 48

# Scoring constants
SCORE_MATCH_WIN = 10
SCORE_TOURNAMENT_1ST = 50
SCORE_TOURNAMENT_2ND = 25
SCORE_TOURNAMENT_3RD = 15
SCORE_PARTICIPATION = 5


# =============================================================================
# Helpers
# =============================================================================

def _current_user_id() -> Optional[int]:
    """JWT identity as int, or None if missing/invalid."""
    try:
        ident = get_jwt_identity()
        return int(ident) if ident is not None else None
    except (TypeError, ValueError):
        return None


def _get_or_create_active_season(kind: str) -> Season:
    """Return the currently active Season for kind (all_time|monthly|weekly).

    For monthly/weekly: creates a new season if the active one has expired.
    For all_time: returns the singleton (created by migration).
    """
    now = datetime.utcnow()

    if kind == "all_time":
        s = Season.query.filter_by(kind="all_time").first()
        if s is None:
            s = Season(kind="all_time", label="All Time", is_active=True)
            db.session.add(s)
            db.session.flush()
        return s

    if kind == "monthly":
        # Window: first of current month → first of next month
        starts = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if starts.month == 12:
            ends = starts.replace(year=starts.year + 1, month=1)
        else:
            ends = starts.replace(month=starts.month + 1)
        label = starts.strftime("%B %Y")

    elif kind == "weekly":
        # Window: most recent Monday → following Monday
        days_since_mon = now.weekday()
        starts = (now - timedelta(days=days_since_mon)).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        ends = starts + timedelta(days=7)
        label = "Week of " + starts.strftime("%b %d")
    else:
        raise ValueError(f"Unknown season kind: {kind}")

    # Find existing or create
    s = Season.query.filter_by(kind=kind, label=label).first()
    if s is None:
        # Deactivate older active seasons of same kind
        Season.query.filter_by(kind=kind, is_active=True).update({"is_active": False})
        s = Season(kind=kind, label=label, starts_at=starts, ends_at=ends, is_active=True)
        db.session.add(s)
        db.session.flush()
    return s


def _bump_leaderboard(
    user_id: int,
    game: str,
    season: Optional[Season],
    score_delta: int,
    *,
    won_match: bool = False,
    lost_match: bool = False,
    tournament_played: bool = False,
    tournament_won: bool = False,
    top3: bool = False,
):
    """Upsert a LeaderboardEntry and increment its counters.

    season=None means all-time.
    Caller commits the session.
    """
    season_id = season.id if season else None

    entry = LeaderboardEntry.query.filter_by(
        user_id=user_id, game_name=game, season_id=season_id
    ).first()

    if entry is None:
        entry = LeaderboardEntry(
            user_id=user_id, game_name=game, season_id=season_id, score=0
        )
        db.session.add(entry)

    entry.score = (entry.score or 0) + score_delta
    if won_match:
        entry.wins = (entry.wins or 0) + 1
    if lost_match:
        entry.losses = (entry.losses or 0) + 1
    if tournament_played:
        entry.tournaments_played = (entry.tournaments_played or 0) + 1
    if tournament_won:
        entry.tournaments_won = (entry.tournaments_won or 0) + 1
    if top3:
        entry.placements_top3 = (entry.placements_top3 or 0) + 1

    entry.last_match_at = datetime.utcnow()
    entry.updated_at = datetime.utcnow()


def _record_match_result(match: TournamentMatch, tournament: Tournament):
    """Update leaderboards for a single confirmed match.

    Updates 8 rows per match: 4 for winner (game+all_time, game+monthly,
    game+weekly, all+all_time), 4 for loser (loss counters only).
    """
    if not match.winner_user_id or not match.loser_user_id:
        return

    game = tournament.game
    season_all = _get_or_create_active_season("all_time")
    season_month = _get_or_create_active_season("monthly")
    season_week = _get_or_create_active_season("weekly")

    # Winner: +10, won_match
    for game_key, season in [
        (game, season_all), (game, season_month), (game, season_week),
        ("__all__", season_all),
    ]:
        _bump_leaderboard(
            match.winner_user_id, game_key, season,
            SCORE_MATCH_WIN, won_match=True,
        )

    # Loser: +0, lost_match
    for game_key, season in [
        (game, season_all), (game, season_month), (game, season_week),
        ("__all__", season_all),
    ]:
        _bump_leaderboard(
            match.loser_user_id, game_key, season, 0, lost_match=True,
        )


def _record_tournament_completion(tournament: Tournament):
    """Award placement points + participation bumps for a finished tournament."""
    game = tournament.game
    season_all = _get_or_create_active_season("all_time")
    season_month = _get_or_create_active_season("monthly")
    season_week = _get_or_create_active_season("weekly")

    placement_points = {
        tournament.winner_user_id: SCORE_TOURNAMENT_1ST,
        tournament.runner_up_user_id: SCORE_TOURNAMENT_2ND,
        tournament.third_place_user_id: SCORE_TOURNAMENT_3RD,
    }

    # SP-8: notify top 3 of their placement
    from api.notifications import notify
    placement_labels = {
        tournament.winner_user_id: ("tournament_won", f'You won "{tournament.name}"!'),
        tournament.runner_up_user_id: ("tournament_placed", f'You placed 2nd in "{tournament.name}"'),
        tournament.third_place_user_id: ("tournament_placed", f'You placed 3rd in "{tournament.name}"'),
    }
    for uid, (ntype, msg) in placement_labels.items():
        if uid:
            notify(
                user_id=uid,
                type=ntype,
                content=msg,
                extra_data={"tournament_id": tournament.id},
            )

    # Award placement bonuses
    for uid, pts in placement_points.items():
        if not uid:
            continue
        for game_key, season in [
            (game, season_all), (game, season_month), (game, season_week),
            ("__all__", season_all),
        ]:
            _bump_leaderboard(
                uid, game_key, season, pts,
                tournament_won=(uid == tournament.winner_user_id),
                top3=True,
            )

    # Participation bonus for everyone who played (active or eliminated, not refunded/withdrew)
    entries = TournamentEntry.query.filter(
        TournamentEntry.tournament_id == tournament.id,
        TournamentEntry.status.in_(["active", "eliminated"]),
    ).all()
    for entry in entries:
        for game_key, season in [
            (game, season_all), (game, season_month), (game, season_week),
            ("__all__", season_all),
        ]:
            _bump_leaderboard(
                entry.user_id, game_key, season,
                SCORE_PARTICIPATION, tournament_played=True,
            )


# =============================================================================
# Bracket generation
# =============================================================================

def _seed_participants(entries: List[TournamentEntry]) -> List[int]:
    """Return user_ids in seeded order. Random for now; future: by rating."""
    user_ids = [e.user_id for e in entries if e.status == "active"]
    random.shuffle(user_ids)
    return user_ids


def _next_power_of_2(n: int) -> int:
    return 1 if n < 1 else 2 ** math.ceil(math.log2(n))


def _build_single_elim(seeded: List[int], tournament_id: int) -> List[TournamentMatch]:
    """Build a single-elimination bracket.

    Pads to next power of 2 with byes (None player2). Bye matches auto-advance.
    Returns list of TournamentMatch objects (not yet committed).
    """
    n = len(seeded)
    bracket_size = _next_power_of_2(n)
    padded = list(seeded) + [None] * (bracket_size - n)

    matches: List[TournamentMatch] = []
    round_num = 1
    current_round_matches: List[TournamentMatch] = []

    # Round 1
    for i in range(0, bracket_size, 2):
        m = TournamentMatch(
            tournament_id=tournament_id,
            round_number=round_num,
            match_index=i // 2,
            bracket_side=None,
            player1_user_id=padded[i],
            player2_user_id=padded[i + 1],
            status="pending",
        )
        # Bye handling
        if padded[i] is not None and padded[i + 1] is None:
            m.winner_user_id = padded[i]
            m.status = "bye"
        elif padded[i] is None and padded[i + 1] is not None:
            m.winner_user_id = padded[i + 1]
            m.status = "bye"
        elif padded[i] is None and padded[i + 1] is None:
            m.status = "bye"
        matches.append(m)
        current_round_matches.append(m)

    # Subsequent rounds (placeholder TBD vs TBD)
    while len(current_round_matches) > 1:
        round_num += 1
        next_round: List[TournamentMatch] = []
        for i in range(0, len(current_round_matches), 2):
            m = TournamentMatch(
                tournament_id=tournament_id,
                round_number=round_num,
                match_index=i // 2,
                bracket_side=None,
                player1_user_id=None,
                player2_user_id=None,
                status="pending",
            )
            matches.append(m)
            next_round.append(m)
        current_round_matches = next_round

    return matches


def _build_round_robin(seeded: List[int], tournament_id: int) -> List[TournamentMatch]:
    """Circle method: every player plays every other player once."""
    n = len(seeded)
    if n < 2:
        return []
    # Add a dummy "bye" if odd
    players = list(seeded)
    if n % 2 == 1:
        players.append(None)
        n += 1

    matches: List[TournamentMatch] = []
    rotation = list(players)
    rounds = n - 1

    for r in range(rounds):
        for i in range(n // 2):
            p1, p2 = rotation[i], rotation[n - 1 - i]
            if p1 is None or p2 is None:
                continue  # skip the bye pairing
            m = TournamentMatch(
                tournament_id=tournament_id,
                round_number=r + 1,
                match_index=i,
                bracket_side=None,
                player1_user_id=p1,
                player2_user_id=p2,
                status="pending",
            )
            matches.append(m)
        # Rotate (keep first fixed)
        rotation = [rotation[0]] + [rotation[-1]] + rotation[1:-1]

    return matches


def _build_swiss(seeded: List[int], tournament_id: int) -> List[TournamentMatch]:
    """Swiss round 1 only (later rounds paired dynamically as results come in).

    Round count = ceil(log2(n)). Round 1 pairs top-half vs bottom-half.
    """
    n = len(seeded)
    if n < 2:
        return []
    half = n // 2
    matches: List[TournamentMatch] = []
    for i in range(half):
        m = TournamentMatch(
            tournament_id=tournament_id,
            round_number=1,
            match_index=i,
            bracket_side=None,
            player1_user_id=seeded[i],
            player2_user_id=seeded[i + half] if (i + half) < n else None,
            status="pending",
        )
        if m.player2_user_id is None:
            m.winner_user_id = m.player1_user_id
            m.status = "bye"
        matches.append(m)
    return matches


def _build_double_elim(seeded: List[int], tournament_id: int) -> List[TournamentMatch]:
    """Double-elim: build winners bracket with bracket_side='winners'.

    Losers bracket and grand final created dynamically as winners bracket
    matches resolve (simpler than pre-computing all losers slots).
    """
    n = len(seeded)
    bracket_size = _next_power_of_2(n)
    padded = list(seeded) + [None] * (bracket_size - n)

    matches: List[TournamentMatch] = []
    round_num = 1
    current: List[TournamentMatch] = []

    # Winners bracket round 1
    for i in range(0, bracket_size, 2):
        m = TournamentMatch(
            tournament_id=tournament_id,
            round_number=round_num,
            match_index=i // 2,
            bracket_side="winners",
            player1_user_id=padded[i],
            player2_user_id=padded[i + 1],
            status="pending",
        )
        if padded[i] is not None and padded[i + 1] is None:
            m.winner_user_id = padded[i]
            m.status = "bye"
        elif padded[i] is None and padded[i + 1] is not None:
            m.winner_user_id = padded[i + 1]
            m.status = "bye"
        elif padded[i] is None and padded[i + 1] is None:
            m.status = "bye"
        matches.append(m)
        current.append(m)

    # Subsequent winners rounds
    while len(current) > 1:
        round_num += 1
        nxt: List[TournamentMatch] = []
        for i in range(0, len(current), 2):
            m = TournamentMatch(
                tournament_id=tournament_id,
                round_number=round_num,
                match_index=i // 2,
                bracket_side="winners",
                status="pending",
            )
            matches.append(m)
            nxt.append(m)
        current = nxt

    return matches


def _generate_bracket(tournament: Tournament, entries: List[TournamentEntry]):
    """Dispatch to the right bracket builder, save matches, set seeds on entries."""
    seeded = _seed_participants(entries)

    # Assign seeds to entries
    for seed_idx, uid in enumerate(seeded, start=1):
        for e in entries:
            if e.user_id == uid:
                e.seed = seed_idx

    fmt = tournament.format
    if fmt == "Single Elimination":
        matches = _build_single_elim(seeded, tournament.id)
    elif fmt == "Double Elimination":
        matches = _build_double_elim(seeded, tournament.id)
    elif fmt == "Round Robin":
        matches = _build_round_robin(seeded, tournament.id)
    elif fmt == "Swiss":
        matches = _build_swiss(seeded, tournament.id)
    else:
        raise ValueError(f"Unknown format: {fmt}")

    db.session.add_all(matches)
    db.session.flush()  # populate match.id

    # Wire winners-bracket advancement pointers (single-elim + winners side of double-elim)
    if fmt in ("Single Elimination", "Double Elimination"):
        side_filter = (lambda m: m.bracket_side in (None, "winners"))
        rounds: Dict[int, List[TournamentMatch]] = {}
        for m in matches:
            if side_filter(m):
                rounds.setdefault(m.round_number, []).append(m)
        for rnum in sorted(rounds.keys())[:-1]:
            current = sorted(rounds[rnum], key=lambda x: x.match_index)
            nxt = sorted(rounds.get(rnum + 1, []), key=lambda x: x.match_index)
            for i, m in enumerate(current):
                target = nxt[i // 2] if i // 2 < len(nxt) else None
                if target:
                    m.advances_to_match_id = target.id

    return matches


# =============================================================================
# Routes — Tournament listing/CRUD
# =============================================================================

@tournament_bp.route("/api/gaming/tournaments", methods=["GET"])
def list_tournaments():
    """List public tournaments. Optional filters: status, game.

    Returns {"tournaments": [...]} matching what TournamentPage.js consumes.
    """
    viewer_id = None
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        try:
            from flask_jwt_extended import decode_token
            decoded = decode_token(auth_header.split(" ", 1)[1])
            viewer_id = int(decoded.get("sub")) if decoded.get("sub") else None
        except Exception:
            viewer_id = None

    q = Tournament.query.filter_by(is_public=True)

    status = request.args.get("status")
    if status and status in {"open", "active", "completed", "cancelled"}:
        q = q.filter_by(status=status)

    game = request.args.get("game")
    if game:
        q = q.filter(Tournament.game.ilike(f"%{game}%"))

    q = q.order_by(Tournament.created_at.desc()).limit(100)
    items = [t.serialize(viewer_id=viewer_id) for t in q.all()]
    return jsonify({"tournaments": items}), 200


@tournament_bp.route("/api/gaming/tournaments", methods=["POST"])
@jwt_required()
def create_tournament():
    """Create a tournament. Creator becomes organizer."""
    user_id = _current_user_id()
    if not user_id:
        return jsonify({"error": "Authentication required"}), 401

    data = request.get_json(silent=True) or {}

    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"error": "Tournament name is required"}), 400
    if len(name) > 120:
        return jsonify({"error": "Name too long (max 120 chars)"}), 400

    game = (data.get("game") or "").strip()
    if not game:
        return jsonify({"error": "Game is required"}), 400

    fmt = data.get("format") or "Single Elimination"
    if fmt not in VALID_FORMATS:
        return jsonify({"error": f"Format must be one of {sorted(VALID_FORMATS)}"}), 400

    try:
        size = int(data.get("size", 8))
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid size"}), 400
    if size not in VALID_SIZES:
        return jsonify({"error": f"Size must be one of {sorted(VALID_SIZES)}"}), 400

    try:
        entry_fee = float(data.get("entry_fee", 0) or 0)
    except (TypeError, ValueError):
        entry_fee = 0.0
    entry_fee_cents = max(0, int(round(entry_fee * 100)))

    # If charging an entry fee, organizer needs Stripe Connect onboarded
    if entry_fee_cents > 0 and not get_creator_destination(user_id):
        return jsonify({
            "error": "Connect your payout account before charging entry fees",
            "code": "stripe_onboarding_required",
        }), 400

    starts_at = None
    raw_starts = data.get("starts_at")
    if raw_starts:
        try:
            # Accept "2026-04-05T18:00" or with seconds
            starts_at = datetime.fromisoformat(raw_starts.replace("Z", "+00:00"))
            if starts_at.tzinfo is not None:
                starts_at = starts_at.replace(tzinfo=None)
        except (ValueError, AttributeError):
            return jsonify({"error": "Invalid starts_at format"}), 400

    t = Tournament(
        creator_id=user_id,
        name=name,
        description=(data.get("description") or "").strip() or None,
        game=game,
        format=fmt,
        size=size,
        is_public=bool(data.get("is_public", True)),
        starts_at=starts_at,
        prize=(data.get("prize") or "").strip() or None,
        entry_fee_cents=entry_fee_cents,
        prize_split_json=data.get("prize_split") or {"1": 70, "2": 20, "3": 10},
        status="open",
    )
    db.session.add(t)
    db.session.commit()
    return jsonify({"tournament": t.serialize(viewer_id=user_id)}), 201


@tournament_bp.route("/api/gaming/tournaments/<int:tid>", methods=["GET"])
def get_tournament(tid):
    """Detail view: tournament + entries + bracket matches."""
    t = Tournament.query.get(tid)
    if not t:
        return jsonify({"error": "Tournament not found"}), 404
    if not t.is_public:
        return jsonify({"error": "Tournament is private"}), 403

    viewer_id = None
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        try:
            from flask_jwt_extended import decode_token
            decoded = decode_token(auth_header.split(" ", 1)[1])
            viewer_id = int(decoded.get("sub")) if decoded.get("sub") else None
        except Exception:
            pass

    entries = TournamentEntry.query.filter_by(tournament_id=tid).order_by(
        TournamentEntry.seed.asc().nullslast(), TournamentEntry.joined_at.asc()
    ).all()
    matches = TournamentMatch.query.filter_by(tournament_id=tid).order_by(
        TournamentMatch.round_number.asc(), TournamentMatch.match_index.asc()
    ).all()

    return jsonify({
        "tournament": t.serialize(viewer_id=viewer_id),
        "entries": [e.serialize() for e in entries],
        "matches": [m.serialize() for m in matches],
    }), 200


# =============================================================================
# Routes — Join (free or Stripe paid)
# =============================================================================

@tournament_bp.route("/api/gaming/tournaments/<int:tid>/join", methods=["POST"])
@jwt_required()
def join_tournament(tid):
    """Join a tournament. Free entries activate immediately. Paid entries
    return a Stripe client_secret; activation happens on webhook.
    """
    user_id = _current_user_id()
    if not user_id:
        return jsonify({"error": "Authentication required"}), 401

    t = Tournament.query.get(tid)
    if not t:
        return jsonify({"error": "Tournament not found"}), 404
    if t.status != "open":
        return jsonify({"error": f"Tournament is {t.status}, not accepting entries"}), 400
    if t.creator_id == user_id:
        return jsonify({"error": "Organizer cannot join own tournament"}), 400
    if t.is_full():
        return jsonify({"error": "Tournament is full"}), 400

    existing = TournamentEntry.query.filter_by(tournament_id=tid, user_id=user_id).first()
    if existing and existing.status in ("active",):
        return jsonify({"error": "Already joined"}), 400
    if existing and existing.payment_status == "pending":
        return jsonify({"error": "Payment already pending — complete or cancel it first"}), 400

    # ── Free entry ──
    if (t.entry_fee_cents or 0) <= 0:
        if existing:
            existing.status = "active"
            existing.payment_status = "none"
            existing.joined_at = datetime.utcnow()
        else:
            existing = TournamentEntry(
                tournament_id=tid, user_id=user_id,
                status="active", payment_status="none",
            )
            db.session.add(existing)
        db.session.commit()
        return jsonify({"entry": existing.serialize(), "free": True}), 200

    # ── Paid entry: PaymentIntent + 10% platform fee ──
    creator_dest = get_creator_destination(t.creator_id)
    if not creator_dest:
        return jsonify({
            "error": "Organizer payout not set up",
            "code": "organizer_stripe_missing",
        }), 503

    metadata = {
        "kind": "tournament_entry",
        "tournament_id": str(tid),
        "user_id": str(user_id),
    }

    intent_kwargs = {
        "amount": t.entry_fee_cents,
        "currency": "usd",
        "automatic_payment_methods": {"enabled": True},
    }
    intent_kwargs.update(
        build_payment_intent_destination_kwargs(
            t.entry_fee_cents / 100.0, creator_dest, metadata=metadata,
        )
    )

    try:
        intent = stripe.PaymentIntent.create(**intent_kwargs)
    except stripe.error.StripeError as e:
        return jsonify({"error": f"Stripe error: {str(e)}"}), 502

    platform_fee_cents = int(round(t.entry_fee_cents * PLATFORM_CUT))

    if existing:
        existing.status = "active"
        existing.payment_status = "pending"
        existing.amount_paid_cents = t.entry_fee_cents
        existing.platform_fee_cents = platform_fee_cents
        existing.stripe_payment_intent_id = intent.id
        existing.joined_at = datetime.utcnow()
    else:
        existing = TournamentEntry(
            tournament_id=tid, user_id=user_id,
            status="active",
            payment_status="pending",
            amount_paid_cents=t.entry_fee_cents,
            platform_fee_cents=platform_fee_cents,
            stripe_payment_intent_id=intent.id,
        )
        db.session.add(existing)

    db.session.commit()

    return jsonify({
        "entry": existing.serialize(),
        "client_secret": intent.client_secret,
        "payment_intent_id": intent.id,
        "amount_cents": t.entry_fee_cents,
    }), 200


# =============================================================================
# Routes — Organizer controls
# =============================================================================

@tournament_bp.route("/api/gaming/tournaments/<int:tid>/start", methods=["POST"])
@jwt_required()
def start_tournament(tid):
    """Organizer triggers bracket generation. Status: open → active."""
    user_id = _current_user_id()
    t = Tournament.query.get(tid)
    if not t:
        return jsonify({"error": "Tournament not found"}), 404
    if t.creator_id != user_id:
        return jsonify({"error": "Only the organizer can start the tournament"}), 403
    if t.status != "open":
        return jsonify({"error": f"Tournament is {t.status}, cannot start"}), 400

    active_entries = TournamentEntry.query.filter_by(
        tournament_id=tid, status="active",
    ).filter(TournamentEntry.payment_status.in_(["none", "paid"])).all()

    if len(active_entries) < 2:
        return jsonify({"error": "Need at least 2 paid/free entries to start"}), 400

    matches = _generate_bracket(t, active_entries)
    t.status = "active"
    t.updated_at = datetime.utcnow()

    # SP-8: notify all entrants the tournament has started
    from api.notifications import notify
    for entry in active_entries:
        notify(
            user_id=entry.user_id,
            type="tournament_started",
            content=f'"{t.name}" has started! Check your bracket.',
            extra_data={"tournament_id": t.id},
        )
    db.session.commit()

    return jsonify({
        "tournament": t.serialize(viewer_id=user_id),
        "matches": [m.serialize() for m in matches],
    }), 200


@tournament_bp.route("/api/gaming/tournaments/<int:tid>/cancel", methods=["POST"])
@jwt_required()
def cancel_tournament(tid):
    """Organizer cancels the tournament BEFORE start. Refunds all paid entries."""
    user_id = _current_user_id()
    t = Tournament.query.get(tid)
    if not t:
        return jsonify({"error": "Tournament not found"}), 404
    if t.creator_id != user_id:
        return jsonify({"error": "Only the organizer can cancel"}), 403
    if t.status not in ("open", "active"):
        return jsonify({"error": f"Cannot cancel a {t.status} tournament"}), 400

    paid = TournamentEntry.query.filter_by(
        tournament_id=tid, payment_status="paid",
    ).all()

    refund_errors = []
    for entry in paid:
        if not entry.stripe_payment_intent_id:
            continue
        try:
            stripe.Refund.create(
                payment_intent=entry.stripe_payment_intent_id,
                reason="requested_by_customer",
                metadata={"tournament_id": str(tid), "reason": "tournament_cancelled"},
            )
            entry.payment_status = "refunded"
            entry.status = "refunded"
        except stripe.error.StripeError as e:
            refund_errors.append({"user_id": entry.user_id, "error": str(e)})

    t.status = "cancelled"
    t.updated_at = datetime.utcnow()
    db.session.commit()

    return jsonify({
        "tournament": t.serialize(viewer_id=user_id),
        "refund_errors": refund_errors,
    }), 200


# =============================================================================
# Routes — Match reporting + disputes
# =============================================================================

@tournament_bp.route(
    "/api/gaming/tournaments/<int:tid>/matches/<int:mid>/report",
    methods=["POST"],
)
@jwt_required()
def report_match(tid, mid):
    """Report a match result. Either player can report. Body:
       { winner_user_id: int, score_p1?: int, score_p2?: int }
    """
    user_id = _current_user_id()
    t = Tournament.query.get(tid)
    if not t:
        return jsonify({"error": "Tournament not found"}), 404

    m = TournamentMatch.query.filter_by(id=mid, tournament_id=tid).first()
    if not m:
        return jsonify({"error": "Match not found"}), 404

    if m.status not in ("pending", "disputed"):
        return jsonify({"error": f"Match is {m.status}, cannot report"}), 400

    if user_id not in (m.player1_user_id, m.player2_user_id) and user_id != t.creator_id:
        return jsonify({"error": "Only match participants or organizer can report"}), 403

    data = request.get_json(silent=True) or {}
    winner = data.get("winner_user_id")
    if winner not in (m.player1_user_id, m.player2_user_id):
        return jsonify({"error": "winner_user_id must be one of the match players"}), 400

    m.winner_user_id = winner
    m.loser_user_id = m.player2_user_id if winner == m.player1_user_id else m.player1_user_id
    if "score_p1" in data:
        try: m.score_p1 = int(data["score_p1"])
        except (TypeError, ValueError): pass
    if "score_p2" in data:
        try: m.score_p2 = int(data["score_p2"])
        except (TypeError, ValueError): pass
    m.reported_by_user_id = user_id
    m.reported_at = datetime.utcnow()

    # Organizer reports = instant confirm. Player reports = pending until other side
    # confirms or 48h auto-confirm window expires.
    if user_id == t.creator_id:
        _confirm_match(m, t)
    else:
        m.status = "reported"

    db.session.commit()
    return jsonify({"match": m.serialize()}), 200


def _confirm_match(match: TournamentMatch, tournament: Tournament):
    """Lock in a match result, advance the winner, update leaderboards."""
    match.status = "confirmed"
    match.confirmed_at = datetime.utcnow()

    # Mark loser eliminated (single-elim only — double-elim handles via losers bracket)
    if tournament.format == "Single Elimination" and match.loser_user_id:
        loser_entry = TournamentEntry.query.filter_by(
            tournament_id=tournament.id, user_id=match.loser_user_id,
        ).first()
        if loser_entry and loser_entry.status == "active":
            loser_entry.status = "eliminated"
            loser_entry.eliminated_at = datetime.utcnow()

    # Advance winner to next match
    if match.advances_to_match_id:
        nxt = TournamentMatch.query.get(match.advances_to_match_id)
        if nxt:
            if nxt.player1_user_id is None:
                nxt.player1_user_id = match.winner_user_id
            elif nxt.player2_user_id is None:
                nxt.player2_user_id = match.winner_user_id

    # Update leaderboards
    _record_match_result(match, tournament)

    # SP-8: notify loser they have 48h to dispute
    if match.loser_user_id and match.reported_by_user_id != match.loser_user_id:
        from api.notifications import notify
        notify(
            user_id=match.loser_user_id,
            type="tournament_match_reported",
            content=f'Your "{tournament.name}" match was reported. You have 48h to dispute.',
            from_user_id=match.reported_by_user_id,
            extra_data={
                "tournament_id": tournament.id,
                "match_id": match.id,
            },
        )

    # Check if tournament is complete
    _maybe_complete_tournament(tournament)


def _maybe_complete_tournament(t: Tournament):
    """If all matches are confirmed and we have a final winner, complete the tournament."""
    pending = TournamentMatch.query.filter(
        TournamentMatch.tournament_id == t.id,
        TournamentMatch.status.in_(["pending", "reported", "disputed"]),
    ).count()
    if pending > 0:
        return

    # Find the final match (highest round_number, winners side or no side)
    final = TournamentMatch.query.filter(
        TournamentMatch.tournament_id == t.id,
        TournamentMatch.bracket_side.in_(["winners", "grand_final", None]),
        TournamentMatch.advances_to_match_id.is_(None),
        TournamentMatch.status.in_(["confirmed", "bye"]),
    ).order_by(TournamentMatch.round_number.desc()).first()

    if not final or not final.winner_user_id:
        return

    t.winner_user_id = final.winner_user_id
    t.runner_up_user_id = final.loser_user_id

    # Find 3rd place (loser of the semifinal)
    semis = TournamentMatch.query.filter(
        TournamentMatch.tournament_id == t.id,
        TournamentMatch.round_number == final.round_number - 1,
        TournamentMatch.status.in_(["confirmed", "bye"]),
    ).all()
    semi_losers = [s.loser_user_id for s in semis if s.loser_user_id]
    if semi_losers:
        t.third_place_user_id = semi_losers[0]

    t.status = "completed"
    t.completed_at = datetime.utcnow()

    _record_tournament_completion(t)


@tournament_bp.route(
    "/api/gaming/tournaments/<int:tid>/matches/<int:mid>/dispute",
    methods=["POST"],
)
@jwt_required()
def dispute_match(tid, mid):
    """Loser disputes a reported match. 48h window before auto-confirm."""
    user_id = _current_user_id()

    m = TournamentMatch.query.filter_by(id=mid, tournament_id=tid).first()
    if not m:
        return jsonify({"error": "Match not found"}), 404

    if m.status != "reported":
        return jsonify({"error": f"Cannot dispute a {m.status} match"}), 400

    if user_id not in (m.player1_user_id, m.player2_user_id):
        return jsonify({"error": "Only match participants can dispute"}), 403

    if m.reported_by_user_id == user_id:
        return jsonify({"error": "Cannot dispute your own report"}), 400

    data = request.get_json(silent=True) or {}
    reason = (data.get("reason") or "").strip()
    if not reason:
        return jsonify({"error": "Reason required"}), 400

    now = datetime.utcnow()
    dispute = MatchDispute(
        match_id=mid,
        tournament_id=tid,
        raised_by_user_id=user_id,
        reason=reason,
        evidence_url=(data.get("evidence_url") or "").strip() or None,
        status="pending",
        created_at=now,
        auto_confirm_at=now + timedelta(hours=DISPUTE_WINDOW_HOURS),
    )
    db.session.add(dispute)

    m.status = "disputed"
    db.session.commit()
    return jsonify({"dispute": dispute.serialize()}), 201


@tournament_bp.route(
    "/api/gaming/tournaments/<int:tid>/matches/<int:mid>/resolve",
    methods=["POST"],
)
@jwt_required()
def resolve_dispute(tid, mid):
    """Organizer rules a dispute. Body:
       { rule_for: "reporter"|"disputer", ruling?: str, winner_user_id?: int }
    If rule_for=reporter, the originally reported winner wins.
    If rule_for=disputer, the disputer wins (we flip the result).
    """
    user_id = _current_user_id()
    t = Tournament.query.get(tid)
    if not t:
        return jsonify({"error": "Tournament not found"}), 404
    if t.creator_id != user_id:
        return jsonify({"error": "Only the organizer can resolve disputes"}), 403

    m = TournamentMatch.query.filter_by(id=mid, tournament_id=tid).first()
    if not m or m.status != "disputed":
        return jsonify({"error": "Match is not disputed"}), 404

    dispute = MatchDispute.query.filter_by(
        match_id=mid, status="pending",
    ).order_by(MatchDispute.created_at.desc()).first()
    if not dispute:
        return jsonify({"error": "No pending dispute on this match"}), 404

    data = request.get_json(silent=True) or {}
    rule_for = (data.get("rule_for") or "").strip().lower()
    ruling = (data.get("ruling") or "").strip() or None

    if rule_for == "reporter":
        dispute.status = "resolved_for_reporter"
        # winner stays as reported; just confirm
    elif rule_for == "disputer":
        dispute.status = "resolved_for_disputer"
        # Flip the winner
        m.winner_user_id, m.loser_user_id = m.loser_user_id, m.winner_user_id
    else:
        return jsonify({"error": "rule_for must be 'reporter' or 'disputer'"}), 400

    dispute.organizer_ruling = ruling
    dispute.resolved_by_user_id = user_id
    dispute.resolved_at = datetime.utcnow()

    _confirm_match(m, t)

    db.session.commit()
    return jsonify({
        "dispute": dispute.serialize(),
        "match": m.serialize(),
    }), 200


# =============================================================================
# Routes — Leaderboard
# =============================================================================

@tournament_bp.route("/api/gaming/leaderboard", methods=["GET"])
def get_leaderboard():
    """Query leaderboard.

    Query params:
      game   - exact game name OR "All Games" (default)
      period - all-time | monthly | weekly  (default: all-time)
      limit  - default 100, max 500

    Returns: {"leaders": [{rank, user_id, username, avatar, game, score, wins, ...}],
              "my_rank": int|None}
    """
    game_param = request.args.get("game", "All Games")
    period = request.args.get("period", "all-time")
    try:
        limit = min(int(request.args.get("limit", 100)), 500)
    except (TypeError, ValueError):
        limit = 100

    game_key = "__all__" if game_param == "All Games" else game_param

    # Resolve season_id
    if period == "all-time":
        season_id = None
    elif period == "monthly":
        season = _get_or_create_active_season("monthly")
        db.session.commit()
        season_id = season.id
    elif period == "weekly":
        season = _get_or_create_active_season("weekly")
        db.session.commit()
        season_id = season.id
    else:
        return jsonify({"error": "period must be all-time, monthly, or weekly"}), 400

    q = LeaderboardEntry.query.filter_by(game_name=game_key, season_id=season_id)
    q = q.order_by(LeaderboardEntry.score.desc(), LeaderboardEntry.wins.desc())
    rows = q.limit(limit).all()

    leaders = []
    for rank, row in enumerate(rows, start=1):
        leaders.append(row.serialize(rank=rank))

    # Find requesting user's rank if authed
    my_rank = None
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        try:
            from flask_jwt_extended import decode_token
            decoded = decode_token(auth_header.split(" ", 1)[1])
            uid = int(decoded.get("sub")) if decoded.get("sub") else None
            if uid:
                my_entry = LeaderboardEntry.query.filter_by(
                    user_id=uid, game_name=game_key, season_id=season_id,
                ).first()
                if my_entry:
                    higher = LeaderboardEntry.query.filter(
                        LeaderboardEntry.game_name == game_key,
                        LeaderboardEntry.season_id == (season_id if season_id else None),
                        LeaderboardEntry.score > my_entry.score,
                    ).count()
                    my_rank = higher + 1
        except Exception:
            pass

    return jsonify({"leaders": leaders, "my_rank": my_rank}), 200


# =============================================================================
# Stripe webhook hook (called from main webhook handler in routes.py)
# =============================================================================

def handle_tournament_payment_succeeded(payment_intent_id: str) -> bool:
    """Called from /api/webhook/stripe when a payment_intent.succeeded event
    arrives with metadata.kind == 'tournament_entry'. Returns True if a
    matching entry was found and updated.

    Idempotent: if entry is already 'paid', does nothing.
    Caller commits the session.
    """
    if not payment_intent_id:
        return False

    entry = TournamentEntry.query.filter_by(
        stripe_payment_intent_id=payment_intent_id,
    ).first()
    if not entry:
        return False
    if entry.payment_status == "paid":
        return False  # idempotent no-op

    entry.payment_status = "paid"

    t = Tournament.query.get(entry.tournament_id)
    if t:
        # 90% to prize pool, 10% to platform
        creator_share = entry.amount_paid_cents - (entry.platform_fee_cents or 0)
        t.prize_pool_cents = (t.prize_pool_cents or 0) + creator_share
        t.platform_fee_collected_cents = (
            (t.platform_fee_collected_cents or 0) + (entry.platform_fee_cents or 0)
        )

    return True


def handle_tournament_payment_failed(payment_intent_id: str) -> bool:
    """Called from /api/webhook/stripe on payment_intent.payment_failed."""
    if not payment_intent_id:
        return False
    entry = TournamentEntry.query.filter_by(
        stripe_payment_intent_id=payment_intent_id,
    ).first()
    if not entry:
        return False
    if entry.payment_status in ("paid", "refunded"):
        return False
    entry.payment_status = "failed"
    entry.status = "withdrew"
    return True
