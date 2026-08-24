from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, VerificationError, InvalidHashError

# Initialize Argon2id password hasher
_ph = PasswordHasher()


def hash_password(password: str) -> str:
    """Hash a password using Argon2id."""
    return _ph.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    """
    Verify a password against an Argon2id hash.
    Returns True if valid, False otherwise.
    """
    try:
        return _ph.verify(hashed_password, password)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False
