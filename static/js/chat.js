// 全局变量
let socket = null;
let currentUser = null;
let messageId = 0;

// DOM 元素
const messagesContainer = document.getElementById('messages-container');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const emojiButton = document.getElementById('emoji-button');
const logoutButton = document.getElementById('logout-button');
const userListElement = document.getElementById('user-list');
const usernameElement = document.getElementById('current-username');
const userAvatarElement = document.getElementById('user-avatar');

// 初始化函数
function initChat(nickname) {
    currentUser = nickname;
    
    // 更新用户信息显示
    usernameElement.textContent = nickname;
    userAvatarElement.textContent = nickname.charAt(0).toUpperCase();
    
    // 连接 WebSocket
    const socketProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socketUrl = `${socketProtocol}//${window.location.host}`;
    socket = io(socketUrl);
    
    // 连接事件
    socket.on('connect', () => {
        console.log('WebSocket 连接成功');
        // 加入聊天室
        socket.emit('join', { nickname: nickname });
    });
    
    // 接收欢迎消息
    socket.on('welcome', (data) => {
        addMessageToUI('系统', data.message, getCurrentTime(), 'system');
    });
    
    // 接收新消息
    socket.on('new_message', (data) => {
        const isOwn = data.nickname === currentUser;
        addMessageToUI(data.nickname, data.message, data.timestamp, data.type, isOwn);
    });
    
    // 接收用户加入通知
    socket.on('user_joined', (data) => {
        addMessageToUI('系统', `${data.nickname} 加入了聊天室`, getCurrentTime(), 'system');
        updateUserList(data.online_users);
    });
    
    // 接收用户离开通知
    socket.on('user_left', (data) => {
        addMessageToUI('系统', `${data.nickname} 离开了聊天室`, getCurrentTime(), 'system');
        updateUserList(data.online_users);
    });
    
    // 接收电影链接
    socket.on('movie_link', (data) => {
        addMovieLinkToUI(data.sender, data.url);
    });
    
    // 连接错误
    socket.on('connect_error', (error) => {
        console.error('WebSocket 连接错误:', error);
        alert('连接失败，请刷新页面重试');
    });
    
    // 断开连接
    socket.on('disconnect', () => {
        console.log('WebSocket 断开连接');
    });
}

// 添加消息到界面
function addMessageToUI(nickname, message, timestamp, type = 'text', isOwn = false) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    if (isOwn) {
        messageElement.classList.add('own');
    }
    if (type === 'ai') {
        messageElement.classList.add('ai');
    }
    
    const messageHeader = document.createElement('div');
    messageHeader.classList.add('message-header');
    
    const avatar = document.createElement('div');
    avatar.classList.add('message-avatar');
    avatar.textContent = nickname.charAt(0).toUpperCase();
    
    const nicknameSpan = document.createElement('span');
    nicknameSpan.classList.add('message-nickname');
    nicknameSpan.textContent = nickname;
    
    const timeSpan = document.createElement('span');
    timeSpan.classList.add('message-time');
    timeSpan.textContent = formatTime(timestamp);
    
    const messageContent = document.createElement('div');
    messageContent.classList.add('message-content');
    
    // 处理消息内容，支持 @ 高亮
    const formattedMessage = message.replace(/@([\u4e00-\u9fa5\w]+)/g, '<span style="color: #667eea; font-weight: 600;">@$1</span>');
    messageContent.innerHTML = formattedMessage;
    
    if (type !== 'system') {
        messageHeader.appendChild(avatar);
        messageHeader.appendChild(nicknameSpan);
        messageHeader.appendChild(timeSpan);
        messageElement.appendChild(messageHeader);
    } else {
        messageContent.style.textAlign = 'center';
        messageContent.style.background = '#e6fffa';
        messageContent.style.color = '#2d3748';
        messageElement.style.alignItems = 'center';
    }
    
    messageElement.appendChild(messageContent);
    messagesContainer.appendChild(messageElement);
    
    // 自动滚动到底部
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// 获取原始视频URL（从可能的代理URL中提取）
function getOriginalUrl(url) {
    // 从不同的代理URL格式中提取原始URL
    const patterns = [
        '/proxy-video?url=',
        'jx.playerjy.com/?url=',
        'api.vvhan.com/api/proxy?url=',
        'mirror.ghproxy.com/',
        'jx.m3u8.tv/jiexi/?url='
    ];
    
    for (const pattern of patterns) {
        if (url.includes(pattern)) {
            return decodeURIComponent(url.split(pattern)[1]);
        }
    }
    return url; // 如果不是代理URL，直接返回原始URL
}

