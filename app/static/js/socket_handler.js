// app/static/js/socket_handler.js

/**
 * SocketHandler 模块
 * 处理与后端 Socket.IO 服务器的连接和事件交互。
 */
const SocketHandler = (function() {

    let socket = null;          // Socket.IO 实例
    let isConnected = false;    // 连接状态标志
    let currentSid = null;      // 当前客户端的 Session ID
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;


    // 用于存储从 main.js 传入的回调函数
    let eventCallbacks = {
        onConnected: null,
        onDisconnected: null,
        onJoinSuccess: null,
        onJoinError: null,
        onReceiveAudio: null,
        onSpeakerUpdate: null,
        // onUserListUpdate: null, // 如果未来实现用户列表
    };

    // --- 私有方法 ---

    /**
     * 设置 Socket.IO 事件监听器。
     */
    function _setupEventListeners() {
        if (!socket) return;

        // --- 连接与断开事件 ---
        socket.on('connect', () => {
            isConnected = true;
            currentSid = socket.id;
            reconnectAttempts = 0; // 重置重连尝试次数
            console.log(`SocketHandler: Connected to server. SID: ${currentSid}`);
            if (eventCallbacks.onConnected) {
                eventCallbacks.onConnected(currentSid);
            }
        });

        socket.on('disconnect', (reason) => {
            isConnected = false;
            const oldSid = currentSid; // 保留下之前的 SID 用于日志
            currentSid = null;
            console.warn(`SocketHandler: Disconnected from server. Reason: ${reason}. Previous SID: ${oldSid}`);
            if (eventCallbacks.onDisconnected) {
                eventCallbacks.onDisconnected(reason);
            }
            // Socket.IO 默认会自动尝试重连，可以根据 reason 决定是否需要额外处理
            if (reason === 'io server disconnect') {
              // 服务器主动断开连接，可能不会自动重连
              console.log("Server initiated disconnect.");
            } else if (reason === 'io client disconnect') {
                // 客户端主动调用 disconnect()
                console.log("Client initiated disconnect.");
            } else {
                // 其他原因 (网络问题等)，可能会自动重连
                console.log("Attempting reconnection (if configured)...");
            }
        });

         socket.on("connect_error", (err) => {
            console.error(`SocketHandler: Connection error: ${err.message}`);
            // Socket.IO 会自动尝试重连，这里可以添加自定义逻辑，比如达到最大次数后提示用户
            reconnectAttempts++;
            if (reconnectAttempts > maxReconnectAttempts) {
                 console.error("SocketHandler: Max reconnection attempts reached. Giving up.");
                 // 可能需要通知 UI 显示永久性错误
            }
         });

        // --- 自定义事件监听 ---
        // 来自 events.py 的 'join_success'
        socket.on('join_success', (data) => {
            console.log('SocketHandler: Received join_success:', data);
            if (eventCallbacks.onJoinSuccess && data && data.channel) {
                eventCallbacks.onJoinSuccess(data.channel);
            }
        });

        // 来自 events.py 的 'join_error'
        socket.on('join_error', (data) => {
            console.error('SocketHandler: Received join_error:', data);
            if (eventCallbacks.onJoinError && data && data.message) {
                eventCallbacks.onJoinError(data.message);
            }
        });

        // 来自 events.py 的 'audio_chunk'
        socket.on('audio_chunk', (audioData) => {
            // console.log(`SocketHandler: Received audio_chunk (${audioData.byteLength} bytes)`); // Log 会很频繁
            // 确保接收到的是 ArrayBuffer (或 Blob，取决于服务器发送和库的行为)
            if (audioData instanceof ArrayBuffer) {
                 if (eventCallbacks.onReceiveAudio) {
                     eventCallbacks.onReceiveAudio(audioData);
                 }
            } else {
                 console.warn("SocketHandler: Received audio_chunk but data is not an ArrayBuffer.");
                 // 如果收到 Blob, 可能需要转换:
                 // audioData.arrayBuffer().then(buf => {
                 //    if (eventCallbacks.onReceiveAudio) eventCallbacks.onReceiveAudio(buf);
                 // });
            }
        });

        // 来自 events.py 的 'speaker_update'
        socket.on('speaker_update', (data) => {
            console.log('SocketHandler: Received speaker_update:', data);
            if (eventCallbacks.onSpeakerUpdate && data) {
                // 确保数据包含必要字段
                if (typeof data.sid === 'string' && typeof data.speaking === 'boolean') {
                     eventCallbacks.onSpeakerUpdate(data.sid, data.speaking);
                } else {
                     console.warn("SocketHandler: Received invalid speaker_update data format.");
                }
            }
        });

         // Optional: Listen for explicit connection confirmation if needed
         socket.on('connection_confirmed', (data) => {
             if (data && data.sid === currentSid) {
                console.log("SocketHandler: Connection explicitly confirmed by server.");
             }
         });

        console.log("SocketHandler: Event listeners set up.");
    }

    // --- 公开方法 ---
    return {
        /**
         * 初始化 SocketHandler 并建立连接。
         * @param {object} callbacks - 包含事件处理回调函数的对象。
         *  - onConnected: (sid) => void
         *  - onDisconnected: (reason) => void
         *  - onJoinSuccess: (channel) => void
         *  - onJoinError: (message) => void
         *  - onReceiveAudio: (audioData: ArrayBuffer) => void
         *  - onSpeakerUpdate: (sid: string, isSpeaking: boolean) => void
         */
        init: function(callbacks) {
        console.log("SocketHandler Init: Entry point.");
    if (socket) {
        console.warn("SocketHandler: Already initialized.");
        return;
    }
    console.log("SocketHandler Init: Setting callbacks...");
    eventCallbacks = { ...eventCallbacks, ...callbacks };
    console.log("SocketHandler Init: Callbacks set.", eventCallbacks);

        // ---> 将检查移到这里 <---
    console.log("SocketHandler Init (Before Try): Checking 'io' type:", typeof io);
    if (typeof io !== 'function') {
        console.error("SocketHandler Init (Before Try): CRITICAL - 'io' is not a function!");
        UIHandler.showError("内部错误：通信库加载失败[Pre-Try]");
        return; // 阻止后续执行
    }
    // ---> 检查结束 <---
    try {
        // ---> 添加日志 1 <---
        console.log("SocketHandler Init: Entering try block.");

        // ---> 日志点 6 <---
        console.log("SocketHandler Init: About to call io().");

        socket = io({
            reconnection: true,
            reconnectionAttempts: maxReconnectAttempts,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 20000,
        });

        // ---> 添加日志 2 <---
        console.log("SocketHandler Init: io() called. Socket instance:", socket);

        // ---> 日志点 8 <---
        console.log("SocketHandler Init: Setting up event listeners...");
        _setupEventListeners();
        // ---> 日志点 9 <---
        console.log("SocketHandler Init: Event listeners setup complete.");
    } catch (error) {
        // ---> 修改错误日志 <---
        console.error("SocketHandler Init: Error in try block:", error);
        socket = null;
    }
    console.log("SocketHandler Init: Exiting init function.");
},

        /**
         * 主动断开与服务器的连接。
         */
        disconnect: function() {
            if (socket && isConnected) {
                console.log("SocketHandler: Manually disconnecting...");
                socket.disconnect();
            } else {
                 console.log("SocketHandler: Not connected or socket not initialized, cannot disconnect.");
            }
            // isConnected 会在 'disconnect' 事件中被设为 false
        },

        /**
         * 发送加入/切换频道请求。
         * @param {string} channelCode - 6 位数字频道代码。
         */
        joinChannel: function(channelCode) {
            if (socket && isConnected) {
                console.log(`SocketHandler: Sending 'join_channel' event. Channel: ${channelCode}`);
                socket.emit('join_channel', { channel: channelCode });
            } else {
                console.error("SocketHandler: Cannot join channel, not connected.");
                // 可以考虑调用 onJoinError 回调？
                if (eventCallbacks.onJoinError) {
                    eventCallbacks.onJoinError("无法加入频道：未连接到服务器。");
                }
            }
        },

        /**
         * 发送原始 PCM 音频数据块。
         * @param {ArrayBuffer} audioData - 包含音频数据的 ArrayBuffer。
         */
        sendAudioChunk: function(audioData) {
            if (socket && isConnected) {
                if (audioData instanceof ArrayBuffer && audioData.byteLength > 0) {
                     // console.log(`SocketHandler: Sending 'audio_chunk' event (${audioData.byteLength} bytes)`); // Log 会很频繁
                     socket.emit('audio_chunk', audioData);
                 } else {
                     console.warn("SocketHandler: Attempted to send invalid audio data (not ArrayBuffer or empty).");
                 }
            } else {
                // 不建议在此处记录错误，因为用户未连接时此函数可能仍被调用
                // console.error("SocketHandler: Cannot send audio chunk, not connected.");
            }
        },

        /**
         * 发送开始说话信号。
         */
        sendStartTalking: function() {
            if (socket && isConnected) {
                console.log("SocketHandler: Sending 'start_talking' event.");
                socket.emit('start_talking');
            } else {
                // console.error("SocketHandler: Cannot send start_talking, not connected.");
            }
        },

        /**
         * 发送停止说话信号。
         */
        sendStopTalking: function() {
            if (socket && isConnected) {
                console.log("SocketHandler: Sending 'stop_talking' event.");
                socket.emit('stop_talking');
            } else {
                 // console.error("SocketHandler: Cannot send stop_talking, not connected.");
            }
        },

        /**
         * 获取当前的 Socket.IO Session ID。
         * @returns {string|null} 当前 SID 或 null (如果未连接)。
         */
        getSid: function() {
            return currentSid;
        },

        /**
         * 获取当前连接状态。
         * @returns {boolean} true 表示已连接, false 表示未连接。
         */
        getConnectionStatus: function() {
            return isConnected;
        }
    };

})(); // Execute the IIFE