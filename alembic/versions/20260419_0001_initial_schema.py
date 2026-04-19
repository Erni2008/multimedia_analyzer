"""Initial schema with media assets and watchlist entries."""

from alembic import op
import sqlalchemy as sa


revision = "20260419_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)
    op.create_index(op.f("ix_users_id"), "users", ["id"], unique=False)

    op.create_table(
        "media_assets",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("owner_id", sa.Integer(), nullable=False),
        sa.Column("original_filename", sa.String(length=255), nullable=False),
        sa.Column("stored_path", sa.String(length=500), nullable=False),
        sa.Column("media_type", sa.Enum("audio", "video", name="mediatype", native_enum=False), nullable=False),
        sa.Column(
            "status",
            sa.Enum("queued", "processing", "completed", "alerted", "failed", name="mediastatus", native_enum=False),
            nullable=False,
        ),
        sa.Column("task_id", sa.String(length=255), nullable=True),
        sa.Column("transcript", sa.Text(), nullable=True),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("entities", sa.Text(), nullable=True),
        sa.Column("alert_matches", sa.Text(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("processing_started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("processing_finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("processing_duration_ms", sa.Integer(), nullable=True),
        sa.Column("retry_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_media_assets_id"), "media_assets", ["id"], unique=False)
    op.create_index(op.f("ix_media_assets_owner_id"), "media_assets", ["owner_id"], unique=False)

    op.create_table(
        "watchlist_entries",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("owner_id", sa.Integer(), nullable=False),
        sa.Column("entity_name", sa.String(length=80), nullable=False),
        sa.Column("entity_key", sa.String(length=80), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("owner_id", "entity_key", name="uq_watchlist_owner_entity_key"),
    )
    op.create_index(op.f("ix_watchlist_entries_entity_key"), "watchlist_entries", ["entity_key"], unique=False)
    op.create_index(op.f("ix_watchlist_entries_id"), "watchlist_entries", ["id"], unique=False)
    op.create_index(op.f("ix_watchlist_entries_owner_id"), "watchlist_entries", ["owner_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_watchlist_entries_owner_id"), table_name="watchlist_entries")
    op.drop_index(op.f("ix_watchlist_entries_id"), table_name="watchlist_entries")
    op.drop_index(op.f("ix_watchlist_entries_entity_key"), table_name="watchlist_entries")
    op.drop_table("watchlist_entries")

    op.drop_index(op.f("ix_media_assets_owner_id"), table_name="media_assets")
    op.drop_index(op.f("ix_media_assets_id"), table_name="media_assets")
    op.drop_table("media_assets")

    op.drop_index(op.f("ix_users_id"), table_name="users")
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_table("users")
