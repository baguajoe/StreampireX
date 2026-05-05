"""add_transcript_columns_to_podcast_episode

Revision ID: 5c06c1bda426
Revises: d83b6f12a4ef
Create Date: 2026-05-05 13:55:26.034605

Part 18c — persist Deepgram/Whisper transcripts on PodcastEpisode so Show Notes
and Magic Clips read from the DB on returning visits.

Autogenerate also detected stale model drift on `clip_comments`, `comment`,
`live_studio`, and `radio_station` from earlier branches; those are intentionally
NOT included here so 18c stays focused. Run that catch-up migration separately.
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '5c06c1bda426'
down_revision = 'd83b6f12a4ef'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('podcast_episode', schema=None) as batch_op:
        batch_op.add_column(sa.Column('transcript', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('transcript_words', sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column('transcript_provider', sa.String(length=32), nullable=True))
        batch_op.add_column(sa.Column('transcript_at', sa.DateTime(), nullable=True))


def downgrade():
    with op.batch_alter_table('podcast_episode', schema=None) as batch_op:
        batch_op.drop_column('transcript_at')
        batch_op.drop_column('transcript_provider')
        batch_op.drop_column('transcript_words')
        batch_op.drop_column('transcript')
