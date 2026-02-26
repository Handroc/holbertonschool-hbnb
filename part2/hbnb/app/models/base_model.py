#!/usr/bin/env python3
import uuid
from datetime import datetime


class BaseModel:
    def __init__(self):
        self.id = str(uuid.uuid4())
        self.created_at = datetime.now()
        self.updated_at = datetime.now()

    def save(self):
        """Update the updated_at timestamp whenever the object is modified"""
        self.updated_at = datetime.now()

    def update(self, data):
        """Update the attributes of the object based on the provided dictionary"""
        for key, value in data.items():
            if hasattr(self, key):
                setattr(self, key, value)
                self.save()

    def to_dict(self):
        result = {}

        for key, value in self.__dict__.items():
            clean_key = key.lstrip("_")

            if isinstance(value, datetime):
                result[clean_key] = value.isoformat()

            elif hasattr(value, "id"):
                result[f"{clean_key}_id"] = value.id

            elif isinstance(value, list):
                result[clean_key] = [
                    item.to_dict() if hasattr(item, 'to_dict') else item for item in value
                ]

            else:
                result[clean_key] = value

        return result