// 获取视频源URL列表（直接使用原始URL）
function getVideoSourceUrls(originalUrl) {
    return [
        originalUrl,  // 直接使用原始URL
        `/proxy-video?url=${encodeURIComponent(originalUrl)}`  // 仅在原始URL无法播放时使用本地代理作为备用
    ];
}

// 添加视频到UI（支持多种播放方式）
function addMovieLinkToUI(sender, url) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    messageElement.classList.add('video-message');
    
    const messageHeader = document.createElement('div');
    messageHeader.classList.add('message-header');
    
    const avatar = document.createElement('div');
    avatar.classList.add('message-avatar');
    avatar.textContent = sender.charAt(0).toUpperCase();
    
    const nicknameSpan = document.createElement('span');
    nicknameSpan.classList.add('message-nickname');
    nicknameSpan.textContent = sender;
    
    const timeSpan = document.createElement('span');
    timeSpan.classList.add('message-time');
    timeSpan.textContent = formatTime(getCurrentTime());
    
    const messageContent = document.createElement('div');
    messageContent.classList.add('message-content');
    messageContent.classList.add('video-container');
    
    // 创建视频播放器标题
    const videoTitle = document.createElement('div');
    videoTitle.classList.add('video-title');
    videoTitle.textContent = '📹 在线视频播放器';
    
    // 获取原始URL
    const originalUrl = getOriginalUrl(url);
    
    // 创建视频元素
    const videoWrapper = document.createElement('div');
    videoWrapper.classList.add('video-wrapper');
    
    // 首先显示加载状态
    const statusInfo = document.createElement('div');
    statusInfo.classList.add('video-status');
    statusInfo.textContent = '正在尝试播放视频...';
    
    // 尝试多种播放方式
    tryMultipleVideoSources(originalUrl, videoWrapper, statusInfo);
    
    // 创建备用选项区域
    const fallbackOptions = document.createElement('div');
    fallbackOptions.classList.add('fallback-options');
    
    // 添加原始链接选项
    const originalLink = document.createElement('button');
    originalLink.textContent = '使用原始链接播放';
    originalLink.classList.add('fallback-link');
    originalLink.onclick = (e) => {
        e.stopPropagation();
        statusInfo.textContent = '正在尝试原始链接...';
        statusInfo.classList.remove('success', 'error');
        
        // 检查浏览器支持
        if (!document.createElement('video').canPlayType) {
            statusInfo.textContent = '您的浏览器不支持HTML5视频播放，请更新浏览器';
            statusInfo.classList.add('error');
            return;
        }
        
        // 清空视频容器
        while (videoWrapper.firstChild) {
            videoWrapper.removeChild(videoWrapper.firstChild);
        }
        
        // 创建新的视频元素 - 优先HTML5
        const video = document.createElement('video');
        video.classList.add('chat-video');
        video.controls = true;
        video.autoplay = false;
        video.preload = 'metadata';
        video.playsInline = true;
        video.crossOrigin = 'anonymous';
        video.style.width = '100%';
        video.style.maxWidth = '600px';
        video.style.height = 'auto';
        video.src = originalUrl;
        
        // 设置事件监听器
        video.addEventListener('loadedmetadata', function() {
            statusInfo.textContent = '视频加载成功，可以播放';
            statusInfo.classList.remove('error');
            statusInfo.classList.add('success');
        });
        
        video.addEventListener('error', function() {
            console.error('视频错误:', video.error.code);
            let errorMsg = '原始链接播放失败';
            if (video.error.code === 4) {
                errorMsg += '（网络连接问题，请检查网络权限设置）';
            }
            statusInfo.textContent = errorMsg + '，请尝试其他选项';
            statusInfo.classList.remove('success');
            statusInfo.classList.add('error');
        });
        
        // 网络状态监测
        function checkNetworkState() {
            if (video.networkState === 3) {
                statusInfo.textContent = '无法连接到视频源，请检查网络连接和权限设置';
                statusInfo.classList.add('error');
            }
        }
        
        video.addEventListener('waiting', checkNetworkState);
        video.addEventListener('stalled', checkNetworkState);
        
        videoWrapper.appendChild(video);
        video.load();
    };
    
    // 添加代理链接选项
    const proxyLink = document.createElement('button');
    proxyLink.textContent = '使用代理链接播放';
    proxyLink.classList.add('fallback-link');
    proxyLink.onclick = (e) => {
        e.stopPropagation();
        statusInfo.textContent = '正在尝试代理链接...';
        statusInfo.classList.remove('success', 'error');
        
        // 检查浏览器支持
        if (!document.createElement('video').canPlayType) {
            statusInfo.textContent = '您的浏览器不支持HTML5视频播放，请更新浏览器';
            statusInfo.classList.add('error');
            return;
        }
        
        // 清空视频容器
        while (videoWrapper.firstChild) {
            videoWrapper.removeChild(videoWrapper.firstChild);
        }
        
        // 创建新的视频元素 - 优先HTML5
        const video = document.createElement('video');
        video.classList.add('chat-video');
        video.controls = true;
        video.autoplay = false;
        video.preload = 'metadata';
        video.playsInline = true;
        video.crossOrigin = 'anonymous';
        video.style.width = '100%';
        video.style.maxWidth = '600px';
        video.style.height = 'auto';
        video.src = `/proxy-video?url=${encodeURIComponent(originalUrl)}`;
        
        // 设置事件监听器
        video.addEventListener('loadedmetadata', function() {
            statusInfo.textContent = '代理视频加载成功';
            statusInfo.classList.remove('error');
            statusInfo.classList.add('success');
        });
        
        video.addEventListener('error', function() {
            console.error('代理视频错误:', video.error.code);
            let errorMsg = '代理链接播放失败';
            if (video.error.code === 4) {
                errorMsg += '（网络连接问题，请检查网络权限设置）';
            }
            statusInfo.textContent = errorMsg;
            statusInfo.classList.remove('success');
            statusInfo.classList.add('error');
        });
        
        // 网络状态监测
        function checkNetworkState() {
            if (video.networkState === 3) {
                statusInfo.textContent = '无法连接到代理服务器，请检查网络连接和权限设置';
                statusInfo.classList.add('error');
            }
        }
        
        video.addEventListener('waiting', checkNetworkState);
        video.addEventListener('stalled', checkNetworkState);
        
        videoWrapper.appendChild(video);
        video.load();
    };
    
    // 添加新窗口打开选项（保留这个功能但不是默认）
    const newWindowLink = document.createElement('button');
    newWindowLink.textContent = '在新窗口打开';
    newWindowLink.classList.add('fallback-link');
    newWindowLink.onclick = (e) => {
        e.stopPropagation();
        window.open(originalUrl, '_blank');
        statusInfo.textContent = '已在新窗口打开视频';
    };
    
    fallbackOptions.appendChild(originalLink);
    fallbackOptions.appendChild(proxyLink);
    fallbackOptions.appendChild(newWindowLink);
    
    // 组装元素
    messageContent.appendChild(videoTitle);
    messageContent.appendChild(videoWrapper);
    messageContent.appendChild(statusInfo);
    messageContent.appendChild(fallbackOptions);
    
    messageHeader.appendChild(avatar);
    messageHeader.appendChild(nicknameSpan);
    messageHeader.appendChild(timeSpan);
    messageElement.appendChild(messageHeader);
    messageElement.appendChild(messageContent);
    
    // 添加到聊天容器
    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// 尝试多种视频源和播放方式
