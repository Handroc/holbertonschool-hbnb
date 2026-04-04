#!/usr/bin/env python3
import datetime
from app.services.repositories import (
    UserRepository,
    PlaceRepository,
    ReviewRepository,
    AmenityRepository,
    BookingRepository,
    PlaceImageRepository,
    WishlistRepository,
    NotificationRepository,
    MessageRepository,
)
from app.models.amenity import Amenity
from app.models.place import Place
from app.models.user import User
from app.models.review import Review
from app.models.booking import Booking
from app.models.place_image import PlaceImage
from app.models.wishlist import WishlistItem
from app.models.notification import Notification
from app.models.message import Message

class HBnBFacade:
    def __init__(self):
        self.user_repo = UserRepository()
        self.place_repo = PlaceRepository()
        self.review_repo = ReviewRepository()
        self.amenity_repo = AmenityRepository()
        self.booking_repo = BookingRepository()
        self.place_image_repo = PlaceImageRepository()
        self.wishlist_repo = WishlistRepository()
        self.notification_repo = NotificationRepository()
        self.message_repo = MessageRepository()

################ AMENITY #####################

    def create_amenity(self, amenity_data):
        amenity_data = dict(amenity_data)
        name = amenity_data.get("name")
        if not name:
            raise ValueError("Name is required")
        name = Amenity._validate_name(name)

        existing = self.amenity_repo.get_first_by_attribute("name", name)
        if existing:
            raise ValueError("Amenity already exists")

        amenity = Amenity(name)
        self.amenity_repo.add(amenity)
        return amenity

    def get_amenity(self, amenity_id):
        return self.amenity_repo.get(amenity_id)

    def get_all_amenities(self):
        return self.amenity_repo.get_all()

    def update_amenity(self, amenity_id, amenity_data):
        amenity_data = dict(amenity_data)
        if "name" in amenity_data:
            amenity_data["name"] = Amenity._validate_name(amenity_data["name"])
            existing = self.amenity_repo.get_first_by_attribute("name", amenity_data["name"])
            if existing and existing.id != amenity_id:
                raise ValueError("An amenity with this name already exists")
        amenity = self.amenity_repo.get(amenity_id)
        if not amenity:
            raise ValueError("Amenity not found")

        self.amenity_repo.update(amenity.id, amenity_data)
        return amenity

    def delete_amenity(self, amenity_id):
        amenity = self.amenity_repo.get(amenity_id)
        if not amenity:
            raise ValueError("Amenity not found")

        for place in self.place_repo.get_all():
            if amenity in place.amenities:
                place.remove_amenity(amenity)
        self.amenity_repo.delete(amenity_id)

