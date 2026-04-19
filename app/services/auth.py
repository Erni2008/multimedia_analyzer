"""Authentication helpers."""

import base64
import hashlib
import hmac
import json
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.user import User

try:
    from jose import jwt
    from jose.exceptions import JWTError
except ImportError:  # pragma: no cover - local fallback for tests without python-jose
    jwt = None

    class JWTError(Exception):
        """Fallback token decode error."""

try:
    from passlib.context import CryptContext
except ImportError:  # pragma: no cover - local fallback for tests without passlib
    CryptContext = None


def _urlsafe_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def _urlsafe_decode(raw: str) -> bytes:
    padding = "=" * (-len(raw) % 4)
    return base64.urlsafe_b64decode(f"{raw}{padding}")


def _encode_token(payload: dict[str, object]) -> str:
    if jwt is not None:
        return jwt.encode(payload, settings.secret_key, algorithm="HS256")

    header = {"alg": "HS256", "typ": "JWT"}
    header_part = _urlsafe_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    payload_part = _urlsafe_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signing_input = f"{header_part}.{payload_part}".encode("ascii")
    signature = hmac.new(
        settings.secret_key.encode("utf-8"),
        signing_input,
        hashlib.sha256,
    ).digest()
    return f"{header_part}.{payload_part}.{_urlsafe_encode(signature)}"


def _decode_token(token: str) -> dict[str, object]:
    if jwt is not None:
        return jwt.decode(token, settings.secret_key, algorithms=["HS256"])

    try:
        header_part, payload_part, signature_part = token.split(".")
    except ValueError as exc:
        raise JWTError("Malformed token") from exc

    signing_input = f"{header_part}.{payload_part}".encode("ascii")
    expected_signature = hmac.new(
        settings.secret_key.encode("utf-8"),
        signing_input,
        hashlib.sha256,
    ).digest()
    actual_signature = _urlsafe_decode(signature_part)
    if not hmac.compare_digest(expected_signature, actual_signature):
        raise JWTError("Invalid signature")

    try:
        payload = json.loads(_urlsafe_decode(payload_part).decode("utf-8"))
    except (ValueError, json.JSONDecodeError) as exc:
        raise JWTError("Invalid payload") from exc

    exp = payload.get("exp")
    if isinstance(exp, (int, float)) and datetime.now(timezone.utc).timestamp() >= exp:
        raise JWTError("Token expired")

    return payload

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def _hash_with_stdlib(password: str) -> str:
    salt = _urlsafe_encode(secrets.token_bytes(16))
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        200000,
    )
    return f"pbkdf2_sha256${salt}${_urlsafe_encode(digest)}"


def _verify_with_stdlib(plain_password: str, hashed_password: str) -> bool:
    try:
        scheme, salt, encoded_digest = hashed_password.split("$", 2)
    except ValueError:
        return False
    if scheme != "pbkdf2_sha256":
        return False

    digest = hashlib.pbkdf2_hmac(
        "sha256",
        plain_password.encode("utf-8"),
        salt.encode("utf-8"),
        200000,
    )
    return hmac.compare_digest(_urlsafe_encode(digest), encoded_digest)


def hash_password(password: str) -> str:
    if CryptContext is not None:
        pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
        return pwd_context.hash(password)
    return _hash_with_stdlib(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    if CryptContext is not None:
        pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
        return pwd_context.verify(plain_password, hashed_password)
    return _verify_with_stdlib(plain_password, hashed_password)


def create_access_token(subject: str) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=settings.access_token_expire_minutes
    )
    payload = {"sub": subject, "exp": int(expires_at.timestamp())}
    return _encode_token(payload)


def decode_access_token(token: str) -> str:
    try:
        payload = _decode_token(token)
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        ) from exc

    subject = payload.get("sub")
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )
    return str(subject)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    email = decode_access_token(token)
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    return user
