"""Database helpers for media assets."""

from sqlalchemy.orm import Session

from app.models.media import MediaAsset


def list_media_for_user(db: Session, user_id: int) -> list[MediaAsset]:
    return (
        db.query(MediaAsset)
        .filter(MediaAsset.owner_id == user_id)
        .order_by(MediaAsset.created_at.desc())
        .all()
    )
