# 带派聊天室 - 项目说明文档

## 项目简介

带派聊天室是一个基于 Flask 和 Socket.IO 开发的实时聊天应用，支持用户通过昵称登录、发送消息、分享视频链接以及与 AI 助手对话等功能。

## 技术栈

- **后端**: Python, Flask, Flask-SocketIO
- **前端**: HTML, CSS, JavaScript, Socket.IO 客户端
- **数据库**: 无（使用内存存储在线用户信息）

## 目录结构

```
chat_room/
├── app.py              # 主应用文件，包含所有路由和SocketIO事件处理
├── config.json         # 配置文件，存储服务器地址列表
├── static/             # 静态资源目录
│   ├── css/            # CSS样式文件
│   └── js/             # JavaScript文件
├── templates/          # HTML模板文件
│   ├── index.html      # 聊天室页面模板
│   └── login.html      # 登录页面模板
└── venv/               # Python虚拟环境
```

## 核心功能

1. **用户登录系统**
   - 昵称验证（长度2-20字符，只允许中文、字母、数字和下划线）
   - 昵称唯一性检查
   - 服务器地址选择

2. **实时聊天功能**
   - 消息实时发送与接收
   - 在线用户列表动态更新
   - 用户加入/离开通知

3. **特色功能**
   - 视频链接分享（使用 `@电影 URL` 命令）
   - AI 助手对话（使用 `@川小农` 命令）

4. **视频代理服务**
   - 支持各类视频链接的代理访问
   - 错误处理和网络连接检查

## 安装与部署

### 本地开发环境

1. **克隆项目**（如果从版本控制系统获取）
   ```bash
   git clone <repository-url>
   cd chat_room
   ```

2. **创建并激活虚拟环境**
   ```bash
   # Windows
   python -m venv venv
   venv\Scripts\activate

   # macOS/Linux
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **安装依赖**
   ```bash
   pip install -r requirements.txt
   ```

   > 注意：如果没有 requirements.txt 文件，请手动安装以下依赖：
   > ```bash
   > pip install flask flask-socketio
   > ```

4. **配置服务器地址**
   编辑 `config.json` 文件，添加或修改服务器地址：
   ```json
   {
     "servers": [
       "http://127.0.0.1:5000",
       "http://localhost:5000"
     ]
   }
   ```

5. **运行应用**
   ```bash
   python app.py
   ```

   应用将在 http://localhost:5000 启动。

## 使用说明

### 登录流程

1. 访问应用首页（会自动重定向到登录页面）
2. 输入2-20个字符的昵称（只允许中文、字母、数字和下划线）
3. 选择服务器地址
4. 点击登录按钮或按回车键

### 聊天功能

1. **发送消息**：在输入框中输入文字，按回车或点击发送按钮
2. **查看在线用户**：侧边栏会显示当前所有在线用户
3. **分享视频**：使用格式 `@电影 视频URL` 分享视频链接
4. **AI 对话**：输入 `@川小农` 与AI助手对话

### 退出登录

点击聊天室右上角的"退出"按钮返回登录页面。

## API 路由说明

### Web 页面路由

- `GET /` - 重定向到登录页面
- `GET /login` - 登录页面
- `GET /chat` - 聊天室页面（需要有效的昵称参数）

### API 路由

- `POST /api/check_nickname` - 检查昵称是否可用
  - 请求体：`{"nickname": "用户昵称"}`
  - 响应：`{"valid": true/false}`
- `GET /proxy-video?url=VIDEO_URL` - 视频代理服务

## Socket.IO 事件

### 客户端事件

- `connect` - 客户端连接
- `disconnect` - 客户端断开连接
- `join` - 用户加入聊天室
- `send_message` - 发送消息

### 服务端事件

- `user_joined` - 通知用户加入
- `user_left` - 通知用户离开
- `new_message` - 新消息
- `movie_link` - 电影链接
- `welcome` - 欢迎消息

## 开发注意事项

1. **调试模式**：开发环境下应用默认以调试模式运行，生产环境应禁用
2. **跨域支持**：当前配置允许所有来源的跨域请求，生产环境应限制
3. **密钥配置**：请修改 `app.config['SECRET_KEY']` 为安全的随机字符串
4. **SSL 验证**：应用当前忽略 SSL 证书验证，生产环境应启用

## 扩展与维护

### 添加新功能

1. **新命令**：在 `handle_message` 函数中添加新的命令处理逻辑
2. **新页面**：在 `templates` 目录下创建新模板，并在 `app.py` 中添加对应路由
3. **静态资源**：新的 CSS 和 JavaScript 文件应放在 `static` 目录下

### 常见问题排查

1. **网络连接问题**：应用包含网络连接检查功能，可在日志中查看详细错误信息
2. **视频代理失败**：检查视频URL是否有效，以及是否被防火墙阻止
3. **Socket.IO 连接问题**：确认服务器地址配置正确，以及端口是否被占用

## 许可证

无特殊许可证限制。