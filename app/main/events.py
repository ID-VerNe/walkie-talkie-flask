# app/main/events.py

import logging
from flask import request
from flask_socketio import emit, join_room, leave_room
# 我们假设 socketio 实例在 app/__init__.py 中创建并可以通过 app.extensions 访问
# 或者直接从 app 包导入 (需要确保 __init__.py 中初始化了它并可供导入)
from .. import socketio  # 使用相对导入从父包(app)导入 socketio 实例

# --- 状态管理 ---
# 存储用户 SID 和其所在频道的关系: {sid: channel_code}
user_channels = {}
# 存储每个频道当前有哪些用户 SID: {channel_code: {sid1, sid2, ...}}
channel_users = {}
# 存储每个频道当前的说话者 SID: {channel_code: speaker_sid}
# (简化模型，假设一个频道同一时间只有一人说话)
current_speakers = {}

# 设置日志记录
logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

# --- SocketIO 事件处理 ---

@socketio.on('connect')
def handle_connect():
    """处理新的 SocketIO 连接。"""
    sid = request.sid
    log.info(f'Client connected: {sid}')
    # 可选: 发送一个确认连接的消息
    emit('connection_confirmed', {'sid': sid})

@socketio.on('disconnect')
def handle_disconnect():
    """处理 SocketIO 连接断开。"""
    sid = request.sid
    log.info(f'Client disconnected: {sid}')

    # --- 清理用户状态 ---
    channel_code = user_channels.pop(sid, None)
    if channel_code:
        # 从 SocketIO 房间移除
        # leave_room 可能在 SocketIO 内部自动处理，但显式调用有助于状态同步
        leave_room(channel_code, sid=sid)

        # 从我们的频道用户集合中移除
        if channel_code in channel_users and sid in channel_users[channel_code]:
            channel_users[channel_code].remove(sid)
            log.info(f'Removed {sid} from channel_users[{channel_code}]')

            # 检查频道是否变空
            if not channel_users[channel_code]:
                log.info(f'Channel {channel_code} is now empty. Removing channel state.')
                del channel_users[channel_code]
                # 如果频道空了，也清除当前说话者信息
                current_speakers.pop(channel_code, None)
            else:
                # 如果断开连接的是当前说话者，通知其他人他已停止说话
                if current_speakers.get(channel_code) == sid:
                    log.info(f'Speaker {sid} disconnected from {channel_code}. Notifying others.')
                    current_speakers.pop(channel_code, None)
                    # 广播给房间内剩余的人
                    emit('speaker_update', {'sid': sid, 'speaking': False, 'channel': channel_code}, room=channel_code)

        log.info(f'Client {sid} cleaned up from channel {channel_code}')
    else:
        log.info(f'Disconnected client {sid} was not in any tracked channel.')

@socketio.on('join_channel')
def handle_join_channel(data):
    """处理客户端加入频道的请求。"""
    sid = request.sid
    if not data or 'channel' not in data:
        log.warning(f'Invalid join request from {sid}: Missing data or channel key.')
        emit('join_error', {'message': '无效的请求格式'})
        return

    channel_code = str(data['channel']).strip() # 确保是字符串并去除首尾空格

    # --- 验证频道代码格式 ---
    if not channel_code.isdigit() or len(channel_code) != 6:
        log.warning(f'Invalid channel code format from {sid}: {channel_code}')
        emit('join_error', {'message': '无效的频道号码 (需要6位数字)'})
        return

    # --- 处理用户切换频道 ---
    old_channel = user_channels.get(sid)
    if old_channel and old_channel != channel_code:
        log.info(f'Client {sid} switching from channel {old_channel} to {channel_code}')
        # 离开旧房间和状态管理
        leave_room(old_channel, sid=sid)
        if old_channel in channel_users and sid in channel_users[old_channel]:
            channel_users[old_channel].remove(sid)
            if not channel_users[old_channel]:
                del channel_users[old_channel]
                current_speakers.pop(old_channel, None)
            elif current_speakers.get(old_channel) == sid:
                # 如果切换时是旧频道的说话者，通知旧频道他停止了
                current_speakers.pop(old_channel, None)
                emit('speaker_update', {'sid': sid, 'speaking': False, 'channel': old_channel}, room=old_channel, include_self=False) #通知旧频道的人

    # --- 加入新频道 ---
    log.info(f'Client {sid} attempting to join channel {channel_code}')
    join_room(channel_code, sid=sid)

    # 更新状态
    user_channels[sid] = channel_code
    if channel_code not in channel_users:
        channel_users[channel_code] = set()
    channel_users[channel_code].add(sid)

    log.info(f'Client {sid} successfully joined channel {channel_code}. Current users: {channel_users[channel_code]}')

    # --- 通知客户端加入成功 ---
    emit('join_success', {'channel': channel_code})

    # 可选: 向房间内广播当前用户列表 (如果前端需要)
    # emit('user_list_update', {'users': list(channel_users[channel_code])}, room=channel_code)

    # 可选: 如果频道内当前有人在说话，告诉新加入者
    current_speaker_sid = current_speakers.get(channel_code)
    if current_speaker_sid:
        emit('speaker_update', {'sid': current_speaker_sid, 'speaking': True, 'channel': channel_code}) # 只发给刚加入的这个 sid

