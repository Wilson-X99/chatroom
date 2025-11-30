# 导入必要的模块
import json
import os
import re
import socket  # 添加socket模块用于异常处理
import urllib.request
import urllib.error
import ssl  # 添加SSL支持以处理HTTPS证书问题
from flask import Flask, render_template, request, jsonify, redirect
from flask_socketio import SocketIO, emit, join_room, leave_room

# 配置SSL上下文以忽略证书验证问题（用于处理可能的HTTPS证书错误）
ssl_context = ssl._create_unverified_context()

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key'
socketio = SocketIO(app, cors_allowed_origins="*")

# 存储在线用户信息
online_users = {}
# 默认房间名
ROOM_NAME = 'general'

# 读取配置文件
def load_config():
    config_path = 'config.json'
    if os.path.exists(config_path):
        with open(config_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {'servers': ['http://127.0.0.1:5000']}

@app.route('/')
def index():
    # 重定向到登录页面
    return redirect('/login')

@app.route('/login')
def login_page():
    config = load_config()
    return render_template('login.html', servers=config['servers'])

@app.route('/chat')
def chat_room():
    # 渲染聊天室页面
    return render_template('index.html')

@app.route('/api/check_nickname', methods=['POST'])
def check_nickname():
    nickname = request.json.get('nickname')
    is_valid = nickname not in online_users
    return jsonify({'valid': is_valid})

@socketio.on('connect')
def handle_connect():
    print('客户端连接')

@socketio.on('disconnect')
def handle_disconnect():
    sid = request.sid
    nickname = None
    for user, user_sid in online_users.items():
        if user_sid == sid:
            nickname = user
            break
    
    if nickname:
        del online_users[nickname]
        leave_room(ROOM_NAME)
        # 通知所有用户有人离开
        emit('user_left', {'nickname': nickname, 'online_users': list(online_users.keys())},
             room=ROOM_NAME, broadcast=True)
        print(f'{nickname} 离开了聊天室')

@socketio.on('join')
def handle_join(data):
    nickname = data['nickname']
    if nickname in online_users:
        emit('join_error', {'message': '昵称已被使用'})
        return
    
    # 记录用户信息
    online_users[nickname] = request.sid
    join_room(ROOM_NAME)
    
    # 通知所有用户有人加入
    emit('user_joined', {'nickname': nickname, 'online_users': list(online_users.keys())},
         room=ROOM_NAME, broadcast=True)
    
    # 发送欢迎消息给新用户
    emit('welcome', {'message': f'欢迎 {nickname} 加入聊天室！'})
    print(f'{nickname} 加入了聊天室')

def get_proxy_url(original_url):
    """智能视频处理函数 - 优先使用直接播放并提供网络兼容性"""
    # 导入urlquote函数用于URL编码
    from urllib.parse import quote
    # 转换为小写以便比较
    url_lower = original_url.lower()
    
    # 对于特殊格式，使用外部代理服务
    if any(keyword in url_lower for keyword in ['.m3u8', '.hls', 'stream', '.m3u', '.ts', 'cdn']):
        return f"https://jx.m3u8.tv/jiexi/?url={quote(original_url)}"
    
    # 检查是否需要网络权限的跨域资源
    if any(domain in url_lower for domain in ['youtube.com', 'vimeo.com', 'dailymotion.com']):
        return f"https://jx.m3u8.tv/jiexi/?url={quote(original_url)}"
    
    # 其他格式直接返回原始URL，尝试直接播放
    return original_url

@app.route('/proxy-video')
def proxy_video():
    # 获取原始视频URL
    url = request.args.get('url')
    if not url:
        return jsonify({'error': '缺少视频URL参数'}), 400
    
    # 日志记录请求的URL（部分隐藏以保护隐私）
    safe_url = url[:50] + '...' if len(url) > 50 else url
    print(f'收到视频代理请求: {safe_url}')
    
    # 检查网络连接状态
    if not check_network_connection():
        print('代理请求失败: 网络连接不可用')
        return jsonify({'error': '网络连接不可用，请检查设备网络权限设置'}), 503
    
    try:
        # 创建请求对象，设置超时和用户代理
        req = urllib.request.Request(url)
        req.add_header('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
        
        # 打开URL连接，使用SSL上下文处理HTTPS
        response = urllib.request.urlopen(req, context=ssl_context, timeout=10)
        
        # 获取响应状态和头部信息
        status_code = response.getcode()
        content_type = response.info().get('Content-Type', 'video/mp4')
        content_length = response.info().get('Content-Length', '')
        
        # 检查响应状态
        if status_code != 200:
            print(f'代理请求失败: 视频源返回状态码 {status_code}')
            return jsonify({'error': f'无法访问视频源，状态码: {status_code}'}), 502
        
        # 如果不是视频内容，返回错误
        if not content_type.startswith('video/') and 'application/x-mpegURL' not in content_type:
            print(f'代理请求失败: 不支持的内容类型 {content_type}')
            return jsonify({'error': f'不支持的内容类型: {content_type}'}), 415
        
        # 设置完整的CORS和流媒体响应头部
        headers = {
            'Content-Type': content_type,
            'Content-Length': content_length,
            'Accept-Ranges': 'bytes',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Range',
            'Access-Control-Expose-Headers': 'Content-Length, Content-Range',
            'X-Proxy-Status': 'success',
            'Cache-Control': 'public, max-age=3600'
        }
        
        # 创建生成器来流式传输视频数据
        def generate():
            try:
                while True:
                    # 使用较大的块大小以提高性能
                    chunk = response.read(32768)
                    if not chunk:
                        break
                    yield chunk
            except Exception as e:
                print(f"视频流传输错误: {str(e)}")
                # 发生错误时不抛出异常，而是返回空响应
            finally:
                response.close()
        
        print(f'代理请求成功: {content_type}')
        return app.response_class(generate(), headers=headers)
    except urllib.error.URLError as e:
        print(f"代理请求连接错误: {str(e.reason)}")
        return jsonify({'error': f'无法连接到视频源: {str(e.reason)}，请检查网络连接和权限设置'}), 503
    except urllib.error.HTTPError as e:
        print(f"代理请求HTTP错误: {e.code} - {e.reason}")
        return jsonify({'error': f'HTTP错误: {e.code} - {e.reason}'}), 502
    except socket.timeout as e:
        print(f"代理请求超时: {str(e)}")
        return jsonify({'error': '连接视频源超时，请检查网络连接或稍后再试'}), 408
    except Exception as e:
        # 处理其他未预期的异常
        print(f"代理错误: {str(e)}")
        return jsonify({'error': f'代理服务器错误: {str(e)}'}), 500

def check_network_connection():
    """检查基本网络连接状态"""
    try:
        # 尝试连接到一个可靠的公共服务器
        req = urllib.request.Request('https://www.baidu.com')
        req.get_method = lambda: 'HEAD'  # 使用HEAD请求节省带宽
        urllib.request.urlopen(req, context=ssl_context, timeout=2)
        return True
    except Exception as e:
        print(f"网络连接检查失败: {str(e)}")
        # 网络连接不可用
        return False

@socketio.on('send_message')
def handle_message(data):
    nickname = data['nickname']
    message = data['message']
    timestamp = data['timestamp']
    
    # 处理@命令
    response_message = None
    if message.startswith('@电影'):
        parts = message.split(' ', 2)
        if len(parts) > 1:
            original_url = parts[1]
            # 使用代理URL替换原始URL
            proxy_url = get_proxy_url(original_url)
            response_message = {
                'type': 'movie',
                'url': proxy_url,
                'message': f'[电影链接] {original_url}'
            }
    elif message.startswith('@川小农'):
        # 简单的AI回复示例
        ai_response = "你好！我是川小农，很高兴为你服务。"
        response_message = {
            'type': 'ai',
            'nickname': '川小农',
            'message': ai_response
        }
    
    # 发送原始消息
    emit('new_message', {
        'nickname': nickname,
        'message': message,
        'timestamp': timestamp,
        'type': 'text'
    }, room=ROOM_NAME, broadcast=True)
    
    # 如果有@命令的响应，发送响应消息
    if response_message:
        if response_message['type'] == 'ai':
            emit('new_message', {
                'nickname': response_message['nickname'],
                'message': response_message['message'],
                'timestamp': timestamp,
                'type': 'ai'
            }, room=ROOM_NAME, broadcast=True)
        elif response_message['type'] == 'movie':
            emit('movie_link', {
                'url': response_message['url'],
                'sender': nickname
            }, room=ROOM_NAME, broadcast=True)

if __name__ == '__main__':
    # 移除eventlet，使用Flask-SocketIO的默认异步模式
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)