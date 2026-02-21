/**
 * Spotify API Client Wrapper
 *
 * This module provides a high-level interface to the Spotify Web API with:
 * - Automatic token refresh
 * - Comprehensive error handling
 * - Exponential backoff retry mechanism for rate limiting
 * - Wrapped API methods for common operations
 */

import SpotifyWebApi from 'spotify-web-api-node';
import { SpotifyAuth } from './auth.js';
import type {
  SpotifyConfig,
  SpotifyTrack,
  SpotifyPlaylist,
  SpotifyDevice,
  PlaybackState,
  SearchResult,
} from './types.js';

/**
 * Retry configuration for exponential backoff
 */
interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

/**
 * Custom error class for Spotify API errors
 */
export class SpotifyApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'SpotifyApiError';
  }
}

/**
 * Spotify API client with automatic authentication and error handling
 */
export class SpotifyApiClient {
  private auth: SpotifyAuth;
  private api: SpotifyWebApi;
  private retryConfig: RetryConfig;

  constructor(config: SpotifyConfig, retryConfig?: Partial<RetryConfig>) {
    this.auth = new SpotifyAuth(config);
    this.api = this.auth.getApiClient();
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  }

  /**
   * Execute an API call with automatic token refresh and retry logic
   *
   * @param operation - The API operation to execute
   * @param operationName - Name of the operation for error messages
   * @returns Result of the operation
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    // Ensure we have a valid token before making the request
    await this.auth.ensureValidToken();

    let lastError: Error | null = null;
    let delay = this.retryConfig.initialDelayMs;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;

        // Check for specific error types
        const statusCode = error?.statusCode || error?.body?.error?.status;

        // 401 Unauthorized - Token expired, refresh and retry
        if (statusCode === 401) {
          console.log(`Token expired during ${operationName}, refreshing...`);
          await this.auth.refreshAccessToken();
          continue; // Retry immediately after refresh
        }

        // 429 Rate Limited - Retry with exponential backoff
        if (statusCode === 429) {
          if (attempt < this.retryConfig.maxRetries) {
            const retryAfter = error?.headers?.['retry-after'];
            const waitTime = retryAfter
              ? parseInt(retryAfter) * 1000
              : Math.min(delay, this.retryConfig.maxDelayMs);

            console.log(
              `Rate limited during ${operationName}, retrying after ${waitTime}ms (attempt ${attempt + 1}/${this.retryConfig.maxRetries})`
            );
            await this.sleep(waitTime);
            delay *= this.retryConfig.backoffMultiplier;
            continue;
          }
        }

        // 503 Service Unavailable - Retry with backoff
        if (statusCode === 503) {
          if (attempt < this.retryConfig.maxRetries) {
            const waitTime = Math.min(delay, this.retryConfig.maxDelayMs);
            console.log(
              `Service unavailable during ${operationName}, retrying after ${waitTime}ms (attempt ${attempt + 1}/${this.retryConfig.maxRetries})`
            );
            await this.sleep(waitTime);
            delay *= this.retryConfig.backoffMultiplier;
            continue;
          }
        }

        // For other errors, throw immediately
        throw this.handleError(error, operationName);
      }
    }

    // If we've exhausted all retries, throw the last error
    throw this.handleError(lastError!, operationName);
  }

  /**
   * Handle and format API errors
   */
  private handleError(error: any, operationName: string): SpotifyApiError {
    const statusCode = error?.statusCode || error?.body?.error?.status;
    const message = error?.body?.error?.message || error?.message || 'Unknown error';

    let friendlyMessage: string;

    switch (statusCode) {
      case 401:
        friendlyMessage = 'Authentication failed. Please re-authorize the application.';
        break;
      case 403:
        friendlyMessage = 'Access forbidden. You may not have the required permissions.';
        break;
      case 404:
        friendlyMessage = 'Resource not found. Please check the provided ID or URI.';
        break;
      case 429:
        friendlyMessage = 'Rate limit exceeded. Please try again later.';
        break;
      case 500:
      case 502:
      case 503:
        friendlyMessage = 'Spotify service is temporarily unavailable. Please try again later.';
        break;
      default:
        friendlyMessage = `Failed to ${operationName}: ${message}`;
    }

    return new SpotifyApiError(friendlyMessage, statusCode, error);
  }

  /**
   * Sleep for a specified duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Search for tracks on Spotify
   *
   * @param query - Search query string
   * @param limit - Maximum number of results to return (default: 10, max: 50)
   * @returns Search results with tracks and total count
   */
  public async searchTracks(query: string, limit: number = 10): Promise<SearchResult> {
    const result = await this.executeWithRetry(
      async () => this.api.searchTracks(query, { limit }),
      'search tracks'
    );

    const tracks: SpotifyTrack[] = result.body.tracks!.items.map((track) => ({
      track_id: track.id,
      name: track.name,
      artist: track.artists.map((a) => a.name).join(', '),
      album: track.album.name,
      uri: track.uri,
      duration_ms: track.duration_ms,
    }));

    return {
      tracks,
      total: result.body.tracks!.total,
    };
  }