@socketio.on('audio_chunk')
def handle_audio_chunk(data):
    """处理客户端发送的音频数据块。"""
    sid = request.sid
    channel_code = user_channels.get(sid)

    if not channel_code:
        log.warning(f'Received audio from {sid} but user is not in a channel.')
        return

    # 检查发送者是否是当前记录的该频道说话者
    # （可选，增加一层校验，防止非说话者意外发送音频被广播）
    # if current_speakers.get(channel_code) != sid:
    #     log.warning(f'Received audio from {sid} in {channel_code}, but they are not the current speaker.')
    #     return

    # --- 将音频数据广播给同频道其他用户 ---
    # log.debug(f'Relaying audio from {sid} in channel {channel_code}, size: {len(data)} bytes')
    emit('audio_chunk', data, room=channel_code, include_self=False) # include_self=False 避免发回给自己

@socketio.on('start_talking')
def handle_start_talking():
    """处理客户端开始说话的信令。"""
    sid = request.sid
    channel_code = user_channels.get(sid)

    if not channel_code:
        log.warning(f'Received start_talking from {sid} but user is not in a channel.')
        return

    # 简单处理：后一个说话者会覆盖前一个（如果允许抢麦）
    # 或者可以增加逻辑，例如只有在无人说话时才能开始说
    # if channel_code in current_speakers and current_speakers[channel_code] != sid:
    #     log.info(f'{sid} tries to talk in {channel_code}, but {current_speakers[channel_code]} is already speaking.')
    #     # 可以选择忽略，或者发送一个 "频道正忙" 的消息给 sid
    #     return

    log.info(f'Client {sid} started talking in channel {channel_code}')
    current_speakers[channel_code] = sid

    # --- 广播说话状态更新给同频道其他人 ---
    emit('speaker_update', {'sid': sid, 'speaking': True, 'channel': channel_code}, room=channel_code, include_self=False)

@socketio.on('stop_talking')
def handle_stop_talking():
    """处理客户端停止说话的信令。"""
    sid = request.sid
    channel_code = user_channels.get(sid)

    if not channel_code:
        # 用户可能在离开频道前发送了 stop_talking
        log.info(f'Received stop_talking from {sid} possibly after leaving channel.')
        return

    # 只有当该用户确实是当前记录的说话者时，才更新状态并广播
    if current_speakers.get(channel_code) == sid:
        log.info(f'Client {sid} stopped talking in channel {channel_code}')
        current_speakers.pop(channel_code, None) # 从说话者记录中移除

        # --- 广播说话状态更新给同频道其他人 ---
        emit('speaker_update', {'sid': sid, 'speaking': False, 'channel': channel_code}, room=channel_code, include_self=False)
    else:
        # 可能收到了延迟的 stop_talking 信号，或者状态已更新
        log.info(f'Received stop_talking from {sid} in {channel_code}, but they were not the recorded speaker.')

# --- 辅助函数 (如果需要可以在这里添加) ---