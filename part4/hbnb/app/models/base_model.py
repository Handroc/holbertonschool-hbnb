#!/usr/bin/env python3
from datetime import datetime, timezone
import uuid

from app import db


def current_time():
    """Return a timezone-aware UTC timestamp."""
    return datetime.now(timezone.utc)


class BaseModel(db.Model):
    """BaseModel defines common attributes and methods for all models."""
    __abstract__ = True

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    created_at = db.Column(db.DateTime, default=current_time)
    updated_at = db.Column(db.DateTime, default=current_time, onupdate=current_time)

    def save(self):
        """Persist the current object and refresh its update timestamp."""
        if self.created_at is None:
            self.created_at = current_time()
        self.updated_at = current_time()

    def update(self, data):
        """Update the current object with the provided data dictionary."""
        ignored_keys = ['id', 'created_at', 'updated_at']
        for key, value in data.items():
            if key not in ignored_keys and hasattr(self, key) and not callable(getattr(self, key)):
                setattr(self, key, value)
        self.updated_at = current_time()

    def to_dict(self):
        """Convert the current object to a dictionary representation."""
        result = {
            column.name: getattr(self, column.name)
            for column in self.__table__.columns
        }
        if self.created_at is not None:
            result["created_at"] = self.created_at.isoformat()
        if self.updated_at is not None:
            result["updated_at"] = self.updated_at.isoformat()
        return result
