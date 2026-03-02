"""add epk collab tables

Revision ID: 6edf216c225c
Revises: 1ca816aac49b
Create Date: 2026-03-01
"""
from alembic import op
import sqlalchemy as sa

revision = '6edf216c225c'
down_revision = '1ca816aac49b'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('epk',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('user.id'), nullable=False),
        sa.Column('epk_name', sa.String(100), server_default='My EPK'),
        sa.Column('artist_name', sa.String(100)),
        sa.Column('tagline', sa.String(200)),
        sa.Column('bio_short', sa.Text()),
        sa.Column('bio_full', sa.Text()),
        sa.Column('genre_primary', sa.String(50)),
        sa.Column('genre_secondary', sa.String(50)),
        sa.Column('location', sa.String(100)),
        sa.Column('booking_email', sa.String(200)),
        sa.Column('management_name', sa.String(100)),
        sa.Column('management_email', sa.String(200)),
        sa.Column('label_name', sa.String(100)),
        sa.Column('website', sa.String(300)),
        sa.Column('social_links', sa.JSON(), server_default='{}'),
        sa.Column('profile_photo', sa.String(500)),
        sa.Column('cover_photo', sa.String(500)),
        sa.Column('press_photos', sa.JSON(), server_default='[]'),
        sa.Column('logo_url', sa.String(500)),
        sa.Column('achievements', sa.JSON(), server_default='[]'),
        sa.Column('stats', sa.JSON(), server_default='{}'),
        sa.Column('press_quotes', sa.JSON(), server_default='[]'),
        sa.Column('featured_tracks', sa.JSON(), server_default='[]'),
        sa.Column('featured_videos', sa.JSON(), server_default='[]'),
        sa.Column('featured_albums', sa.JSON(), server_default='[]'),
        sa.Column('rider', sa.Text()),
        sa.Column('stage_plot_url', sa.String(500)),
        sa.Column('featured_media', sa.JSON(), server_default='[]'),
        sa.Column('skills', sa.JSON(), server_default='[]'),
        sa.Column('collab_open', sa.Boolean(), server_default='true'),
        sa.Column('collab_rate', sa.String(100)),
        sa.Column('preferred_genres', sa.JSON(), server_default='[]'),
        sa.Column('equipment', sa.JSON(), server_default='[]'),
        sa.Column('template', sa.String(20), server_default='modern'),
        sa.Column('accent_color', sa.String(7), server_default='#00ffc8'),
        sa.Column('is_public', sa.Boolean(), server_default='true'),
        sa.Column('slug', sa.String(100), unique=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index('ix_epk_slug', 'epk', ['slug'])
    op.create_index('idx_epk_user', 'epk', ['user_id'])

    op.create_table('collab_request',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('user.id'), nullable=False),
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('description', sa.Text()),
        sa.Column('genre', sa.String(50)),
        sa.Column('roles_needed', sa.JSON(), server_default='[]'),
        sa.Column('budget', sa.String(100)),
        sa.Column('deadline', sa.DateTime()),
        sa.Column('reference_track_url', sa.String(500)),
        sa.Column('reference_notes', sa.Text()),
        sa.Column('status', sa.String(20), server_default='open'),
        sa.Column('is_public', sa.Boolean(), server_default='true'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now()),
    )

    op.create_table('collab_application',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('request_id', sa.Integer(), sa.ForeignKey('collab_request.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('user.id'), nullable=False),
        sa.Column('message', sa.Text()),
        sa.Column('proposed_rate', sa.String(100)),
        sa.Column('sample_url', sa.String(500)),
        sa.Column('status', sa.String(20), server_default='pending'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.UniqueConstraint('request_id', 'user_id'),
    )


def downgrade():
    op.drop_table('collab_application')
    op.drop_table('collab_request')
    op.drop_index('idx_epk_user', 'epk')
    op.drop_index('ix_epk_slug', 'epk')
    op.drop_table('epk')
