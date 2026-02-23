#!/usr/bin/env python3
from models import BaseModel

class User(BaseModel):
    def __init__(self, first_name, last_name, email, password, is_admin=False):
        super().__init__()
        self.first_name = first_name
        self.last_name = last_name
        self.email = email
        self.password = password
        self.is_admin = is_admin

        """different ids to link"""
        self.place_ids = []
        self.review_ids = []

    def add_place(self, place):
        """Add a place to the User"""
        self.place_ids.append(place)
    
    def add_review(self, review):
        """Add a review to the User"""
        self.review_ids.append(review)
