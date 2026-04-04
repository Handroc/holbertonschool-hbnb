#!/usr/bin/env python3
"""Seed demo data: 5 users, 20 places, and sentiment-matched reviews.

Usage:
    python scripts/seed_demo_data.py
"""

from __future__ import annotations

import random
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app import create_app, db
from app.models.amenity import Amenity
from app.models.place import Place
from app.models.review import Review
from app.models.user import User


def seed_demo_data() -> None:
    app = create_app()

    users_data = [
        {"first_name": "Lina", "last_name": "Martin", "email": "lina@hbnb.demo", "password": "lina1234"},
        {"first_name": "Noah", "last_name": "Petit", "email": "noah@hbnb.demo", "password": "noah1234"},
        {"first_name": "Sara", "last_name": "Lopez", "email": "sara@hbnb.demo", "password": "sara1234"},
        {"first_name": "Omar", "last_name": "Diallo", "email": "omar@hbnb.demo", "password": "omar1234"},
        {"first_name": "Maya", "last_name": "Roux", "email": "maya@hbnb.demo", "password": "maya1234"},
    ]

    places_data = [
        {"title": "Canal Loft Near City Center", "description": "Sunny loft with exposed brick, fast Wi-Fi, and a quiet courtyard.", "price": 115, "latitude": 48.8566, "longitude": 2.3522},
        {"title": "Seaside Studio with Balcony", "description": "Compact studio two blocks from the beach with sunset balcony views.", "price": 98, "latitude": 43.2965, "longitude": 5.3698},
        {"title": "Mountain Cabin and Pine View", "description": "Warm wooden cabin with fireplace and hiking trails at the doorstep.", "price": 142, "latitude": 45.9237, "longitude": 6.8694},
        {"title": "Modern Flat in Old Town", "description": "Renovated apartment in a historic district with cafes and markets nearby.", "price": 126, "latitude": 45.7640, "longitude": 4.8357},
        {"title": "Garden House with Private Patio", "description": "Two-bedroom house with patio dining, herbs, and neighborhood bakeries.", "price": 133, "latitude": 44.8378, "longitude": -0.5792},
        {"title": "Riverside Apartment with Workspace", "description": "Bright apartment on the river with ergonomic desk and printer setup.", "price": 121, "latitude": 47.2184, "longitude": -1.5536},
        {"title": "Cozy Nest Near Central Station", "description": "Well-connected one-bedroom ideal for short business or city trips.", "price": 89, "latitude": 50.6292, "longitude": 3.0573},
        {"title": "Design Suite in Arts District", "description": "Stylish suite with curated decor, gallery access, and premium bedding.", "price": 158, "latitude": 43.6047, "longitude": 1.4442},
        {"title": "Lakefront Retreat with Kayaks", "description": "Peaceful retreat with dock access, kayaks, and lake sunrise views.", "price": 171, "latitude": 45.8992, "longitude": 6.1294},
        {"title": "City Penthouse with Skyline View", "description": "Top-floor penthouse with skyline terrace and chef-ready kitchen.", "price": 219, "latitude": 48.5734, "longitude": 7.7521},
        {"title": "Quiet Courtyard Apartment", "description": "Ground-floor apartment around a silent courtyard and mature trees.", "price": 104, "latitude": 47.3220, "longitude": 5.0415},
        {"title": "Historic Home by Cathedral", "description": "Character home steps from the cathedral with restored stone details.", "price": 137, "latitude": 49.2583, "longitude": 4.0317},
        {"title": "Sunny Duplex with Terrace", "description": "Two-level duplex with breakfast terrace and open-plan living room.", "price": 149, "latitude": 43.7102, "longitude": 7.2620},
        {"title": "Minimal Studio in Tech Hub", "description": "Efficient studio close to startup offices and co-working spaces.", "price": 93, "latitude": 45.1885, "longitude": 5.7245},
        {"title": "Family Villa with Pool", "description": "Spacious villa with fenced pool, barbecue area, and game room.", "price": 248, "latitude": 43.9493, "longitude": 4.8055},
        {"title": "Harbor Apartment with Market Access", "description": "Apartment near harbor fish market and waterfront morning walks.", "price": 117, "latitude": 49.4944, "longitude": 0.1079},
        {"title": "Bohemian Flat with Vinyl Corner", "description": "Colorful flat with vinyl listening corner and local food scene nearby.", "price": 112, "latitude": 45.7772, "longitude": 3.0870},
        {"title": "Eco Lodge with Forest Trails", "description": "Eco-conscious lodge with solar power and direct forest trail access.", "price": 164, "latitude": 47.7480, "longitude": 7.3397},
        {"title": "Boutique Loft in Shopping Quarter", "description": "Boutique loft surrounded by independent shops and brunch spots.", "price": 131, "latitude": 47.9025, "longitude": 1.9090},
        {"title": "Rooftop Studio with City Lights", "description": "Rooftop studio with twinkling night views and compact luxury touches.", "price": 108, "latitude": 48.3904, "longitude": -4.4861},
    ]

    amenity_names = [
        "WiFi",
        "Kitchen",
        "Heating",
        "Air Conditioning",
        "Washer",
        "Parking",
        "Pool",
        "Pet Friendly",
        "Workspace",
        "Balcony",
    ]

    positive_templates = [
        "I had a fantastic stay at {title}. Everything felt clean, comfortable, and thoughtfully prepared.",
        "Loved this place. {title} matched the listing perfectly and the overall experience was excellent.",
        "Great value for money. {title} was quiet, well-located, and very pleasant for the whole trip.",
        "Super positive experience. The host communication and comfort at {title} were both top-notch.",
        "Would definitely book again. {title} made the trip easy and enjoyable from start to finish.",
    ]

    negative_templates = [
        "The stay at {title} was disappointing. The comfort and cleanliness did not match expectations.",
        "I expected better from {title}. Communication and overall condition were below average.",
        "Sadly, {title} was not a good fit. Noise and maintenance issues impacted the experience.",
        "Not ideal this time. {title} needs improvements in consistency and guest readiness.",
        "I would not rebook {title} right now. Several details made the stay less enjoyable than expected.",
    ]

    rng = random.Random(20260404)

    with app.app_context():
        # Remove previously seeded demo users to keep the script idempotent.
        demo_emails = [u["email"] for u in users_data]
        existing_users = User.query.filter(User.email.in_(demo_emails)).all()
        for user in existing_users:
            db.session.delete(user)
        db.session.commit()

        # Ensure amenities exist and build a reusable pool.
        amenities_pool = []
        for name in amenity_names:
            amenity = Amenity.query.filter_by(name=name).first()
            if amenity is None:
                amenity = Amenity(name=name)
                db.session.add(amenity)
            amenities_pool.append(amenity)
        db.session.commit()

        # Create 5 non-admin users.
        users = []
        for data in users_data:
            user = User(
                first_name=data["first_name"],
                last_name=data["last_name"],
                email=data["email"],
                password=data["password"],
                is_admin=False,
            )
            db.session.add(user)
            users.append(user)
        db.session.commit()

        # Create 20 distinct places, distributed across the 5 users (4 each).
        places = []
        for idx, pdata in enumerate(places_data):
            owner = users[idx % len(users)]
            place = Place(
                title=pdata["title"],
                description=pdata["description"],
                price=pdata["price"],
                latitude=pdata["latitude"],
                longitude=pdata["longitude"],
                user_id=owner.id,
            )
            for amenity in rng.sample(amenities_pool, k=rng.randint(3, 6)):
                place.add_amenity(amenity)
            db.session.add(place)
            places.append(place)
        db.session.commit()

        # Each user reviews every place they can review (all non-owned places).
        reviews_created = 0
        for user in users:
            for place in places:
                if place.user_id == user.id:
                    continue

                sentiment = rng.choice(["positive", "negative"])
                if sentiment == "positive":
                    rating = rng.choice([4, 5])
                    text = rng.choice(positive_templates).format(title=place.title)
                    cleanliness = rng.choice([4, 5])
                    location = rng.choice([4, 5])
                    value_score = rng.choice([4, 5])
                    communication = rng.choice([4, 5])
                else:
                    rating = rng.choice([1, 2])
                    text = rng.choice(negative_templates).format(title=place.title)
                    cleanliness = rng.choice([1, 2])
                    location = rng.choice([1, 2])
                    value_score = rng.choice([1, 2])
                    communication = rng.choice([1, 2])

                review = Review(
                    text=text,
                    rating=rating,
                    place_id=place.id,
                    user_id=user.id,
                    cleanliness=cleanliness,
                    location=location,
                    value_score=value_score,
                    communication=communication,
                )
                db.session.add(review)
                reviews_created += 1

        db.session.commit()

        print("Seed complete")
        print("Users created: 5 (all non-admin)")
        print("Places created: 20")
        print(f"Reviews created: {reviews_created}")
        print("\nUser credentials:")
        for data in users_data:
            print(f"- {data['email']} / {data['password']}")


if __name__ == "__main__":
    seed_demo_data()
