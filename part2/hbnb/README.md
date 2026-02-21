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

This project features a well-organized, modular structure with a clear separation of concerns across the Presentation, Business Logic, and Persistence layers. It is built using Flask and prepares the architecture for future integration of API endpoints and a database-backed persistence layer.

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

## 🔧 <span id="whats-next">What's next?</span>

- Integration of functional API endpoints within the `api/` directory.
- Full implementation of the Business logic in the `models/` directory and Facade class.
- Replacement of the in-memory repository with a database-backed persistence layer using SQL Alchemy.
