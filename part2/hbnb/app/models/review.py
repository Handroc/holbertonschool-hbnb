#!/usr/bin/env python3
from .base_model import BaseModel
from .user import User
from .place import Place

class Review(BaseModel):
    def __init__(self, text="", rating=1, place_id="", user_id=""):
        super().__init__()
        self.text = text
        self.rating = rating
        self.place_id = place_id
        self.user_id = user_id

    @property
    def text(self):
        return self._text
    
    @property
    def rating(self):
        return self._rating
    
    @property
    def place_id(self):
        return self._place_id
    
    @property
    def user_id(self):
        return self._user_id
    
    @text.setter
    def text(self, value):
        if not isinstance(value, str):
            raise ValueError("Text must be a string")
        if not value:
            raise ValueError("Text cannot be empty")
        self._text = value
    
    @rating.setter
    def rating(self, value):
        if not isinstance(value, int):
            raise ValueError("Rating must be an integer")
        if not (1 <= value <= 5):
            raise ValueError("Rating must be between 1 and 5")
        self._rating = value
    
    @place_id.setter
    def place_id(self, value):
        if not isinstance(value, str):
            raise ValueError("Place ID must be a string")
        if not value:
            raise ValueError("Place ID cannot be empty")
        self._place_id = value
    
    @user_id.setter
    def user_id(self, value):
        if not isinstance(value, str):
            raise ValueError("User ID must be a string")
        if not value:
            raise ValueError("User ID cannot be empty")
        self._user_id = value