function tryMultipleVideoSources(originalUrl, container, statusElement) {
    // 检查浏览器是否支持HTML5视频
    if (!document.createElement('video').canPlayType) {
        statusElement.textContent = '您的浏览器不支持HTML5视频播放，请更新浏览器';
        statusElement.classList.add('error');
        return;
    }
    
    // 记录尝试的URL和时间，用于调试
    console.log('尝试播放视频:', originalUrl);
    
    // 检查是否是腾讯视频链接，使用iframe嵌入
    const tencentUrlLower = originalUrl.toLowerCase();
    if (tencentUrlLower.includes('v.qq.com')) {
        statusElement.textContent = '检测到腾讯视频链接，使用官方嵌入格式播放...';
        
        // 创建iframe元素
        const iframe = document.createElement('iframe');
        iframe.id = 'tencent-video-player';
        iframe.classList.add('chat-video-iframe');
        iframe.frameBorder = '0';
        iframe.allowFullscreen = true;
        // 添加必要的权限属性
        iframe.allow = 'autoplay; fullscreen; accelerometer; gyroscope';
        iframe.style.width = '100%';
        iframe.style.maxWidth = '600px';
        iframe.style.height = '400px'; // 调整为更合适的高度
        
        // 尝试从URL中提取VID参数
        let vid = null;
        // 尝试多种VID提取方式
        const vidMatch1 = originalUrl.match(/vid=([\w]+)/);
        const vidMatch2 = originalUrl.match(/(\w+)\.html$/);
        const vidMatch3 = originalUrl.match(/\/(\w+)\.html/);
        
        if (vidMatch1 && vidMatch1[1]) {
            vid = vidMatch1[1];
        } else if (vidMatch2 && vidMatch2[1]) {
            vid = vidMatch2[1];
        } else if (vidMatch3 && vidMatch3[1]) {
            vid = vidMatch3[1];
        } else {
            // 尝试从URL路径中提取
            const pathMatch = originalUrl.match(/cover\/(\w+)\//);
            if (pathMatch && pathMatch[1]) {
                vid = pathMatch[1];
            }
        }
        
        // 使用腾讯视频官方推荐的通用嵌入链接格式
        if (vid) {
            iframe.src = `https://v.qq.com/iframe/player.html?vid=${vid}&tiny=0&auto=0`;
        } else {
            // 如果无法提取VID，显示提示信息
            statusElement.textContent = '无法从链接中提取视频ID，请尝试直接使用带有vid参数的链接';
            statusElement.classList.add('error');
            return;
        }
        
        // iframe加载完成处理
        iframe.addEventListener('load', function() {
            statusElement.textContent = '腾讯视频iframe加载成功';
            statusElement.classList.remove('error');
            statusElement.classList.add('success');
        });
        
        // 添加错误处理
        iframe.onerror = function() {
            statusElement.textContent = 'iframe加载失败，请尝试使用备用链接';
            statusElement.classList.remove('success');
            statusElement.classList.add('error');
            
            // 移除iframe，允许用户尝试其他选项
            if (container.contains(iframe)) {
                container.removeChild(iframe);
            }
        };
        
        // 将iframe添加到容器
        container.appendChild(iframe);
        return; // 处理完腾讯视频后直接返回
    }
    
    // 非腾讯视频链接，创建普通视频元素 - 优先使用HTML5
    const video = document.createElement('video');
    video.id = 'current-video-player';
    video.classList.add('chat-video');
    video.controls = true;
    video.autoplay = false; // 禁用自动播放，避免浏览器限制
    video.preload = 'metadata'; // 只预加载元数据
    video.playsInline = true; // 允许内联播放
    video.crossOrigin = 'anonymous'; // 允许跨域视频资源
    video.style.width = '100%';
    video.style.maxWidth = '600px';
    video.style.height = 'auto';
    
    // 定期检查网络状态（使用标准方法）
    function checkNetworkStatus() {
        console.log('视频网络状态:', video.networkState, '准备状态:', video.readyState);
        if (video.networkState === 3) { // NETWORK_NO_SOURCE
            statusElement.textContent = '无法连接到视频源，请尝试下方的备用链接';
            statusElement.classList.add('error');
        } else if (video.networkState === 2) { // NETWORK_LOADING
            statusElement.textContent = '正在加载视频...';
        }
    }
    
    // 定时检查网络状态（替代不存在的networkStateChange事件）
    const networkStatusInterval = setInterval(checkNetworkStatus, 2000);
    
    // 在视频元素移除时清除定时器
    video.addEventListener('error', () => {
        clearInterval(networkStatusInterval);
    });
    
    video.addEventListener('loadedmetadata', () => {
        clearInterval(networkStatusInterval);
    });
    
    // 检查URL的可能格式，添加相应的source
    const urlLower = originalUrl.toLowerCase();
    
    // 添加MP4格式支持
    if (urlLower.includes('.mp4')) {
        const mp4Source = document.createElement('source');
        mp4Source.src = originalUrl;
        mp4Source.type = 'video/mp4';
        video.appendChild(mp4Source);
    }
    
    // 添加WebM格式支持
    if (urlLower.includes('.webm')) {
        const webmSource = document.createElement('source');
        webmSource.src = originalUrl;
        webmSource.type = 'video/webm';
        video.appendChild(webmSource);
    }
    
    // 添加HLS格式支持
    if (urlLower.includes('.m3u8')) {
        const hlsSource = document.createElement('source');
        hlsSource.src = originalUrl;
        hlsSource.type = 'application/x-mpegURL';
        video.appendChild(hlsSource);
    }
    
    // 如果没有检测到特定格式，添加通用格式
    if (video.children.length === 0) {
        const genericSource = document.createElement('source');
        genericSource.src = originalUrl;
        genericSource.type = 'video/mp4';
        video.appendChild(genericSource);
    }
    
    // 设置直接源作为后备
    video.src = originalUrl;
    
    // 视频加载成功处理
    video.addEventListener('loadedmetadata', function() {
        statusElement.textContent = '视频加载成功，可以播放';
        statusElement.classList.remove('error');
        statusElement.classList.add('success');
    });
    
    // 视频可以播放处理
    video.addEventListener('canplay', function() {
        statusElement.textContent = '视频可以正常播放';
        statusElement.classList.remove('error');
        statusElement.classList.add('success');
    });
    
    // 视频加载失败处理
    video.addEventListener('error', function() {
        console.error('视频加载失败:', video.error);
        let errorMsg = '视频加载失败';
        
        // 更详细的错误处理
        switch (video.error.code) {
            case MediaError.MEDIA_ERR_ABORTED:
                errorMsg += '（用户中止）';
                break;
            case MediaError.MEDIA_ERR_NETWORK:
                errorMsg += '（网络错误，请检查网络权限）';
                break;
            case MediaError.MEDIA_ERR_DECODE:
                errorMsg += '（解码错误，格式不支持）';
                break;
            case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
                errorMsg += '（视频源不受支持，请尝试代理链接）';
                break;
        }
        
        statusElement.textContent = errorMsg + '，请尝试使用下方备用链接';
        statusElement.classList.remove('success');
        statusElement.classList.add('error');
        
        // 移除视频元素，不影响用户使用备用选项
        if (container.contains(video)) {
            container.removeChild(video);
        }
    });
    
    // 网络错误处理
    video.addEventListener('stalled', function() {
        statusElement.textContent = '视频加载中断，检查网络连接和权限设置...';
        console.log('视频加载中断，可能是网络权限问题');
        // 仅尝试一次重新加载，避免无限循环
        setTimeout(() => {
            if (container.contains(video)) {
                try {
                    video.load();
                } catch (e) {
                    console.error('重新加载失败:', e);
                }
            }
        }, 2000);
    });
    
    // 网络状态变化处理
    video.addEventListener('waiting', function() {
        statusElement.textContent = '正在缓冲视频...';
    });
    
    // 将视频添加到容器
    container.appendChild(video);
    
    // 尝试加载视频
    video.load();
    
    // 5秒后如果视频仍未加载成功，尝试使用代理URL
    setTimeout(() => {
        if (container.contains(video) && video.readyState < 2) { // HAVE_CURRENT_DATA
            console.log('直接播放失败，尝试使用代理URL...');
            try {
                if (container.contains(video)) {
                    container.removeChild(video);
                }
                
                // 创建代理URL版本的视频
                const proxyVideo = document.createElement('video');
                proxyVideo.id = 'proxy-video-player';
                proxyVideo.classList.add('chat-video');
                proxyVideo.controls = true;
                proxyVideo.autoplay = false;
                proxyVideo.preload = 'metadata';
                proxyVideo.playsInline = true;
                proxyVideo.crossOrigin = 'anonymous'; // 重要：允许跨域
                proxyVideo.style.width = '100%';
                proxyVideo.style.maxWidth = '600px';
                proxyVideo.style.height = 'auto';
                proxyVideo.src = `/proxy-video?url=${encodeURIComponent(originalUrl)}`;
                
                // 更完善的错误处理
                proxyVideo.addEventListener('loadedmetadata', function() {
                    console.log('代理视频加载成功');
                    statusElement.textContent = '代理视频加载成功';
                    statusElement.classList.remove('error');
                    statusElement.classList.add('success');
                });
                
                proxyVideo.addEventListener('error', function() {
                    console.error('代理视频错误:', proxyVideo.error);
                    let errorMsg = '代理视频也加载失败';
                    
                    if (proxyVideo.error.code === MediaError.MEDIA_ERR_NETWORK) {
                        errorMsg += '（可能是网络权限限制，请尝试新窗口播放）';
                    }
                    
                    statusElement.textContent = errorMsg + '，请使用下方备用链接';
                    statusElement.classList.remove('success');
                    statusElement.classList.add('error');
                    
                    if (container.contains(proxyVideo)) {
                        container.removeChild(proxyVideo);
                    }
                });
                
                // 网络状态监测
                proxyVideo.addEventListener('stalled', function() {
                    console.log('代理视频加载中断');
                    statusElement.textContent = '代理视频加载中断，请检查网络权限';
                });
                
                container.appendChild(proxyVideo);
                // 使用用户交互触发播放，避免自动播放限制
                console.log('代理视频已添加，请点击播放按钮开始播放');
            } catch (e) {
                console.error('代理尝试失败:', e);
                statusElement.textContent = '代理请求失败，尝试直接使用备用链接';
            }
        }
    }, 5000);
}

// 更新在线用户列表
function updateUserList(users) {
    userListElement.innerHTML = '';
    users.forEach(user => {
        const userElement = document.createElement('li');
        userElement.textContent = user;
        userListElement.appendChild(userElement);
    });
}

// 发送消息
function sendMessage() {
    const message = messageInput.value.trim();
    if (!message || !socket) return;
    
    const timestamp = getCurrentTime();
    
    // 发送消息到服务器
    socket.emit('send_message', {
        nickname: currentUser,
        message: message,
        timestamp: timestamp
    });
    
    // 清空输入框
    messageInput.value = '';
}

// 获取当前时间
function getCurrentTime() {
    return new Date().toISOString();
}

// 格式化时间显示
function formatTime(timestamp) {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}

// 退出登录
function logout() {
    if (socket) {
        socket.disconnect();
    }
    window.location.href = '/login';
}

// 表情选择功能
function toggleEmojiPicker() {
    // 检查表情面板是否已存在
    let emojiPicker = document.getElementById('emoji-picker');
    
    if (emojiPicker) {
        // 如果存在，移除它
        emojiPicker.remove();
        return;
    }
    
    // 创建表情面板
    emojiPicker = document.createElement('div');
    emojiPicker.id = 'emoji-picker';
    emojiPicker.className = 'emoji-picker';
    
    // 定义常用表情
    const emojiCategories = {
        '表情': ['😊', '😂', '🥰', '😍', '🤔', '😅', '😎', '🥳'],
        '手势': ['👍', '👎', '👌', '🤞', '🤟', '🤘', '👏', '🙏'],
        '爱心': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '💔'],
        '符号': ['🎉', '🔥', '⭐', '✨', '💯', '💪', '🎊', '🎁']
    };
    
    // 创建表情分类
    for (const [category, emojis] of Object.entries(emojiCategories)) {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'emoji-category';
        
        const categoryTitle = document.createElement('div');
        categoryTitle.className = 'emoji-category-title';
        categoryTitle.textContent = category;
        categoryDiv.appendChild(categoryTitle);
        
        const emojiGrid = document.createElement('div');
        emojiGrid.className = 'emoji-grid';
        
        // 添加表情按钮
        emojis.forEach(emoji => {
            const emojiButton = document.createElement('button');
            emojiButton.className = 'emoji-item';
            emojiButton.textContent = emoji;
            emojiButton.title = emoji;
            
            // 点击表情时插入到输入框
            emojiButton.addEventListener('click', () => {
                insertEmojiToInput(emoji);
                emojiPicker.remove();
            });
            
            emojiGrid.appendChild(emojiButton);
        });
        
        categoryDiv.appendChild(emojiGrid);
        emojiPicker.appendChild(categoryDiv);
    }
    
    // 将表情面板添加到输入区域旁边
    const inputContainer = document.querySelector('.input-container');
    inputContainer.parentNode.insertBefore(emojiPicker, inputContainer.nextSibling);
    
    // 设置表情面板位置
    const emojiButtonRect = emojiButton.getBoundingClientRect();
    const containerRect = inputContainer.getBoundingClientRect();
    
    emojiPicker.style.position = 'absolute';
    emojiPicker.style.bottom = `${containerRect.bottom - emojiButtonRect.top + 10}px`;
    emojiPicker.style.left = `${emojiButtonRect.left - containerRect.left}px`;
    
    // 点击页面其他地方关闭表情面板
    document.addEventListener('click', closeEmojiPickerOnOutsideClick);
}