################ PLACE ##################### 

    def create_place(self, place_data):
        place_data = dict(place_data)
        owner_id = place_data.pop("user_id", place_data.pop("owner_id", None))
        if owner_id is None:
            raise ValueError("An owner is required")
        amenities_ids = place_data.pop("amenities", [])

        user = self.user_repo.get(owner_id)
        if not user:
            raise ValueError("Owner not found")

        place = Place(user_id=owner_id, **place_data)

        for amenity_id in amenities_ids:
            amenity = self.amenity_repo.get(amenity_id)
            if not amenity:
                raise ValueError("Amenity not found")
            place.add_amenity(amenity)

        self.place_repo.add(place)
        return place

    def get_place(self, place_id):
        return self.place_repo.get(place_id)

    def get_all_places(self):
        return self.place_repo.get_all()

    def get_available_places(self, check_in_str, check_out_str):
        """Return places that have no confirmed booking overlapping check_in..check_out."""
        from datetime import date
        try:
            check_in  = date.fromisoformat(check_in_str)
            check_out = date.fromisoformat(check_out_str)
        except ValueError:
            return self.place_repo.get_all()
        if check_out <= check_in:
            return self.place_repo.get_all()

        all_places = self.place_repo.get_all()
        available = []
        for place in all_places:
            booked = any(
                b.status == 'confirmed' and
                date.fromisoformat(b.check_in) < check_out and
                date.fromisoformat(b.check_out) > check_in
                for b in place.bookings
            )
            if not booked:
                available.append(place)
        return available

    def get_places_by_owner(self, owner_id):
        return self.place_repo.get_all_by_attribute('user_id', owner_id)

    def update_place(self, place_id, place_data):
        place_data = dict(place_data)
        place_data.pop("reviews", None)
        place = self.place_repo.get(place_id)
        if not place:
            raise ValueError("Place not found")

        owner_id = place_data.pop("user_id", place_data.pop("owner_id", None))
        if owner_id is not None:
            user = self.user_repo.get(owner_id)
            if not user:
                raise ValueError("Owner not found")
            place.user = user

        if "amenities" in place_data:
            amenity_list = []
            amenities_ids = place_data.pop("amenities")
            for amenity_id in amenities_ids:
                amenity = self.amenity_repo.get(amenity_id)
                if not amenity:
                    raise ValueError("Amenity not found")
                amenity_list.append(amenity)
            place.amenities.clear()
            for amenity in amenity_list:
                place.add_amenity(amenity)

        self.place_repo.update(place.id, place_data)
        return place

    def delete_place(self, place_id):
        place = self.place_repo.get(place_id)
        if not place:
            raise ValueError("Place not found")

        for review in self.get_review_by_place(place_id):
            self.delete_review(review.id)
        self.place_repo.delete(place_id)

################ USER ##################### 

    def create_user(self, user_data):
        user_data = dict(user_data)
        email = user_data.get("email")
        password = user_data.pop("password", None)
        if not email:
            raise ValueError("Email is required")
        if password is None:
            raise ValueError("Password is required")
        existing = self.user_repo.get_user_by_email(email)
        if existing:
            raise ValueError("Email is already used")

        user = User(password=password, **user_data)
        self.user_repo.add(user)
        return user

    def get_user(self, user_id):
        return self.user_repo.get(user_id)
    
    def get_all_users(self):
        return self.user_repo.get_all()

    def get_user_by_email(self, email):
        return self.user_repo.get_user_by_email(email)

    def update_user(self, user_id, user_data):
        user_data = dict(user_data)
        user = self.user_repo.get(user_id)
        if not user:
            raise ValueError("User not found")

        password = user_data.pop("password", None)
        user_data.pop("is_admin", None)

        if "email" in user_data:
            existing = self.user_repo.get_user_by_email(user_data["email"])
            if existing and existing.id != user_id:
                raise ValueError("Email is already used")

        if password is not None:
            user_data["password"] = password
        self.user_repo.update(user.id, user_data)
        return user

    def update_place_picture(self, place_id, picture_path):
        place = self.place_repo.get(place_id)
        if not place:
            raise ValueError("Place not found")
        self.place_repo.update(place_id, {'picture': picture_path})
        return place

################ PLACE IMAGES #####################

    def add_place_image(self, place_id, path):
        place = self.place_repo.get(place_id)
        if not place:
            raise ValueError("Place not found")
        existing_count = len(place.images)
        img = PlaceImage(place_id=place_id, path=path, order=existing_count)
        self.place_image_repo.add(img)
        return img

    def delete_place_image(self, image_id):
        img = self.place_image_repo.get(image_id)
        if not img:
            raise ValueError("Image not found")
        self.place_image_repo.delete(image_id)

