# run.py (使用手动生成的证书)

import os
from app import create_app
from dotenv import load_dotenv

load_dotenv()

config_name = os.getenv('FLASK_CONFIG') or 'default'
print(f" * Loading configuration: '{config_name}'")

app, socketio = create_app(config_name)

# 定义证书和密钥文件路径 (相对于 run.py)
keyfile_path = 'key.pem'
certfile_path = 'cert.pem'

if __name__ == '__main__':
    # 检查证书文件是否存在，提供更友好的提示
    if not os.path.exists(keyfile_path) or not os.path.exists(certfile_path):
        print("=" * 60)
        print("ERROR: SSL certificate (cert.pem) or key (key.pem) not found.")
        print("Please generate them using OpenSSL:")
        print("openssl req -x509 -newkey rsa:4096 -nodes -out cert.pem -keyout key.pem -days 365")
        print("=" * 60)
        exit(1) # 如果缺少文件则退出

    print(f" * Starting SocketIO server with SSL on https://0.0.0.0:5000 (Debug: {app.debug})")
    socketio.run(
        app,
        host='0.0.0.0',
        port=int(os.environ.get('PORT', 5000)),
        debug=app.debug,
        use_reloader=app.debug,
        # 使用文件路径指定证书和密钥
        keyfile=keyfile_path,
        certfile=certfile_path
    )