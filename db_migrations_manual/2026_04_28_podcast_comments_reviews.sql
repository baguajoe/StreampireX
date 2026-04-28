-- HIGH-B2 (POD-5, POD-8): podcast_comment + podcast_comment_like + podcast_review
-- Idempotent migration. Run before next Railway redeploy.
-- Replaces 6 stub endpoints in podcast_pro_routes.py that pretended to
-- save comments/reviews but actually discarded them. Schema below
-- mirrors src/api/models.py classes added in HIGH-B2.

CREATE TABLE IF NOT EXISTS podcast_comment (
    id              SERIAL PRIMARY KEY,
    episode_id      INTEGER NOT NULL
                        REFERENCES podcast_episode(id) ON DELETE CASCADE,
    user_id         INTEGER NOT NULL
                        REFERENCES "user"(id) ON DELETE CASCADE,
    parent_id       INTEGER
                        REFERENCES podcast_comment(id) ON DELETE CASCADE,
    text            TEXT NOT NULL,
    timestamp_sec   INTEGER,
    is_pinned       BOOLEAN NOT NULL DEFAULT FALSE,
    likes_count     INTEGER NOT NULL DEFAULT 0,
    is_deleted      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_pc_episode_id ON podcast_comment(episode_id);
CREATE INDEX IF NOT EXISTS ix_pc_user_id    ON podcast_comment(user_id);
CREATE INDEX IF NOT EXISTS ix_pc_parent_id  ON podcast_comment(parent_id);


CREATE TABLE IF NOT EXISTS podcast_comment_like (
    id          SERIAL PRIMARY KEY,
    comment_id  INTEGER NOT NULL
                    REFERENCES podcast_comment(id) ON DELETE CASCADE,
    user_id     INTEGER NOT NULL
                    REFERENCES "user"(id) ON DELETE CASCADE,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_pc_like_comment_user UNIQUE (comment_id, user_id)
);
CREATE INDEX IF NOT EXISTS ix_pcl_comment_id ON podcast_comment_like(comment_id);
CREATE INDEX IF NOT EXISTS ix_pcl_user_id    ON podcast_comment_like(user_id);


CREATE TABLE IF NOT EXISTS podcast_review (
    id          SERIAL PRIMARY KEY,
    podcast_id  INTEGER NOT NULL
                    REFERENCES podcast(id) ON DELETE CASCADE,
    user_id     INTEGER NOT NULL
                    REFERENCES "user"(id) ON DELETE CASCADE,
    rating      INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    text        TEXT,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_pc_review_podcast_user UNIQUE (podcast_id, user_id)
);
CREATE INDEX IF NOT EXISTS ix_pr_podcast_id ON podcast_review(podcast_id);
CREATE INDEX IF NOT EXISTS ix_pr_user_id    ON podcast_review(user_id);
