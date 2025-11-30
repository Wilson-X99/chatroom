// DOM 元素
const nicknameInput = document.getElementById('nickname');
const serverSelect = document.getElementById('server');
const loginButton = document.getElementById('login-button');
const errorMessage = document.getElementById('error-message');

// 验证昵称
async function validateNickname(nickname) {
    try {
        const response = await fetch('/api/check_nickname', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ nickname: nickname })
        });
        const data = await response.json();
        return data.valid;
    } catch (error) {
        console.error('验证昵称失败:', error);
        return false;
    }
}

// 显示错误消息
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
}

// 隐藏错误消息
function hideError() {
    errorMessage.style.display = 'none';
}

// 处理登录
async function handleLogin() {
    const nickname = nicknameInput.value.trim();
    const server = serverSelect.value;
    
    // 验证输入
    if (!nickname) {
        showError('请输入昵称');
        return;
    }
    
    if (nickname.length < 2 || nickname.length > 20) {
        showError('昵称长度应在2-20个字符之间');
        return;
    }
    
    if (!/^[\u4e00-\u9fa5\w]+$/.test(nickname)) {
        showError('昵称只能包含中文、字母、数字和下划线');
        return;
    }
    
    // 验证昵称是否已存在
    hideError();
    loginButton.disabled = true;
    loginButton.textContent = '登录中...';
    
    try {
        const isValid = await validateNickname(nickname);
        if (isValid) {
            // 登录成功，直接跳转到聊天室页面
            window.location.href = `/chat?nickname=${encodeURIComponent(nickname)}`;
        } else {
            showError('昵称已被使用，请更换其他昵称');
        }
    } catch (error) {
        showError('登录失败，请稍后重试');
    } finally {
        loginButton.disabled = false;
        loginButton.textContent = '登录';
    }
}

// 事件监听器
function setupEventListeners() {
    // 登录按钮点击事件
    loginButton.addEventListener('click', handleLogin);
    
    // 输入框回车登录
    nicknameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleLogin();
        }
    });
    
    // 输入框输入时隐藏错误消息
    nicknameInput.addEventListener('input', hideError);
}

// 页面加载完成后执行
window.addEventListener('load', setupEventListeners);