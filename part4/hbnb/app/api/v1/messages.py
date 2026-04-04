#!/usr/bin/env python3
from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services import facade

api = Namespace('messages', description='Messaging operations')

send_model = api.model('SendMessage', {
    'recipient_id': fields.String(required=True, description='Recipient user ID'),
    'body': fields.String(required=True, description='Message body'),
})


@api.route('/')
class MessageList(Resource):
    @jwt_required()
    @api.expect(send_model)
    @api.response(201, 'Message sent')
    @api.response(400, 'Invalid input')
    def post(self):
        """Send a message to another user"""
        sender_id = get_jwt_identity()
        data = api.payload or {}
        recipient_id = data.get('recipient_id')
        body = data.get('body', '').strip()
        if not recipient_id:
            return {"Error": "recipient_id is required"}, 400
        if not body:
            return {"Error": "body is required"}, 400
        try:
            msg = facade.send_message(sender_id, recipient_id, body)
            return msg.to_dict(), 201
        except ValueError as e:
            return {"Error": str(e)}, 400


@api.route('/inbox')
class Inbox(Resource):
    @jwt_required()
    @api.response(200, 'Inbox retrieved')
    def get(self):
        """Get received messages for the current user"""
        user_id = get_jwt_identity()
        msgs = facade.get_inbox(user_id)
        return [m.to_dict() for m in msgs], 200


@api.route('/sent')
class Sent(Resource):
    @jwt_required()
    @api.response(200, 'Sent messages retrieved')
    def get(self):
        """Get sent messages for the current user"""
        user_id = get_jwt_identity()
        msgs = facade.get_sent(user_id)
        return [m.to_dict() for m in msgs], 200


@api.route('/unread-count')
class MessageUnreadCount(Resource):
    @jwt_required()
    @api.response(200, 'Unread count')
    def get(self):
        """Get unread message count for the current user"""
        user_id = get_jwt_identity()
        count = facade.get_unread_message_count(user_id)
        return {"count": count}, 200


@api.route('/conversation/<other_user_id>')
class Conversation(Resource):
    @jwt_required()
    @api.response(200, 'Conversation retrieved')
    def get(self, other_user_id):
        """Get conversation thread with another user"""
        user_id = get_jwt_identity()
        msgs = facade.get_conversation(user_id, other_user_id)
        return [m.to_dict() for m in msgs], 200


@api.route('/<message_id>/read')
class MessageRead(Resource):
    @jwt_required()
    @api.response(200, 'Message marked as read')
    @api.response(403, 'Forbidden')
    @api.response(404, 'Not found')
    def put(self, message_id):
        """Mark a message as read"""
        user_id = get_jwt_identity()
        msg = facade.get_message(message_id)
        if not msg:
            return {"Error": "Message not found"}, 404
        if str(msg.recipient_id) != str(user_id):
            return {"Error": "Forbidden"}, 403
        facade.mark_message_read(message_id)
        return {"message": "Marked as read"}, 200


@api.route('/<message_id>')
class MessageDetail(Resource):
    @jwt_required()
    @api.response(200, 'Message deleted')
    @api.response(403, 'Forbidden')
    @api.response(404, 'Not found')
    def delete(self, message_id):
        """Delete a message (sender or recipient)"""
        user_id = get_jwt_identity()
        msg = facade.get_message(message_id)
        if not msg:
            return {"Error": "Message not found"}, 404
        if str(msg.sender_id) != str(user_id) and str(msg.recipient_id) != str(user_id):
            return {"Error": "Forbidden"}, 403
        facade.delete_message(message_id)
        return {"message": "Deleted"}, 200
