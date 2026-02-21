#!/usr/bin/env node
/**
 * Test script to verify MCP Server protocol communication
 * This tests the server without needing actual Spotify credentials
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Mock environment variables for testing
const testEnv = {
  ...process.env,
  SPOTIFY_CLIENT_ID: 'test_client_id',
  SPOTIFY_CLIENT_SECRET: 'test_client_secret',
  SPOTIFY_REDIRECT_URI: 'http://localhost:3000/callback',
  SPOTIFY_REFRESH_TOKEN: 'test_refresh_token',
  LOG_LEVEL: 'error' // Suppress logs during test
};

console.log('🧪 Testing Spotify MCP Server...\n');

// Start the MCP server
const serverPath = join(__dirname, 'dist', 'index.js');
const server = spawn('node', [serverPath], {
  env: testEnv,
  stdio: ['pipe', 'pipe', 'pipe']
});

let responseBuffer = '';
let testsPassed = 0;
let testsFailed = 0;

// Handle server output
server.stdout.on('data', (data) => {
  responseBuffer += data.toString();

  // Process complete JSON-RPC messages
  const lines = responseBuffer.split('\n');
  responseBuffer = lines.pop() || ''; // Keep incomplete line in buffer

  lines.forEach(line => {
    if (line.trim()) {
      try {
        const response = JSON.parse(line);
        console.log('📨 Received:', JSON.stringify(response, null, 2));

        // Validate response
        if (response.jsonrpc === '2.0') {
          console.log('✅ Valid JSON-RPC 2.0 response');
          testsPassed++;

          // Check for tools list
          if (response.result && response.result.tools) {
            const tools = response.result.tools;
            console.log(`✅ Found ${tools.length} MCP tools:`);
            tools.forEach(tool => {
              console.log(`   - ${tool.name}: ${tool.description.substring(0, 50)}...`);
            });
            testsPassed++;

            // Verify all 8 tools are present
            const expectedTools = [
              'search_tracks',
              'play_track',
              'playback_control',
              'get_current_playback',
              'get_user_playlists',
              'get_playlist_tracks',
              'add_to_queue',
              'get_available_devices'
            ];

            const toolNames = tools.map(t => t.name);
            const allToolsPresent = expectedTools.every(name => toolNames.includes(name));

            if (allToolsPresent) {
              console.log('✅ All 8 expected tools are registered');
              testsPassed++;
            } else {
              console.log('❌ Some expected tools are missing');
              testsFailed++;
            }

            // Test complete, shut down server
            setTimeout(() => {
              server.kill();
              printResults();
            }, 1000);
          }
        }
      } catch (e) {
        // Not JSON or incomplete
      }
    }
  });
});

server.stderr.on('data', (data) => {
  const error = data.toString();
  if (!error.includes('DeprecationWarning')) {
    console.error('⚠️  Server stderr:', error);
  }
});

server.on('error', (error) => {
  console.error('❌ Failed to start server:', error);
  testsFailed++;
  process.exit(1);
});

server.on('close', (code) => {
  if (code !== 0 && code !== null) {
    console.error(`\n❌ Server exited with code ${code}`);
  }
});

// Send MCP initialize request
setTimeout(() => {
  console.log('📤 Sending initialize request...\n');
  const initRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'test-client',
        version: '1.0.0'
      }
    }
  };

  server.stdin.write(JSON.stringify(initRequest) + '\n');
}, 500);

// After initialize, send tools/list request
setTimeout(() => {
  console.log('📤 Sending tools/list request...\n');
  const toolsListRequest = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list',
    params: {}
  };

  server.stdin.write(JSON.stringify(toolsListRequest) + '\n');
}, 1500);

function printResults() {
  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Results:');
  console.log('='.repeat(50));
  console.log(`✅ Tests Passed: ${testsPassed}`);
  console.log(`❌ Tests Failed: ${testsFailed}`);
  console.log('='.repeat(50));

  if (testsFailed === 0 && testsPassed >= 3) {
    console.log('\n🎉 All tests passed! MCP Server is working correctly.');
    console.log('\n📝 Next steps:');
    console.log('1. Set up Spotify Developer App (see SETUP.md)');
    console.log('2. Create .env file with your credentials');
    console.log('3. Add to Claude Desktop config');
    process.exit(0);
  } else {
    console.log('\n❌ Some tests failed. Please check the implementation.');
    process.exit(1);
  }
}

// Timeout after 10 seconds
setTimeout(() => {
  console.log('\n⏱️  Test timeout - server may not be responding');
  server.kill();
  printResults();
}, 10000);
