from flask_restx import Namespace, Resource, fields
from app.services import facade

api = Namespace('users', description='User operations')

# Define the user model for input validation and documentation
user_model = api.model('User', {
    'first_name': fields.String(required=True, description='First name of the user'),
    'last_name': fields.String(required=True, description='Last name of the user'),
    'email': fields.String(required=True, description='Email of the user')
})

@api.route('/')
class UserList(Resource):
    @api.expect(user_model, validate=True)
    @api.response(201, 'User successfully created')
    @api.response(400, 'Email already registered')
    @api.response(400, 'Invalid input data')
    def post(self):
        """Register a new user"""
        user_data = api.payload

        # Simulate email uniqueness check (to be replaced by real validation with persistence)
        existing_user = facade.get_user_by_email(user_data['email'])
        if existing_user:
            return {'error': 'Email already registered'}, 400

        new_user = facade.create_user(user_data)
        return {'id': new_user.id, 'first_name': new_user.first_name, 'last_name': new_user.last_name, 'email': new_user.email}, 201

@api.route('/<user_id>')
class UserResource(Resource):
    @api.response(200, 'User details retrieved successfully')
    @api.response(404, 'User not found')
    def get(self, user_id):
        """Get user details by ID"""
        user = facade.get_user(user_id)
        if not user:
            return {'error': 'User not found'}, 404
        return {'id': user.id, 'first_name': user.first_name, 'last_name': user.last_name, 'email': user.email}, 200

    def get_mail(email):
        """Get user details by email"""
        user = facade.get_user_by_email(email)
        if not user:
            return {'error': 'User not found'}, 404
        return {'id': user.id, 'first_name': user.first_name, 'last_name': user.last_name, 'email': user.email}, 200

    def put(self, user_id):
        """Modify the entire details of the user by ID"""
        user = facade.get_user(user_id)
        updated_user = facade.put_user(user_id, api.payload)
        if not user:
            return {'error': 'User not found'}, 404
        return {
        'id': updated_user.id,
        'first_name': updated_user.first_name,
        'last_name': updated_user.last_name,
        'email': updated_user.email
        }, 200
    
    def patch_user(self, user_id):
        """Modify a specific detail of user"""
        user = facade.get_user(user_id)
        if not user:
            return {'error': 'User not found'}, 404
        
        payload = api.payload or {}

        if 'email' in payload:
            existing_user = facade.get_user_by_email(payload['email'])
            if existing_user and existing_user.id != user_id:
                return {'error': 'Email already taken'}, 400
        
        updated_user = facade.patch(user_id, payload)

        return {
            'id': updated_user.id,
            'first_name': updated_user.first_name,
            'last_name': updated_user.last_name,
            'email': updated_user.email
        }, 200

    def delete(self, user_id):
        """Delete user"""
        user = facade.get_user(user_id)
        if not user:
            return {'error': 'User not found'}, 404
        facade.delete_user(user_id)
        return {'message': 'User deleted'}, 200
