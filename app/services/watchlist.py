"""Watchlist service helpers."""

from sqlalchemy.orm import Session

from app.models.watchlist import WatchlistEntry


def normalize_watchlist_entities(entities: list[str]) -> list[str]:
    normalized: list[str] = []
    seen: set[str] = set()
    for item in entities:
        clean = " ".join(item.split()).strip()
        if not clean:
            continue
        key = clean.casefold()
        if key in seen:
            continue
        seen.add(key)
        normalized.append(clean)
    return normalized


def get_watchlist_entities(db: Session, owner_id: int) -> list[str]:
    rows = (
        db.query(WatchlistEntry)
        .filter(WatchlistEntry.owner_id == owner_id)
        .order_by(WatchlistEntry.entity_name.asc())
        .all()
    )
    return [row.entity_name for row in rows]


def replace_watchlist_entities(db: Session, owner_id: int, entities: list[str]) -> list[str]:
    clean = normalize_watchlist_entities(entities)
    db.query(WatchlistEntry).filter(WatchlistEntry.owner_id == owner_id).delete()
    for entity in clean:
        db.add(
            WatchlistEntry(
                owner_id=owner_id,
                entity_name=entity,
                entity_key=entity.casefold(),
            )
        )
    db.commit()
    return clean
