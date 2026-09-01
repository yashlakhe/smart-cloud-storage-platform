from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.models.user import User


class DuplicateEmailError(Exception):
    """Raised when an account with the requested email already exists."""


class AuthenticationError(Exception):
    """Raised when credentials are invalid or user is not found."""


class InactiveUserError(Exception):
    """Raised when the user account is disabled/inactive."""


def normalize_email(email: str) -> str:
    """Normalize an email address for consistent comparison."""
    return email.strip().lower()


def register_user(
    db: Session,
    email: str,
    password: str,
    full_name: str,
) -> User:
    """Create and persist a new user."""
    normalized_email = normalize_email(email)
    normalized_full_name = full_name.strip()

    if not normalized_full_name:
        raise ValueError("Full name cannot be empty")

    result = db.execute(
        select(User).where(User.email == normalized_email)
    )
    existing_user = result.scalar_one_or_none()

    if existing_user is not None:
        raise DuplicateEmailError()

    password_hash = hash_password(password)

    user = User(
        email=normalized_email,
        password_hash=password_hash,
        full_name=normalized_full_name,
        is_active=True,
    )

    db.add(user)

    try:
        db.commit()
        db.refresh(user)
    except IntegrityError as exc:
        db.rollback()
        raise DuplicateEmailError() from exc

    return user


def authenticate_user(
    db: Session,
    email: str,
    password: str,
) -> User:
    """
    Authenticate a user by email and password using Argon2id.
    Raises AuthenticationError if invalid (without leaking email existence).
    Raises InactiveUserError if user account is deactivated.
    """
    normalized_email = normalize_email(email)
    result = db.execute(
        select(User).where(User.email == normalized_email)
    )
    user = result.scalar_one_or_none()

    # Always verify against a dummy or real hash to maintain constant-time resistance
    if user is None:
        # Dummy verification to prevent timing attacks
        verify_password("dummy_password", "$argon2id$v=19$m=65536,t=3,p=4$dummy$dummy")
        raise AuthenticationError("Invalid email or password")

    if not verify_password(password, user.password_hash):
        raise AuthenticationError("Invalid email or password")

    if not user.is_active:
        raise InactiveUserError("User account is inactive")

    return user