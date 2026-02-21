/**
 * Spotify OAuth2 Authentication Module
 *
 * This module handles:
 * - Generating authorization URLs for initial token acquisition
 * - Exchanging authorization codes for access tokens
 * - Refreshing access tokens using refresh tokens
 * - Token expiration detection and automatic refresh
 */

import SpotifyWebApi from 'spotify-web-api-node';
import type { SpotifyConfig, TokenResponse } from './types.js';

/**
 * Required Spotify OAuth scopes for MCP server functionality
 */
export const SPOTIFY_SCOPES = [
  'user-read-playback-state',      // Read playback state
  'user-modify-playback-state',    // Control playback
  'user-read-currently-playing',   // Read current playing track
  'playlist-read-private',         // Read private playlists
  'playlist-read-collaborative',   // Read collaborative playlists
  'user-library-read',            // Read user's library
];

/**
 * Token metadata for tracking expiration
 */
interface TokenMetadata {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp in milliseconds
}

/**
 * OAuth2 authentication handler for Spotify
 */
export class SpotifyAuth {
  private spotifyApi: SpotifyWebApi;
  private tokenMetadata: TokenMetadata | null = null;

  constructor(config: SpotifyConfig) {
    this.spotifyApi = new SpotifyWebApi({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      redirectUri: config.redirectUri,
    });

    // If refresh token is provided, set it
    if (config.refreshToken) {
      this.tokenMetadata = {
        accessToken: '',
        refreshToken: config.refreshToken,
        expiresAt: 0, // Will be refreshed on first use
      };
      this.spotifyApi.setRefreshToken(config.refreshToken);
    }
  }

  /**
   * Generate authorization URL for OAuth2 flow
   *
   * This URL should be opened in a browser for the user to authorize the application.
   * After authorization, Spotify will redirect to the redirect_uri with an authorization code.
   *
   * @param state - Optional state parameter for CSRF protection
   * @returns Authorization URL
   */
  public generateAuthUrl(state?: string): string {
    const authUrl = this.spotifyApi.createAuthorizeURL(SPOTIFY_SCOPES, state || '');
    return authUrl;
  }

  /**
   * Exchange authorization code for access and refresh tokens
   *
   * This is the second step of the OAuth2 flow, after the user has authorized
   * the application and Spotify has redirected back with an authorization code.
   *
   * @param code - Authorization code from Spotify callback
   * @returns Token response with access token, refresh token, and expiration info
   * @throws Error if token exchange fails
   */
  public async exchangeCodeForToken(code: string): Promise<TokenResponse> {
    try {
      const data = await this.spotifyApi.authorizationCodeGrant(code);

      const tokenResponse: TokenResponse = {
        access_token: data.body.access_token,
        token_type: data.body.token_type,
        expires_in: data.body.expires_in,
        refresh_token: data.body.refresh_token,
        scope: data.body.scope,
      };

      // Store token metadata
      this.tokenMetadata = {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token!,
        expiresAt: Date.now() + tokenResponse.expires_in * 1000,
      };

      // Set tokens in API client
      this.spotifyApi.setAccessToken(tokenResponse.access_token);
      this.spotifyApi.setRefreshToken(tokenResponse.refresh_token!);

      return tokenResponse;
    } catch (error) {
      throw new Error(
        `Failed to exchange authorization code for token: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Refresh the access token using the refresh token
   *
   * This method should be called when the access token has expired or is about to expire.
   * It uses the refresh token to obtain a new access token without requiring user interaction.
   *
   * @returns New token response with fresh access token
   * @throws Error if token refresh fails or no refresh token is available
   */
  public async refreshAccessToken(): Promise<TokenResponse> {
    if (!this.tokenMetadata?.refreshToken) {
      throw new Error('No refresh token available. Please authorize the application first.');
    }

    try {
      const data = await this.spotifyApi.refreshAccessToken();

      const tokenResponse: TokenResponse = {
        access_token: data.body.access_token,
        token_type: data.body.token_type,
        expires_in: data.body.expires_in,
        refresh_token: data.body.refresh_token || this.tokenMetadata.refreshToken, // Keep old refresh token if new one not provided
        scope: data.body.scope || SPOTIFY_SCOPES.join(' '),
      };

      // Update token metadata
      this.tokenMetadata = {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token!,
        expiresAt: Date.now() + tokenResponse.expires_in * 1000,
      };

      // Set new access token in API client
      this.spotifyApi.setAccessToken(tokenResponse.access_token);
      if (tokenResponse.refresh_token !== this.tokenMetadata.refreshToken) {
        this.spotifyApi.setRefreshToken(tokenResponse.refresh_token!);
      }

      return tokenResponse;
    } catch (error) {
      throw new Error(
        `Failed to refresh access token: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Check if the current access token is expired or about to expire
   *
   * Returns true if:
   * - No token metadata is available
   * - Token has already expired
   * - Token will expire within the next 60 seconds (safety buffer)
   *
   * @returns True if token is expired or about to expire, false otherwise
   */
  public isTokenExpired(): boolean {
    if (!this.tokenMetadata) {
      return true;
    }

    // Add 60 second buffer to prevent race conditions
    const expirationBuffer = 60 * 1000; // 60 seconds in milliseconds
    return Date.now() >= this.tokenMetadata.expiresAt - expirationBuffer;
  }

  /**
   * Ensure a valid access token is available
   *
   * This method checks if the token is expired and automatically refreshes it if needed.
   * It should be called before making any API requests to ensure authentication is valid.
   *
   * @returns The current valid access token
   * @throws Error if token refresh fails
   */
  public async ensureValidToken(): Promise<string> {
    if (this.isTokenExpired()) {
      await this.refreshAccessToken();
    }

    if (!this.tokenMetadata?.accessToken) {
      throw new Error('No access token available. Please authorize the application first.');
    }

    return this.tokenMetadata.accessToken;
  }

  /**
   * Get the underlying SpotifyWebApi instance
   *
   * This allows direct access to the Spotify API client for making authenticated requests.
   * The client will have the current access token set.
   *
   * @returns SpotifyWebApi instance
   */
  public getApiClient(): SpotifyWebApi {
    return this.spotifyApi;
  }

  /**
   * Get current token metadata (for debugging/monitoring)
   *
   * @returns Token metadata or null if not authenticated
   */
  public getTokenMetadata(): Readonly<TokenMetadata> | null {
    return this.tokenMetadata ? { ...this.tokenMetadata } : null;
  }
}
