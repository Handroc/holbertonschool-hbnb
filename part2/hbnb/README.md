# HBnB Project Setup

## 🔖 Table of contents

<details>
  <summary>
    CLICK TO ENLARGE 😇
  </summary>
  📄 <a href="#description">Description</a>
  <br>
  📂 <a href="#files-description">Files description</a>
  <br>
  💻 <a href="#installation">Installation</a>
  <br>
  🔧 <a href="#whats-next">What's next?</a>
</details>

## 📄 <span id="description">Description</span>

This project features a well-organized structure across the Presentation, Business Logic, and Persistence layers. It is built using Flask and prepares the architecture for future integration of API endpoints and a database-backed persistence layer.

The application utilizes the Facade design pattern to manage communication between the Presentation, Business Logic, and Persistence layers. Currently, an in-memory repository handles object storage and validation, which will act as a placeholder until it is replaced by a database-backed solution using SQLAlchemy in later stages.

## 📂 <span id="files-description">Files description</span>

| **FILE / DIRECTORY** | **DESCRIPTION** |
| :-----------------: | ------------------------------------------------- |
| `app/`       | Contains the core application code                         |
| `app/api/`     | Houses the API endpoints, organized by version (e.g., `v1/`)                      |
| `app/models/`      | Contains the business logic classes (such as `user.py`, `place.py`, `review.py`, and `amenity.py`) |
| `app/services/`      | The location where the Facade pattern is implemented to manage layer interactions |
| `app/persistence/`      | Contains the implementation of the in-memory repository |
| `run.py`      | Serves as the entry point for running the Flask application |
| `config.py`      | Used for configuring environment variables and application settings |
| `requirements.txt`      | Lists all the required Python packages (including `flask` and `flask-restx`) needed for the project |
| `README.md`       | Provides a brief overview of the project setup   |

## 💻 <span id="installation">Installation</span>

1. **Install dependencies:** Use `pip` to install the required packages listed in the requirements file.

```bash
pip install -r requirements.txt
```

2. **Run the application:** Execute the entry point script to start the Flask server.

```bash
python run.py
```

## 🚀 API Endpoints Integration

### ✅ Implemented Features

---

### 0. 🗂️ Project Setup

- Modular folders:
  - `api/` for route definitions  
  - `models/` for business entities  
  - `facade/` as an entry point to the business logic  
  - `repository/` for in-memory persistence  
- Flask-RESTx initialized with Swagger UI  
- Swagger auto-generates documentation from defined models  

---

### 1. 🧠 Business Models

- **BaseModel**: common fields (`id`, `created_at`, `updated_at`)  
- **User**: name, email, password *(not exposed via API)*  
- **Place**: name, location, price, owner (`User`), amenities  
- **Amenity**: name of feature (WiFi, AC, etc.)  
- **Review**: text content, linked to a `User` and a `Place`  
- Relationship management:
  - One-to-many
  - Many-to-many  

---

### 2. 👤 User Endpoints

| **Method** | **Endpoint** | **Description** |
|:----------:|-------------|-----------------|
| POST | `/users/` | Create a user |
| GET | `/users/` | Retrieve all users |
| GET | `/users/{id}` | Get user by ID |
| PUT | `/users/{id}` | Update user details |

⚠️ Passwords are stored securely but are **not returned** by the API.  
🚫 `DELETE` not implemented for Users.

---

### 3. 🏷️ Amenity Endpoints

| **Method** | **Endpoint** | **Description** |
|:----------:|-------------|-----------------|
| POST | `/amenities/` | Create an amenity |
| GET | `/amenities/` | List all amenities |
| GET | `/amenities/{id}` | Get a specific amenity |
| PUT | `/amenities/{id}` | Update amenity details |

🚫 `DELETE` not implemented.

---

### 4. 🏠 Place Endpoints

| **Method** | **Endpoint** | **Description** |
|:----------:|-------------|-----------------|
| POST | `/places/` | Create a place |
| GET | `/places/` | List all places |
| GET | `/places/{id}` | Get place by ID (includes owner & amenities) |
| PUT | `/places/{id}` | Update place details |

✔ Includes data from related `User` and `Amenity` objects.  
🚫 `DELETE` not implemented.

---

### 5. 📝 Review Endpoints

| **Method** | **Endpoint** | **Description** |
|:----------:|-------------|-----------------|
| POST | `/reviews/` | Create a review |
| GET | `/reviews/` | List all reviews |
| GET | `/reviews/{id}` | Get review by ID |
| PUT | `/reviews/{id}` | Update a review |
| DELETE | `/reviews/{id}` | Delete a review |

