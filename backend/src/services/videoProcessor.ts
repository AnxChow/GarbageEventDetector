import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';

interface Frame {
  timestamp: string;
  framePath: string;
}

export class VideoProcessor {
  private readonly uploadDir: string;
  private readonly framesDir: string;

  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR || 'uploads';
    this.framesDir = path.join(this.uploadDir, 'frames');
  }

  async extractFrames(videoPath: string): Promise<Frame[]> {
    const videoFileName = path.basename(videoPath, path.extname(videoPath));
    const framesOutputDir = path.join(this.framesDir, videoFileName);
    
    // Create frames directory if it doesn't exist
    await fs.mkdir(framesOutputDir, { recursive: true });

    return new Promise((resolve, reject) => {
      const frames: Frame[] = [];

      // First, get video duration
      const ffprobe = spawn('ffprobe', [
        '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        videoPath
      ]);

      let duration = '';
      ffprobe.stdout.on('data', (data) => {
        duration += data.toString();
      });

      ffprobe.on('close', (code) => {
        if (code !== 0) {
          reject(new Error('Failed to get video duration'));
          return;
        }

        const videoDuration = parseFloat(duration);
        console.log(`Video duration: ${videoDuration} seconds`);

        // Now extract frames - one every 5 seconds instead of every second
        const ffmpeg = spawn('ffmpeg', [
          '-i', videoPath,
          '-vf', 'fps=1/5', // Extract 1 frame every 5 seconds
          '-frame_pts', '1',
          '-f', 'image2',
          path.join(framesOutputDir, 'frame_%d.jpg')
        ]);

        ffmpeg.stderr.on('data', (data) => {
          const output = data.toString();
          // Only log errors or important messages
          if (output.includes('Error') || output.includes('frame=')) {
            console.log(`FFmpeg: ${output.trim()}`);
          }
        });

        ffmpeg.on('close', async (code) => {
          if (code !== 0) {
            reject(new Error(`FFmpeg process exited with code ${code}`));
            return;
          }

          try {
            // Read all generated frames
            const files = await fs.readdir(framesOutputDir);
            const frameFiles = files.filter(f => f.startsWith('frame_') && f.endsWith('.jpg'));
            
            // Sort frames by number
            frameFiles.sort((a, b) => {
              const numA = parseInt(a.replace('frame_', '').replace('.jpg', ''));
              const numB = parseInt(b.replace('frame_', '').replace('.jpg', ''));
              return numA - numB;
            });

            // Create frame objects with timestamps
            frames.push(...frameFiles.map((file, index) => ({
              timestamp: this.formatTimestamp(index * 5), // Multiply by 5 since we're sampling every 5 seconds
              framePath: path.join(framesOutputDir, file)
            })));

            console.log(`Extracted ${frames.length} frames (one every 5 seconds)`);
            resolve(frames);
          } catch (error) {
            reject(error);
          }
        });

        ffmpeg.on('error', (err) => {
          reject(err);
        });
      });

      ffprobe.on('error', (err) => {
        reject(err);
      });
    });
  }

  private formatTimestamp(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
} 