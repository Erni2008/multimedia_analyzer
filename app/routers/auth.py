"""Authentication routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.user import User
from app.schemas.auth import Token, UserCreate, UserLogin, UserProfile
from app.services.auth import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from app.services.watchlist import get_watchlist_entities, replace_watchlist_entities

router = APIRouter()


@router.post("/register", response_model=Token)
def register(user: UserCreate, db: Session = Depends(get_db)) -> Token:
    existing = db.query(User).filter(User.email == user.email).first()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User already exists",
        )

    record = User(
        email=user.email,
        hashed_password=hash_password(user.password),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    replace_watchlist_entities(
        db,
        owner_id=record.id,
        entities=[item.strip() for item in settings.default_alert_entities.split(",") if item.strip()],
    )
    access_token = create_access_token(user.email)
    return Token(access_token=access_token)


@router.post("/login", response_model=Token)
def login(user: UserLogin, db: Session = Depends(get_db)) -> Token:
    record = db.query(User).filter(User.email == user.email).first()
    if record is None or not verify_password(user.password, record.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    access_token = create_access_token(user.email)
    return Token(access_token=access_token)


@router.get("/me", response_model=UserProfile)
def me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserProfile:
    watched = get_watchlist_entities(db, current_user.id)
    return UserProfile(id=current_user.id, email=current_user.email, watched_entities=watched)
