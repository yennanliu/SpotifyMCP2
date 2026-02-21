# Spotify Developer Setup Guide

This guide walks you through setting up a Spotify Developer App and obtaining the necessary credentials for the MCP server.

## Step 1: Create a Spotify Developer Account

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Log in with your Spotify account
3. Accept the Terms of Service if prompted

## Step 2: Create a New App

1. Click **"Create app"** button
2. Fill in the app details:
   - **App name**: `Spotify MCP Server` (or any name you prefer)
   - **App description**: `MCP server for Claude to control Spotify`
   - **Redirect URI**: `http://localhost:3000/callback`
   - **API**: Check "Web API"
3. Accept the Developer Terms of Service
4. Click **"Save"**

## Step 3: Get Your Client ID and Client Secret

1. On your app's dashboard, you'll see:
   - **Client ID**: Copy this value
   - **Client Secret**: Click "View client secret" and copy it

2. Save these values securely - you'll need them for your `.env` file

## Step 4: Configure Redirect URI

The redirect URI should already be set from Step 2, but verify:

1. Go to your app's **Settings**
2. Under **Redirect URIs**, ensure `http://localhost:3000/callback` is listed
3. Click **"Save"** if you made any changes

## Step 5: Obtain a Refresh Token

To get a refresh token, you need to complete the OAuth2 authorization flow once. Here's how:

### Option A: Using a Helper Script (Recommended)

Create a temporary file `get-token.js`:

```javascript
import SpotifyWebApi from 'spotify-web-api-node';
import http from 'http';
import { exec } from 'child_process';

const spotifyApi = new SpotifyWebApi({
  clientId: 'YOUR_CLIENT_ID',
  clientSecret: 'YOUR_CLIENT_SECRET',
  redirectUri: 'http://localhost:3000/callback'
});

const scopes = [
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'playlist-read-private',
  'playlist-read-collaborative',
  'user-library-read'
];

const authUrl = spotifyApi.createAuthorizeURL(scopes, 'state');

console.log('Opening browser for Spotify authorization...');
console.log('If it doesn\'t open automatically, visit:');
console.log(authUrl);

// Try to open browser
exec(`open "${authUrl}"` || `start "${authUrl}"` || `xdg-open "${authUrl}"`);

// Create temporary server to catch the callback
const server = http.createServer(async (req, res) => {
  if (req.url.startsWith('/callback')) {
    const code = new URL(req.url, 'http://localhost:3000').searchParams.get('code');

    try {
      const data = await spotifyApi.authorizationCodeGrant(code);

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <html>
          <body>
            <h1>Success!</h1>
            <p>Copy these values to your .env file:</p>
            <pre>
SPOTIFY_REFRESH_TOKEN=${data.body.refresh_token}
            </pre>
            <p>You can close this window.</p>
          </body>
        </html>
      `);

      console.log('\n=================================');
      console.log('SUCCESS! Add this to your .env file:');
      console.log('=================================\n');
      console.log(`SPOTIFY_REFRESH_TOKEN=${data.body.refresh_token}\n`);

      setTimeout(() => {
        server.close();
        process.exit(0);
      }, 1000);

    } catch (error) {
      console.error('Error getting tokens:', error);
      res.writeHead(500);
      res.end('Error getting tokens');
      server.close();
      process.exit(1);
    }
  }
});

server.listen(3000, () => {
  console.log('Listening on http://localhost:3000/callback');
});
```

Run it:

```bash
# Replace YOUR_CLIENT_ID and YOUR_CLIENT_SECRET in get-token.js first
node get-token.js
```

This will:
1. Open your browser to Spotify's authorization page
2. Ask you to log in and grant permissions
3. Redirect back to localhost:3000/callback
4. Display your refresh token

Copy the `SPOTIFY_REFRESH_TOKEN` value to your `.env` file.

### Option B: Manual Method

1. Build this URL (replace `YOUR_CLIENT_ID`):

```
https://accounts.spotify.com/authorize?client_id=YOUR_CLIENT_ID&response_type=code&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fcallback&scope=user-read-playback-state%20user-modify-playback-state%20user-read-currently-playing%20playlist-read-private%20playlist-read-collaborative%20user-library-read
```

2. Open this URL in your browser
3. Log in and authorize the app
4. You'll be redirected to `http://localhost:3000/callback?code=...` (will fail to load)
5. Copy the `code` parameter from the URL
6. Use this code to get tokens:

```bash
curl -X POST "https://accounts.spotify.com/api/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "code=YOUR_CODE_FROM_URL" \
  -d "redirect_uri=http://localhost:3000/callback" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET"
```

7. The response will include a `refresh_token` - copy this value

## Step 6: Configure Your .env File

Create a `.env` file in your project root:

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
SPOTIFY_CLIENT_ID=your_client_id_from_step_3
SPOTIFY_CLIENT_SECRET=your_client_secret_from_step_3
SPOTIFY_REDIRECT_URI=http://localhost:3000/callback
SPOTIFY_REFRESH_TOKEN=your_refresh_token_from_step_5
LOG_LEVEL=info
```

## Step 7: Verify Setup

Test that everything works:

```bash
npm run build
npm run start:mcp
```

If the server starts without errors, your setup is complete!

## Troubleshooting

### "Invalid client" error
- Double-check your `client_id` and `client_secret`
- Make sure you copied them correctly (no extra spaces)

### "Invalid redirect URI" error
- Verify the redirect URI in Spotify Dashboard matches exactly: `http://localhost:3000/callback`
- Make sure there are no trailing slashes

### "Insufficient scope" error
- Make sure you authorized all required scopes when getting the refresh token
- Try getting a new refresh token with all scopes

### Refresh token doesn't work
- Refresh tokens can expire if not used for a long time
- Get a new refresh token by repeating Step 5
- Make sure you're using the correct Spotify account

## Security Reminders

- Never share your `client_secret` or `refresh_token`
- Don't commit your `.env` file to version control
- Keep your Spotify Developer Dashboard app settings secure
- Regenerate credentials if you suspect they've been compromised

## Next Steps

Once your setup is complete:
1. Return to [README.md](./README.md) for usage instructions
2. Configure Claude Desktop to use this MCP server
3. Start controlling Spotify with Claude!
