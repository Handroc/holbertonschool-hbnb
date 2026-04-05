from app import db
from app.models.base_model import BaseModel


class Notification(BaseModel):
    __tablename__ = 'notifications'

    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    type = db.Column(db.String(50), nullable=False)
    message = db.Column(db.String(500), nullable=False)
    read = db.Column(db.Boolean, default=False, nullable=False)

    user = db.relationship('User', back_populates='notifications')

    def to_dict(self):
        data = super().to_dict()
        data['user_id'] = self.user_id
        data['type'] = self.type
        data['message'] = self.message
        data['read'] = self.read
        return data
