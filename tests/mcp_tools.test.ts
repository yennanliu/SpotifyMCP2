/**
 * Integration Tests for MCP Tools
 *
 * Tests all 8 MCP tools for:
 * - Tool functionality under different API responses
 * - Edge cases (empty results, no active devices, etc.)
 * - MCP protocol compliance (correct message format)
 * - Input validation and error handling
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { SpotifyApiClient } from '../src/spotify_api.js';
import type {
  SpotifyConfig,
  SpotifyTrack,
  SpotifyPlaylist,
  SpotifyDevice,
  PlaybackState,
  SearchResult,
} from '../src/types.js';

// Import tool handlers
import { searchTracks } from '../src/tools/search.js';
import { playTrack, playbackControl, getCurrentPlayback, addToQueue } from '../src/tools/playback.js';
import { getUserPlaylists, getPlaylistTracks } from '../src/tools/playlist.js';
import { getAvailableDevices } from '../src/tools/device.js';

/**
 * Mock Spotify API Client
 */
const createMockClient = (): jest.Mocked<SpotifyApiClient> => {
  const mockClient = {
    searchTracks: jest.fn<() => Promise<SearchResult>>(),
    playTrack: jest.fn<() => Promise<void>>(),
    controlPlayback: jest.fn<() => Promise<void>>(),
    getCurrentPlayback: jest.fn<() => Promise<PlaybackState | null>>(),
    getUserPlaylists: jest.fn<() => Promise<SpotifyPlaylist[]>>(),
    getPlaylistTracks: jest.fn<() => Promise<SpotifyTrack[]>>(),
    addToQueue: jest.fn<() => Promise<void>>(),
    getAvailableDevices: jest.fn<() => Promise<SpotifyDevice[]>>(),
  } as unknown as jest.Mocked<SpotifyApiClient>;

  return mockClient;
};

/**
 * Sample test data
 */
const mockTrack: SpotifyTrack = {
  track_id: '1234567890',
  name: 'Test Song',
  artist: 'Test Artist',
  album: 'Test Album',
  uri: 'spotify:track:1234567890',
  duration_ms: 180000, // 3 minutes
};

const mockPlaylist: SpotifyPlaylist = {
  id: 'playlist123',
  name: 'My Test Playlist',
  tracks_count: 10,
  uri: 'spotify:playlist:playlist123',
  description: 'A test playlist',
  owner: 'testuser',
};

const mockDevice: SpotifyDevice = {
  id: 'device123',
  name: 'Test Device',
  type: 'Computer',
  is_active: true,
  volume_percent: 50,
};

const mockPlaybackState: PlaybackState = {
  is_playing: true,
  track: mockTrack,
  progress_ms: 60000,
  device: mockDevice,
  shuffle_state: false,
  repeat_state: 'off',
};

