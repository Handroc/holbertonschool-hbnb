#!/usr/bin/env python3
from .user import User

def test_user_creation():
    user = User(first_name="John", last_name="Doe", email="john.doe@example.com", password="")
    assert user.first_name == "John"
    assert user.last_name == "Doe"
    assert user.email == "john.doe@example.com"
    assert user.password == ""
    assert user.is_admin is False
    print("User creation test passed!")

test_user_creation()
