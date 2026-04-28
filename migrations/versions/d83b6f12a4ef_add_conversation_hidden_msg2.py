"""MSG-2 (HIGH-C3): add conversation_hidden table for per-user soft-delete

Revision ID: d83b6f12a4ef
Revises: c0a17e500c2c
Create Date: 2026-04-28

Before this migration, DELETE /api/messages/conversation/<other_user_id>
hard-deleted every Message row in the thread, destroying the OTHER
user's view of the conversation as well. That was unauthorized
destruction of someone else's data and a privacy violation.

This migration introduces conversation_hidden, a per-user "hide" table
keyed on (user_id, other_user_id) with UNIQUE constraint. The new
delete endpoint inserts a row here instead of deleting messages, so
each user can hide threads independently. send_message auto-clears
hide rows on new traffic so threads resurrect (industry standard).

Keyed on (user_id, other_user_id) rather than conversation_id because
the existing fallback code path in messages_routes.py builds threads
from raw Message rows when no Conversation row exists; this scheme
covers both paths.
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd83b6f12a4ef'
down_revision = 'c0a17e500c2c'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'conversation_hidden',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('other_user_id', sa.Integer(), nullable=False),
        sa.Column('hidden_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ['user_id'], ['user.id'],
            name='fk_conv_hidden_user_id', ondelete='CASCADE'
        ),
        sa.ForeignKeyConstraint(
            ['other_user_id'], ['user.id'],
            name='fk_conv_hidden_other_user_id', ondelete='CASCADE'
        ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint(
            'user_id', 'other_user_id',
            name='uq_conv_hidden_user_pair'
        ),
        sa.CheckConstraint(
            'user_id != other_user_id',
            name='ck_conv_hidden_distinct_users'
        ),
    )
    op.create_index(
        'ix_conversation_hidden_user_id',
        'conversation_hidden', ['user_id'], unique=False
    )
    op.create_index(
        'ix_conversation_hidden_other_user_id',
        'conversation_hidden', ['other_user_id'], unique=False
    )


def downgrade():
    op.drop_index('ix_conversation_hidden_other_user_id', table_name='conversation_hidden')
    op.drop_index('ix_conversation_hidden_user_id', table_name='conversation_hidden')
    op.drop_table('conversation_hidden')
