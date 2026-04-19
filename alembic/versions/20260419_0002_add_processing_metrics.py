"""Add processing metric columns for existing media_assets tables."""

from alembic import op
import sqlalchemy as sa


revision = "20260419_0002"
down_revision = "20260419_0001"
branch_labels = None
depends_on = None


def _has_column(table_name: str, column_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return any(column["name"] == column_name for column in inspector.get_columns(table_name))


def upgrade() -> None:
    if not _has_column("media_assets", "processing_started_at"):
        op.add_column("media_assets", sa.Column("processing_started_at", sa.DateTime(timezone=True), nullable=True))

    if not _has_column("media_assets", "processing_finished_at"):
        op.add_column("media_assets", sa.Column("processing_finished_at", sa.DateTime(timezone=True), nullable=True))

    if not _has_column("media_assets", "processing_duration_ms"):
        op.add_column("media_assets", sa.Column("processing_duration_ms", sa.Integer(), nullable=True))

    if not _has_column("media_assets", "retry_count"):
        op.add_column(
            "media_assets",
            sa.Column("retry_count", sa.Integer(), nullable=False, server_default="0"),
        )


def downgrade() -> None:
    if _has_column("media_assets", "retry_count"):
        op.drop_column("media_assets", "retry_count")

    if _has_column("media_assets", "processing_duration_ms"):
        op.drop_column("media_assets", "processing_duration_ms")

    if _has_column("media_assets", "processing_finished_at"):
        op.drop_column("media_assets", "processing_finished_at")

    if _has_column("media_assets", "processing_started_at"):
        op.drop_column("media_assets", "processing_started_at")
