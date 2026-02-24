#!/usr/bin/env python3
from .base_model import BaseModel
from .user import User
from .place import Place

class Review(BaseModel):
    def __init__(self, comment="", rating=1, place=Place, user=User):
        super().__init__()
        self.comment = comment
        self.rating = rating
        self.place = place
        self.user = user

    def valid_review(self):
        """Control the rating wich is between 1 and 5"""
        return 1 <= self.rating <= 5