// 关闭表情面板的外部点击处理
function closeEmojiPickerOnOutsideClick(event) {
    const emojiPicker = document.getElementById('emoji-picker');
    const emojiBtn = document.getElementById('emoji-button');
    
    if (emojiPicker && !emojiPicker.contains(event.target) && event.target !== emojiBtn) {
        emojiPicker.remove();
        document.removeEventListener('click', closeEmojiPickerOnOutsideClick);
    }
}

// 将表情插入到输入框
function insertEmojiToInput(emoji) {
    const input = messageInput;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const text = input.value;
    
    // 在光标位置插入表情
    input.value = text.substring(0, start) + emoji + text.substring(end);
    
    // 移动光标到表情后面
    input.selectionStart = input.selectionEnd = start + emoji.length;
    input.focus();
}

// 事件监听器
function setupEventListeners() {
    // 发送按钮点击事件
    sendButton.addEventListener('click', sendMessage);
    
    // 输入框回车发送
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Emoji 按钮点击事件
    if (emojiButton) {
        emojiButton.addEventListener('click', (e) => {
            e.stopPropagation(); // 阻止事件冒泡，避免立即关闭
            toggleEmojiPicker();
        });
    }
    
    // 退出按钮点击事件
    if (logoutButton) {
        logoutButton.addEventListener('click', logout);
    }
}

