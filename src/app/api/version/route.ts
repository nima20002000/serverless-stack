import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface BuildVersion {
  buildId: string;
  gitHash: string | null;
  buildTime: string;
  timestamp: number;
}

/**
 * GET /api/version
 *
 * Returns the current build version information.
 * Used by the service worker and client to detect when a new version is deployed.
 *
 * Response headers disable caching to ensure clients always get the latest version.
 */
export async function GET() {
  try {
    const versionFilePath = path.join(
      process.cwd(),
      'public',
      'build-version.json'
    );

    if (!fs.existsSync(versionFilePath)) {
      // Development fallback - generate a dev version
      const devVersion: BuildVersion = {
        buildId: `dev-${Date.now()}`,
        gitHash: null,
        buildTime: new Date().toISOString(),
        timestamp: Date.now(),
      };

      return NextResponse.json(devVersion, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      });
    }

    const versionData = JSON.parse(
      fs.readFileSync(versionFilePath, 'utf8')
    ) as BuildVersion;

    return NextResponse.json(versionData, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (error) {
    console.error('[api/version] Error reading version file:', error);

    return NextResponse.json(
      { error: 'Failed to get version info' },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  }
}
