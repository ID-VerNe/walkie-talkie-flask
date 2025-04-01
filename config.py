# config.py

import os
from dotenv import load_dotenv  # 用于从 .env 文件加载环境变量

# 获取项目根目录的绝对路径
basedir = os.path.abspath(os.path.dirname(__file__))

# 加载 .env 文件中的环境变量 (如果存在)
# 这将在 os.environ 中设置 .env 文件里的键值对
load_dotenv(os.path.join(basedir, '.env'))

class Config:
    """基础配置类"""
    # 从环境变量获取 SECRET_KEY，提供一个默认值以防万一 (但在生产中强烈建议设置环境变量)
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'you-should-set-a-strong-secret-key'

    # Debug 模式默认为 False
    DEBUG = False
    # Testing 模式默认为 False
    TESTING = False

    # Flask-SocketIO 异步模式配置
    # 从环境变量获取，默认为 'eventlet'。可以是 'eventlet', 'gevent', 'gevent_uwsgi' 等
    # 需要确保安装了对应的库 (pip install eventlet / gevent)
    ASYNC_MODE = os.environ.get('ASYNC_MODE') or 'eventlet'

    # 可以添加其他应用配置，例如数据库 URI 等（如果需要）
    # SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
    #     'sqlite:///' + os.path.join(basedir, 'app.db')
    # SQLALCHEMY_TRACK_MODIFICATIONS = False

class DevelopmentConfig(Config):
    """开发环境配置"""
    DEBUG = True
    # 可选：为开发环境设置不同的密钥
    # SECRET_KEY = 'dev-secret-key'

class ProductionConfig(Config):
    """生产环境配置"""
    # 生产环境必须从环境变量中获取 SECRET_KEY
    SECRET_KEY = os.environ.get('SECRET_KEY')
    if not SECRET_KEY:
        raise ValueError("生产环境未设置 SECRET_KEY 环境变量")

    # 生产环境中 Debug 和 Testing 必须是 False
    DEBUG = False
    TESTING = False
    # 生产环境确保使用推荐的异步模式，例如 eventlet 或 gevent
    ASYNC_MODE = os.environ.get('ASYNC_MODE') or 'eventlet'

class TestingConfig(Config):
    """测试环境配置"""
    TESTING = True
    # 可以为测试设置特定的配置，例如内存数据库
    # SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    # 关闭 CSRF 保护等（如果使用了 Flask-WTF）
    # WTF_CSRF_ENABLED = False

# 可以创建一个配置字典，方便在 app/__init__.py 中根据环境变量选择配置
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig # 默认使用开发配置
}

# --- 如何使用 ---
# 在 app/__init__.py 的 create_app 函数中:
# import os
# from config import config
# config_name = os.getenv('FLASK_CONFIG') or 'default'
# app.config.from_object(config[config_name])