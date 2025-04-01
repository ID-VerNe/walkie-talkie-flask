# app/main/__init__.py

from flask import Blueprint

# Create the main blueprint
# The 'main' argument is the blueprint's name.
# __name__ helps Flask locate the blueprint's root path.
main_bp = Blueprint('main', __name__)

# Import the routes and events modules here AFTER the blueprint is created.
# This ensures that the decorators within those files (@main_bp.route, @socketio.on)
# are registered with the blueprint and the socketio instance respectively.
from . import routes
from . import events # events needs the socketio instance from app/__init__ via `from .. import socketio`