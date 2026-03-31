#!/usr/bin/env python3
from app.models.user import User
from app.persistence.repository import SQLAlchemyRepository
from app import db


class UserRepository(SQLAlchemyRepository):
    def __init__(self):
        super().__init__(User, db)

    def get_user_by_email(self, email):
        if not isinstance(email, str):
            return None
        return self.model.query.filter_by(email=email.strip().lower()).first()
