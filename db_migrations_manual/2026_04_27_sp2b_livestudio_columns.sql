-- SP-2b: add viewer_count + like_count to live_studio.
-- Idempotent.

ALTER TABLE live_studio
  ADD COLUMN IF NOT EXISTS viewer_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE live_studio
  ADD COLUMN IF NOT EXISTS like_count INTEGER NOT NULL DEFAULT 0;

SELECT 'live_studio.viewer_count' AS col, EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_name='live_studio' AND column_name='viewer_count'
) AS exists
UNION ALL
SELECT 'live_studio.like_count', EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_name='live_studio' AND column_name='like_count'
);
