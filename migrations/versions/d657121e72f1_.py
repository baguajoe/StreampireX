"""empty message

Revision ID: d657121e72f1
Revises: a8c2fec556be
Create Date: 2025-03-27 22:17:12.658628

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd657121e72f1'
down_revision = 'a8c2fec556be'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.alter_column('artist_name',
               existing_type=sa.VARCHAR(length=80),
               nullable=True)

    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.alter_column('artist_name',
               existing_type=sa.VARCHAR(length=80),
               nullable=False)

    # ### end Alembic commands ###
