-- Part 18c: persist Deepgram/Whisper transcripts on PodcastEpisode.
-- Idempotent. Run before next Railway redeploy. Mirrors Alembic revision
-- 5c06c1bda426 in migrations/versions/.
--
-- Without these columns, Show Notes and Magic Clips silently fail on
-- returning users because both routes read episode.transcript from the DB.

ALTER TABLE podcast_episode
    ADD COLUMN IF NOT EXISTS transcript          TEXT,
    ADD COLUMN IF NOT EXISTS transcript_words    JSON,
    ADD COLUMN IF NOT EXISTS transcript_provider VARCHAR(32),
    ADD COLUMN IF NOT EXISTS transcript_at       TIMESTAMP;