################ WISHLIST #####################

    def add_to_wishlist(self, user_id, place_id):
        if self.wishlist_repo.get_by_user_and_place(user_id, place_id):
            return  # already saved
        item = WishlistItem(user_id=user_id, place_id=place_id)
        self.wishlist_repo.add(item)
        return item

    def remove_from_wishlist(self, user_id, place_id):
        item = self.wishlist_repo.get_by_user_and_place(user_id, place_id)
        if not item:
            raise ValueError("Wishlist item not found")
        self.wishlist_repo.delete(item.id)

    def get_wishlist(self, user_id):
        items = self.wishlist_repo.get_by_user(user_id)
        return [item.place for item in items if item.place]

    def get_wishlist_place_ids(self, user_id):
        items = self.wishlist_repo.get_by_user(user_id)
        return [item.place_id for item in items]

    def update_user_picture(self, user_id, picture_path):
        user = self.user_repo.get(user_id)
        if not user:
            raise ValueError("User not found")
        self.user_repo.update(user_id, {'profile_picture': picture_path})
        return user

    def delete_user(self, user_id):
        user = self.user_repo.get(user_id)
        if not user:
            raise ValueError("User not found")

        for review in self.review_repo.get_all_by_attribute("user_id", user_id):
            if review.user_id == user_id:
                place = self.place_repo.get(review.place_id)
                if place and review in place.reviews:
                    place.remove_review(review)
                self.review_repo.delete(review.id)

        for place in self.place_repo.get_all_by_attribute("user_id", user_id):
            if place.user_id == user_id:
                self.delete_place(place.id)

        self.user_repo.delete(user_id)

############### REVIEW ########################

    def create_review(self, review_data):
        review_data = dict(review_data)

        user_id = review_data.get("user_id")
        place_id = review_data.get("place_id")
        if not user_id:
            raise ValueError("User is required")
        if not place_id:
            raise ValueError("Place is required")
        if not self.user_repo.get(user_id):
            raise ValueError("User not found")
        if not self.place_repo.get(place_id):
            raise ValueError("Place not found")

        place = self.get_place(place_id)
        review = Review(**review_data)
        place.add_review(review)
        self.review_repo.add(review)
        # Notify place owner of new review
        owner_id = str(place.user_id)
        if owner_id != str(user_id):
            reviewer = self.user_repo.get(user_id)
            reviewer_name = f"{reviewer.first_name} {reviewer.last_name}" if reviewer else "Someone"
            rating = review_data.get('rating', '?')
            self.create_notification(
                owner_id, 'review',
                f"{reviewer_name} left a {rating}-star review on '{place.title}'"
            )
        return review
    
    def get_review(self, review_id):
        return self.review_repo.get(review_id)

    def get_all_reviews(self):
        return self.review_repo.get_all()
    
    def get_review_by_place(self, place_id):
        return self.review_repo.get_all_by_attribute('place_id', place_id)

    def update_review(self, review_id, review_data):
        review_data = dict(review_data)
        review_data.pop("user_id", None)
        review_data.pop("place_id", None)
        review = self.review_repo.get(review_id)
        if not review:
            raise ValueError("Review not found")

        self.review_repo.update(review.id, review_data)
        return review

    def delete_review(self, review_id):
        review = self.review_repo.get(review_id)
        if not review:
            raise ValueError("Review not found")

        place = self.place_repo.get(review.place_id)
        if place and review in place.reviews:
            place.remove_review(review)

        self.review_repo.delete(review_id)

