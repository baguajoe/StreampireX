-- SP-2a: add columns missed by db.create_all() because the tables already exist.
-- Idempotent — uses IF NOT EXISTS.

-- Comment.parent_id (self-referential FK for reply threads)
ALTER TABLE comment
  ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES comment(id);

-- ClipComment.is_pinned (clip-owner pin)
ALTER TABLE clip_comments
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;

-- Verify
SELECT 'comment.parent_id' AS column, EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_name='comment' AND column_name='parent_id'
) AS exists
UNION ALL
SELECT 'clip_comments.is_pinned', EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_name='clip_comments' AND column_name='is_pinned'
);
