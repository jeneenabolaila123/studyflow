/**
 * Audio extraction utility using FFmpeg
 * Requires: brew install ffmpeg (or download from https://ffmpeg.org)
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';

const execAsync = promisify(exec);

/**
 * Extract audio from video file using FFmpeg
 * @param videoPath - Path to input video file
 * @returns Path to output audio file
 */
export async function extractAudio(videoPath: string): Promise<string> {
  try {
    const audioPath = videoPath.replace('.mp4', '.wav');

    // FFmpeg command to extract audio as mono 16kHz WAV (optimal for Whisper)
    const command = `ffmpeg -i "${videoPath}" -ar 16000 -ac 1 -f wav "${audioPath}" -y`;

    console.log('Extracting audio with command:', command);

    const { stderr } = await execAsync(command);

    if (stderr && !stderr.includes('Output')) {
      console.warn('FFmpeg stderr:', stderr);
    }

    if (!fs.existsSync(audioPath)) {
      throw new Error('Audio file not created');
    }

    console.log(`Successfully extracted audio: ${audioPath}`);

    return audioPath;
  } catch (error) {
    console.error('Audio extraction error:', error);
    const message = error instanceof Error ? error.message : 'Failed to extract audio';
    throw new Error(message);
  }
}

/**
 * Clean up temporary audio file
 * @param audioPath - Path to audio file
 */
export function cleanupAudio(audioPath: string): void {
  try {
    if (fs.existsSync(audioPath)) {
      fs.unlinkSync(audioPath);
      console.log(`Cleaned up: ${audioPath}`);
    }
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}


