# Spotify MCP Server

A Model Context Protocol (MCP) server that enables Claude to directly control Spotify playback, search tracks, and manage playlists through the Spotify Web API.

## Features

### MCP Tools Available

1. **search_tracks** - Search for tracks in Spotify's catalog
2. **play_track** - Play a specific track on your device
3. **playback_control** - Control playback (play, pause, next, previous)
4. **get_current_playback** - Get current playback state
5. **get_user_playlists** - Get your playlists
6. **get_playlist_tracks** - Get tracks from a specific playlist
7. **add_to_queue** - Add a track to the playback queue
8. **get_available_devices** - List available Spotify devices

### Key Capabilities

- Full OAuth2 authentication with automatic token refresh
- Exponential backoff retry logic for rate limiting (429) and service errors (503)
- User-friendly error messages
- Comprehensive TypeScript type safety
- 113 unit and integration tests with 95%+ coverage

## Prerequisites

- Node.js 18+ and npm
- A Spotify account (Premium required for playback control)
- Spotify Developer App credentials

## Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd SpotifyMCP2
npm install
```

### 2. Set Up Spotify Developer App

Follow the detailed instructions in [SETUP.md](./SETUP.md) to:
1. Create a Spotify Developer App
2. Configure redirect URI
3. Obtain Client ID and Client Secret
4. Get your refresh token

### 3. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and add your credentials:

```env
SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_CLIENT_SECRET=your_client_secret_here
SPOTIFY_REDIRECT_URI=http://localhost:3000/callback
SPOTIFY_REFRESH_TOKEN=your_refresh_token_here
LOG_LEVEL=info
```

### 4. Build the Project

```bash
npm run build
```

### 5. Run the MCP Server

```bash
npm run start:mcp
```

The server will start and communicate via stdio (standard input/output) following the MCP protocol.

## Usage with Claude Desktop

To use this MCP server with Claude Desktop, add it to your Claude configuration:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "spotify": {
      "command": "node",
      "args": ["/absolute/path/to/SpotifyMCP2/dist/index.js"],
      "env": {
        "SPOTIFY_CLIENT_ID": "your_client_id",
        "SPOTIFY_CLIENT_SECRET": "your_client_secret",
        "SPOTIFY_REDIRECT_URI": "http://localhost:3000/callback",
        "SPOTIFY_REFRESH_TOKEN": "your_refresh_token"
      }
    }
  }
}
```

Restart Claude Desktop after making changes.

## Example Interactions

Once configured, you can ask Claude:

- "Search for songs by The Beatles"
- "Play 'Bohemian Rhapsody' by Queen"
- "What's currently playing on Spotify?"
- "Show me my playlists"
- "Add this song to the queue"
- "Pause the music"
- "Skip to the next track"

## Development

### Available Scripts

```bash
npm run build         # Compile TypeScript to JavaScript
npm run dev          # Watch mode for development
npm test             # Run all tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
npm run start:mcp    # Start the MCP server
```

### Project Structure

```
SpotifyMCP2/
├── src/
│   ├── index.ts              # MCP Server entry point
│   ├── auth.ts              # OAuth2 authentication
│   ├── spotify_api.ts        # Spotify API client wrapper
│   ├── types.ts             # TypeScript type definitions
│   └── tools/               # MCP tool implementations
│       ├── search.ts        # Search functionality
│       ├── playback.ts      # Playback control
│       ├── playlist.ts      # Playlist management
│       └── device.ts        # Device management
├── tests/
│   ├── spotify_api.test.ts  # OAuth and API tests
│   └── mcp_tools.test.ts    # MCP tools integration tests
├── ARCHITECTURE.md          # Architecture documentation
├── SETUP.md                 # Spotify setup guide
└── TEST_REPORT.md           # Test coverage report
```

### Testing

Run the full test suite:

```bash
npm test
```

Generate coverage report:

```bash
npm run test:coverage
```

Current test coverage:
- **113 tests** (all passing)
- **95%+ coverage** on core modules

## Required Spotify API Scopes

This server requires the following OAuth scopes:

- `user-read-playback-state` - Read playback state
- `user-modify-playback-state` - Control playback
- `user-read-currently-playing` - Read currently playing track
- `playlist-read-private` - Read private playlists
- `playlist-read-collaborative` - Read collaborative playlists
- `user-library-read` - Read saved tracks

## Error Handling

The server handles common errors gracefully:

- **No active device**: Returns a friendly message asking to open Spotify
- **Token expiration**: Automatically refreshes tokens
- **Rate limiting (429)**: Implements exponential backoff with retry
- **Service errors (503)**: Retries with exponential backoff
- **Invalid parameters**: Returns clear validation error messages

## Security Notes

- Never commit your `.env` file to version control
- Keep your `client_secret` and `refresh_token` secure
- The `.gitignore` file excludes sensitive files by default
- Consider using your system's keychain for storing the refresh token

## Troubleshooting

### "No active device" error
Make sure Spotify is open and playing on at least one device (desktop app, mobile, web player).

### Authentication errors
1. Verify your `client_id` and `client_secret` are correct
2. Ensure your `redirect_uri` matches the one in Spotify Dashboard
3. Check that your `refresh_token` is valid (follow SETUP.md to get a new one)

### MCP server not appearing in Claude
1. Check that the path to `dist/index.js` is absolute
2. Verify the build was successful (`npm run build`)
3. Restart Claude Desktop after configuration changes
4. Check Claude's logs for any error messages

## Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Detailed architecture and design decisions
- [SETUP.md](./SETUP.md) - Step-by-step Spotify Developer setup guide
- [TEST_REPORT.md](./TEST_REPORT.md) - Test coverage and quality report

## License

MIT

## Contributors

Developed by Agent Team:
- Project Manager: Architecture and coordination
- Software Development Engineer: Implementation
- QA Engineer: Testing and quality assurance
