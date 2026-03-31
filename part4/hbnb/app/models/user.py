#!/usr/bin/env python3
import re
from app import db, bcrypt
from .base_model import BaseModel, current_time


class User(BaseModel):
    __tablename__ = 'users'

    first_name = db.Column(db.String(50), nullable=False)
    last_name = db.Column(db.String(50), nullable=False)
    email = db.Column(db.String(120), nullable=False, unique=True)
    password = db.Column(db.String(128), nullable=False)
    is_admin = db.Column(db.Boolean, default=False)

    places = db.relationship('Place', back_populates='user', lazy=True, cascade='all, delete-orphan')
    reviews = db.relationship('Review', back_populates='user', lazy=True, cascade='all, delete-orphan')

    @staticmethod
    def _validate_name(value, field_name):
        if not isinstance(value, str) or not value.strip():
            raise ValueError(f"{field_name} is required and must be a non-empty string")

        value = value.strip()
        if len(value) > 50:
            raise ValueError(f"{field_name} must be 50 characters or less")
        return value

    @staticmethod
    def _validate_email(email):
        if not isinstance(email, str) or not email.strip():
            raise ValueError("email is required and must be a non-empty string")

        email = email.strip().lower()
        email_regex = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
        if not re.match(email_regex, email):
            raise ValueError("email format is invalid")
        return email

    @staticmethod
    def _validate_is_admin(is_admin):
        if not isinstance(is_admin, bool):
            raise TypeError("is_admin must be a boolean")
        return is_admin

    def __init__(self, first_name, last_name, email, password=None, is_admin=False, **kwargs):
        super().__init__(**kwargs)

        self.first_name = self._validate_name(first_name, "first_name")
        self.last_name = self._validate_name(last_name, "last_name")
        self.email = self._validate_email(email)
        self.is_admin = self._validate_is_admin(is_admin)

        if password is not None:
            if not isinstance(password, str) or not password:
                raise ValueError("password is required")
            self.hash_password(password)

    def hash_password(self, password):
        """Hashes the password before storing it."""
        if not isinstance(password, str) or not password:
            raise ValueError("password is required")
        self.password = bcrypt.generate_password_hash(password).decode('utf-8')

    def verify_password(self, password):
        """Verifies if the provided password matches the hashed password."""
        return bcrypt.check_password_hash(self.password, password)

    def to_dict(self):
        """Serialize the user without exposing the password hash."""
        data = super().to_dict()
        data.pop("password", None)
        return data

    def update(self, data):
        """Update user fields with validation and secure password hashing."""

        if "first_name" in data:
            self.first_name = self._validate_name(data["first_name"], "first_name")

        if "last_name" in data:
            self.last_name = self._validate_name(data["last_name"], "last_name")

        if "email" in data:
            self.email = self._validate_email(data["email"])

        if "password" in data:
            password = data["password"]
            if not isinstance(password, str) or not password:
                raise ValueError("password is required")
            self.hash_password(password)

        if "is_admin" in data:
            self.is_admin = self._validate_is_admin(data["is_admin"])
        self.updated_at = current_time()
