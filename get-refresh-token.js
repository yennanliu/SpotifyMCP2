#!/usr/bin/env node
/**
 * Helper script to get Spotify refresh token
 * Run this once to obtain your refresh token for the .env file
 */

import SpotifyWebApi from 'spotify-web-api-node';
import http from 'http';
import { exec } from 'child_process';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n╔═══════════════════════════════════════════════════════════════╗');
console.log('║                                                               ║');
console.log('║        🎵 Spotify Refresh Token Generator 🎵                 ║');
console.log('║                                                               ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

function ask(question) {
  return new Promise(resolve => rl.question(question, resolve));
}

async function main() {
  console.log('Please enter your Spotify App credentials:\n');

  const clientId = await ask('Client ID: ');
  const clientSecret = await ask('Client Secret: ');

  if (!clientId || !clientSecret) {
    console.log('\n❌ Client ID and Secret are required!');
    rl.close();
    process.exit(1);
  }

  const redirectUri = 'http://localhost:3000/callback';

  const spotifyApi = new SpotifyWebApi({
    clientId: clientId.trim(),
    clientSecret: clientSecret.trim(),
    redirectUri: redirectUri
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

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('Opening browser for Spotify authorization...\n');
  console.log('If it doesn\'t open automatically, copy this URL:\n');
  console.log(authUrl);
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Try to open browser (works on macOS, Windows, Linux)
  const command = process.platform === 'darwin' ? 'open' :
                  process.platform === 'win32' ? 'start' : 'xdg-open';
  exec(`${command} "${authUrl}"`);

  // Create temporary server to catch the callback
  const server = http.createServer(async (req, res) => {
    if (req.url.startsWith('/callback')) {
      const code = new URL(req.url, 'http://localhost:3000').searchParams.get('code');

      if (!code) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<h1>Error: No authorization code received</h1>');
        console.log('\n❌ No authorization code received');
        server.close();
        rl.close();
        process.exit(1);
        return;
      }

      try {
        const data = await spotifyApi.authorizationCodeGrant(code);

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
                h1 { color: #1DB954; }
                pre { background: #f4f4f4; padding: 15px; border-radius: 5px; overflow-x: auto; }
                .success { color: #1DB954; font-size: 24px; }
              </style>
            </head>
            <body>
              <h1>✅ Success!</h1>
              <p class="success">Authorization successful!</p>
              <p>Copy this refresh token to your <code>.env</code> file:</p>
              <pre>SPOTIFY_REFRESH_TOKEN=${data.body.refresh_token}</pre>
              <p>You can close this window and return to your terminal.</p>
            </body>
          </html>
        `);

        console.log('\n╔═══════════════════════════════════════════════════════════════╗');
        console.log('║                    ✅ SUCCESS!                                ║');
        console.log('╚═══════════════════════════════════════════════════════════════╝\n');
        console.log('Add this to your .env file:\n');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`SPOTIFY_CLIENT_ID=${clientId.trim()}`);
        console.log(`SPOTIFY_CLIENT_SECRET=${clientSecret.trim()}`);
        console.log('SPOTIFY_REDIRECT_URI=http://localhost:3000/callback');
        console.log(`SPOTIFY_REFRESH_TOKEN=${data.body.refresh_token}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        setTimeout(() => {
          server.close();
          rl.close();
          console.log('✅ Done! You can now configure Claude Desktop.\n');
          process.exit(0);
        }, 1000);

      } catch (error) {
        console.error('\n❌ Error getting tokens:', error.message);
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end('<h1>Error getting tokens</h1><pre>' + error.message + '</pre>');
        server.close();
        rl.close();
        process.exit(1);
      }
    }
  });

  server.listen(3000, () => {
    console.log('⏳ Waiting for authorization...\n');
    console.log('   (A browser window should open. Log in and authorize the app)\n');
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log('\n❌ Port 3000 is already in use. Please close any other apps using port 3000 and try again.\n');
    } else {
      console.log('\n❌ Server error:', err.message);
    }
    rl.close();
    process.exit(1);
  });
}

main();
