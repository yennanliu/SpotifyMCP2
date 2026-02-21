/**
 * Device Management Tools
 *
 * MCP tools for managing Spotify playback devices
 */

import type { SpotifyApiClient } from '../spotify_api.js';
import type { SpotifyDevice } from '../types.js';

/**
 * Get available playback devices
 *
 * @param client - Spotify API client instance
 * @returns Formatted device list
 */
export async function getAvailableDevices(client: SpotifyApiClient): Promise<string> {
  const devices: SpotifyDevice[] = await client.getAvailableDevices();

  if (devices.length === 0) {
    return 'No devices found. Please open Spotify on a device to start playback.';
  }

  let response = `Available devices (${devices.length}):\n\n`;

  devices.forEach((device, index) => {
    const activeIndicator = device.is_active ? ' [ACTIVE]' : '';

    response += `${index + 1}. ${device.name}${activeIndicator}\n`;
    response += `   Type: ${device.type}\n`;
    response += `   ID: ${device.id}\n`;

    if (device.volume_percent !== undefined) {
      response += `   Volume: ${device.volume_percent}%\n`;
    }

    response += `   Status: ${device.is_active ? 'Active' : 'Inactive'}\n\n`;
  });

  const activeDevice = devices.find((d) => d.is_active);
  if (activeDevice) {
    response += `Currently active: ${activeDevice.name}`;
  } else {
    response += 'No active device. Select a device to start playback.';
  }

  return response;
}
