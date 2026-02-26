from app.persistence.repository import InMemoryRepository
from models.user import User
from models.review import Review

class HBnBFacade:
    def __init__(self):
        self.user_repo = InMemoryRepository()
        self.review_repo = InMemoryRepository()

################ USER ##################### 

    def create_user(self, user_data):
        user = User(**user_data)
        if not user:
            raise ValueError("Invalid user data")
        self.user_repo.add(user)
        return user

    def get_user(self, user_id):
        user = self.user_repo.get(user_id)
        if not user:
            raise ValueError("User not found")
        return user

    def get_user_by_email(self, email):
        user = self.user_repo.get_by_attribute('email', email)
        if not user:
            raise ValueError("User not found")
        return user
    
    def put_user(self, user_id, data):
        if not self.get_user(user_id):
            raise ValueError("User not found")
        return self.user_repo.update(user_id, data)
    
    def patch(self, user_id: str, data: dict):
        if 'email' in data:
            existing_user = self.get_user_by_email(data['email'])
            if not existing_user:
                raise ValueError("User not found")
        updated_user = self.user_repo.update(user_id, data)
        return updated_user

    def delete_user(self, user_id):
        if not self.get_user(user_id):
            raise ValueError("User not found")
        return self.user_repo.delete(user_id)

############### REVIEW ########################

    def create_review(self, review_data):
        review = Review(**review_data)
        if not review:
            raise ValueError("Invalid review data")
        self.review_repo.add(review)
        return review
    
    def get_review(self, review_id):
        review = self.review_repo.get(review_id)
        if not review:
            raise ValueError("Review not found")
        return review
    
    def get_review_by_user(self, user):
        review = self.review_repo.get_by_attribute('user', user)
        if not review:
            raise ValueError("No reviews found for this user")
        return review

    def put_review(self, review_id, data):
        if not self.get_review(review_id):
            raise ValueError("Review not found")
        return self.review_repo.update(review_id, data)
    
    def patch_review(self, review_id: str, data: dict):
        if not self.get_review(review_id):
            raise ValueError("Review not found")
        return self.review_repo.update(review_id, data)
    
    def delete_review(self, review_id):
        if not self.get_review(review_id):
            raise ValueError("Review not found")
        return self.review_repo.delete(review_id)
