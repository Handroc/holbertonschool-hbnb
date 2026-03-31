#!/usr/bin/env python3
from abc import ABC, abstractmethod
from app import db

class Repository(ABC):
    @abstractmethod
    def add(self, obj):
        pass

    @abstractmethod
    def get(self, obj_id):
        pass

    @abstractmethod
    def get_all(self):
        pass

    @abstractmethod
    def update(self, obj_id, data):
        pass

    @abstractmethod
    def delete(self, obj_id):
        pass

    @abstractmethod
    def get_first_by_attribute(self, attr_name, attr_value):
        pass

    @abstractmethod
    def get_all_by_attribute(self, attr_name, attr_value):
        pass


class SQLAlchemyRepository(Repository):
    def __init__(self, model, db_instance=None):
        self.model = model
        self.db = db_instance or db

    def add(self, obj):
        self.db.session.add(obj)
        self.db.session.commit()

    def get(self, obj_id):
        return self.db.session.get(self.model, obj_id)

    def get_all(self):
        return self.model.query.all()

    def update(self, obj_id, data):
        obj = self.get(obj_id)
        if not obj:
            raise ValueError("Object doesn't exist")
        obj.update(data)
        self.db.session.commit()

    def delete(self, obj_id):
        obj = self.get(obj_id)
        if obj:
            self.db.session.delete(obj)
            self.db.session.commit()

    def get_all_by_attribute(self, attr_name, attr_value):
        """Always returns a list (empty if no matches)."""
        return self.model.query.filter_by(**{attr_name: attr_value}).all()

    def get_first_by_attribute(self, attr_name, attr_value):
        """Returns the first matched object, or None."""
        return self.model.query.filter_by(**{attr_name: attr_value}).first()
