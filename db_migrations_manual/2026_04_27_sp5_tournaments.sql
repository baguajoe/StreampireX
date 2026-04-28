-- SP-5: Tournaments + Leaderboards schema.
-- Idempotent — uses CREATE TABLE IF NOT EXISTS.
-- Run against Railway Postgres BEFORE next redeploy.

CREATE TABLE IF NOT EXISTS tournament (
    id                              SERIAL PRIMARY KEY,
    creator_id                      INTEGER NOT NULL,
    name                            VARCHAR(120) NOT NULL,
    description                     TEXT,
    game                            VARCHAR(80) NOT NULL,
    game_id                         INTEGER,
    format                          VARCHAR(40) NOT NULL DEFAULT 'Single Elimination',
    size                            INTEGER NOT NULL DEFAULT 8,
    status                          VARCHAR(20) NOT NULL DEFAULT 'open',
    is_public                       BOOLEAN NOT NULL DEFAULT TRUE,
    starts_at                       TIMESTAMP,
    completed_at                    TIMESTAMP,
    prize                           VARCHAR(255),
    prize_pool_cents                INTEGER NOT NULL DEFAULT 0,
    prize_split_json                JSON,
    entry_fee_cents                 INTEGER NOT NULL DEFAULT 0,
    platform_fee_collected_cents    INTEGER NOT NULL DEFAULT 0,
    bracket_json                    JSON,
    winner_user_id                  INTEGER,
    runner_up_user_id               INTEGER,
    third_place_user_id             INTEGER,
    created_at                      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at                      TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_tournament_status    ON tournament(status);
CREATE INDEX IF NOT EXISTS ix_tournament_starts_at ON tournament(starts_at);

CREATE TABLE IF NOT EXISTS tournament_entry (
    id                          SERIAL PRIMARY KEY,
    tournament_id               INTEGER NOT NULL,
    user_id                     INTEGER NOT NULL,
    seed                        INTEGER,
    status                      VARCHAR(20) NOT NULL DEFAULT 'active',
    placement                   INTEGER,
    stripe_payment_intent_id    VARCHAR(255),
    amount_paid_cents           INTEGER NOT NULL DEFAULT 0,
    platform_fee_cents          INTEGER NOT NULL DEFAULT 0,
    payment_status              VARCHAR(20) NOT NULL DEFAULT 'none',
    joined_at                   TIMESTAMP NOT NULL DEFAULT NOW(),
    eliminated_at               TIMESTAMP,
    CONSTRAINT uq_tournament_entry_user UNIQUE (tournament_id, user_id)
);
CREATE INDEX IF NOT EXISTS ix_tournament_entry_tournament_id ON tournament_entry(tournament_id);
CREATE INDEX IF NOT EXISTS ix_tournament_entry_user_id       ON tournament_entry(user_id);
CREATE INDEX IF NOT EXISTS ix_tournament_entry_pi            ON tournament_entry(stripe_payment_intent_id);

CREATE TABLE IF NOT EXISTS tournament_match (
    id                              SERIAL PRIMARY KEY,
    tournament_id                   INTEGER NOT NULL,
    round_number                    INTEGER NOT NULL,
    match_index                     INTEGER NOT NULL,
    bracket_side                    VARCHAR(20),
    player1_user_id                 INTEGER,
    player2_user_id                 INTEGER,
    score_p1                        INTEGER,
    score_p2                        INTEGER,
    winner_user_id                  INTEGER,
    loser_user_id                   INTEGER,
    status                          VARCHAR(20) NOT NULL DEFAULT 'pending',
    reported_by_user_id             INTEGER,
    reported_at                     TIMESTAMP,
    confirmed_at                    TIMESTAMP,
    advances_to_match_id            INTEGER,
    loser_advances_to_match_id      INTEGER,
    created_at                      TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_tournament_match_tournament_id ON tournament_match(tournament_id);

CREATE TABLE IF NOT EXISTS match_dispute (
    id                          SERIAL PRIMARY KEY,
    match_id                    INTEGER NOT NULL,
    tournament_id               INTEGER NOT NULL,
    raised_by_user_id           INTEGER NOT NULL,
    reason                      TEXT NOT NULL,
    evidence_url                VARCHAR(500),
    status                      VARCHAR(40) NOT NULL DEFAULT 'pending',
    organizer_ruling            TEXT,
    resolved_by_user_id         INTEGER,
    created_at                  TIMESTAMP NOT NULL DEFAULT NOW(),
    resolved_at                 TIMESTAMP,
    auto_confirm_at             TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_match_dispute_match_id      ON match_dispute(match_id);
CREATE INDEX IF NOT EXISTS ix_match_dispute_tournament_id ON match_dispute(tournament_id);

CREATE TABLE IF NOT EXISTS season (
    id          SERIAL PRIMARY KEY,
    kind        VARCHAR(20) NOT NULL,
    label       VARCHAR(60) NOT NULL,
    starts_at   TIMESTAMP,
    ends_at     TIMESTAMP,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_season_kind      ON season(kind);
CREATE INDEX IF NOT EXISTS ix_season_is_active ON season(is_active);

CREATE TABLE IF NOT EXISTS leaderboard_entry (
    id                      SERIAL PRIMARY KEY,
    user_id                 INTEGER NOT NULL,
    game_name               VARCHAR(80) NOT NULL DEFAULT '__all__',
    season_id               INTEGER,
    score                   INTEGER NOT NULL DEFAULT 0,
    wins                    INTEGER NOT NULL DEFAULT 0,
    losses                  INTEGER NOT NULL DEFAULT 0,
    tournaments_played      INTEGER NOT NULL DEFAULT 0,
    tournaments_won         INTEGER NOT NULL DEFAULT 0,
    placements_top3         INTEGER NOT NULL DEFAULT 0,
    last_match_at           TIMESTAMP,
    updated_at              TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_leaderboard_user_game_season UNIQUE (user_id, game_name, season_id)
);
CREATE INDEX IF NOT EXISTS ix_leaderboard_user_id           ON leaderboard_entry(user_id);
CREATE INDEX IF NOT EXISTS ix_leaderboard_game_name         ON leaderboard_entry(game_name);
CREATE INDEX IF NOT EXISTS ix_leaderboard_season_id         ON leaderboard_entry(season_id);
CREATE INDEX IF NOT EXISTS ix_leaderboard_game_season_score ON leaderboard_entry(game_name, season_id, score);

INSERT INTO season (kind, label, starts_at, ends_at, is_active)
SELECT 'all_time', 'All Time', NULL, NULL, TRUE
WHERE NOT EXISTS (SELECT 1 FROM season WHERE kind = 'all_time');

SELECT 'tournament'         AS tbl, EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='tournament') AS exists
UNION ALL SELECT 'tournament_entry', EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='tournament_entry')
UNION ALL SELECT 'tournament_match', EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='tournament_match')
UNION ALL SELECT 'match_dispute',    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='match_dispute')
UNION ALL SELECT 'season',           EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='season')
UNION ALL SELECT 'leaderboard_entry',EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='leaderboard_entry');
