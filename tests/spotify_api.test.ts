/**
 * Unit Tests for Spotify OAuth2 Authentication and API Client
 *
 * Test Coverage:
 * - OAuth2 authentication flow (auth.ts)
 * - Token refresh mechanism
 * - Token expiration detection
 * - API client wrapper methods (spotify_api.ts)
 * - Error handling (401, 429, 503, 404, 403)
 * - Retry logic with exponential backoff
 */

import { SpotifyAuth, SPOTIFY_SCOPES } from '../src/auth.js';
import { SpotifyApiClient, SpotifyApiError } from '../src/spotify_api.js';
import type { SpotifyConfig, TokenResponse } from '../src/types.js';

// Mock spotify-web-api-node
jest.mock('spotify-web-api-node');

// Import the mocked module
import SpotifyWebApi from 'spotify-web-api-node';

const MockedSpotifyWebApi = SpotifyWebApi as jest.MockedClass<typeof SpotifyWebApi>;

describe('SpotifyAuth', () => {
  let auth: SpotifyAuth;
  let mockApi: jest.Mocked<SpotifyWebApi>;

  const mockConfig: SpotifyConfig = {
    clientId: 'test_client_id',
    clientSecret: 'test_client_secret',
    redirectUri: 'http://localhost:3000/callback',
    refreshToken: 'test_refresh_token',
  };

  const mockTokenResponse = {
    body: {
      access_token: 'mock_access_token',
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: 'mock_refresh_token',
      scope: SPOTIFY_SCOPES.join(' '),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock API instance
    mockApi = {
      setAccessToken: jest.fn(),
      setRefreshToken: jest.fn(),
      createAuthorizeURL: jest.fn(),
      authorizationCodeGrant: jest.fn(),
      refreshAccessToken: jest.fn(),
    } as any;

    // Mock the constructor to return our mock instance
    MockedSpotifyWebApi.mockImplementation(() => mockApi);

    auth = new SpotifyAuth(mockConfig);
  });

  describe('generateAuthUrl', () => {
    it('should generate correct authorization URL', () => {
      const expectedUrl = 'https://accounts.spotify.com/authorize?client_id=test&scope=user-read-playback-state';
      mockApi.createAuthorizeURL.mockReturnValue(expectedUrl);

      const url = auth.generateAuthUrl('test_state');

      expect(mockApi.createAuthorizeURL).toHaveBeenCalledWith(SPOTIFY_SCOPES, 'test_state');
      expect(url).toBe(expectedUrl);
    });

    it('should handle missing state parameter', () => {
      const expectedUrl = 'https://accounts.spotify.com/authorize';
      mockApi.createAuthorizeURL.mockReturnValue(expectedUrl);

      const url = auth.generateAuthUrl();

      expect(mockApi.createAuthorizeURL).toHaveBeenCalledWith(SPOTIFY_SCOPES, '');
      expect(url).toBe(expectedUrl);
    });
  });

  describe('exchangeCodeForToken', () => {
    it('should successfully exchange code for token', async () => {
      mockApi.authorizationCodeGrant.mockResolvedValue(mockTokenResponse as any);

      const result = await auth.exchangeCodeForToken('test_code');

      expect(mockApi.authorizationCodeGrant).toHaveBeenCalledWith('test_code');
      expect(result.access_token).toBe('mock_access_token');
      expect(result.refresh_token).toBe('mock_refresh_token');
      expect(result.expires_in).toBe(3600);
      expect(mockApi.setAccessToken).toHaveBeenCalledWith('mock_access_token');
      expect(mockApi.setRefreshToken).toHaveBeenCalledWith('mock_refresh_token');
    });

    it('should handle invalid authorization code error', async () => {
      const error = new Error('Invalid authorization code');
      mockApi.authorizationCodeGrant.mockRejectedValue(error);

      await expect(auth.exchangeCodeForToken('invalid_code')).rejects.toThrow(
        'Failed to exchange authorization code for token'
      );
    });

    it('should store token metadata with correct expiration time', async () => {
      const startTime = Date.now();
      mockApi.authorizationCodeGrant.mockResolvedValue(mockTokenResponse as any);

      await auth.exchangeCodeForToken('test_code');

      const metadata = auth.getTokenMetadata();
      expect(metadata).not.toBeNull();
      expect(metadata!.accessToken).toBe('mock_access_token');
      expect(metadata!.refreshToken).toBe('mock_refresh_token');
      // Check expiration is approximately correct (within 1 second)
      expect(metadata!.expiresAt).toBeGreaterThanOrEqual(startTime + 3600 * 1000);
      expect(metadata!.expiresAt).toBeLessThanOrEqual(Date.now() + 3600 * 1000);
    });
  });

  describe('refreshAccessToken', () => {
    beforeEach(async () => {
      // Initialize with a token
      mockApi.authorizationCodeGrant.mockResolvedValue(mockTokenResponse as any);
      await auth.exchangeCodeForToken('test_code');
      jest.clearAllMocks();
    });

    it('should successfully refresh access token', async () => {
      const newTokenResponse = {
        body: {
          access_token: 'new_access_token',
          token_type: 'Bearer',
          expires_in: 3600,
          scope: SPOTIFY_SCOPES.join(' '),
        },
      };
      mockApi.refreshAccessToken.mockResolvedValue(newTokenResponse as any);

      const result = await auth.refreshAccessToken();

      expect(mockApi.refreshAccessToken).toHaveBeenCalled();
      expect(result.access_token).toBe('new_access_token');
      expect(mockApi.setAccessToken).toHaveBeenCalledWith('new_access_token');
      // Should keep old refresh token if not provided
      expect(result.refresh_token).toBe('mock_refresh_token');
    });

    it('should update refresh token if new one is provided', async () => {
      const newTokenResponse = {
        body: {
          access_token: 'new_access_token',
          token_type: 'Bearer',
          expires_in: 3600,
          refresh_token: 'new_refresh_token',
          scope: SPOTIFY_SCOPES.join(' '),
        },
      };
      mockApi.refreshAccessToken.mockResolvedValue(newTokenResponse as any);

      const result = await auth.refreshAccessToken();

      expect(result.refresh_token).toBe('new_refresh_token');
      // setRefreshToken is called because new token is different from old 'mock_refresh_token'
      const metadata = auth.getTokenMetadata();
      expect(metadata!.refreshToken).toBe('new_refresh_token');
    });

    it('should handle invalid refresh token error', async () => {
      const error = new Error('Invalid refresh token');
      mockApi.refreshAccessToken.mockRejectedValue(error);

      await expect(auth.refreshAccessToken()).rejects.toThrow(
        'Failed to refresh access token'
      );
    });

    it('should throw error if no refresh token available', async () => {
      // Create auth without refresh token
      const authNoToken = new SpotifyAuth({
        clientId: 'test',
        clientSecret: 'test',
        redirectUri: 'http://localhost:3000/callback',
      });

      await expect(authNoToken.refreshAccessToken()).rejects.toThrow(
        'No refresh token available'
      );
    });
  });

  describe('isTokenExpired', () => {
    it('should return true if no token metadata exists', () => {
      const authNoToken = new SpotifyAuth({
        clientId: 'test',
        clientSecret: 'test',
        redirectUri: 'http://localhost:3000/callback',
      });

      expect(authNoToken.isTokenExpired()).toBe(true);
    });

    it('should return true if token has expired', async () => {
      // Mock a token that expired in the past
      const expiredTokenResponse = {
        body: {
          ...mockTokenResponse.body,
          expires_in: -1, // Expired 1 second ago
        },
      };
      mockApi.authorizationCodeGrant.mockResolvedValue(expiredTokenResponse as any);
      await auth.exchangeCodeForToken('test_code');

      expect(auth.isTokenExpired()).toBe(true);
    });

    it('should return true if token expires within 60 seconds (buffer)', async () => {
      // Mock a token that expires in 30 seconds
      const soonToExpireResponse = {
        body: {
          ...mockTokenResponse.body,
          expires_in: 30, // Expires in 30 seconds
        },
      };
      mockApi.authorizationCodeGrant.mockResolvedValue(soonToExpireResponse as any);
      await auth.exchangeCodeForToken('test_code');

      expect(auth.isTokenExpired()).toBe(true);
    });

    it('should return false if token is valid and not expiring soon', async () => {
      // Mock a token that expires in 2 hours
      const validTokenResponse = {
        body: {
          ...mockTokenResponse.body,
          expires_in: 7200, // Expires in 2 hours
        },
      };
      mockApi.authorizationCodeGrant.mockResolvedValue(validTokenResponse as any);
      await auth.exchangeCodeForToken('test_code');

      expect(auth.isTokenExpired()).toBe(false);
    });
  });

  describe('ensureValidToken', () => {
    it('should automatically refresh expired token', async () => {
      // Initialize with expired token
      const expiredTokenResponse = {
        body: {
          ...mockTokenResponse.body,
          expires_in: -1,
        },
      };
      mockApi.authorizationCodeGrant.mockResolvedValue(expiredTokenResponse as any);
      await auth.exchangeCodeForToken('test_code');

      // Mock refresh
      const newTokenResponse = {
        body: {
          access_token: 'refreshed_token',
          token_type: 'Bearer',
          expires_in: 3600,
          scope: SPOTIFY_SCOPES.join(' '),
        },
      };
      mockApi.refreshAccessToken.mockResolvedValue(newTokenResponse as any);

      const token = await auth.ensureValidToken();

      expect(mockApi.refreshAccessToken).toHaveBeenCalled();
      expect(token).toBe('refreshed_token');
    });

    it('should not refresh valid token', async () => {
      // Initialize with valid token
      mockApi.authorizationCodeGrant.mockResolvedValue(mockTokenResponse as any);
      await auth.exchangeCodeForToken('test_code');
      jest.clearAllMocks();

      const token = await auth.ensureValidToken();

      expect(mockApi.refreshAccessToken).not.toHaveBeenCalled();
      expect(token).toBe('mock_access_token');
    });

    it('should throw error if no token is available after refresh attempt', async () => {
      const authNoToken = new SpotifyAuth({
        clientId: 'test',
        clientSecret: 'test',
        redirectUri: 'http://localhost:3000/callback',
      });

      await expect(authNoToken.ensureValidToken()).rejects.toThrow(
        'No refresh token available'
      );
    });
  });

  describe('getApiClient', () => {
    it('should return SpotifyWebApi instance', () => {
      const client = auth.getApiClient();
      expect(client).toBe(mockApi);
    });
  });

  describe('getTokenMetadata', () => {
    it('should return null when no token exists', () => {
      const authNoToken = new SpotifyAuth({
        clientId: 'test',
        clientSecret: 'test',
        redirectUri: 'http://localhost:3000/callback',
      });

      expect(authNoToken.getTokenMetadata()).toBeNull();
    });

    it('should return token metadata when token exists', async () => {
      mockApi.authorizationCodeGrant.mockResolvedValue(mockTokenResponse as any);
      await auth.exchangeCodeForToken('test_code');

      const metadata = auth.getTokenMetadata();
      expect(metadata).not.toBeNull();
      expect(metadata!.accessToken).toBe('mock_access_token');
      expect(metadata!.refreshToken).toBe('mock_refresh_token');
    });

    it('should return a copy of metadata (immutable)', async () => {
      mockApi.authorizationCodeGrant.mockResolvedValue(mockTokenResponse as any);
      await auth.exchangeCodeForToken('test_code');

      const metadata1 = auth.getTokenMetadata();
      const metadata2 = auth.getTokenMetadata();

      expect(metadata1).not.toBe(metadata2); // Different objects
      expect(metadata1).toEqual(metadata2); // Same content
    });
  });
});

