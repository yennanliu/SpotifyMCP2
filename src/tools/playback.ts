/**
 * Playback Control Tools
 *
 * MCP tools for controlling Spotify playback
 */

import type { SpotifyApiClient } from '../spotify_api.js';
import type { PlaybackAction, PlaybackState } from '../types.js';

/**
 * Play a specific track on Spotify
 *
 * @param client - Spotify API client instance
 * @param trackUri - Spotify track URI (spotify:track:xxx)
 * @param deviceId - Optional device ID to play on
 * @returns Success message
 */
export async function playTrack(
  client: SpotifyApiClient,
  trackUri: string,
  deviceId?: string
): Promise<string> {
  if (!trackUri || !trackUri.startsWith('spotify:track:')) {
    throw new Error('Invalid track URI. Must be in format: spotify:track:xxx');
  }

  await client.playTrack(trackUri, deviceId);

  return deviceId
    ? `Successfully started playing track on device ${deviceId}`
    : 'Successfully started playing track';
}

/**
 * Control playback (play/pause/next/previous)
 *
 * @param client - Spotify API client instance
 * @param action - Playback action to perform
 * @param deviceId - Optional device ID
 * @returns Success message
 */
export async function playbackControl(
  client: SpotifyApiClient,
  action: PlaybackAction,
  deviceId?: string
): Promise<string> {
  const validActions: PlaybackAction[] = ['play', 'pause', 'next', 'previous'];

  if (!validActions.includes(action)) {
    throw new Error(`Invalid action. Must be one of: ${validActions.join(', ')}`);
  }

  await client.controlPlayback(action, deviceId);

  const actionMessages: Record<PlaybackAction, string> = {
    play: 'Resumed playback',
    pause: 'Paused playback',
    next: 'Skipped to next track',
    previous: 'Skipped to previous track',
  };

  return actionMessages[action];
}

/**
 * Get current playback state
 *
 * @param client - Spotify API client instance
 * @returns Formatted playback state
 */
export async function getCurrentPlayback(client: SpotifyApiClient): Promise<string> {
  const state: PlaybackState | null = await client.getCurrentPlayback();

  if (!state || !state.track) {
    return 'No active playback. Please start playing something on Spotify.';
  }

  const duration = state.track.duration_ms
    ? formatDuration(state.track.duration_ms)
    : 'Unknown';

  const progress = state.progress_ms
    ? formatDuration(state.progress_ms)
    : 'Unknown';

  let response = `Current Playback:\n\n`;
  response += `Status: ${state.is_playing ? 'Playing' : 'Paused'}\n\n`;
  response += `Track: ${state.track.name}\n`;
  response += `Artist: ${state.track.artist}\n`;
  response += `Album: ${state.track.album}\n`;
  response += `Progress: ${progress} / ${duration}\n`;
  response += `URI: ${state.track.uri}\n\n`;

  if (state.device) {
    response += `Device: ${state.device.name} (${state.device.type})\n`;
    if (state.device.volume_percent !== undefined) {
      response += `Volume: ${state.device.volume_percent}%\n`;
    }
  }

  if (state.shuffle_state !== undefined) {
    response += `Shuffle: ${state.shuffle_state ? 'On' : 'Off'}\n`;
  }

  if (state.repeat_state) {
    response += `Repeat: ${state.repeat_state}\n`;
  }

  return response;
}

/**
 * Add a track to the playback queue
 *
 * @param client - Spotify API client instance
 * @param trackUri - Spotify track URI (spotify:track:xxx)
 * @param deviceId - Optional device ID
 * @returns Success message
 */
export async function addToQueue(
  client: SpotifyApiClient,
  trackUri: string,
  deviceId?: string
): Promise<string> {
  if (!trackUri || !trackUri.startsWith('spotify:track:')) {
    throw new Error('Invalid track URI. Must be in format: spotify:track:xxx');
  }

  await client.addToQueue(trackUri, deviceId);

  return 'Successfully added track to queue';
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
