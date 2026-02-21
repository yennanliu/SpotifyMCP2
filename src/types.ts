/**
 * Core types for Spotify MCP Server
 */

/**
 * Spotify Track information
 */
export interface SpotifyTrack {
  track_id: string;
  name: string;
  artist: string;
  album: string;
  uri: string;
  duration_ms?: number;
}

/**
 * Spotify Playlist information
 */
export interface SpotifyPlaylist {
  id: string;
  name: string;
  tracks_count: number;
  uri: string;
  description?: string;
  owner?: string;
}

/**
 * Spotify Device information
 */
export interface SpotifyDevice {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
  volume_percent?: number;
}

/**
 * Current playback state
 */
export interface PlaybackState {
  is_playing: boolean;
  track?: SpotifyTrack;
  progress_ms?: number;
  device?: SpotifyDevice;
  shuffle_state?: boolean;
  repeat_state?: string;
}

/**
 * Playback control actions
 */
export type PlaybackAction = 'play' | 'pause' | 'next' | 'previous';

/**
 * Search results from Spotify
 */
export interface SearchResult {
  tracks: SpotifyTrack[];
  total: number;
}

/**
 * MCP Tool result wrapper
 */
export interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Spotify API configuration
 */
export interface SpotifyConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  refreshToken?: string;
}

/**
 * OAuth token response
 */
export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
}
