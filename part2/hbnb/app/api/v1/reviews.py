from flask_restx import Namespace, Resource, fields
from app.services import facade

api = Namespace('reviews', description='Review operations')

# Define the review model for input validation and documentation
review_model = api.model('Review', {
    'text': fields.String(required=True, description='Text of the review'),
    'rating': fields.Integer(required=False, min=1, max=5, description='The rate the user gave to the review'),
    'place_id': fields.String(required=True, description='IDs place being reviewed'),
    'user_id': fields.String(required=True, description='IDs user who made the review')
}) 
@api.route('/')
class ReviewList(Resource):
    @api.expect(review_model, validate=True)
    @api.response(201, 'Review successfully created')
    @api.response(400, 'Invalid input data')
    def post(self):
        """Create a new review"""
        try:
            review = facade.create_review(api.payload)
            return review.to_dict(), 201
        except (ValueError, TypeError) as e:
            return {"Error": str(e)}, 400

    @api.response(200, 'List of reviews retrieved successfully')
    def get(self):
        """Retrieve a list of all reviews"""
        all_reviews = facade.get_all_reviews()
        return [x.to_dict() for x in all_reviews], 200
    
@api.route('/<review_id>')
class ReviewResource(Resource):
    @api.response(200, 'Review details retrieved successfully')
    @api.response(404, 'Review not found')
    def get(self, review_id):
        """Get review details by ID"""
        review = facade.get_review(review_id)
        if not review:
            return {"Error": "Review not found"}, 404
        return review.to_dict(), 200
    
    @api.expect(review_model)
    @api.response(200, 'Review updated successfully')
    @api.response(404, 'Review not found')
    @api.response(400, 'Invalid input data')
    def put(self, review_id):
        """Update a review entirely"""
        try:
            review = facade.put_review(review_id, api.payload)
            return review.to_dict(), 200
        except ValueError as e:
            return {"Error": str(e)}, 400
        except TypeError as e:
            return {"Error": str(e)}, 404
    
    @api.expect(review_model)
    @api.response(200, 'Review updated successfully')
    @api.response(404, 'Review not found')
    @api.response(400, 'Invalid input data')
    def patch(self, review_id):
        """Update a review partially"""
        try:
            review = facade.patch_review(review_id, api.payload)
            if not review:
                return {"Error": "Review not found"}, 404
            return review.to_dict(), 200
        except ValueError as e:
            return {"Error": str(e)}, 400

    @api.response(200, 'Review deleted successfully')
    @api.response(404, 'Review not found')
    def delete(self, review_id):
        """Delete a review"""
        try:
            review = facade.get_review(review_id)
            if not review:
                return {"Error": "Review not found"}, 404
            facade.delete_review(review_id)
            return {"message": "Review deleted"}, 200
        except (ValueError, TypeError) as e:
            return {"Error": str(e)}, 400

@api.route('/user/<user_id>')
class ReviewByUser(Resource):
    @api.response(200, 'Reviews retrieved successfully')
    @api.response(404, 'User or reviews not found')
    def get(self, user_id):
        """Get all reviews by a specific user"""
        try:
            reviews = facade.get_review_by_user(user_id)
            if not reviews:
                return {"Error": "No reviews found for this user"}, 404
            return [x.to_dict() for x in reviews], 200
        except (ValueError, TypeError) as e:
            return {"Error": str(e)}, 400