describe('MCP Tools Integration Tests', () => {
  let mockClient: jest.Mocked<SpotifyApiClient>;

  beforeEach(() => {
    mockClient = createMockClient();
    jest.clearAllMocks();
  });

  /**
   * Tool: search_tracks
   */
  describe('search_tracks', () => {
    it('should return formatted search results', async () => {
      const searchResult: SearchResult = {
        tracks: [mockTrack],
        total: 1,
      };

      mockClient.searchTracks.mockResolvedValue(searchResult);

      const result = await searchTracks(mockClient, 'test query', 10);

      expect(mockClient.searchTracks).toHaveBeenCalledWith('test query', 10);
      expect(result).toContain('Found 1 tracks');
      expect(result).toContain('Test Song');
      expect(result).toContain('Test Artist');
      expect(result).toContain('Test Album');
      expect(result).toContain('spotify:track:1234567890');
      expect(result).toContain('3:00'); // Duration formatted
    });

    it('should handle empty search results', async () => {
      const searchResult: SearchResult = {
        tracks: [],
        total: 0,
      };

      mockClient.searchTracks.mockResolvedValue(searchResult);

      const result = await searchTracks(mockClient, 'nonexistent', 10);

      expect(result).toContain('No tracks found for query: "nonexistent"');
    });

    it('should throw error for empty query', async () => {
      await expect(searchTracks(mockClient, '', 10)).rejects.toThrow(
        'Search query cannot be empty'
      );

      await expect(searchTracks(mockClient, '   ', 10)).rejects.toThrow(
        'Search query cannot be empty'
      );
    });

    it('should throw error for invalid limit (> 50)', async () => {
      await expect(searchTracks(mockClient, 'test', 51)).rejects.toThrow(
        'Limit must be between 1 and 50'
      );
    });

    it('should throw error for invalid limit (< 1)', async () => {
      await expect(searchTracks(mockClient, 'test', 0)).rejects.toThrow(
        'Limit must be between 1 and 50'
      );
    });

    it('should use default limit of 10', async () => {
      const searchResult: SearchResult = {
        tracks: [mockTrack],
        total: 1,
      };

      mockClient.searchTracks.mockResolvedValue(searchResult);

      await searchTracks(mockClient, 'test');

      expect(mockClient.searchTracks).toHaveBeenCalledWith('test', 10);
    });

    it('should handle multiple tracks correctly', async () => {
      const tracks = Array.from({ length: 5 }, (_, i) => ({
        ...mockTrack,
        track_id: `track${i}`,
        name: `Song ${i}`,
        uri: `spotify:track:track${i}`,
      }));

      const searchResult: SearchResult = {
        tracks,
        total: 5,
      };

      mockClient.searchTracks.mockResolvedValue(searchResult);

      const result = await searchTracks(mockClient, 'test', 5);

      expect(result).toContain('Found 5 tracks (showing 5)');
      tracks.forEach((track, i) => {
        expect(result).toContain(`${i + 1}. Song ${i}`);
      });
    });
  });

  /**
   * Tool: play_track
   */
  describe('play_track', () => {
    it('should successfully play track', async () => {
      mockClient.playTrack.mockResolvedValue();

      const result = await playTrack(mockClient, 'spotify:track:123');

      expect(mockClient.playTrack).toHaveBeenCalledWith('spotify:track:123', undefined);
      expect(result).toBe('Successfully started playing track');
    });

    it('should successfully play track with device_id', async () => {
      mockClient.playTrack.mockResolvedValue();

      const result = await playTrack(mockClient, 'spotify:track:123', 'device123');

      expect(mockClient.playTrack).toHaveBeenCalledWith('spotify:track:123', 'device123');
      expect(result).toBe('Successfully started playing track on device device123');
    });

    it('should throw error for invalid track URI format', async () => {
      await expect(playTrack(mockClient, 'invalid-uri')).rejects.toThrow(
        'Invalid track URI. Must be in format: spotify:track:xxx'
      );

      await expect(playTrack(mockClient, 'spotify:album:123')).rejects.toThrow(
        'Invalid track URI. Must be in format: spotify:track:xxx'
      );
    });

    it('should throw error for empty track URI', async () => {
      await expect(playTrack(mockClient, '')).rejects.toThrow(
        'Invalid track URI. Must be in format: spotify:track:xxx'
      );
    });

    it('should handle no active device error', async () => {
      mockClient.playTrack.mockRejectedValue(
        new Error('No active device found')
      );

      await expect(playTrack(mockClient, 'spotify:track:123')).rejects.toThrow(
        'No active device found'
      );
    });
  });

  /**
   * Tool: playback_control
   */
  describe('playback_control', () => {
    it('should control playback - play', async () => {
      mockClient.controlPlayback.mockResolvedValue();

      const result = await playbackControl(mockClient, 'play');

      expect(mockClient.controlPlayback).toHaveBeenCalledWith('play', undefined);
      expect(result).toBe('Resumed playback');
    });

    it('should control playback - pause', async () => {
      mockClient.controlPlayback.mockResolvedValue();

      const result = await playbackControl(mockClient, 'pause');

      expect(mockClient.controlPlayback).toHaveBeenCalledWith('pause', undefined);
      expect(result).toBe('Paused playback');
    });

    it('should control playback - next', async () => {
      mockClient.controlPlayback.mockResolvedValue();

      const result = await playbackControl(mockClient, 'next');

      expect(mockClient.controlPlayback).toHaveBeenCalledWith('next', undefined);
      expect(result).toBe('Skipped to next track');
    });

    it('should control playback - previous', async () => {
      mockClient.controlPlayback.mockResolvedValue();

      const result = await playbackControl(mockClient, 'previous');

      expect(mockClient.controlPlayback).toHaveBeenCalledWith('previous', undefined);
      expect(result).toBe('Skipped to previous track');
    });

    it('should throw error for invalid action', async () => {
      await expect(
        playbackControl(mockClient, 'invalid' as any)
      ).rejects.toThrow('Invalid action. Must be one of: play, pause, next, previous');
    });

    it('should handle no active device error', async () => {
      mockClient.controlPlayback.mockRejectedValue(
        new Error('No active device found')
      );

      await expect(playbackControl(mockClient, 'play')).rejects.toThrow(
        'No active device found'
      );
    });

    it('should pass device_id when provided', async () => {
      mockClient.controlPlayback.mockResolvedValue();

      await playbackControl(mockClient, 'play', 'device123');

      expect(mockClient.controlPlayback).toHaveBeenCalledWith('play', 'device123');
    });
  });

  /**
   * Tool: get_current_playback
   */
  describe('get_current_playback', () => {
    it('should return formatted playback state when playing', async () => {
      mockClient.getCurrentPlayback.mockResolvedValue(mockPlaybackState);

      const result = await getCurrentPlayback(mockClient);

      expect(mockClient.getCurrentPlayback).toHaveBeenCalled();
      expect(result).toContain('Current Playback:');
      expect(result).toContain('Status: Playing');
      expect(result).toContain('Track: Test Song');
      expect(result).toContain('Artist: Test Artist');
      expect(result).toContain('Album: Test Album');
      expect(result).toContain('Progress: 1:00 / 3:00');
      expect(result).toContain('Device: Test Device (Computer)');
      expect(result).toContain('Volume: 50%');
      expect(result).toContain('Shuffle: Off');
      expect(result).toContain('Repeat: off');
    });

    it('should return paused status when paused', async () => {
      const pausedState: PlaybackState = {
        ...mockPlaybackState,
        is_playing: false,
      };

      mockClient.getCurrentPlayback.mockResolvedValue(pausedState);

      const result = await getCurrentPlayback(mockClient);

      expect(result).toContain('Status: Paused');
    });

    it('should handle no playback state (nothing playing)', async () => {
      mockClient.getCurrentPlayback.mockResolvedValue(null);

      const result = await getCurrentPlayback(mockClient);

      expect(result).toBe('No active playback. Please start playing something on Spotify.');
    });

    it('should handle playback state without track', async () => {
      const stateWithoutTrack: PlaybackState = {
        is_playing: false,
        shuffle_state: false,
        repeat_state: 'off',
      };

      mockClient.getCurrentPlayback.mockResolvedValue(stateWithoutTrack);

      const result = await getCurrentPlayback(mockClient);

      expect(result).toBe('No active playback. Please start playing something on Spotify.');
    });

    it('should handle shuffle and repeat states', async () => {
      const state: PlaybackState = {
        ...mockPlaybackState,
        shuffle_state: true,
        repeat_state: 'context',
      };

      mockClient.getCurrentPlayback.mockResolvedValue(state);

      const result = await getCurrentPlayback(mockClient);

      expect(result).toContain('Shuffle: On');
      expect(result).toContain('Repeat: context');
    });

    it('should handle missing optional fields gracefully', async () => {
      const minimalState: PlaybackState = {
        is_playing: true,
        track: {
          track_id: '123',
          name: 'Minimal Track',
          artist: 'Artist',
          album: 'Album',
          uri: 'spotify:track:123',
        },
      };

      mockClient.getCurrentPlayback.mockResolvedValue(minimalState);

      const result = await getCurrentPlayback(mockClient);

      expect(result).toContain('Minimal Track');
      expect(result).toContain('Progress: Unknown / Unknown');
    });
  });

  /**
   * Tool: get_user_playlists
   */
  describe('get_user_playlists', () => {
    it('should return formatted playlists', async () => {
      mockClient.getUserPlaylists.mockResolvedValue([mockPlaylist]);

      const result = await getUserPlaylists(mockClient, 20);

      expect(mockClient.getUserPlaylists).toHaveBeenCalledWith(20);
      expect(result).toContain('Found 1 playlist(s)');
      expect(result).toContain('My Test Playlist');
      expect(result).toContain('Tracks: 10');
      expect(result).toContain('Description: A test playlist');
      expect(result).toContain('Owner: testuser');
      expect(result).toContain('ID: playlist123');
      expect(result).toContain('URI: spotify:playlist:playlist123');
    });

    it('should handle empty playlists', async () => {
      mockClient.getUserPlaylists.mockResolvedValue([]);

      const result = await getUserPlaylists(mockClient, 20);

      expect(result).toBe('No playlists found. Create some playlists in Spotify!');
    });

    it('should use default limit of 20', async () => {
      mockClient.getUserPlaylists.mockResolvedValue([mockPlaylist]);

      await getUserPlaylists(mockClient);

      expect(mockClient.getUserPlaylists).toHaveBeenCalledWith(20);
    });

    it('should throw error for invalid limit (> 50)', async () => {
      await expect(getUserPlaylists(mockClient, 51)).rejects.toThrow(
        'Limit must be between 1 and 50'
      );
    });

    it('should throw error for invalid limit (< 1)', async () => {
      await expect(getUserPlaylists(mockClient, 0)).rejects.toThrow(
        'Limit must be between 1 and 50'
      );
    });

    it('should handle multiple playlists', async () => {
      const playlists = Array.from({ length: 3 }, (_, i) => ({
        ...mockPlaylist,
        id: `playlist${i}`,
        name: `Playlist ${i}`,
        uri: `spotify:playlist:playlist${i}`,
      }));

      mockClient.getUserPlaylists.mockResolvedValue(playlists);

      const result = await getUserPlaylists(mockClient, 20);

      expect(result).toContain('Found 3 playlist(s)');
      playlists.forEach((playlist, i) => {
        expect(result).toContain(`${i + 1}. Playlist ${i}`);
      });
    });

    it('should handle playlists without optional fields', async () => {
      const minimalPlaylist: SpotifyPlaylist = {
        id: 'playlist123',
        name: 'Minimal Playlist',
        tracks_count: 5,
        uri: 'spotify:playlist:playlist123',
      };

      mockClient.getUserPlaylists.mockResolvedValue([minimalPlaylist]);

      const result = await getUserPlaylists(mockClient, 20);

      expect(result).toContain('Minimal Playlist');
      expect(result).not.toContain('Description:');
      expect(result).not.toContain('Owner:');
    });
  });

  /**
   * Tool: get_playlist_tracks
   */
  describe('get_playlist_tracks', () => {
    it('should return formatted playlist tracks', async () => {
      mockClient.getPlaylistTracks.mockResolvedValue([mockTrack]);

      const result = await getPlaylistTracks(mockClient, 'playlist123', 50);

      expect(mockClient.getPlaylistTracks).toHaveBeenCalledWith('playlist123', 50);
      expect(result).toContain('Playlist tracks (showing 1)');
      expect(result).toContain('Test Song');
      expect(result).toContain('Artist: Test Artist');
      expect(result).toContain('Album: Test Album');
      expect(result).toContain('Duration: 3:00');
      expect(result).toContain('URI: spotify:track:1234567890');
    });

    it('should handle empty playlist', async () => {
      mockClient.getPlaylistTracks.mockResolvedValue([]);

      const result = await getPlaylistTracks(mockClient, 'playlist123', 50);

      expect(result).toBe('No tracks found in playlist playlist123');
    });

    it('should throw error for empty playlist_id', async () => {
      await expect(getPlaylistTracks(mockClient, '', 50)).rejects.toThrow(
        'Playlist ID cannot be empty'
      );

      await expect(getPlaylistTracks(mockClient, '   ', 50)).rejects.toThrow(
        'Playlist ID cannot be empty'
      );
    });

    it('should throw error for invalid limit (> 100)', async () => {
      await expect(getPlaylistTracks(mockClient, 'playlist123', 101)).rejects.toThrow(
        'Limit must be between 1 and 100'
      );
    });

    it('should throw error for invalid limit (< 1)', async () => {
      await expect(getPlaylistTracks(mockClient, 'playlist123', 0)).rejects.toThrow(
        'Limit must be between 1 and 100'
      );
    });

    it('should use default limit of 50', async () => {
      mockClient.getPlaylistTracks.mockResolvedValue([mockTrack]);

      await getPlaylistTracks(mockClient, 'playlist123');

      expect(mockClient.getPlaylistTracks).toHaveBeenCalledWith('playlist123', 50);
    });

    it('should handle invalid playlist_id error from API', async () => {
      mockClient.getPlaylistTracks.mockRejectedValue(
        new Error('Resource not found. Please check the provided ID or URI.')
      );

      await expect(getPlaylistTracks(mockClient, 'invalid123', 50)).rejects.toThrow(
        'Resource not found'
      );
    });
  });

  /**
   * Tool: add_to_queue
   */
  describe('add_to_queue', () => {
    it('should successfully add track to queue', async () => {
      mockClient.addToQueue.mockResolvedValue();

      const result = await addToQueue(mockClient, 'spotify:track:123');

      expect(mockClient.addToQueue).toHaveBeenCalledWith('spotify:track:123', undefined);
      expect(result).toBe('Successfully added track to queue');
    });

    it('should successfully add track to queue with device_id', async () => {
      mockClient.addToQueue.mockResolvedValue();

      const result = await addToQueue(mockClient, 'spotify:track:123', 'device123');

      expect(mockClient.addToQueue).toHaveBeenCalledWith('spotify:track:123', 'device123');
      expect(result).toBe('Successfully added track to queue');
    });

    it('should throw error for invalid track URI', async () => {
      await expect(addToQueue(mockClient, 'invalid-uri')).rejects.toThrow(
        'Invalid track URI. Must be in format: spotify:track:xxx'
      );

      await expect(addToQueue(mockClient, 'spotify:playlist:123')).rejects.toThrow(
        'Invalid track URI. Must be in format: spotify:track:xxx'
      );
    });

    it('should throw error for empty track URI', async () => {
      await expect(addToQueue(mockClient, '')).rejects.toThrow(
        'Invalid track URI. Must be in format: spotify:track:xxx'
      );
    });

    it('should handle no active device error', async () => {
      mockClient.addToQueue.mockRejectedValue(
        new Error('No active device found')
      );

      await expect(addToQueue(mockClient, 'spotify:track:123')).rejects.toThrow(
        'No active device found'
      );
    });
  });

  /**
   * Tool: get_available_devices
   */
  describe('get_available_devices', () => {
    it('should return formatted device list', async () => {
      mockClient.getAvailableDevices.mockResolvedValue([mockDevice]);

      const result = await getAvailableDevices(mockClient);

      expect(mockClient.getAvailableDevices).toHaveBeenCalled();
      expect(result).toContain('Available devices (1)');
      expect(result).toContain('1. Test Device [ACTIVE]');
      expect(result).toContain('Type: Computer');
      expect(result).toContain('ID: device123');
      expect(result).toContain('Volume: 50%');
      expect(result).toContain('Status: Active');
      expect(result).toContain('Currently active: Test Device');
    });

    it('should handle no devices found', async () => {
      mockClient.getAvailableDevices.mockResolvedValue([]);

      const result = await getAvailableDevices(mockClient);

      expect(result).toBe('No devices found. Please open Spotify on a device to start playback.');
    });

    it('should handle multiple devices with one active', async () => {
      const devices: SpotifyDevice[] = [
        { ...mockDevice, id: 'device1', name: 'Computer', is_active: true },
        { ...mockDevice, id: 'device2', name: 'Phone', is_active: false },
        { ...mockDevice, id: 'device3', name: 'Tablet', is_active: false },
      ];

      mockClient.getAvailableDevices.mockResolvedValue(devices);

      const result = await getAvailableDevices(mockClient);

      expect(result).toContain('Available devices (3)');
      expect(result).toContain('1. Computer [ACTIVE]');
      expect(result).toContain('2. Phone');
      expect(result).toContain('3. Tablet');
      expect(result).toContain('Currently active: Computer');
    });

    it('should handle devices with no active device', async () => {
      const devices: SpotifyDevice[] = [
        { ...mockDevice, id: 'device1', is_active: false },
        { ...mockDevice, id: 'device2', is_active: false },
      ];

      mockClient.getAvailableDevices.mockResolvedValue(devices);

      const result = await getAvailableDevices(mockClient);

      expect(result).toContain('Available devices (2)');
      expect(result).not.toContain('[ACTIVE]');
      expect(result).toContain('No active device. Select a device to start playback.');
    });

    it('should handle devices without volume information', async () => {
      const deviceWithoutVolume: SpotifyDevice = {
        id: 'device123',
        name: 'Test Device',
        type: 'Computer',
        is_active: true,
      };

      mockClient.getAvailableDevices.mockResolvedValue([deviceWithoutVolume]);

      const result = await getAvailableDevices(mockClient);

      expect(result).toContain('Test Device');
      expect(result).not.toContain('Volume:');
    });
  });

  /**
   * Error Handling Tests
   * Ensures all tools return appropriate error messages in MCP format
   */
  describe('Error Handling and MCP Compliance', () => {
    it('should throw clear error messages for validation failures', async () => {
      // Search with empty query
      await expect(searchTracks(mockClient, '')).rejects.toThrow(
        'Search query cannot be empty'
      );

      // Play track with invalid URI
      await expect(playTrack(mockClient, 'invalid')).rejects.toThrow(
        'Invalid track URI'
      );

      // Playback control with invalid action
      await expect(
        playbackControl(mockClient, 'stop' as any)
      ).rejects.toThrow('Invalid action');

      // Get playlist tracks with empty ID
      await expect(getPlaylistTracks(mockClient, '')).rejects.toThrow(
        'Playlist ID cannot be empty'
      );

      // Add to queue with invalid URI
      await expect(addToQueue(mockClient, 'bad-uri')).rejects.toThrow(
        'Invalid track URI'
      );
    });

    it('should propagate API errors correctly', async () => {
      mockClient.searchTracks.mockRejectedValue(
        new Error('Rate limit exceeded')
      );

      await expect(searchTracks(mockClient, 'test')).rejects.toThrow(
        'Rate limit exceeded'
      );
    });

    it('should return text responses (MCP format)', async () => {
      // All tool functions should return string (TextContent in MCP)
      mockClient.searchTracks.mockResolvedValue({
        tracks: [mockTrack],
        total: 1,
      });
      mockClient.playTrack.mockResolvedValue();
      mockClient.getCurrentPlayback.mockResolvedValue(mockPlaybackState);

      const searchResult = await searchTracks(mockClient, 'test');
      const playResult = await playTrack(mockClient, 'spotify:track:123');
      const playbackResult = await getCurrentPlayback(mockClient);

      expect(typeof searchResult).toBe('string');
      expect(typeof playResult).toBe('string');
      expect(typeof playbackResult).toBe('string');
    });

    it('should handle authentication errors', async () => {
      mockClient.getCurrentPlayback.mockRejectedValue(
        new Error('Authentication failed')
      );

      await expect(getCurrentPlayback(mockClient)).rejects.toThrow(
        'Authentication failed'
      );
    });

    it('should handle no active device errors consistently', async () => {
      const noDeviceError = new Error('No active device found');

      mockClient.playTrack.mockRejectedValue(noDeviceError);
      mockClient.controlPlayback.mockRejectedValue(noDeviceError);
      mockClient.addToQueue.mockRejectedValue(noDeviceError);

      await expect(playTrack(mockClient, 'spotify:track:123')).rejects.toThrow(
        'No active device found'
      );
      await expect(playbackControl(mockClient, 'play')).rejects.toThrow(
        'No active device found'
      );
      await expect(addToQueue(mockClient, 'spotify:track:123')).rejects.toThrow(
        'No active device found'
      );
    });
  });

  /**
   * Integration: Test combinations of tools
   */
  describe('Integration Scenarios', () => {
    it('should search and play a track', async () => {
      // Search for tracks
      mockClient.searchTracks.mockResolvedValue({
        tracks: [mockTrack],
        total: 1,
      });

      const searchResult = await searchTracks(mockClient, 'test song');
      expect(searchResult).toContain('spotify:track:1234567890');

      // Extract URI and play
      mockClient.playTrack.mockResolvedValue();
      const playResult = await playTrack(mockClient, mockTrack.uri);
      expect(playResult).toContain('Successfully started playing');
    });

    it('should get devices and play on specific device', async () => {
      // Get available devices
      mockClient.getAvailableDevices.mockResolvedValue([mockDevice]);
      const devicesResult = await getAvailableDevices(mockClient);
      expect(devicesResult).toContain('device123');

      // Play on specific device
      mockClient.playTrack.mockResolvedValue();
      const playResult = await playTrack(mockClient, 'spotify:track:123', mockDevice.id);
      expect(playResult).toContain('device123');
    });

    it('should get playlists and then get tracks from a playlist', async () => {
      // Get user playlists
      mockClient.getUserPlaylists.mockResolvedValue([mockPlaylist]);
      const playlistsResult = await getUserPlaylists(mockClient);
      expect(playlistsResult).toContain('playlist123');

      // Get tracks from playlist
      mockClient.getPlaylistTracks.mockResolvedValue([mockTrack]);
      const tracksResult = await getPlaylistTracks(mockClient, mockPlaylist.id);
      expect(tracksResult).toContain('Test Song');
    });

    it('should handle graceful degradation when device becomes unavailable', async () => {
      // First call succeeds
      mockClient.getCurrentPlayback.mockResolvedValue(mockPlaybackState);
      let result = await getCurrentPlayback(mockClient);
      expect(result).toContain('Playing');

      // Device becomes unavailable
      mockClient.controlPlayback.mockRejectedValue(
        new Error('No active device found')
      );
      await expect(playbackControl(mockClient, 'next')).rejects.toThrow(
        'No active device found'
      );

      // Check playback shows no active playback
      mockClient.getCurrentPlayback.mockResolvedValue(null);
      result = await getCurrentPlayback(mockClient);
      expect(result).toContain('No active playback');
    });
  });
});
