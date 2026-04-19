"""Auth schemas."""

from typing import Annotated
import re

from pydantic import BaseModel, Field, field_validator

PasswordField = Annotated[str, Field(min_length=8, max_length=128)]
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class AuthCredentials(BaseModel):
    email: str
    password: PasswordField

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip().lower()
        return value

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        if not EMAIL_RE.fullmatch(value):
            raise ValueError("Invalid email address")
        return value


class UserCreate(AuthCredentials):
    pass


class UserLogin(AuthCredentials):
    pass


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserProfile(BaseModel):
    id: int
    email: str
    watched_entities: list[str]
