from flask_restx import Namespace, Resource
from flask_jwt_extended import get_jwt, jwt_required, get_jwt_identity

api = Namespace('protected', description='Protected endpoints')

@api.route('/protected')
class ProtectedResource(Resource):
    @jwt_required()
    def get(self):
        """A protected endpoint that requires a valid JWT token"""
        current_user = get_jwt_identity()
        is_admin = get_jwt().get("is_admin", False)
        if is_admin:
            return {'message': f'Hello, admin {current_user}'}, 200
        else:
            return {'message': f'Hello, user {current_user}'}, 200
