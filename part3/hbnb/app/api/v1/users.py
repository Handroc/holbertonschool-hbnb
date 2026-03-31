from flask_restx import Namespace, Resource, fields
from app.services import facade
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt

api = Namespace('users', description='User operations')

# Define the user model for input validation and documentation
user_model = api.model('User', {
    'first_name': fields.String(required=True, description='First name of the user'),
    'last_name': fields.String(required=True, description='Last name of the user'),
    'email': fields.String(required=True, description='Email of the user'),
    'password': fields.String(required=True, description='Password of the user')
})

update_user_model = api.model('UpdateUser', {
    'first_name': fields.String(description='First name of the user'),
    'last_name': fields.String(description='Last name of the user'),
    'email': fields.String(description='Email of the user'),
    'password': fields.String(description='Password of the user')
})
@api.route('/')
class UserList(Resource):
    @jwt_required()
    @api.expect(user_model)
    @api.response(201, 'User successfully created')
    @api.response(400, 'Invalid input data or email already registered')
    def post(self):
        """Register a new user"""
        current_user = get_jwt()
        if not current_user.get('is_admin'):
            return {'Error': 'Admin privileges required'}, 403
        safe_data = {
            "first_name": api.payload.get("first_name"),
            "last_name": api.payload.get("last_name"),
            "email": api.payload.get("email"),
            "password": api.payload.get("password")
        }
        try:
            user = facade.create_user(safe_data)
            return {
                "id": user.id,
                "message": "User successfully created"
            }, 201
        except ValueError as e:
            return {"Error": str(e)}, 400
        except TypeError as e:
            return {"Error": str(e)}, 400

    @api.response(200, 'List of users retrieved successfully')
    def get(self):
        """Retrieve a list of all users"""
        all_users = facade.get_all_users()
        return [user.to_dict() for user in all_users], 200

@api.route('/<user_id>')
class UserResource(Resource):
    @api.response(200, 'User details retrieved successfully')
    @api.response(404, 'User not found')
    def get(self, user_id):
        """Get user details by ID"""
        user = facade.get_user(user_id)
        if not user:
            return {"Error": "User not found"}, 404
        return user.to_dict(), 200

    @jwt_required()
    @api.expect(update_user_model)
    @api.response(200, 'User updated successfully')
    @api.response(404, 'User not found')
    @api.response(400, 'Invalid input data or email already taken')
    def put(self, user_id):
        """Update entire user details by ID"""
        current_user_id = get_jwt_identity()
        current_user = get_jwt()
        data = api.payload
        is_admin = current_user.get('is_admin', False)

        if not is_admin:
            if str(user_id) != str(current_user_id):
                return {"Error": 'Admin privileges required'}, 403
            if "email" in data or "password" in data:
                return {"Error": 'You cannot modify email or password'}, 400
            if "is_admin" in data:
                return {"Error": 'You cannot modify admin privileges'}, 403
        try:
            return facade.update_user(user_id, data).to_dict(), 200
        except ValueError as e:
            if "not found" in str(e).lower():
                return {"Error": str(e)}, 404
            return {"Error": str(e)}, 400
        except TypeError as e:
            return {"Error": str(e)}, 400

    @jwt_required()
    @api.response(200, 'User deleted successfully')
    @api.response(404, 'User not found')
    @api.response(403, 'Unauthorized action')
    def delete(self, user_id):
        """Delete a user account"""
        current_user_id = get_jwt_identity()
        current_user = get_jwt()
        is_admin = current_user.get('is_admin', False)
        if not is_admin and str(user_id) != str(current_user_id):
            return {"Error": 'Unauthorized action'}, 403
        try:
            facade.delete_user(user_id)
            return {"message": "User deleted successfully"}, 200
        except ValueError as e:
            return {"Error": str(e)}, 404

@api.route('/email/<email>')
class UserByEmail(Resource):
    @api.response(200, 'User details retrieved successfully')
    @api.response(404, 'User not found')
    def get(self, email):
        """Get user details by email"""
        user = facade.get_user_by_email(email)
        if not user:
            return {"Error": "User not found"}, 404
        return user.to_dict(), 200
