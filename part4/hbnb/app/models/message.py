from app import db
from app.models.base_model import BaseModel


class Message(BaseModel):
    __tablename__ = 'messages'

    sender_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    recipient_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    body = db.Column(db.String(2000), nullable=False)
    read = db.Column(db.Boolean, default=False, nullable=False)

    sender = db.relationship('User', foreign_keys=[sender_id], backref=db.backref('sent_messages', lazy=True))
    recipient = db.relationship('User', foreign_keys=[recipient_id], backref=db.backref('received_messages', lazy=True))

    def to_dict(self):
        data = super().to_dict()
        data['sender_id'] = self.sender_id
        data['recipient_id'] = self.recipient_id
        data['body'] = self.body
        data['read'] = self.read
        if self.sender:
            data['sender'] = {
                'id': self.sender.id,
                'first_name': self.sender.first_name,
                'last_name': self.sender.last_name,
                'profile_picture': self.sender.profile_picture,
            }
        if self.recipient:
            data['recipient'] = {
                'id': self.recipient.id,
                'first_name': self.recipient.first_name,
                'last_name': self.recipient.last_name,
                'profile_picture': self.recipient.profile_picture,
            }
        return data
