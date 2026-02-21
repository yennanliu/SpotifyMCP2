/**
 * Search Tools
 *
 * MCP tools for searching Spotify content
 */

import type { SpotifyApiClient } from '../spotify_api.js';
import type { SearchResult } from '../types.js';

/**
 * Search for tracks on Spotify
 *
 * @param client - Spotify API client instance
 * @param query - Search query string
 * @param limit - Maximum number of results (default: 10)
 * @returns Formatted search results
 */
export async function searchTracks(
  client: SpotifyApiClient,
  query: string,
  limit: number = 10
): Promise<string> {
  if (!query || query.trim().length === 0) {
    throw new Error('Search query cannot be empty');
  }

  if (limit < 1 || limit > 50) {
    throw new Error('Limit must be between 1 and 50');
  }

  const result: SearchResult = await client.searchTracks(query, limit);

  if (result.tracks.length === 0) {
    return `No tracks found for query: "${query}"`;
  }

  let response = `Found ${result.total} tracks (showing ${result.tracks.length}):\n\n`;

  result.tracks.forEach((track, index) => {
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
