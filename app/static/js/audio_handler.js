// app/static/js/audio_handler.js
// Version: Corrected for Syntax Errors (Extra Brace Removed)

/**
 * AudioHandler 模块 (RAW PCM Mode @ 16kHz)
 * 负责处理所有音频相关的任务：
 * - 获取麦克风权限 (请求 16kHz)
 * - 使用 Web Audio API 捕获、处理和播放原始 PCM 音频数据
 * - 直接发送和接收 Float32Array 的 ArrayBuffer
 */
const AudioHandler = (function() {

    // --- Configuration & State ---
    const TARGET_SAMPLE_RATE = 16000; // 目标采样率
    const CHANNELS = 1; // 单声道
    const SCRIPT_PROCESSOR_BUFFER_SIZE = 2048; // @ 16kHz: ~128ms latency buffer

    let audioContext = null;
    let actualSampleRate = null; // 存储 AudioContext 实际使用的采样率
    let microphoneStream = null;
    let audioSourceNode = null;
    let processorNode = null;
    let isCapturing = false;
    let isInitialized = false;
    let isMuted = false;

    let sendAudioCallback = null; // Callback to send audio data

    const audioQueue = []; // Playback queue
    let isPlaying = false; // Playback loop flag

    // --- Private Methods ---

    function _onAudioProcess(event) {
        if (!isCapturing || !sendAudioCallback) {
            return;
        }
        try {
            const pcmData = event.inputBuffer.getChannelData(0);
            if (pcmData && pcmData.length > 0) {
                const pcmDataBufferCopy = pcmData.buffer.slice(0);
                sendAudioCallback(pcmDataBufferCopy);
            }
        } catch (error) {
            console.error("AudioHandler: Error processing audio:", error);
        }
    }

    async function _tryPlayFromQueue() {
        if (isPlaying || isMuted || audioQueue.length === 0 || !audioContext || !actualSampleRate) {
            isPlaying = false;
            return;
        }

        isPlaying = true;
        const rawPcmArrayBuffer = audioQueue.shift();

        try {
            if (!(rawPcmArrayBuffer instanceof ArrayBuffer) || rawPcmArrayBuffer.byteLength === 0) {
                console.warn("AudioHandler (RAW): Received invalid or empty ArrayBuffer data. Skipping.");
                isPlaying = false;
                _requestNextFrame();
                return;
            }

            const pcmData = new Float32Array(rawPcmArrayBuffer);

            if (pcmData.length === 0) {
                 console.warn("AudioHandler (RAW): PCM data length is zero after conversion. Skipping.");
                 isPlaying = false;
                 _requestNextFrame();
                 return;
            }

            const audioBuffer = audioContext.createBuffer(
                CHANNELS,
                pcmData.length,
                actualSampleRate
            );

            try {
                 audioBuffer.copyToChannel(pcmData, 0);
            } catch (copyError) {
                 console.error(`AudioHandler (RAW): Error copying data to AudioBuffer (length: ${pcmData.length}, buffer length: ${audioBuffer.length}).`, copyError);
                 isPlaying = false;
                 _requestNextFrame();
                 return;
            }

            const sourceNode = audioContext.createBufferSource();
            sourceNode.buffer = audioBuffer;
            sourceNode.connect(audioContext.destination);
            sourceNode.onended = () => {
                setTimeout(_requestNextFrame, 0);
            };
            sourceNode.start();

        } catch (error) {
            console.error("AudioHandler (RAW): Error decoding or playing audio:", error);
            isPlaying = false;
        }
    }

    function _requestNextFrame() {
        isPlaying = false;
        requestAnimationFrame(_tryPlayFromQueue);
    }

    // --- Public Methods ---
    // This is the object returned by the IIFE
    return {
        /**
         * Initializes the AudioHandler (RAW PCM Mode).
         */
        init: async function(config) {
            // --- Initialization Logic (same as before) ---
            console.log("AudioHandler Init: Entry point (Corrected Code)."); // Added marker
            if (isInitialized) {
                console.warn("AudioHandler: Already initialized.");
                return true;
            }
            if (!config || typeof config.onSendAudio !== 'function') {
                 console.error("AudioHandler: Initialization requires config with onSendAudio callback.");
                 return false;
            }

             console.log("AudioHandler: Initializing (RAW PCM Mode)...");
             sendAudioCallback = config.onSendAudio;

            try {
                // Check APIs
                console.log("AudioHandler Init: Checking API support...");
                window.AudioContext = window.AudioContext || window.webkitAudioContext;
                if (!window.AudioContext) {
                    console.error("AudioHandler: Web Audio API not supported.");
                    return false;
                }
                if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                     console.error("AudioHandler: getUserMedia not supported.");
                     return false;
                }
                console.log("AudioHandler Init: API support checked.");

                // Create Context
                console.log("AudioHandler Init: Creating AudioContext...");
                try {
                    audioContext = new AudioContext({ sampleRate: TARGET_SAMPLE_RATE });
                    actualSampleRate = audioContext.sampleRate;
                } catch (contextError) {
                     console.error("AudioHandler Init: FAILED to create AudioContext!", contextError);
                     throw contextError;
                }
                console.log(`AudioHandler Init: AudioContext created. Actual SR: ${actualSampleRate}, State: ${audioContext.state}`);

                // Resume Context if needed
                console.log("AudioHandler Init: Checking AudioContext state for resume...");
                if (audioContext.state === 'suspended') {
                    console.log("AudioHandler Init: AudioContext is suspended, attempting to resume...");
                    try {
                        const resumePromise = audioContext.resume();
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('AudioContext resume timed out after 3 seconds')), 3000) // 3秒超时
        );
                console.log("AudioHandler Init: Waiting for resume() or timeout...");
        // 等待 resume() 或者超时先完成
        await Promise.race([resumePromise, timeoutPromise]);

        if (audioContext.state !== 'running') {
            console.warn("AudioHandler Init: resume() completed but state is not 'running'. Actual state:", audioContext.state);
            // 可以选择视为失败
            throw new Error(`AudioContext state is ${audioContext.state} after resume.`);
        }
        console.log("AudioHandler Init: AudioContext resume() finished successfully. New state:", audioContext.state);

                    } catch (resumeError) {
                        console.error("AudioHandler Init: Error during audioContext.resume():", resumeError);
                        throw resumeError;
                    }
                } else {
                    console.log("AudioHandler Init: AudioContext state is not suspended, no resume needed.");
                }
                console.log("AudioHandler Init: State checked/resumed process finished.");

                isInitialized = true;
                console.log("AudioHandler Init: Initialization successful. Returning true.");
                return true; // Resolve promise with true

            } catch (error) {
                console.error("AudioHandler Init: Initialization failed in outer try-catch:", error);
                if (audioContext) {
                    try { audioContext.close(); } catch(e){}
                    audioContext = null;
                }
                isInitialized = false;
                actualSampleRate = null;
                return false; // Resolve promise with false
            }
        }, // <--- Comma after init method definition

        /**
         * Starts capturing audio from the microphone.
         */
        startCapture: async function() {
            // --- Start Capture Logic (same as before) ---
             console.log("AudioHandler StartCapture: Entry point."); // Added Marker
            if (!isInitialized) {
                console.error("AudioHandler: Not initialized. Call init() first.");
                return false;
            }
            if (isCapturing) {
                console.warn("AudioHandler: Already capturing.");
                return true;
            }
            console.log("AudioHandler: Starting audio capture (RAW PCM Mode)...");
             if (audioContext && audioContext.state === 'suspended') {
                try { await audioContext.resume(); } catch(e){ console.warn("AudioContext resume failed silently", e); }
             }
            try {
                microphoneStream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        sampleRate: TARGET_SAMPLE_RATE,
                        channelCount: CHANNELS,
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                    }
                });
                console.log("AudioHandler: Microphone access granted.");
                const audioTracks = microphoneStream.getAudioTracks();
                if (audioTracks.length > 0) {
                    const settings = audioTracks[0].getSettings();
                    console.log(`AudioHandler: Actual microphone track settings: SR=${settings.sampleRate}, Channels=${settings.channelCount}`);
                }
                audioSourceNode = audioContext.createMediaStreamSource(microphoneStream);
                processorNode = audioContext.createScriptProcessor(SCRIPT_PROCESSOR_BUFFER_SIZE, CHANNELS, CHANNELS);
                processorNode.onaudioprocess = _onAudioProcess;
                audioSourceNode.connect(processorNode);
                processorNode.connect(audioContext.destination);
                isCapturing = true;
                console.log("AudioHandler: Audio capture started.");
                return true; // Resolve promise with true
            } catch (error) {
                console.error("AudioHandler: Failed to start audio capture:", error);
                if (microphoneStream) {
                    microphoneStream.getTracks().forEach(track => track.stop());
                    microphoneStream = null;
                }
                if (audioSourceNode) { try{ audioSourceNode.disconnect(); } catch(e){} }
                if (processorNode) { try{ processorNode.disconnect(); } catch(e){} }
                audioSourceNode = null;
                processorNode = null;
                isCapturing = false;
                return false; // Resolve promise with false
            }
        }, // <--- Comma after startCapture definition

        /**
         * Stops capturing audio from the microphone.
         */
        stopCapture: function() {
            // --- Stop Capture Logic (same as before) ---
            if (!isCapturing) {
                return;
            }
            console.log("AudioHandler: Stopping audio capture...");
            isCapturing = false;
            if (microphoneStream) {
                microphoneStream.getTracks().forEach(track => track.stop());
                microphoneStream = null;
                console.log("AudioHandler: Microphone stream stopped.");
            }
             if (processorNode) {
                 try {
                    processorNode.disconnect();
                    processorNode.onaudioprocess = null;
                 } catch(e) {console.warn("Error disconnecting processor", e);}
                 processorNode = null;
                 console.log("AudioHandler: Processor node disconnected.");
             }
             if (audioSourceNode) {
                 try { audioSourceNode.disconnect(); } catch(e) {console.warn("Error disconnecting source", e);}
                 audioSourceNode = null;
                 console.log("AudioHandler: Source node disconnected.");
             }
            console.log("AudioHandler: Audio capture stopped.");
        }, // <--- Comma after stopCapture definition

        /**
         * Sets the muted state for playback.
         */
        setMuted: function(mutedState) {
            isMuted = mutedState;
            console.log(`AudioHandler: Mute state set to ${isMuted}`);
            if (!isMuted && !isPlaying && audioQueue.length > 0) {
                 _requestNextFrame();
            }
        }, // <--- Comma after setMuted definition

        /**
         * Called externally to queue received audio data.
         */
        queueAudioForPlayback: function(rawPcmArrayBuffer) {
            // --- Queue Audio Logic (Same as before) ---
            if (!isInitialized) {
                console.warn("AudioHandler: Received audio but not initialized. Skipping.");
                return;
            }
            if (!(rawPcmArrayBuffer instanceof ArrayBuffer) || rawPcmArrayBuffer.byteLength === 0) {
                 console.warn("AudioHandler (RAW): Received invalid or empty ArrayBuffer. Skipping.");
                 return;
             }
            audioQueue.push(rawPcmArrayBuffer);
            if (!isPlaying && !isMuted) {
                _requestNextFrame();
            }
        }, // <--- Comma after queueAudioForPlayback definition

        /**
         * Checks if the AudioHandler is initialized and ready.
         */
        isReady: function() {
            return isInitialized;
        }, // <--- Comma after isReady definition

        /**
         * Gets the actual sample rate the AudioContext is running at.
         */
        getSampleRate: function() {
            return actualSampleRate;
        } // <--- No comma after the LAST method definition

    }; // End of the returned object literal

})(); // Execute the IIFE to define AudioHandler