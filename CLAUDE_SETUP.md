# 🎵 Using Spotify MCP Server with Claude Desktop

Follow these steps to control Spotify from Claude Desktop.

## Step 1: Get Spotify Developer Credentials

1. Go to https://developer.spotify.com/dashboard
2. Log in with your Spotify account
3. Click **"Create app"**
4. Fill in the form:
   - **App name**: `Claude Spotify Control` (or any name)
   - **App description**: `MCP server for Claude`
   - **Redirect URI**: `http://localhost:3000/callback` ⚠️ Must be exact
   - **API**: Check "Web API"
5. Click **"Save"**
6. You'll see your **Client ID** on the dashboard
7. Click **"View client secret"** to see your **Client Secret**
8. **Keep these values** - you'll need them in the next step

## Step 2: Get Your Refresh Token

Run the helper script to get your refresh token:

```bash
cd /Users/jerryliu/SpotifyMCP2
node get-refresh-token.js
```

This will:
1. Ask for your Client ID and Client Secret
2. Open a browser for you to authorize the app
3. Display your refresh token
4. Show the complete `.env` configuration

**Important**: Copy all the values it displays!

## Step 3: Create .env File

Create a `.env` file in the project root:

```bash
cd /Users/jerryliu/SpotifyMCP2
nano .env
```

Paste the values from Step 2:

```env
SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_CLIENT_SECRET=your_client_secret_here
SPOTIFY_REDIRECT_URI=http://localhost:3000/callback
SPOTIFY_REFRESH_TOKEN=your_refresh_token_here
```

Save and exit (Ctrl+O, Enter, Ctrl+X in nano).

## Step 4: Test the Server

Make sure everything works:

```bash
npm run build
npm run test:integration
```

You should see all tests passing.

## Step 5: Configure Claude Desktop

### macOS

Edit your Claude Desktop config:

```bash
nano ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

### Windows

Edit:
```
%APPDATA%\Claude\claude_desktop_config.json
```

### Configuration

Add this to the config file:

```json
{
  "mcpServers": {
    "spotify": {
      "command": "node",
      "args": [
        "/Users/jerryliu/SpotifyMCP2/dist/index.js"
      ],
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

**⚠️ Important**:
- Use the **absolute path** to your `dist/index.js` file
- Replace `your_client_id`, `your_client_secret`, and `your_refresh_token` with your actual values
- Make sure the JSON is valid (no trailing commas, proper quotes)

### If you already have other MCP servers configured:

```json
{
  "mcpServers": {
    "existing-server": {
      "command": "...",
      "args": ["..."]
    },
    "spotify": {
      "command": "node",
      "args": [
        "/Users/jerryliu/SpotifyMCP2/dist/index.js"
      ],
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

## Step 6: Restart Claude Desktop

**Completely quit and restart Claude Desktop** (not just close the window).

### macOS:
- Press Cmd+Q to quit
- Reopen Claude Desktop from Applications

### Windows:
- Right-click system tray icon → Exit
- Reopen Claude Desktop

## Step 7: Test with Claude

Open Claude Desktop and try these commands:

### Basic Tests:

1. **"Search for songs by The Beatles"**
   - Should return a list of Beatles songs

2. **"What devices are available on Spotify?"**
   - Should list your Spotify devices (desktop, mobile, etc.)

3. **"What's currently playing on Spotify?"**
   - Shows current playback state (or says nothing is playing)

### Playback Control (requires Spotify Premium):

4. **"Play Bohemian Rhapsody by Queen"**
   - Searches and plays the song

5. **"Pause the music"**
   - Pauses playback

6. **"Skip to the next song"**
   - Skips track

7. **"Show me my playlists"**
   - Lists your Spotify playlists

## Troubleshooting

### Claude doesn't see the Spotify tools

1. Check the MCP server logs in Claude Desktop:
   - macOS: `~/Library/Logs/Claude/mcp*.log`
   - Windows: `%APPDATA%\Claude\Logs\mcp*.log`

2. Verify the path in `claude_desktop_config.json` is absolute and correct

3. Make sure you ran `npm run build` before starting Claude

4. Restart Claude Desktop completely

### "No active device" error

- Make sure Spotify is open and playing on at least one device:
  - Desktop app
  - Mobile app
  - Web player (open.spotify.com)

- The device must be active (playing or paused, not completely idle)

### Authentication errors

1. Verify your credentials in the config are correct
2. Try getting a new refresh token: `node get-refresh-token.js`
3. Make sure your Spotify Developer App has the correct redirect URI

### Server not starting

1. Check that Node.js is installed: `node --version` (needs 18+)
2. Run `npm install` to ensure dependencies are installed
3. Check for errors: `node dist/index.js` (should start without errors)

## What You Can Do

Once configured, you can ask Claude to:

### Search & Discover
- "Search for jazz music"
- "Find songs by Daft Punk"
- "Look for the Stranger Things soundtrack"

### Playback Control
- "Play [song name] by [artist]"
- "Pause/play the music"
- "Skip to the next song"
- "Go back to the previous track"

### Playlists
- "Show me my playlists"
- "What's in my 'Workout' playlist?"
- "List the tracks in [playlist name]"

### Queue Management
- "Add [song] to the queue"
- "Queue up some Beatles songs"

### Device Control
- "What devices are available?"
- "Switch playback to my phone"

### Status
- "What's currently playing?"
- "What song is this?"

## Tips

1. **Spotify Premium Required**: Playback control features require Spotify Premium
2. **Keep Spotify Open**: At least one device needs to be active
3. **Refresh Token**: Never expires unless you revoke it, so you only need to get it once
4. **Multiple Devices**: You can control which device plays music
5. **Privacy**: Your credentials stay local in the Claude Desktop config

## Need Help?

- Check `SETUP.md` for detailed Spotify Developer setup
- Check `README.md` for general documentation
- Check `TESTING_RESULTS.md` to verify the server works
- Review logs in Claude Desktop's log directory

Enjoy controlling Spotify with Claude! 🎵
