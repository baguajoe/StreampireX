"""empty message

Revision ID: 9b3ae07da27c
Revises: 4fd5173b2eda
Create Date: 2025-03-17 23:19:22.844404

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '9b3ae07da27c'
down_revision = '4fd5173b2eda'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('podcast_clip',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('podcast_id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('clip_url', sa.String(length=255), nullable=False),
    sa.Column('start_time', sa.Integer(), nullable=False),
    sa.Column('end_time', sa.Integer(), nullable=False),
    sa.Column('shared_platform', sa.String(length=50), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['podcast_id'], ['podcast.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('radio_access',
    sa.Column('station_id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['station_id'], ['radio_station.id'], ),
    sa.ForeignKeyConstraint(['user_id'], ['user.id'], ),
    sa.PrimaryKeyConstraint('station_id', 'user_id')
    )
    op.create_table('radio_follower',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('station_id', sa.Integer(), nullable=False),
    sa.Column('followed_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['station_id'], ['radio_station.id'], ),
    sa.ForeignKeyConstraint(['user_id'], ['user.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('ticket_purchase',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('station_id', sa.Integer(), nullable=False),
    sa.Column('purchase_date', sa.DateTime(), nullable=True),
    sa.Column('amount_paid', sa.Float(), nullable=False),
    sa.ForeignKeyConstraint(['station_id'], ['radio_station.id'], ),
    sa.ForeignKeyConstraint(['user_id'], ['user.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('radio_track',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('station_id', sa.Integer(), nullable=False),
    sa.Column('track_id', sa.Integer(), nullable=False),
    sa.Column('added_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['station_id'], ['radio_station.id'], ),
    sa.ForeignKeyConstraint(['track_id'], ['track.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('radio_station', schema=None) as batch_op:
        batch_op.add_column(sa.Column('is_public', sa.Boolean(), nullable=True))
        batch_op.add_column(sa.Column('is_subscription_based', sa.Boolean(), nullable=True))
        batch_op.add_column(sa.Column('is_ticketed', sa.Boolean(), nullable=True))
        batch_op.add_column(sa.Column('ticket_price', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('is_webrtc_enabled', sa.Boolean(), nullable=True))
        batch_op.add_column(sa.Column('max_listeners', sa.Integer(), nullable=True))
        batch_op.drop_column('ad_revenue')
        batch_op.drop_column('is_premium')

    with op.batch_alter_table('subscription', schema=None) as batch_op:
        batch_op.add_column(sa.Column('grace_period_end', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('auto_renew', sa.Boolean(), nullable=True))
        batch_op.add_column(sa.Column('billing_cycle', sa.String(length=20), nullable=True))
        batch_op.add_column(sa.Column('status', sa.String(length=20), nullable=True))

    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('subscription', schema=None) as batch_op:
        batch_op.drop_column('status')
        batch_op.drop_column('billing_cycle')
        batch_op.drop_column('auto_renew')
        batch_op.drop_column('grace_period_end')

    with op.batch_alter_table('radio_station', schema=None) as batch_op:
        batch_op.add_column(sa.Column('is_premium', sa.BOOLEAN(), autoincrement=False, nullable=True))
        batch_op.add_column(sa.Column('ad_revenue', postgresql.DOUBLE_PRECISION(precision=53), autoincrement=False, nullable=True))
        batch_op.drop_column('max_listeners')
        batch_op.drop_column('is_webrtc_enabled')
        batch_op.drop_column('ticket_price')
        batch_op.drop_column('is_ticketed')
        batch_op.drop_column('is_subscription_based')
        batch_op.drop_column('is_public')

    op.drop_table('radio_track')
    op.drop_table('ticket_purchase')
    op.drop_table('radio_follower')
    op.drop_table('radio_access')
    op.drop_table('podcast_clip')
    # ### end Alembic commands ###
