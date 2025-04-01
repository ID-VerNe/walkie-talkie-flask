# app/main/routes.py

from flask import render_template
from . import main_bp  # Import the blueprint instance created in app/main/__init__.py

@main_bp.route('/')
def index():
    """
    Handles requests to the root URL ('/') and serves the main application page.
    """
    # Flask's render_template function automatically looks for templates
    # in the 'templates' folder located at the application root level
    # (or in a folder specified when creating the app or blueprint).
    return render_template('index.html')

# You can add other standard HTTP routes here if needed for your application.
# For example, a health check endpoint:
# @main_bp.route('/health')
# def health_check():
#     return "OK", 200