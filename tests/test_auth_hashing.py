"""Tests for password hashing helpers."""

import unittest

try:
    from app.schemas.auth import UserCreate, UserLogin
    from app.services.auth import hash_password, verify_password

    IMPORT_ERROR = None
except ImportError as exc:  # pragma: no cover - environment-dependent
    UserCreate = None
    UserLogin = None
    hash_password = None
    verify_password = None
    IMPORT_ERROR = exc


@unittest.skipIf(IMPORT_ERROR is not None, f"Missing dependency: {IMPORT_ERROR}")
class AuthHashingTests(unittest.TestCase):
    def test_hash_password_produces_verifiable_hash(self) -> None:
        hashed = hash_password("strongpass123")

        self.assertNotEqual(hashed, "strongpass123")
        self.assertTrue(verify_password("strongpass123", hashed))

    def test_verify_password_rejects_wrong_secret(self) -> None:
        hashed = hash_password("strongpass123")

        self.assertFalse(verify_password("wrongpass123", hashed))

    def test_auth_credentials_normalize_email(self) -> None:
        created = UserCreate(email="  SingGren@GMAIL.com ", password="strongpass123")
        login = UserLogin(email=" SingGren@GMAIL.com ", password="strongpass123")

        self.assertEqual(created.email, "singgren@gmail.com")
        self.assertEqual(login.email, "singgren@gmail.com")


if __name__ == "__main__":
    unittest.main()
