"""Add comprehensive gamer profile fields

Revision ID: add_gamer_profile_fields
Revises: [your_previous_revision]
Create Date: 2025-01-10

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = 'add_gamer_profile_fields'
down_revision = '2d57dc6ccb5f'  # Replace with your actual previous revision
branch_labels = None
depends_on = None

def upgrade():
    # Add new gamer profile columns
    op.add_column('user', sa.Column('gamertag', sa.String(length=100), nullable=True))
    op.add_column('user', sa.Column('gaming_platforms', sa.JSON(), nullable=True))
    op.add_column('user', sa.Column('current_games', postgresql.ARRAY(sa.String()), nullable=True))
    op.add_column('user', sa.Column('gaming_schedule', sa.Text(), nullable=True))
    op.add_column('user', sa.Column('skill_level', sa.String(length=50), nullable=True))
    
    # Social & Team Elements
    op.add_column('user', sa.Column('looking_for', postgresql.ARRAY(sa.String()), nullable=True))
    op.add_column('user', sa.Column('communication_prefs', postgresql.ARRAY(sa.String()), nullable=True))
    op.add_column('user', sa.Column('age_range', sa.String(length=20), nullable=True))
    op.add_column('user', sa.Column('timezone', sa.String(length=50), nullable=True))
    op.add_column('user', sa.Column('region', sa.String(length=100), nullable=True))
    
    # Gaming Preferences
    op.add_column('user', sa.Column('favorite_genres', postgresql.ARRAY(sa.String()), nullable=True))
    op.add_column('user', sa.Column('playstyle', sa.String(length=50), nullable=True))
    op.add_column('user', sa.Column('game_modes', postgresql.ARRAY(sa.String()), nullable=True))
    
    # Setup & Equipment
    op.add_column('user', sa.Column('gaming_setup', sa.JSON(), nullable=True))
    
    # Streaming & Content
    op.add_column('user', sa.Column('is_streamer', sa.Boolean(), nullable=True))
    op.add_column('user', sa.Column('streaming_platforms', postgresql.ARRAY(sa.String()), nullable=True))
    op.add_column('user', sa.Column('streaming_schedule', sa.Text(), nullable=True))
    
    # Languages & Communication
    op.add_column('user', sa.Column('languages_spoken', postgresql.ARRAY(sa.String()), nullable=True))
    
    # Gaming Stats & Achievements
    op.add_column('user', sa.Column('gaming_stats', sa.JSON(), nullable=True))
    
    # Gamer Bio
    op.add_column('user', sa.Column('gamer_bio', sa.Text(), nullable=True))
    
    # Availability & Status
    op.add_column('user', sa.Column('online_status', sa.String(length=20), nullable=True))
    op.add_column('user', sa.Column('last_seen', sa.DateTime(), nullable=True))
    op.add_column('user', sa.Column('current_game_activity', sa.String(length=200), nullable=True))
    
    # Set default values for existing users
    op.execute("""
        UPDATE "user" SET 
            gaming_platforms = '{}',
            current_games = '{}',
            skill_level = 'intermediate',
            looking_for = '{}',
            communication_prefs = '{}',
            favorite_genres = '{}',
            game_modes = '{}',
            gaming_setup = '{}',
            is_streamer = false,
            streaming_platforms = '{}',
            languages_spoken = '{}',
            gaming_stats = '{}',
            online_status = 'offline'
        WHERE gaming_platforms IS NULL
    """)

def downgrade():
    # Remove all the added columns
    op.drop_column('user', 'current_game_activity')
    op.drop_column('user', 'last_seen')
    op.drop_column('user', 'online_status')
    op.drop_column('user', 'gamer_bio')
    op.drop_column('user', 'gaming_stats')
    op.drop_column('user', 'languages_spoken')
    op.drop_column('user', 'streaming_schedule')
    op.drop_column('user', 'streaming_platforms')
    op.drop_column('user', 'is_streamer')
    op.drop_column('user', 'gaming_setup')
    op.drop_column('user', 'game_modes')
    op.drop_column('user', 'playstyle')
    op.drop_column('user', 'favorite_genres')
    op.drop_column('user', 'region')
    op.drop_column('user', 'timezone')
    op.drop_column('user', 'age_range')
    op.drop_column('user', 'communication_prefs')
    op.drop_column('user', 'looking_for')
    op.drop_column('user', 'skill_level')
    op.drop_column('user', 'gaming_schedule')
    op.drop_column('user', 'current_games')
    op.drop_column('user', 'gaming_platforms')
    op.drop_column('user', 'gamertag')