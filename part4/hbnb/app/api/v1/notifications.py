#!/usr/bin/env python3
from flask_restx import Namespace, Resource
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services import facade

api = Namespace('notifications', description='Notification operations')


@api.route('/')
class NotificationList(Resource):
    @jwt_required()
    @api.response(200, 'Notifications retrieved')
    def get(self):
        """Get all notifications for the current user"""
        user_id = get_jwt_identity()
        notifs = facade.get_notifications_for_user(user_id)
        return [n.to_dict() for n in notifs], 200


@api.route('/unread-count')
class NotificationUnreadCount(Resource):
    @jwt_required()
    @api.response(200, 'Unread count')
    def get(self):
        """Get unread notification count for the current user"""
        user_id = get_jwt_identity()
        count = facade.get_unread_notification_count(user_id)
        return {"count": count}, 200


@api.route('/<notification_id>/read')
class NotificationRead(Resource):
    @jwt_required()
    @api.response(200, 'Notification marked as read')
    @api.response(403, 'Forbidden')
    @api.response(404, 'Not found')
    def put(self, notification_id):
        """Mark a notification as read"""
        user_id = get_jwt_identity()
        notif = facade.notification_repo.get(notification_id)
        if not notif:
            return {"Error": "Notification not found"}, 404
        if str(notif.user_id) != str(user_id):
            return {"Error": "Forbidden"}, 403
        facade.mark_notification_read(notification_id)
        return {"message": "Marked as read"}, 200


@api.route('/<notification_id>')
class NotificationDetail(Resource):
    @jwt_required()
    @api.response(200, 'Notification deleted')
    @api.response(403, 'Forbidden')
    @api.response(404, 'Not found')
    def delete(self, notification_id):
        """Delete a notification"""
        user_id = get_jwt_identity()
        notif = facade.notification_repo.get(notification_id)
        if not notif:
            return {"Error": "Notification not found"}, 404
        if str(notif.user_id) != str(user_id):
            return {"Error": "Forbidden"}, 403
        facade.delete_notification(notification_id)
        return {"message": "Deleted"}, 200
