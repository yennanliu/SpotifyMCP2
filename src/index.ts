#!/usr/bin/env node

/**
 * Spotify MCP Server
 *
 * Model Context Protocol server for controlling Spotify playback.
 * This server provides tools for searching tracks, controlling playback,
 * managing playlists, and handling devices through the MCP protocol.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode,
} from '@modelcontextprotocol/sdk/types.js';
import dotenv from 'dotenv';
import { SpotifyApiClient } from './spotify_api.js';
import type { SpotifyConfig } from './types.js';

// Import tool handlers
import { searchTracks } from './tools/search.js';
import { playTrack, playbackControl, getCurrentPlayback, addToQueue } from './tools/playback.js';
import { getUserPlaylists, getPlaylistTracks } from './tools/playlist.js';
import { getAvailableDevices } from './tools/device.js';

// Load environment variables
dotenv.config();

/**
 * Validate required environment variables
 */
function validateEnvironment(): SpotifyConfig {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;
  const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      'Missing required environment variables. Please set SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, and SPOTIFY_REDIRECT_URI in .env file'
    );
  }

  if (!refreshToken) {
    console.error(
      'Warning: SPOTIFY_REFRESH_TOKEN not set. You will need to complete OAuth flow to use the server.'
    );
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
    refreshToken,
  };
}

/**
 * Main server initialization
 */
async function main() {
  // Validate environment and create Spotify client
  const config = validateEnvironment();
  const spotifyClient = new SpotifyApiClient(config);

  // Create MCP server
  const server = new Server(
    {
      name: 'spotify-mcp-server',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  /**
   * Handler for tools/list request
   * Returns the list of all available MCP tools
   */
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'search_tracks',
          description:
            'Search for tracks on Spotify. Returns a list of tracks matching the search query with their details (name, artist, album, URI).',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query string (song name, artist, album, etc.)',
              },
              limit: {
                type: 'number',
                description: 'Maximum number of results to return (1-50, default: 10)',
                default: 10,
                minimum: 1,
                maximum: 50,
              },
            },
            required: ['query'],
          },
        },
        {
          name: 'play_track',
          description:
            'Play a specific track on Spotify. Requires a Spotify track URI in the format spotify:track:xxx',
          inputSchema: {
            type: 'object',
            properties: {
              track_uri: {
                type: 'string',
                description: 'Spotify track URI (format: spotify:track:xxx)',
              },
              device_id: {
                type: 'string',
                description: 'Optional device ID to play on. If not specified, plays on the currently active device.',
              },
            },
            required: ['track_uri'],
          },
        },
        {
          name: 'playback_control',
          description:
            'Control Spotify playback. Supports play, pause, next track, and previous track actions.',
          inputSchema: {
            type: 'object',
            properties: {
              action: {
                type: 'string',
                description: 'Playback action to perform',
                enum: ['play', 'pause', 'next', 'previous'],
              },
              device_id: {
                type: 'string',
                description: 'Optional device ID to control. If not specified, controls the currently active device.',
              },
            },
            required: ['action'],
          },
        },
        {
          name: 'get_current_playback',
          description:
            'Get current playback state including the currently playing track, progress, device info, shuffle and repeat state.',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'get_user_playlists',
          description:
            "Get the user's Spotify playlists with details including name, track count, and description.",
          inputSchema: {
            type: 'object',
            properties: {
              limit: {
                type: 'number',
                description: 'Maximum number of playlists to return (1-50, default: 20)',
                default: 20,
                minimum: 1,
                maximum: 50,
              },
            },
          },
        },
        {
          name: 'get_playlist_tracks',
          description:
            'Get tracks from a specific Spotify playlist. Returns track details including name, artist, album, and URI.',
          inputSchema: {
            type: 'object',
            properties: {
              playlist_id: {
                type: 'string',
                description: 'Spotify playlist ID',
              },
              limit: {
                type: 'number',
                description: 'Maximum number of tracks to return (1-100, default: 50)',
                default: 50,
                minimum: 1,
                maximum: 100,
              },
            },
            required: ['playlist_id'],
          },
        },
        {
          name: 'add_to_queue',
          description:
            'Add a track to the Spotify playback queue. The track will play after the current track and any other queued tracks.',
          inputSchema: {
            type: 'object',
            properties: {
              track_uri: {
                type: 'string',
                description: 'Spotify track URI (format: spotify:track:xxx)',
              },
              device_id: {
                type: 'string',
                description: 'Optional device ID. If not specified, adds to the currently active device queue.',
              },
            },
            required: ['track_uri'],
          },
        },
        {
          name: 'get_available_devices',
          description:
            'Get all available Spotify playback devices. Returns device name, type, ID, and active status.',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
      ],
    };
  });

  /**
   * Handler for tools/call request
   * Executes the requested tool with provided arguments
   */
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      let result: string;

      switch (name) {
        case 'search_tracks': {
          const query = args?.query as string;
          const limit = (args?.limit as number) ?? 10;
          result = await searchTracks(spotifyClient, query, limit);
          break;
        }

        case 'play_track': {
          const trackUri = args?.track_uri as string;
          const deviceId = args?.device_id as string | undefined;
          result = await playTrack(spotifyClient, trackUri, deviceId);
          break;
        }

        case 'playback_control': {
          const action = args?.action as 'play' | 'pause' | 'next' | 'previous';
          const deviceId = args?.device_id as string | undefined;
          result = await playbackControl(spotifyClient, action, deviceId);
          break;
        }

        case 'get_current_playback': {
          result = await getCurrentPlayback(spotifyClient);
          break;
        }

        case 'get_user_playlists': {
          const limit = (args?.limit as number) ?? 20;
          result = await getUserPlaylists(spotifyClient, limit);
          break;
        }

        case 'get_playlist_tracks': {
          const playlistId = args?.playlist_id as string;
          const limit = (args?.limit as number) ?? 50;
          result = await getPlaylistTracks(spotifyClient, playlistId, limit);
          break;
        }

        case 'add_to_queue': {
          const trackUri = args?.track_uri as string;
          const deviceId = args?.device_id as string | undefined;
          result = await addToQueue(spotifyClient, trackUri, deviceId);
          break;
        }

        case 'get_available_devices': {
          result = await getAvailableDevices(spotifyClient);
          break;
        }

        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${name}`
          );
      }

      return {
        content: [
          {
            type: 'text',
            text: result,
          },
        ],
      };
    } catch (error) {
      // Handle errors gracefully
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Check for common error types
      if (errorMessage.includes('No active device') || errorMessage.includes('No devices found')) {
        return {
          content: [
            {
              type: 'text',
              text: 'No active Spotify device found. Please open Spotify on a device (phone, computer, web player) to use playback controls.',
            },
          ],
          isError: true,
        };
      }

      if (errorMessage.includes('Authentication failed') || errorMessage.includes('token')) {
        return {
          content: [
            {
              type: 'text',
              text: 'Authentication error. Please check your Spotify credentials and refresh token in the .env file.',
            },
          ],
          isError: true,
        };
      }

      // Return the error message
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  });

  // Start the server using stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('Spotify MCP Server running on stdio');
}

// Start the server
main().catch((error) => {
  console.error('Fatal error starting server:', error);
  process.exit(1);
});
