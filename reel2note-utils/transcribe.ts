/**
 * Transcription utility using local Whisper Python script
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

/**
 * Transcribe audio file using local Whisper
 * @param audioPath - Path to audio file
 * @returns Transcription text
 */
export async function transcribeAudio(audioPath: string): Promise<string> {
  try {
    const whisperScript = path.join(process.cwd(), 'utils', 'whisper.py');
    const command = `python "${whisperScript}" "${audioPath}"`;

    console.log('Transcribing audio with Whisper...');

    const { stdout, stderr } = await execAsync(command);

    if (stderr) {
      console.warn('Whisper stderr:', stderr);
    }

    // Parse JSON output from Python script
    const outputLines = stdout.trim().split('\n');
    const jsonLine = outputLines[outputLines.length - 1];
    
    try {
      const result = JSON.parse(jsonLine);
      return result.transcript;
    } catch {
      // If JSON parsing fails, try to extract transcript from stdout
      console.error('Failed to parse JSON, trying to extract transcript from stdout');
      throw new Error('Failed to parse Whisper output');
    }
  } catch (error) {
    console.error('Transcription error:', error);
    const message = error instanceof Error ? error.message : 'Failed to transcribe audio';
    throw new Error(message);
  }
}


