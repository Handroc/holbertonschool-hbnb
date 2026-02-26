#!/usr/bin/env python3
from .base_model import BaseModel

class User(BaseModel):
    def __init__(self, first_name="", last_name="", email="", password="", is_admin=False):
        super().__init__()
        self.first_name = first_name
        self.last_name = last_name
        self.email = email
        self.password = password
        self.is_admin = is_admin

    @property
    def first_name(self):
        return self._first_name

    @property
    def last_name(self):
        return self._last_name

    @property
    def email(self):
        return self._email

    @property
    def password(self):
        return self._password

    @property
    def is_admin(self):
        return self._is_admin
    
    @first_name.setter
    def first_name(self, value):
        if not isinstance(value, str):
            raise ValueError("First name must be a string")
        if not value:
            raise ValueError("First name cannot be empty")
        self._first_name = value
    
    @last_name.setter
    def last_name(self, value):
        if not isinstance(value, str):
            raise ValueError("Last name must be a string")
        if not value:
            raise ValueError("Last name cannot be empty")
        self._last_name = value
    
    @email.setter
    def email(self, value):
        if not isinstance(value, str):
            raise ValueError("Email must be a string")
        if not value:
            raise ValueError("Email cannot be empty")
        self._email = value
    
    @password.setter
    def password(self, value):
        if not isinstance(value, str):
            raise ValueError("Password must be a string")
        if not value:
            raise ValueError("Password cannot be empty")
        self._password = value
    
    @is_admin.setter
    def is_admin(self, value):
        if not isinstance(value, bool):
            raise ValueError("is_admin must be a boolean")
        self._is_admin = value