describe('SpotifyApiClient', () => {
  let client: SpotifyApiClient;
  let mockApi: jest.Mocked<SpotifyWebApi>;

  const mockConfig: SpotifyConfig = {
    clientId: 'test_client_id',
    clientSecret: 'test_client_secret',
    redirectUri: 'http://localhost:3000/callback',
    refreshToken: 'test_refresh_token',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockApi = {
      setAccessToken: jest.fn(),
      setRefreshToken: jest.fn(),
      createAuthorizeURL: jest.fn(),
      authorizationCodeGrant: jest.fn(),
      refreshAccessToken: jest.fn(),
      searchTracks: jest.fn(),
      play: jest.fn(),
      pause: jest.fn(),
      skipToNext: jest.fn(),
      skipToPrevious: jest.fn(),
      getMyCurrentPlaybackState: jest.fn(),
      getUserPlaylists: jest.fn(),
      getPlaylistTracks: jest.fn(),
      addToQueue: jest.fn(),
      getMyDevices: jest.fn(),
    } as any;

    MockedSpotifyWebApi.mockImplementation(() => mockApi);

    // Mock valid token
    const mockTokenResponse = {
      body: {
        access_token: 'mock_access_token',
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: 'test_refresh_token',
        scope: SPOTIFY_SCOPES.join(' '),
      },
    };
    mockApi.authorizationCodeGrant.mockResolvedValue(mockTokenResponse as any);
    mockApi.refreshAccessToken.mockResolvedValue(mockTokenResponse as any);

    client = new SpotifyApiClient(mockConfig);
  });

  describe('initialization', () => {
    it('should initialize with correct configuration', () => {
      expect(MockedSpotifyWebApi).toHaveBeenCalledWith({
        clientId: mockConfig.clientId,
        clientSecret: mockConfig.clientSecret,
        redirectUri: mockConfig.redirectUri,
      });
      expect(mockApi.setRefreshToken).toHaveBeenCalledWith(mockConfig.refreshToken);
    });

    it('should accept custom retry configuration', () => {
      const customRetryConfig = {
        maxRetries: 5,
        initialDelayMs: 2000,
      };

      const customClient = new SpotifyApiClient(mockConfig, customRetryConfig);
      expect(customClient).toBeInstanceOf(SpotifyApiClient);
    });
  });

  describe('searchTracks', () => {
    const mockSearchResponse = {
      body: {
        tracks: {
          items: [
            {
              id: 'track1',
              name: 'Test Song',
              artists: [{ name: 'Artist 1' }, { name: 'Artist 2' }],
              album: { name: 'Test Album' },
              uri: 'spotify:track:track1',
              duration_ms: 200000,
            },
            {
              id: 'track2',
              name: 'Another Song',
              artists: [{ name: 'Artist 3' }],
              album: { name: 'Another Album' },
              uri: 'spotify:track:track2',
              duration_ms: 180000,
            },
          ],
          total: 100,
        },
      },
    };

    it('should successfully search and return tracks', async () => {
      mockApi.searchTracks.mockResolvedValue(mockSearchResponse as any);

      const result = await client.searchTracks('test query', 10);

      expect(mockApi.searchTracks).toHaveBeenCalledWith('test query', { limit: 10 });
      expect(result.tracks).toHaveLength(2);
      expect(result.tracks[0].track_id).toBe('track1');
      expect(result.tracks[0].name).toBe('Test Song');
      expect(result.tracks[0].artist).toBe('Artist 1, Artist 2');
      expect(result.total).toBe(100);
    });

    it('should handle empty search results', async () => {
      const emptyResponse = {
        body: {
          tracks: {
            items: [],
            total: 0,
          },
        },
      };
      mockApi.searchTracks.mockResolvedValue(emptyResponse as any);

      const result = await client.searchTracks('nonexistent', 10);

      expect(result.tracks).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should use default limit of 10 if not specified', async () => {
      mockApi.searchTracks.mockResolvedValue(mockSearchResponse as any);

      await client.searchTracks('test');

      expect(mockApi.searchTracks).toHaveBeenCalledWith('test', { limit: 10 });
    });
  });

  describe('playTrack', () => {
    it('should successfully play a track', async () => {
      mockApi.play.mockResolvedValue({} as any);

      await client.playTrack('spotify:track:test123');

      expect(mockApi.play).toHaveBeenCalledWith({
        uris: ['spotify:track:test123'],
        device_id: undefined,
      });
    });

    it('should play track on specific device', async () => {
      mockApi.play.mockResolvedValue({} as any);

      await client.playTrack('spotify:track:test123', 'device123');

      expect(mockApi.play).toHaveBeenCalledWith({
        uris: ['spotify:track:test123'],
        device_id: 'device123',
      });
    });
  });

  describe('controlPlayback', () => {
    it('should execute play action', async () => {
      mockApi.play.mockResolvedValue({} as any);

      await client.controlPlayback('play');

      expect(mockApi.play).toHaveBeenCalledWith(undefined);
    });

    it('should execute pause action', async () => {
      mockApi.pause.mockResolvedValue({} as any);

      await client.controlPlayback('pause');

      expect(mockApi.pause).toHaveBeenCalledWith(undefined);
    });

    it('should execute next action', async () => {
      mockApi.skipToNext.mockResolvedValue({} as any);

      await client.controlPlayback('next');

      expect(mockApi.skipToNext).toHaveBeenCalledWith(undefined);
    });

    it('should execute previous action', async () => {
      mockApi.skipToPrevious.mockResolvedValue({} as any);

      await client.controlPlayback('previous');

      expect(mockApi.skipToPrevious).toHaveBeenCalledWith(undefined);
    });

    it('should control playback on specific device', async () => {
      mockApi.play.mockResolvedValue({} as any);

      await client.controlPlayback('play', 'device123');

      expect(mockApi.play).toHaveBeenCalledWith({ device_id: 'device123' });
    });
  });

  describe('getCurrentPlayback', () => {
    const mockPlaybackResponse = {
      body: {
        is_playing: true,
        item: {
          id: 'track1',
          name: 'Current Song',
          artists: [{ name: 'Current Artist' }],
          album: { name: 'Current Album' },
          uri: 'spotify:track:track1',
          duration_ms: 240000,
        },
        progress_ms: 120000,
        device: {
          id: 'device1',
          name: 'My Device',
          type: 'Computer',
          is_active: true,
          volume_percent: 80,
        },
        shuffle_state: false,
        repeat_state: 'off',
      },
    };

    it('should return current playback state', async () => {
      mockApi.getMyCurrentPlaybackState.mockResolvedValue(mockPlaybackResponse as any);

      const result = await client.getCurrentPlayback();

      expect(result).not.toBeNull();
      expect(result!.is_playing).toBe(true);
      expect(result!.track!.name).toBe('Current Song');
      expect(result!.progress_ms).toBe(120000);
      expect(result!.device!.name).toBe('My Device');
      expect(result!.shuffle_state).toBe(false);
      expect(result!.repeat_state).toBe('off');
    });

    it('should return null if nothing is playing', async () => {
      mockApi.getMyCurrentPlaybackState.mockResolvedValue({ body: null } as any);

      const result = await client.getCurrentPlayback();

      expect(result).toBeNull();
    });

    it('should return null if no item in playback', async () => {
      mockApi.getMyCurrentPlaybackState.mockResolvedValue({
        body: { is_playing: false, item: null },
      } as any);

      const result = await client.getCurrentPlayback();

      expect(result).toBeNull();
    });
  });

  describe('getUserPlaylists', () => {
    const mockPlaylistsResponse = {
      body: {
        items: [
          {
            id: 'playlist1',
            name: 'My Playlist',
            tracks: { total: 50 },
            uri: 'spotify:playlist:playlist1',
            description: 'Test playlist',
            owner: { display_name: 'User1', id: 'user1' },
          },
          {
            id: 'playlist2',
            name: 'Another Playlist',
            tracks: { total: 30 },
            uri: 'spotify:playlist:playlist2',
            description: null,
            owner: { display_name: null, id: 'user2' },
          },
        ],
      },
    };

    it('should return user playlists', async () => {
      mockApi.getUserPlaylists.mockResolvedValue(mockPlaylistsResponse as any);

      const result = await client.getUserPlaylists(20);

      expect(mockApi.getUserPlaylists).toHaveBeenCalledWith({ limit: 20 });
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('My Playlist');
      expect(result[0].tracks_count).toBe(50);
      expect(result[0].description).toBe('Test playlist');
      expect(result[0].owner).toBe('User1');
      expect(result[1].owner).toBe('user2'); // Fallback to ID
    });

    it('should use default limit of 20', async () => {
      mockApi.getUserPlaylists.mockResolvedValue(mockPlaylistsResponse as any);

      await client.getUserPlaylists();

      expect(mockApi.getUserPlaylists).toHaveBeenCalledWith({ limit: 20 });
    });
  });

  describe('getPlaylistTracks', () => {
    const mockPlaylistTracksResponse = {
      body: {
        items: [
          {
            track: {
              id: 'track1',
              name: 'Playlist Song 1',
              artists: [{ name: 'Artist 1' }],
              album: { name: 'Album 1' },
              uri: 'spotify:track:track1',
              duration_ms: 200000,
            },
          },
          {
            track: null, // Null track should be filtered
          },
          {
            track: {
              id: 'track2',
              name: 'Playlist Song 2',
              artists: [{ name: 'Artist 2' }],
              album: { name: 'Album 2' },
              uri: 'spotify:track:track2',
              duration_ms: 180000,
            },
          },
        ],
      },
    };

    it('should return playlist tracks', async () => {
      mockApi.getPlaylistTracks.mockResolvedValue(mockPlaylistTracksResponse as any);

      const result = await client.getPlaylistTracks('playlist123', 50);

      expect(mockApi.getPlaylistTracks).toHaveBeenCalledWith('playlist123', { limit: 50 });
      expect(result).toHaveLength(2); // Null track filtered out
      expect(result[0].name).toBe('Playlist Song 1');
      expect(result[1].name).toBe('Playlist Song 2');
    });

    it('should use default limit of 50', async () => {
      mockApi.getPlaylistTracks.mockResolvedValue(mockPlaylistTracksResponse as any);

      await client.getPlaylistTracks('playlist123');

      expect(mockApi.getPlaylistTracks).toHaveBeenCalledWith('playlist123', { limit: 50 });
    });
  });

  describe('addToQueue', () => {
    it('should add track to queue', async () => {
      mockApi.addToQueue.mockResolvedValue({} as any);

      await client.addToQueue('spotify:track:test123');

      expect(mockApi.addToQueue).toHaveBeenCalledWith('spotify:track:test123', undefined);
    });

    it('should add track to queue on specific device', async () => {
      mockApi.addToQueue.mockResolvedValue({} as any);

      await client.addToQueue('spotify:track:test123', 'device123');

      expect(mockApi.addToQueue).toHaveBeenCalledWith('spotify:track:test123', {
        device_id: 'device123',
      });
    });
  });

  describe('getAvailableDevices', () => {
    const mockDevicesResponse = {
      body: {
        devices: [
          {
            id: 'device1',
            name: 'Computer',
            type: 'Computer',
            is_active: true,
            volume_percent: 80,
          },
          {
            id: 'device2',
            name: 'Phone',
            type: 'Smartphone',
            is_active: false,
            volume_percent: null,
          },
        ],
      },
    };

    it('should return available devices', async () => {
      mockApi.getMyDevices.mockResolvedValue(mockDevicesResponse as any);

      const result = await client.getAvailableDevices();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Computer');
      expect(result[0].is_active).toBe(true);
      expect(result[0].volume_percent).toBe(80);
      expect(result[1].volume_percent).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      // Initialize client with valid token
      mockApi.authorizationCodeGrant.mockResolvedValue({
        body: {
          access_token: 'test_access_token',
          token_type: 'Bearer',
          expires_in: 3600,
          refresh_token: 'test_refresh_token',
          scope: SPOTIFY_SCOPES.join(' '),
        },
      } as any);

      await client.getAuth().exchangeCodeForToken('test_code');
      jest.clearAllMocks();
    });

    it('should automatically refresh token on 401 error and retry', async () => {
      const error401 = {
        statusCode: 401,
        message: 'Unauthorized',
      };

      const mockSearchResponse = {
        body: {
          tracks: { items: [], total: 0 },
        },
      };

      // First call fails with 401, second succeeds
      mockApi.searchTracks
        .mockRejectedValueOnce(error401)
        .mockResolvedValueOnce(mockSearchResponse as any);

      const result = await client.searchTracks('test');

      expect(mockApi.refreshAccessToken).toHaveBeenCalled();
      expect(mockApi.searchTracks).toHaveBeenCalledTimes(2);
      expect(result.tracks).toHaveLength(0);
    });

    it('should retry with exponential backoff on 429 error', async () => {
      const error429 = {
        statusCode: 429,
        headers: { 'retry-after': '2' },
        message: 'Rate limited',
      };

      const mockSearchResponse = {
        body: {
          tracks: { items: [], total: 0 },
        },
      };

      // Mock setTimeout to avoid actual delays in tests
      jest.useFakeTimers();

      // First call fails with 429, second succeeds
      mockApi.searchTracks
        .mockRejectedValueOnce(error429)
        .mockResolvedValueOnce(mockSearchResponse as any);

      const promise = client.searchTracks('test');

      // Fast-forward time
      await jest.runAllTimersAsync();

      const result = await promise;

      expect(mockApi.searchTracks).toHaveBeenCalledTimes(2);
      expect(result.tracks).toHaveLength(0);

      jest.useRealTimers();
    }, 10000);

    it('should retry on 503 error with exponential backoff', async () => {
      const error503 = {
        statusCode: 503,
        message: 'Service unavailable',
      };

      const mockSearchResponse = {
        body: {
          tracks: { items: [], total: 0 },
        },
      };

      jest.useFakeTimers();

      mockApi.searchTracks
        .mockRejectedValueOnce(error503)
        .mockResolvedValueOnce(mockSearchResponse as any);

      const promise = client.searchTracks('test');
      await jest.runAllTimersAsync();

      const result = await promise;

      expect(mockApi.searchTracks).toHaveBeenCalledTimes(2);
      expect(result.tracks).toHaveLength(0);

      jest.useRealTimers();
    }, 10000);

    it('should throw SpotifyApiError on 404 error', async () => {
      const error404 = {
        statusCode: 404,
        body: { error: { status: 404, message: 'Not found' } },
      };

      mockApi.searchTracks.mockRejectedValue(error404);

      await expect(client.searchTracks('test')).rejects.toThrow(SpotifyApiError);
      await expect(client.searchTracks('test')).rejects.toThrow(
        'Resource not found'
      );
    });

    it('should throw SpotifyApiError on 403 error', async () => {
      const error403 = {
        statusCode: 403,
        body: { error: { status: 403, message: 'Forbidden' } },
      };

      mockApi.play.mockRejectedValue(error403);

      await expect(client.playTrack('spotify:track:test')).rejects.toThrow(
        SpotifyApiError
      );
      await expect(client.playTrack('spotify:track:test')).rejects.toThrow(
        'Access forbidden'
      );
    });

    it('should throw SpotifyApiError after max retries on 429 error', async () => {
      const error429 = {
        statusCode: 429,
        headers: { 'retry-after': '0' }, // Use 0 to avoid long delays
        body: { error: { status: 429, message: 'Rate limited' } },
      };

      mockApi.searchTracks.mockRejectedValue(error429);

      try {
        await client.searchTracks('test');
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(SpotifyApiError);
        expect((error as SpotifyApiError).message).toContain('Rate limit exceeded');
        // Should have tried maxRetries + 1 times (initial + 3 retries)
        expect(mockApi.searchTracks).toHaveBeenCalledTimes(4);
      }
    }, 10000);

    it('should throw SpotifyApiError after max retries on 503 error', async () => {
      const error503 = {
        statusCode: 503,
        body: { error: { status: 503, message: 'Service unavailable' } },
      };

      // Create client with minimal retry delays for testing
      const fastRetryClient = new SpotifyApiClient(mockConfig, {
        maxRetries: 3,
        initialDelayMs: 1, // Very short delay
        maxDelayMs: 10,
        backoffMultiplier: 2,
      });
      await fastRetryClient.getAuth().exchangeCodeForToken('test_code');
      jest.clearAllMocks();

      mockApi.searchTracks.mockRejectedValue(error503);

      try {
        await fastRetryClient.searchTracks('test');
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(SpotifyApiError);
        expect((error as SpotifyApiError).message).toContain('temporarily unavailable');
      }
    }, 10000);

    it('should include status code in SpotifyApiError', async () => {
      const error404 = {
        statusCode: 404,
        body: { error: { status: 404, message: 'Not found' } },
      };

      mockApi.searchTracks.mockRejectedValue(error404);

      try {
        await client.searchTracks('test');
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(SpotifyApiError);
        expect((error as SpotifyApiError).statusCode).toBe(404);
      }
    });

    it('should handle unknown error gracefully', async () => {
      const unknownError = new Error('Something went wrong');

      mockApi.searchTracks.mockRejectedValue(unknownError);

      await expect(client.searchTracks('test')).rejects.toThrow(SpotifyApiError);
      await expect(client.searchTracks('test')).rejects.toThrow('Failed to search tracks');
    });

    it('should handle error without status code', async () => {
      const errorNoStatus = {
        message: 'Network error',
      };

      mockApi.searchTracks.mockRejectedValue(errorNoStatus);

      await expect(client.searchTracks('test')).rejects.toThrow(SpotifyApiError);
    });
  });

  describe('generateAuthUrl', () => {
    it('should delegate to auth module', () => {
      const mockAuthUrl = 'https://accounts.spotify.com/authorize';
      mockApi.createAuthorizeURL.mockReturnValue(mockAuthUrl);

      const url = client.generateAuthUrl('test_state');

      expect(url).toBe(mockAuthUrl);
    });
  });

  describe('exchangeCodeForToken', () => {
    it('should delegate to auth module', async () => {
      const mockTokenResponse = {
        body: {
          access_token: 'new_token',
          token_type: 'Bearer',
          expires_in: 3600,
          refresh_token: 'new_refresh',
          scope: SPOTIFY_SCOPES.join(' '),
        },
      };
      mockApi.authorizationCodeGrant.mockResolvedValue(mockTokenResponse as any);

      await client.exchangeCodeForToken('test_code');

      expect(mockApi.authorizationCodeGrant).toHaveBeenCalledWith('test_code');
    });
  });

  describe('getAuth', () => {
    it('should return auth instance', () => {
      const auth = client.getAuth();
      expect(auth).toBeInstanceOf(SpotifyAuth);
    });
  });
});
