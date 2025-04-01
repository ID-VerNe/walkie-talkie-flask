// app/static/js/main.js

/**
 * Main application logic.
 * Initializes modules and orchestrates interactions between UI, Audio, and Socket handlers.
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed. Initializing main script...");

    // --- State ---
    let currentChannel = null;
    let isMuted = false;
    let isSpeaking = false; // Flag to track if the user is currently pressing the talk button
    let audioHandlerReady = false; // Flag to track if AudioHandler initialized successfully
    let isMicEnabled = true;

    // --- Module Initialization ---
    // UI is ready immediately as it just caches DOM elements
    console.log("Initializing UI Handler...");
    // Initialize UI elements to default states
    UIHandler.updateConnectionStatus('未连接', 'disconnected');
    UIHandler.updateChannelDisplay(null);
    UIHandler.enableTalkButton(false);
    UIHandler.updateMuteButton(isMuted);
    UIHandler.updateMicToggleButton(isMicEnabled);
    UIHandler.updateTalkButtonText(isSpeaking);
    UIHandler.hideError();

    // ---> 设置初始界面显示状态 <---
    UIHandler.showJoinSection(true);
    UIHandler.showTalkSection(false);
    UIHandler.showActionsSection(false);

    // Initialize Socket Handler and define callbacks
    console.log("Initializing Socket Handler...");
    SocketHandler.init({
        onConnected: (sid) => {
            console.log("Main: Socket connected with SID:", sid);
            UIHandler.updateConnectionStatus('已连接', 'connected');
            UIHandler.enableJoinButton(true); // Enable join button only when connected
             // If user was trying to join before connect finished, maybe trigger join now?
             // Or just let them click again.
             if (!currentChannel) {
                 UIHandler.showJoinSection(true);
                 UIHandler.showTalkSection(false);
                 UIHandler.showActionsSection(false);
             }
        },
        onDisconnected: (reason) => {
            console.log("Main: Socket disconnected. Reason:", reason);
            UIHandler.updateConnectionStatus('已断开', 'disconnected');
            UIHandler.updateChannelDisplay(null);
            UIHandler.enableJoinButton(false); // Disable join when disconnected
            UIHandler.enableTalkButton(false); // Disable talk when disconnected
            UIHandler.setSpeakerStatus(null, false); // Clear speaker status
            currentChannel = null;
            audioHandlerReady = false;
             isSpeaking = false;
             UIHandler.showJoinSection(true);
            UIHandler.showTalkSection(false);
            UIHandler.showActionsSection(false);
            UIHandler.updateTalkButtonText(false); // 重置按钮文本
            // Assume audio needs re-init if possible context loss
             // Optionally stop audio capture if it was running
             if (AudioHandler.isReady()) { // Check if it was ever initialized
                  AudioHandler.stopCapture();
             }
        },
        onJoinSuccess: (channel) => {
            console.log(`Main: Successfully joined channel ${channel}`);
            currentChannel = channel;
            UIHandler.updateChannelDisplay(channel);
            UIHandler.hideError(); // Hide previous errors
            UIHandler.clearChannelInput(); // Clear input after successful join

            UIHandler.showJoinSection(false); // 隐藏加入区域
            UIHandler.showTalkSection(true);  // 显示对讲区域
            UIHandler.showActionsSection(true); // 显示操作区域

            // --- IMPORTANT: Initialize Audio Handler *after* joining successfully ---
            // This often helps satisfy browser autoplay policies requiring interaction.
            if (!audioHandlerReady) {
                 // Initialize Audio Handler, providing the function to send audio data
                 console.log("Main: Initializing Audio Handler...");

                  // ---> 添加检查 AudioHandler 对象 <---
    console.log("Main: Checking AudioHandler object before calling init:", AudioHandler);
    console.log("Main: Checking AudioHandler.init method before calling init:", AudioHandler?.init); // 使用可选链以防 AudioHandler 未定义
    console.log("Main: Checking typeof AudioHandler.init before calling init:", typeof AudioHandler?.init);

                 try { // ----> 添加一个 try...catch 包裹调用 <----
        console.log("Main: ===> About to call AudioHandler.init(...) <===");
        AudioHandler.init({ onSendAudio: SocketHandler.sendAudioChunk })
            .then(success => {
                console.log("Main: AudioHandler.init() .then() was called. Success:", success);
                if (success) {
                    audioHandlerReady = true;
                    UIHandler.enableTalkButton(isMicEnabled);
                    console.log("Main: Audio Handler initialized successfully.");
                } else {
                    UIHandler.showError("无法初始化音频设备。请检查权限或刷新页面重试。");
                    UIHandler.enableTalkButton(isMicEnabled);
                    console.error("Main: Audio Handler initialization failed.");
                }
            })
            .catch(error => {
                console.error("Main: Audio Handler init() .catch() was called:", error);
                UIHandler.showError("初始化音频时出错。");
                UIHandler.enableTalkButton(false);
            });
        console.log("Main: ===> Call to AudioHandler.init has been issued (after the call line). <==="); // 将这条日志也移入 try 块

    } catch (syncError) { // ----> 捕获同步错误 <----
         console.error("Main: !!! SYNCHRONOUS ERROR occurred during or right after calling AudioHandler.init():", syncError);
         UIHandler.showError("调用音频初始化时发生同步错误。");
    }

} else {
    UIHandler.enableTalkButton(true);
}
             console.log("Main: Call to AudioHandler.init has been issued."); // 这个应该会立即打印
        },
        onJoinError: (message) => {
            console.error(`Main: Failed to join channel: ${message}`);
            UIHandler.showError(message);
            // Optionally disable talk button if join failed
            // UIHandler.enableTalkButton(false);
        },
        onReceiveAudio: (audioData) => {
            // Pass received audio data to AudioHandler for playback
            if (audioHandlerReady) {
                AudioHandler.queueAudioForPlayback(audioData);
            } else {
                 // console.warn("Main: Received audio data, but Audio Handler is not ready.");
            }
        },
        onSpeakerUpdate: (sid, isSpeaking) => {
            console.log(`Main: Speaker update - SID: ${sid}, Speaking: ${isSpeaking}`);
            const mySid = SocketHandler.getSid();
            if (sid !== mySid) { // Don't show yourself as 'speaking' in the status area
                 UIHandler.setSpeakerStatus(sid, isSpeaking);
            } else {
                 // It's me, maybe visually indicate I'm talking on my button?
                 // (already handled by talk button active state)
            }
        }
    });

    // --- Event Listeners for UI Elements ---

    // Join Button Click
    const joinButton = document.getElementById('join-button');
    if(joinButton) {
        joinButton.addEventListener('click', () => {
            console.log("Main: Join button clicked.");
            UIHandler.hideError(); // Hide previous errors on new attempt
            const channelCode = UIHandler.getChannelInputValue();

             // Basic validation (6 digits) - more robust validation might be needed
             if (/^\d{6}$/.test(channelCode)) {
                 // Disable button while joining to prevent double clicks
                 UIHandler.enableJoinButton(false);
                console.log(`Main: Attempting to join channel ${channelCode}...`);
                SocketHandler.joinChannel(channelCode);
                 // Re-enable button in onJoinSuccess or onJoinError callback
                 // (Or just leave it disabled until disconnect?) - Let's re-enable on error.
            } else {
                 UIHandler.showError('请输入有效的 6 位数字频道号码。');
            }
         });
         joinButton.disabled = true; // Initially disable, enable on socket connect
    } else {
        console.error("Initialization Error: Join button not found.");
    }

    // Talk Button Events (Press and Hold)
    const talkButton = document.getElementById('talk-button');
    if (talkButton) {
        talkButton.addEventListener('click', () => {
            // 检查按钮是否可用，以及必要条件
            if (talkButton.disabled || !currentChannel || !audioHandlerReady || !isMicEnabled) {
                console.log("Main: Talk button clicked but conditions not met (disabled, not in channel, audio not ready, or mic off).");
                // 也许给用户一个反馈？
                if (!isMicEnabled) UIHandler.showError("麦克风当前已禁用。");
                else if (!audioHandlerReady) UIHandler.showError("音频设备尚未就绪。");
                else if (!currentChannel) UIHandler.showError("请先加入频道。");
                return;
            }

            // --- 切换逻辑 ---
            if (!isSpeaking) {
                // === 开始说话 ===
                console.log("Main: Toggle -> Start speaking requested.");
                isSpeaking = true; // 更新状态
                UIHandler.updateTalkButtonText(true); // "停止说话"
                UIHandler.setTalkButtonActive(true); // 视觉状态

                // 启动音频捕获 (如果需要) 并发送信号
                AudioHandler.startCapture().then(success => {
                    if (success) {
                        console.log("Main: Audio capture started/resumed, sending start_talking.");
                        SocketHandler.sendStartTalking();
                        // 理论上 capture 应该持续进行，直到下次停止
                    } else {
                        console.error("Main: Failed to start audio capture on talk toggle.");
                        // 启动失败，回滚状态
                        isSpeaking = false;
                        UIHandler.updateTalkButtonText(false);
                        UIHandler.setTalkButtonActive(false);
                        UIHandler.showError("无法启动麦克风。");
                    }
                });

            } else {
                // === 停止说话 ===
                console.log("Main: Toggle -> Stop speaking requested.");
                isSpeaking = false; // 更新状态
                UIHandler.updateTalkButtonText(false); // "开始说话"
                UIHandler.setTalkButtonActive(false); // 取消视觉状态

                // 发送停止信号
                SocketHandler.sendStopTalking();

                // 根据策略决定是否停止捕获
                // 如果希望每次停止说话都释放麦克风资源，取消注释下一行
                AudioHandler.stopCapture();
                console.log("Main: Audio capture stopped on toggle off.");

            }
        });
    } else {
         console.error("Initialization Error: Talk button not found.");
    }



    // Mute Button Click
    const muteButton = document.getElementById('mute-button');
    if(muteButton) {
        muteButton.addEventListener('click', () => {
            isMuted = !isMuted;
            console.log(`Main: Mute toggled to ${isMuted}`);
            UIHandler.updateMuteButton(isMuted);
            if (audioHandlerReady) {
                AudioHandler.setMuted(isMuted);
            }
        });
    } else {
        console.error("Initialization Error: Mute button not found.");
    }

    console.log("Main script initialization complete. Waiting for socket connection...");

    const micToggleButton = document.getElementById('mic-toggle-button');


    if (micToggleButton) {
        micToggleButton.addEventListener('click', () => {
            isMicEnabled = !isMicEnabled;
            console.log(`Main: Mic globally toggled to ${isMicEnabled ? 'ENABLED' : 'DISABLED'}`);
            UIHandler.updateMicToggleButton(isMicEnabled);

            if (!isMicEnabled) {
                // 如果禁用了麦克风
                if (isSpeaking) { // 如果当前正在说话
                    console.log("Main: Microphone disabled while talking. Forcing stop speaking sequence.");
                    isSpeaking = false;
                    UIHandler.updateTalkButtonText(false); // 更新说话按钮文本
                    UIHandler.setTalkButtonActive(false); // 更新说话按钮状态
                    SocketHandler.sendStopTalking();
                    AudioHandler.stopCapture(); // 停止捕获
                }
                UIHandler.enableTalkButton(false); // 禁用说话按钮
            } else {
                // 如果启用了麦克风
                if (SocketHandler.getConnectionStatus() && currentChannel && audioHandlerReady) {
                    UIHandler.enableTalkButton(true);
                    console.log("Main: Microphone enabled. Talk button re-enabled.");
                } else {
                     console.log("Main: Microphone enabled, but talk button remains disabled (not in channel or audio not ready).");
                }
            }
        });
    } else {
        console.error("Initialization Error: Mic toggle button not found.");
    }

    console.log("Main script initialization complete. Waiting for socket connection...");
}); // End DOMContentLoaded listener