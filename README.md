# 网页对讲机 (Flask Web Walkie-Talkie)

这是一个使用 Python Flask 和 Socket.IO 构建的简单网页版对讲机应用。用户可以通过输入相同的 6 位数频道代码进入同一个“频道”，并在频道内进行实时语音交流。

This is a simple web-based walkie-talkie application built with Python Flask and Socket.IO. Users can join the same "channel" by entering an identical 6-digit channel code and communicate in real-time voice within that channel.

## 功能特性 (Features)

*   **频道系统:** 使用 6 位数字密码创建或加入频道。
*   **实时语音:** 同一频道内用户可以进行实时语音对讲。
*   **无需注册:** 无需复杂的用户名或密码注册。
*   **一键通话:** 点击按钮开始说话，再次点击停止说话。
*   **自动播放:** 自动播放来自同频道其他用户的语音。
*   **静音功能:** 可以静音收听到的音频。
*   **麦克风开关:** 可以独立于通话按钮全局开启或关闭麦克风。
*   **状态显示:** 显示连接状态、当前频道和谁在说话。
*   **HTTPS 支持:** 使用自签名证书支持 HTTPS，满足浏览器麦克风权限要求。

## 技术栈 (Technology Stack)

*   **后端 (Backend):**
    *   Python 3.x
    *   Flask
    *   Flask-SocketIO
    *   eventlet (或 gevent, 根据配置)
    *   python-dotenv
    *   pyOpenSSL (用于生成开发证书)
*   **前端 (Frontend):**
    *   HTML5
    *   CSS3
    *   JavaScript (原生)
    *   Web Audio API (`getUserMedia`, `AudioContext`)
    *   Socket.IO Client Library

## 安装与设置 (Setup and Installation)

1.  **先决条件 (Prerequisites):**
    *   Python 3.7+
    *   pip (Python 包管理器)
    *   Git
    *   OpenSSL (用于生成 SSL 证书 - Linux/macOS 通常自带，Windows 需要安装)

2.  **克隆仓库 (Clone the Repository):**
    ```bash
    git clone https://github.com/ID-VerNe/walkie-talkie-flask.git
    cd walkie-talkie-flask
    ```

3.  **创建并激活虚拟环境 (Create and Activate Virtual Environment):**
    ```bash
    # Windows
    python -m venv venv
    venv\Scripts\activate.bat
    # Linux / macOS
    python3 -m venv venv
    source venv/bin/activate
    ```

4.  **安装依赖 (Install Dependencies):**
    ```bash
    pip install -r requirements.txt
    ```
    *(如果 `requirements.txt` 文件不是最新的，请先运行 `pip freeze > requirements.txt` 生成)*

5.  **生成 SSL 证书和私钥 (Generate SSL Certificate and Key):**
    *   在项目根目录下运行以下命令（需要安装 OpenSSL）：
        ```bash
        openssl req -x509 -newkey rsa:4096 -nodes -out cert.pem -keyout key.pem -days 365
        ```
    *   根据提示输入信息（可随意填写或直接回车）。
    *   **重要:** 将 `key.pem` 添加到你的 `.gitignore` 文件中，不要将私钥提交到版本控制系统。

6.  **创建环境变量文件 (Create Environment File):**
    *   在项目根目录下创建一个名为 `.env` 的文件。
    *   至少添加以下内容，并将 `your_super_secret_and_random_string_here` 替换为一个真实的、随机的、保密的字符串：
        ```dotenv
        SECRET_KEY=your_super_secret_and_random_string_here
        FLASK_CONFIG=development # 或 production
        # PORT=5000 # 可选，设置端口
        # ASYNC_MODE=eventlet # 可选，设置异步模式
        ```

## 运行应用 (Running the Application)

1.  **确保虚拟环境已激活。**
2.  **运行启动脚本:**
    ```bash
    python run.py
    ```
3.  服务器现在应该启动并在 `https://0.0.0.0:5000` (或你配置的端口) 上监听。

## 使用方法 (Usage)

1.  在支持 Web Audio API 的现代浏览器（如 Chrome, Firefox）中打开 `https://<你的电脑IP地址>:5000`。
    *   **注意:** 必须使用 `https://` 协议。
    *   由于使用的是自签名证书，浏览器会显示安全警告。你需要接受风险并选择“继续前往”（Proceed）。手机和电脑都需要进行此操作。
2.  页面加载后，连接状态应显示为“已连接”。
3.  在输入框中输入一个 6 位的数字频道号。
4.  点击“加入/切换”按钮。
5.  成功加入后，“当前频道”会更新，并且“对讲”和“操作”区域会显示出来，“开始说话”按钮变为可用。
6.  点击“开始说话”按钮开始传输你的声音，按钮文本变为“停止说话”。
7.  再次点击“停止说话”按钮停止传输。
8.  使用“静音”按钮来切换是否播放收到的音频。
9.  使用“关闭/开启麦克风”按钮来全局控制麦克风是否允许捕获。

## 注意事项 (Important Notes)

*   **HTTPS 是必需的:** 浏览器要求通过安全的 HTTPS 连接才能访问麦克风 (`getUserMedia`)。本项目使用自签名证书仅用于开发和测试。在生产环境中，你应该使用由受信任的证书颁发机构 (CA) 签发的真实 SSL 证书。
*   **带宽:** 本项目当前配置为传输**未压缩**的 PCM 音频数据 (16kHz, 32bit Float, Mono)。这意味着每个说话的用户大约需要 **0.5 Mbps 的上行带宽**。请确保你的服务器（特别是上行带宽）和客户端的网络条件能够支持。对于带宽受限的环境，建议后续集成 Opus 等音频编解码器进行压缩。
*   **浏览器兼容性:** 主要在现代桌面版 Chrome 和 Firefox 测试。移动端浏览器（特别是 iOS Safari）对 Web Audio API 和 `getUserMedia` 的支持和限制可能有所不同。

## 部署 (Deployment)

对于生产环境部署，建议：

1.  使用生产级的 WSGI 服务器，如 Gunicorn (配合 eventlet 或 gevent worker) 或 uWSGI。
2.  设置 `FLASK_CONFIG=production` 环境变量。
3.  获取并配置真实的 SSL/TLS 证书（例如使用 Let's Encrypt）。
4.  在 Flask 应用前面部署一个反向代理服务器（如 Nginx 或 Caddy）来处理静态文件、HTTPS 终止和 WebSocket 代理。

## 许可证 (License)

[Apache-2.0 license](LICENSE)
