/**
 * Downloader utility for Instagram reels using yt-dlp
 * Requires: brew install yt-dlp (or pip install yt-dlp)
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

interface DownloadResult {
  videoPath: string;
  title: string;
}

/**
 * Download Instagram reel using yt-dlp
 * @param url - Instagram reel URL
 * @returns Promise with video path and title
 */
export async function downloadInstagramReel(url: string): Promise<DownloadResult> {
  try {
    // Create temp directory if it doesn't exist
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const outputPath = path.join(tempDir, '%(title)s.%(ext)s');

    // yt-dlp command to download best video
    const command = `yt-dlp -f "best[ext=mp4]/best" -o "${outputPath}" "${url}"`;

    console.log('Downloading with command:', command);

    const { stderr } = await execAsync(command);

    if (stderr) {
      console.warn('yt-dlp stderr:', stderr);
    }

    // Find the downloaded file
    const files = fs.readdirSync(tempDir);
    const videoFile = files.find(f => f.endsWith('.mp4'));

    if (!videoFile) {
      throw new Error('Video file not found after download');
    }

    const videoPath = path.join(tempDir, videoFile);
    const title = videoFile.replace('.mp4', '');

    console.log(`Successfully downloaded: ${title}`);

    return { videoPath, title };
  } catch (error) {
    console.error('Download error:', error);
    const message = error instanceof Error ? error.message : 'Failed to download reel';
    throw new Error(message);
  }
}

/**
 * Clean up temporary video file
 * @param videoPath - Path to video file
 */
export function cleanupVideo(videoPath: string): void {
  try {
    if (fs.existsSync(videoPath)) {
      fs.unlinkSync(videoPath);
      console.log(`Cleaned up: ${videoPath}`);
    }
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}