  /**
   * Play a specific track
   *
   * @param trackUri - Spotify track URI (spotify:track:xxx)
   * @param deviceId - Optional device ID to play on
   */
  public async playTrack(trackUri: string, deviceId?: string): Promise<void> {
    await this.executeWithRetry(
      async () =>
        this.api.play({
          uris: [trackUri],
          device_id: deviceId,
        }),
      'play track'
    );
  }

  /**
   * Control playback (play/pause/next/previous)
   *
   * @param action - Playback action to perform
   * @param deviceId - Optional device ID
   */
  public async controlPlayback(
    action: 'play' | 'pause' | 'next' | 'previous',
    deviceId?: string
  ): Promise<void> {
    const options = deviceId ? { device_id: deviceId } : undefined;

    await this.executeWithRetry(async () => {
      switch (action) {
        case 'play':
          return this.api.play(options);
        case 'pause':
          return this.api.pause(options);
        case 'next':
          return this.api.skipToNext(options);
        case 'previous':
          return this.api.skipToPrevious(options);
        default:
          throw new Error(`Invalid playback action: ${action}`);
      }
    }, `${action} playback`);
  }

  /**
   * Get current playback state
   *
   * @returns Current playback state or null if nothing is playing
   */
  public async getCurrentPlayback(): Promise<PlaybackState | null> {
    const result = await this.executeWithRetry(
      async () => this.api.getMyCurrentPlaybackState(),
      'get current playback'
    );

    if (!result.body || !result.body.item) {
      return null;
    }

    const item = result.body.item as SpotifyApi.TrackObjectFull;

    return {
      is_playing: result.body.is_playing,
      track: {
        track_id: item.id,
        name: item.name,
        artist: item.artists.map((a) => a.name).join(', '),
        album: item.album.name,
        uri: item.uri,
        duration_ms: item.duration_ms,
      },
      progress_ms: result.body.progress_ms || undefined,
      device: result.body.device
        ? {
            id: result.body.device.id!,
            name: result.body.device.name,
            type: result.body.device.type,
            is_active: result.body.device.is_active,
            volume_percent: result.body.device.volume_percent || undefined,
          }
        : undefined,
      shuffle_state: result.body.shuffle_state,
      repeat_state: result.body.repeat_state,
    };
  }

  /**
   * Get user's playlists
   *
   * @param limit - Maximum number of playlists to return (default: 20, max: 50)
   * @returns Array of playlists
   */
  public async getUserPlaylists(limit: number = 20): Promise<SpotifyPlaylist[]> {
    const result = await this.executeWithRetry(
      async () => this.api.getUserPlaylists({ limit }),
      'get user playlists'
    );

    return result.body.items.map((playlist) => ({
      id: playlist.id,
      name: playlist.name,
      tracks_count: playlist.tracks.total,
      uri: playlist.uri,
      description: playlist.description || undefined,
      owner: playlist.owner.display_name || playlist.owner.id,
    }));
  }

  /**
   * Get tracks from a specific playlist
   *
   * @param playlistId - Spotify playlist ID
   * @param limit - Maximum number of tracks to return (default: 50, max: 100)
   * @returns Array of tracks
   */
  public async getPlaylistTracks(playlistId: string, limit: number = 50): Promise<SpotifyTrack[]> {
    const result = await this.executeWithRetry(
      async () => this.api.getPlaylistTracks(playlistId, { limit }),
      'get playlist tracks'
    );

    return result.body.items
      .filter((item) => item.track) // Filter out null tracks
      .map((item) => {
        const track = item.track as SpotifyApi.TrackObjectFull;
        return {
          track_id: track.id,
          name: track.name,
          artist: track.artists.map((a) => a.name).join(', '),
          album: track.album.name,
          uri: track.uri,
          duration_ms: track.duration_ms,
        };
      });
  }

  /**
   * Add a track to the playback queue
   *
   * @param trackUri - Spotify track URI (spotify:track:xxx)
   * @param deviceId - Optional device ID
   */
  public async addToQueue(trackUri: string, deviceId?: string): Promise<void> {
    await this.executeWithRetry(
      async () =>
        this.api.addToQueue(trackUri, deviceId ? { device_id: deviceId } : undefined),
      'add to queue'
    );
  }

  /**
   * Get available playback devices
   *
   * @returns Array of available devices
   */
  public async getAvailableDevices(): Promise<SpotifyDevice[]> {
    const result = await this.executeWithRetry(
      async () => this.api.getMyDevices(),
      'get available devices'
    );

    return result.body.devices.map((device) => ({
      id: device.id!,
      name: device.name,
      type: device.type,
      is_active: device.is_active,
      volume_percent: device.volume_percent || undefined,
    }));
  }

  /**
   * Get the authentication handler (useful for initial setup)
   */
  public getAuth(): SpotifyAuth {
    return this.auth;
  }

  /**
   * Generate authorization URL for initial OAuth flow
   *
   * @param state - Optional state parameter for CSRF protection
   * @returns Authorization URL
   */
  public generateAuthUrl(state?: string): string {
    return this.auth.generateAuthUrl(state);
  }

  /**
   * Exchange authorization code for tokens
   *
   * @param code - Authorization code from OAuth callback
   */
  public async exchangeCodeForToken(code: string): Promise<void> {
    await this.auth.exchangeCodeForToken(code);
  }
}