✅ `DELETE` is available **only** for Review.

---

# 🧪 HBnB API Testing Guide

This section describes how to run unit tests and perform manual testing using `curl` for your Flask REST API.

---

## 📦 Project Structure (Testing)

```
project_root/
├── part2/
│   └── hbnb/
│       ├── app/
│       ├── tests/
│       │   ├── __init__.py
│       │   ├── test_users.py
│       │   ├── test_places.py
│       │   ├── test_amenities.py
│       │   ├── test_reviews.py
│       │   └── ...
│       ├── ...
│       └── app.py (or create_app.py)
```

---

## 🧪 Running Unit Tests

### ✅ Run All Tests

Make sure your virtual environment is activated and the `PYTHONPATH` is set:

```bash
export PYTHONPATH=$PYTHONPATH:$(pwd)/part2/hbnb
python3 -m unittest discover part2/hbnb/tests
```

Expected result:

```
Ran 15 tests in 0.039s
OK
```

---

## 🚀 Start the Flask API Server

Before using `curl`, run your Flask API server:

```bash
cd part2/hbnb
python3 app.py
```

Make sure it is running at:

```
http://localhost:5000
```

Swagger documentation is available at:

```
http://localhost:5000/api/v1/
```

---

## 🧪 Manual Testing with curl

### 1️⃣ Create a User

```bash
curl -X POST http://localhost:5000/api/v1/users/ \
-H "Content-Type: application/json" \
-d '{
  "first_name": "Alice",
  "last_name": "Wonderland",
  "email": "alice@example.com"
}'
```

---

### 2️⃣ Create an Amenity

```bash
curl -X POST http://localhost:5000/api/v1/amenities/ \
-H "Content-Type: application/json" \
-d '{"name": "WiFi"}'
```

Repeat for other amenities like `"Air Conditioning"`, `"Parking"`, etc.

🔍 List amenities and retrieve their IDs:

```bash
curl http://localhost:5000/api/v1/amenities/
```

---

### 3️⃣ Create a Place  
*(Use a valid `user_id` and `amenity` IDs)*

```bash
curl -X POST http://localhost:5000/api/v1/places/ \
-H "Content-Type: application/json" \
-d '{
  "title": "Charming Loft",
  "description": "A cozy loft in the city center",
  "price": 120.5,
  "latitude": 48.8566,
  "longitude": 2.3522,
  "owner_id": "USER_ID",
  "amenities": ["AMENITY_ID_1", "AMENITY_ID_2"]
}'
```

---

### 4️⃣ Create a Review

```bash
curl -X POST http://localhost:5000/api/v1/reviews/ \
-H "Content-Type: application/json" \
-d '{
  "text": "Great location and clean space!",
  "rating": 5,
  "user_id": "USER_ID",
  "place_id": "PLACE_ID"
}'
```

---

## 📖 Additional GET Examples

### List all users

```bash
curl http://localhost:5000/api/v1/users/
```

### Get a user by ID

```bash
curl http://localhost:5000/api/v1/users/<user_id>
```

### List all places

```bash
curl http://localhost:5000/api/v1/places/
```

### Get a place by ID

```bash
curl http://localhost:5000/api/v1/places/<place_id>
```

### Get all reviews for a place

```bash
curl http://localhost:5000/api/v1/reviews/places/<place_id>/reviews
```

---

## ✅ Testing Summary

| **Test Type** | **Description** | **Command / URL** |
|:-------------:|----------------|-------------------|
| Unit Tests | Run Python unittest suite | `python3 -m unittest discover part2/hbnb/tests` |
| Manual API Test | Run server & use curl requests | `curl -X ...` |
| API Documentation | Swagger (Flask-RESTx auto-generated) | `http://localhost:5000/api/v1/` |

---

## ⚠️ Important Notes

- A `User` must exist before creating a `Place`.
- A `User` and `Place` must exist before creating a `Review`.
- `Amenity` IDs must exist before attaching them to a `Place`.
- Make sure related resources exist before linking them together.
- All endpoints return appropriate HTTP status codes (`200`, `201`, `400`, `404`, etc.).

## 🔧 <span id="whats-next">What's next?</span>

- Integration of functional API endpoints within the `api/` directory.
- Full implementation of the Business logic in the `models/` directory and Facade class.
- Replacement of the in-memory repository with a database-backed persistence layer using SQL Alchemy.
