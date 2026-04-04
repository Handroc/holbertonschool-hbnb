#!/usr/bin/env python3
from app.models.message import Message
from app.persistence.repository import SQLAlchemyRepository
from app import db


class MessageRepository(SQLAlchemyRepository):
    def __init__(self):
        super().__init__(Message, db)

    def get_inbox(self, user_id):
        return Message.query.filter_by(recipient_id=user_id).order_by(Message.created_at.desc()).all()

    def get_sent(self, user_id):
        return Message.query.filter_by(sender_id=user_id).order_by(Message.created_at.desc()).all()

    def get_unread_count(self, user_id):
        return Message.query.filter_by(recipient_id=user_id, read=False).count()

    def get_conversation(self, user_a, user_b):
        return Message.query.filter(
            db.or_(
                db.and_(Message.sender_id == user_a, Message.recipient_id == user_b),
                db.and_(Message.sender_id == user_b, Message.recipient_id == user_a)
            )
        ).order_by(Message.created_at.asc()).all()