############### BOOKING ########################

    def create_booking(self, booking_data):
        booking_data = dict(booking_data)
        user_id  = booking_data.get('user_id')
        place_id = booking_data.get('place_id')
        check_in  = booking_data.get('check_in')
        check_out = booking_data.get('check_out')

        if not user_id:
            raise ValueError("user_id is required")
        if not place_id:
            raise ValueError("place_id is required")
        if not check_in:
            raise ValueError("check_in is required")
        if not check_out:
            raise ValueError("check_out is required")

        if not self.user_repo.get(user_id):
            raise ValueError("User not found")
        place = self.place_repo.get(place_id)
        if not place:
            raise ValueError("Place not found")
        if str(place.user_id) == str(user_id):
            raise ValueError("Cannot book your own place")

        ci = datetime.date.fromisoformat(str(check_in))
        co = datetime.date.fromisoformat(str(check_out))
        if self.booking_repo.get_overlapping(place_id, ci, co):
            raise ValueError("Place already booked for these dates")

        booking = Booking(
            place_id=place_id,
            user_id=user_id,
            check_in=check_in,
            check_out=check_out,
            status=booking_data.get('status', 'pending')
        )
        self.booking_repo.add(booking)
        # Notify place owner of new booking request
        owner_id = str(place.user_id)
        if owner_id != str(user_id):
            guest = self.user_repo.get(user_id)
            guest_name = f"{guest.first_name} {guest.last_name}" if guest else "A guest"
            self.create_notification(
                owner_id, 'booking',
                f"{guest_name} requested a booking at '{place.title}' ({check_in} → {check_out})"
            )
        return booking

    def get_booking(self, booking_id):
        return self.booking_repo.get(booking_id)

    def get_all_bookings(self):
        return self.booking_repo.get_all()

    def get_bookings_by_place(self, place_id):
        return self.booking_repo.get_bookings_by_place(place_id)

    def get_bookings_by_user(self, user_id):
        return self.booking_repo.get_bookings_by_user(user_id)

    def update_booking(self, booking_id, booking_data):
        booking_data = dict(booking_data)
        booking_data.pop('user_id', None)
        booking_data.pop('place_id', None)

        booking = self.booking_repo.get(booking_id)
        if not booking:
            raise ValueError("Booking not found")

        if 'check_in' in booking_data or 'check_out' in booking_data:
            ci = datetime.date.fromisoformat(str(booking_data.get('check_in', booking.check_in)))
            co = datetime.date.fromisoformat(str(booking_data.get('check_out', booking.check_out)))
            if self.booking_repo.get_overlapping(booking.place_id, ci, co, exclude_id=booking_id):
                raise ValueError("Place already booked for these dates")

        self.booking_repo.update(booking_id, booking_data)
        return booking

    def delete_booking(self, booking_id):
        booking = self.booking_repo.get(booking_id)
        if not booking:
            raise ValueError("Booking not found")
        self.booking_repo.delete(booking_id)

############### NOTIFICATIONS ########################

    def create_notification(self, user_id, notif_type, message):
        notif = Notification(user_id=user_id, type=notif_type, message=message)
        self.notification_repo.add(notif)
        return notif

    def get_notifications_for_user(self, user_id):
        return self.notification_repo.get_by_user(user_id)

    def mark_notification_read(self, notification_id):
        notif = self.notification_repo.get(notification_id)
        if not notif:
            raise ValueError("Notification not found")
        self.notification_repo.update(notification_id, {'read': True})
        return notif

    def delete_notification(self, notification_id):
        notif = self.notification_repo.get(notification_id)
        if not notif:
            raise ValueError("Notification not found")
        self.notification_repo.delete(notification_id)

    def get_unread_notification_count(self, user_id):
        return self.notification_repo.get_unread_count(user_id)

############### MESSAGES ########################

    def send_message(self, sender_id, recipient_id, body):
        if not self.user_repo.get(sender_id):
            raise ValueError("Sender not found")
        if not self.user_repo.get(recipient_id):
            raise ValueError("Recipient not found")
        if str(sender_id) == str(recipient_id):
            raise ValueError("Cannot message yourself")
        msg = Message(sender_id=sender_id, recipient_id=recipient_id, body=body)
        self.message_repo.add(msg)
        return msg

    def get_inbox(self, user_id):
        return self.message_repo.get_inbox(user_id)

    def get_sent(self, user_id):
        return self.message_repo.get_sent(user_id)

    def get_message(self, message_id):
        return self.message_repo.get(message_id)

    def mark_message_read(self, message_id):
        msg = self.message_repo.get(message_id)
        if not msg:
            raise ValueError("Message not found")
        self.message_repo.update(message_id, {'read': True})
        return msg

    def delete_message(self, message_id):
        msg = self.message_repo.get(message_id)
        if not msg:
            raise ValueError("Message not found")
        self.message_repo.delete(message_id)

    def get_unread_message_count(self, user_id):
        return self.message_repo.get_unread_count(user_id)

    def get_conversation(self, user_a, user_b):
        return self.message_repo.get_conversation(user_a, user_b)
