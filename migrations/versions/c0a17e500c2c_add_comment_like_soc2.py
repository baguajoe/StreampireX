"""SOC-2 (HIGH-C2): add comment_like table for per-user comment like uniqueness

Revision ID: c0a17e500c2c
Revises: 49d0ff06420f
Create Date: 2026-04-28

Before this migration the /api/comments/<id>/like endpoint just
incremented Comment.likes unbounded, letting any user spam likes.
This migration introduces a comment_like join table with
UNIQUE(comment_id, user_id), backing the new toggle endpoint in
src/api/comment_routes.py.

Distinct from podcast_comment_like (HIGH-B2) which covers the
PodcastComment table.

Note: existing Comment.likes integer column is retained as a
denormalized counter that the new toggle endpoint maintains. The
counts won't be retroactively reconciled to actual users since the
prior data was anonymous; the column simply continues from its
current value.
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c0a17e500c2c'
down_revision = '49d0ff06420f'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'comment_like',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('comment_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ['comment_id'], ['comment.id'],
            name='fk_comment_like_comment_id', ondelete='CASCADE'
        ),
        sa.ForeignKeyConstraint(
            ['user_id'], ['user.id'],
            name='fk_comment_like_user_id', ondelete='CASCADE'
        ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint(
            'comment_id', 'user_id',
            name='uq_comment_like_comment_user'
        ),
    )
    op.create_index(
        'ix_comment_like_comment_id',
        'comment_like', ['comment_id'], unique=False
    )
    op.create_index(
        'ix_comment_like_user_id',
        'comment_like', ['user_id'], unique=False
    )


def downgrade():
    op.drop_index('ix_comment_like_user_id', table_name='comment_like')
    op.drop_index('ix_comment_like_comment_id', table_name='comment_like')
    op.drop_table('comment_like')
