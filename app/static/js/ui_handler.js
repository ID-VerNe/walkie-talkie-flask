// app/static/js/ui_handler.js

/**
 * UIHandler 模块
 * 封装所有与界面元素更新相关的操作。
 */
const UIHandler = (function() {

    // --- 缓存 DOM 元素引用 ---
    // 状态区域
    const connectionStatusSpan = document.querySelector('#connection-status .status-text');
    const channelDisplaySpan = document.querySelector('#channel-display .status-text');
    const speakerStatusP = document.getElementById('speaker-status');
    const speakerNameSpan = document.querySelector('#speaker-status .speaker-name');

    // 控制区域
    const channelInput = document.getElementById('channel-input');
    const joinButton = document.getElementById('join-button');
    const errorMessageP = document.getElementById('error-message');

    // 对讲区域
    const talkButton = document.getElementById('talk-button');

    // 操作区域
    const muteButton = document.getElementById('mute-button');
    const micToggleButton = document.getElementById('mic-toggle-button');


    // ---> 缓存需要控制显示/隐藏的区域 <---
    const controlsArea = document.getElementById('controls-area'); // 加入频道区域
    const talkArea = document.getElementById('talk-area');         // 对讲区域
    const actionsArea = document.getElementById('actions-area');    // 操作区域

    // --- 私有辅助函数 ---
    /**
     * 移除所有状态相关的 CSS 类
     * @param {HTMLElement} element - 需要操作的元素
     */
    function _removeStatusClasses(element) {
        element.classList.remove('status-connected', 'status-disconnected', 'status-connecting', 'status-error');
    }

    // --- 公开方法 ---
    return {
        /**
         * 更新连接状态显示。
         * @param {string} statusText - 显示的文本 (e.g., "已连接", "连接中", "已断开", "错误").
         * @param {'connected'|'disconnected'|'connecting'|'error'} statusType - 用于设置 CSS 类的状态类型。
         */
        updateConnectionStatus: function(statusText, statusType) {
            if (!connectionStatusSpan) return;
            connectionStatusSpan.textContent = statusText;
            _removeStatusClasses(connectionStatusSpan); // 移除旧的状态类
            connectionStatusSpan.classList.add(`status-${statusType}`); // 添加新的状态类
            console.log(`UI: Connection status updated - ${statusText} (${statusType})`);
        },

        /**
         * 更新当前频道显示。
         * @param {string|null} channel - 频道号码，或 null 表示未加入。
         */
        updateChannelDisplay: function(channel) {
            if (!channelDisplaySpan) return;
            channelDisplaySpan.textContent = channel ? channel : '无';
            console.log(`UI: Channel display updated - ${channel || 'None'}`);
        },

        /**
         * 更新说话者状态显示。
         * @param {string|null} speakerSid - 正在说话者的 SID，或 null。
         * @param {boolean} isSpeaking - 是否正在说话。
         */
        setSpeakerStatus: function(speakerSid, isSpeaking) {
            if (!speakerStatusP || !speakerNameSpan) return;

            if (isSpeaking && speakerSid) {
                // 可以考虑在未来映射 SID 到更友好的名称
                speakerNameSpan.textContent = speakerSid;
                speakerStatusP.style.display = 'block'; // 或 'inline'/'inline-block' 取决于布局
                console.log(`UI: Speaker status updated - ${speakerSid} is speaking`);
            } else {
                // 如果当前显示的就是这个 SID 停止说话，或者强制隐藏
                // 简单的处理：只要 isSpeaking 为 false 就隐藏
                speakerNameSpan.textContent = '无';
                speakerStatusP.style.display = 'none';
                // 如果需要显示 "无人说话", 则不隐藏 P 标签，只改文字
                // speakerStatusP.style.display = 'block';
                // speakerNameSpan.textContent = '无人说话';

                // 只有在明确是某个用户停止说话时才打印日志
                if (speakerSid) {
                     console.log(`UI: Speaker status updated - ${speakerSid} stopped speaking`);
                } else {
                     console.log(`UI: Speaker status cleared`);
                }

            }
        },

        /**
         * 显示加入频道的错误消息。
         * @param {string} message - 要显示的错误信息。
         */
        showError: function(message) {
            if (!errorMessageP) return;
            errorMessageP.textContent = message;
            errorMessageP.style.display = 'block';
            console.error(`UI Error: ${message}`);
        },

        /**
         * 隐藏加入频道的错误消息。
         */
        hideError: function() {
            if (!errorMessageP) return;
            errorMessageP.textContent = '';
            errorMessageP.style.display = 'none';
        },

        /**
         * 启用或禁用“加入/切换”按钮。
         * @param {boolean} enable - true 表示启用, false 表示禁用。
         */
        enableJoinButton: function(enable) {
            if (!joinButton) return;
            joinButton.disabled = !enable;
            console.log(`UI: Join button ${enable ? 'enabled' : 'disabled'}`);
        },

        /**
         * 启用或禁用“说话”按钮（整体是否可用）。
         * @param {boolean} enable - true 表示启用, false 表示禁用。
         */
        enableTalkButton: function(enable) {
            if (!talkButton) return;
            talkButton.disabled = !enable;
             console.log(`UI: Talk button ${enable ? 'enabled' : 'disabled'}`);
        },

        /**
         * 设置“说话”按钮的文本。
         * @param {boolean} isTalking - 当前是否处于“正在说话”状态。
         */
        updateTalkButtonText: function(isTalking) {
           if (!talkButton) return;
           talkButton.textContent = isTalking ? '停止说话' : '开始说话';
             console.log(`UI: Talk button text updated to "${talkButton.textContent}"`);
        },


        /**
         * 设置“说话”按钮的视觉活动状态（表示正在说话）。
         * @param {boolean} isActive - true 表示设为活动状态 (正在说话), false 取消活动状态。
         */
        setTalkButtonActive: function(isActive) {
            if (!talkButton) return;
            if (isActive) {
                talkButton.classList.add('active'); // 使用 .active 类表示正在说话
            } else {
                talkButton.classList.remove('active');
            }
            console.log(`UI: Talk button active state (isTalking) set to ${isActive}`);
        },

        /**
         * 更新静音按钮的文本和状态。
         * @param {boolean} isMuted - 当前是否处于静音状态。
         */
        updateMuteButton: function(isMuted) {
            if (!muteButton) return;
            muteButton.textContent = isMuted ? '取消静音' : '静音';
            // 可以添加 .muted 类来改变样式
            if (isMuted) {
                muteButton.classList.add('muted');
            } else {
                muteButton.classList.remove('muted');
            }
             console.log(`UI: Mute button updated - isMuted: ${isMuted}`);
        },


        /**
         * 更新麦克风开关按钮的文本和状态。
         * @param {boolean} isEnabled - 当前麦克风是否启用。
         */
        updateMicToggleButton: function(isEnabled) {
            if (!micToggleButton) return;
            micToggleButton.textContent = isEnabled ? '关闭麦克风' : '开启麦克风';
            if (isEnabled) {
                micToggleButton.classList.remove('mic-disabled');
            } else {
                micToggleButton.classList.add('mic-disabled');
            }
            console.log(`UI: Mic toggle button updated - isEnabled: ${isEnabled}`);
        }, // <--- 注意这里加逗号

        /**
         * 清空频道输入框的内容。
         */
        clearChannelInput: function() {
            if (!channelInput) return;
            channelInput.value = '';
             console.log(`UI: Channel input cleared`);
        },

        /**
         * 获取频道输入框的值。
         * @returns {string} 输入框的值。
         */
        getChannelInputValue: function() {
            return channelInput ? channelInput.value.trim() : '';
        },

        /**
         * 控制“加入频道”区域的显示。
         * @param {boolean} show - true 显示, false 隐藏。
         */
        showJoinSection: function(show) {
            if (controlsArea) {
                controlsArea.style.display = show ? 'block' : 'none'; // 假设默认是 block
                console.log(`UI: Join section display set to ${show ? 'block' : 'none'}`);
            }
        },

        /**
         * 控制“对讲”区域的显示。
         * @param {boolean} show - true 显示, false 隐藏。
         */
        showTalkSection: function(show) {
            if (talkArea) {
                talkArea.style.display = show ? 'block' : 'none';
                console.log(`UI: Talk section display set to ${show ? 'block' : 'none'}`);
            }
        },

        /**
         * 控制“操作”区域的显示。
         * @param {boolean} show - true 显示, false 隐藏。
         */
        showActionsSection: function(show) {
            if (actionsArea) {
                actionsArea.style.display = show ? 'block' : 'none';
                console.log(`UI: Actions section display set to ${show ? 'block' : 'none'}`);
            }
        }
    };

})(); // 立即执行函数表达式 (IIFE)，封装作用域

// --- (可选) 初始化 UI 状态 ---
// 可以在 main.js 中调用这些来进行初始化
// UIHandler.updateConnectionStatus('未连接', 'disconnected');
// UIHandler.updateChannelDisplay(null);
// UIHandler.enableTalkButton(false); // 默认禁用 Talk 按钮
// UIHandler.updateMuteButton(false); // 默认非静音状态