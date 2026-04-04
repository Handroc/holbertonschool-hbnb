#!/usr/bin/env python3
from app.models.notification import Notification
from app.persistence.repository import SQLAlchemyRepository
from app import db


class NotificationRepository(SQLAlchemyRepository):
    def __init__(self):
        super().__init__(Notification, db)

    def get_by_user(self, user_id):
        return Notification.query.filter_by(user_id=user_id).order_by(Notification.created_at.desc()).all()

    def get_unread_count(self, user_id):
        return Notification.query.filter_by(user_id=user_id, read=False).count()
