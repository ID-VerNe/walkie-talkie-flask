# app/__init__.py (修改后的 create_app 部分)
from flask import Flask
from flask_socketio import SocketIO
from config import config # 导入 config 字典

socketio = SocketIO()

def create_app(config_name='default'): # 接收 config_name
    app = Flask(__name__)
    # --- Load Configuration ---
    app.config.from_object(config[config_name]) # 使用字典加载配置

    # --- Initialize Extensions ---
    async_mode = app.config.get('ASYNC_MODE')
    socketio.init_app(app, async_mode=async_mode)

    # --- Register Blueprints ---
    from .main import main_bp
    app.register_blueprint(main_bp)

    return app, socketio # 返回两个实例