// 页面加载完成后执行
window.addEventListener('load', () => {
    setupEventListeners();
    
    // 检查并显示兼容性提示
    checkCompatibility();
    
    // 从 URL 获取昵称参数
    const urlParams = new URLSearchParams(window.location.search);
    const nickname = urlParams.get('nickname');
    
    if (nickname) {
        initChat(nickname);
    }
});

// 检查浏览器兼容性并显示提示
function checkCompatibility() {
    // 检查HTML5视频支持
    const hasVideoSupport = !!document.createElement('video').canPlayType;
    
    if (!hasVideoSupport) {
        // 创建兼容性提示元素
        const compatibilityNotice = document.createElement('div');
        compatibilityNotice.className = 'compatibility-notice';
        compatibilityNotice.style.cssText = `
            background: #f8d7da;
            color: #721c24;
            padding: 10px;
            border-radius: 5px;
            margin: 10px;
            text-align: center;
            font-weight: bold;
            border: 1px solid #f5c6cb;
        `;
        compatibilityNotice.innerHTML = 
            '⚠️ 您的浏览器不支持HTML5视频播放。请更新到最新版本的Chrome、Firefox、Edge或Safari浏览器，' +
            '并确保已启用JavaScript和允许网络访问。';
        
        // 添加到页面顶部
        document.body.insertBefore(compatibilityNotice, document.body.firstChild);
    } else {
        // 显示网络权限提示
        const networkTip = document.createElement('div');
        networkTip.className = 'network-tip';
        networkTip.style.cssText = `
            background: #d4edda;
            color: #155724;
            padding: 8px;
            border-radius: 5px;
            margin: 10px;
            text-align: center;
            font-size: 14px;
            border: 1px solid #c3e6cb;
        `;
        networkTip.innerHTML = 
            '💡 提示：请确保您的设备已允许聊天软件使用网络，浏览器已启用HTML5视频播放功能。';
        
        // 添加到页面顶部（但3秒后自动隐藏）
        document.body.insertBefore(networkTip, document.body.firstChild);
        setTimeout(() => {
            networkTip.style.transition = 'opacity 0.5s ease';
            networkTip.style.opacity = '0';
            setTimeout(() => {
                if (document.body.contains(networkTip)) {
                    document.body.removeChild(networkTip);
                }
            }, 500);
        }, 5000);
    }
}