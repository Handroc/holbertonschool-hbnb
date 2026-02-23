#!/usr/bin/env python3
from models import BaseModel

class Review(BaseModel):
    def __init__(self, comment, rating, place_id, user_id):
        super().__init__()
        self.comment = comment
        self.rating = rating

        """different ids to link"""
        self.place_id = place_id
        self.user_id = user_id
