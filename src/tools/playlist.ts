/**
 * Playlist Tools
 *
 * MCP tools for managing Spotify playlists
 */

import type { SpotifyApiClient } from '../spotify_api.js';
import type { SpotifyPlaylist, SpotifyTrack } from '../types.js';

/**
 * Get user's playlists
 *
 * @param client - Spotify API client instance
 * @param limit - Maximum number of playlists to return (default: 20)
 * @returns Formatted playlist list
 */
export async function getUserPlaylists(
  client: SpotifyApiClient,
  limit: number = 20
): Promise<string> {
  if (limit < 1 || limit > 50) {
    throw new Error('Limit must be between 1 and 50');
  }

  const playlists: SpotifyPlaylist[] = await client.getUserPlaylists(limit);

  if (playlists.length === 0) {
    return 'No playlists found. Create some playlists in Spotify!';
  }

  let response = `Found ${playlists.length} playlist(s):\n\n`;

  playlists.forEach((playlist, index) => {
    response += `${index + 1}. ${playlist.name}\n`;
    response += `   Tracks: ${playlist.tracks_count}\n`;

    if (playlist.description) {
      response += `   Description: ${playlist.description}\n`;
    }

    if (playlist.owner) {
      response += `   Owner: ${playlist.owner}\n`;
    }

    response += `   ID: ${playlist.id}\n`;
    response += `   URI: ${playlist.uri}\n\n`;
  });

  return response;
}

/**
 * Get tracks from a specific playlist
 *
 * @param client - Spotify API client instance
 * @param playlistId - Spotify playlist ID
 * @param limit - Maximum number of tracks to return (default: 50)
 * @returns Formatted track list
 */
export async function getPlaylistTracks(
  client: SpotifyApiClient,
  playlistId: string,
  limit: number = 50
): Promise<string> {
  if (!playlistId || playlistId.trim().length === 0) {
    throw new Error('Playlist ID cannot be empty');
  }

  if (limit < 1 || limit > 100) {
    throw new Error('Limit must be between 1 and 100');
  }

  const tracks: SpotifyTrack[] = await client.getPlaylistTracks(playlistId, limit);

  if (tracks.length === 0) {
    return `No tracks found in playlist ${playlistId}`;
  }

  let response = `Playlist tracks (showing ${tracks.length}):\n\n`;

  tracks.forEach((track, index) => {
    const duration = track.duration_ms
      ? formatDuration(track.duration_ms)
      : 'Unknown';

    response += `${index + 1}. ${track.name}\n`;
    response += `   Artist: ${track.artist}\n`;
    response += `   Album: ${track.album}\n`;
    response += `   Duration: ${duration}\n`;
    response += `   URI: ${track.uri}\n\n`;
  });

  return response;
}

/**
 * Format duration from milliseconds to MM:SS
 */
function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
