# Spotify MCP Server - Architecture Design

## 项目概述
此 MCP Server 允许 Claude 通过 Model Context Protocol 直接控制 Spotify 播放器。

## MCP Tools 定义

### 1. search_tracks
搜索 Spotify 曲库中的歌曲
- **输入参数**:
  - `query` (string, required): 搜索关键词
  - `limit` (number, optional, default=10): 返回结果数量
- **返回**: 歌曲列表（包含 track_id, name, artist, album, uri）

### 2. play_track
播放指定歌曲
- **输入参数**:
  - `track_uri` (string, required): Spotify track URI (spotify:track:xxx)
  - `device_id` (string, optional): 指定播放设备
- **返回**: 播放状态确认

### 3. playback_control
控制播放状态（播放/暂停/下一首/上一首）
- **输入参数**:
  - `action` (string, required): "play" | "pause" | "next" | "previous"
  - `device_id` (string, optional): 指定设备
- **返回**: 操作结果

### 4. get_current_playback
获取当前播放状态
- **输入参数**: 无
- **返回**: 当前播放的歌曲信息、进度、设备信息

### 5. get_user_playlists
获取用户的播放列表
- **输入参数**:
  - `limit` (number, optional, default=20): 返回数量
- **返回**: 播放列表（id, name, tracks_count, uri）

### 6. get_playlist_tracks
获取指定播放列表的歌曲
- **输入参数**:
  - `playlist_id` (string, required): 播放列表 ID
  - `limit` (number, optional, default=50): 返回数量
- **返回**: 歌曲列表

### 7. add_to_queue
添加歌曲到播放队列
- **输入参数**:
  - `track_uri` (string, required): Spotify track URI
  - `device_id` (string, optional): 指定设备
- **返回**: 操作确认

### 8. get_available_devices
获取可用的播放设备
- **输入参数**: 无
- **返回**: 设备列表（id, name, type, is_active）

## Spotify API Scopes 需求

根据上述 Tools，需要以下 OAuth Scopes：

```
user-read-playback-state      # 读取播放状态
user-modify-playback-state    # 控制播放
user-read-currently-playing   # 读取当前播放
playlist-read-private         # 读取私人播放列表
playlist-read-collaborative   # 读取协作播放列表
user-library-read            # 读取用户音乐库
```

## 项目结构

```
spotify-mcp/
├── src/
│   ├── index.ts              # MCP Server 入口
│   ├── spotify_api.ts        # Spotify API 封装
│   ├── auth.ts              # OAuth2 认证模块
│   ├── tools/               # MCP Tools 实现
│   │   ├── search.ts
│   │   ├── playback.ts
│   │   ├── playlist.ts
│   │   └── device.ts
│   └── types.ts             # TypeScript 类型定义
├── tests/
│   ├── spotify_api.test.ts  # API 单元测试
│   └── mcp_tools.test.ts    # MCP Tools 集成测试
├── .env.example             # 环境变量模板
├── package.json
├── tsconfig.json
└── README.md
```

## 环境变量配置

需要在 `.env` 文件中配置：

```env
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
SPOTIFY_REDIRECT_URI=http://localhost:3000/callback
SPOTIFY_REFRESH_TOKEN=your_refresh_token  # 初次授权后获得
```

## Spotify Dashboard 设置

1. 前往 [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. 创建新应用（App）
3. 设置 Redirect URI: `http://localhost:3000/callback`
4. 获取 Client ID 和 Client Secret
5. 使用 Authorization Code Flow 获取 Refresh Token

## 技术栈

- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **MCP SDK**: `@modelcontextprotocol/sdk`
- **Spotify SDK**: `spotify-web-api-node`
- **Testing**: Jest
- **HTTP Client**: Axios (内建于 spotify-web-api-node)

## 错误处理策略

1. **Token 过期**: 自动使用 refresh_token 刷新
2. **无活动设备**: 返回友好提示"请先打开 Spotify 应用"
3. **API 限流**: 实现 exponential backoff 重试机制
4. **无效输入**: 返回清晰的参数错误信息

## 安全考虑

- 不在代码中硬编码任何凭证
- 使用 `.gitignore` 排除 `.env` 文件
- Refresh Token 应安全存储（考虑使用系统 keychain）
- 所有 API 请求使用 HTTPS

## 开发阶段

### Phase 1: 基础设施 (由 SDE 负责)
- 项目初始化
- OAuth2 认证流程
- 基本 API 封装

### Phase 2: 核心功能 (由 SDE 负责)
- 实现所有 MCP Tools
- MCP Server 集成
- 错误处理

### Phase 3: 测试与优化 (由 QA 负责)
- 单元测试
- 集成测试
- 边界情况测试

### Phase 4: 文档与交付 (由 PM 负责)
- 用户文档
- 代码审查
- 最终验收
