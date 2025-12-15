"""add_fulfilled_to_demand_status

Revision ID: 9c788747008c
Revises: eae67b2e1678
Create Date: 2025-12-15 14:41:21.872362+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9c788747008c'
down_revision: Union[str, None] = 'eae67b2e1678'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add FULFILLED to demand_status enum
    op.execute("ALTER TYPE demand_status ADD VALUE IF NOT EXISTS 'FULFILLED'")


def downgrade() -> None:
    # PostgreSQL doesn't support removing enum values directly
    # We would need to recreate the type, which is complex and risky
    # For now, we leave FULFILLED in place as downgrade
    pass

