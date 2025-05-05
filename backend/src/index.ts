import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import dotenv from 'dotenv';
import { VideoProcessor } from './services/videoProcessor';
import { LLMService } from './services/llmService';
import fs from 'fs/promises';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const videoProcessor = new VideoProcessor();
const llmService = new LLMService();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads')); // Serve uploaded files

// Configure multer for video upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Not a video file'));
    }
  },
});

// Store processing status and results
const processingStatus = new Map<string, { 
  status: string; 
  events: any[];
  message?: string;
  totalFrames?: number;
  processedFrames?: number;
}>();

// Routes
app.post('/upload', upload.single('video'), async (req, res) => {
  if (!req.file) {
    console.log('❌ No video file uploaded');
    return res.status(400).json({ error: 'No video file uploaded' });
  }

  console.log(`📥 Video received: ${req.file.originalname} (${req.file.size} bytes)`);
  const fileId = req.file.filename;
  processingStatus.set(fileId, { status: 'processing', events: [] });

  try {
    // Start processing in the background
    processVideo(fileId, req.file.path);
    console.log(`✅ Video uploaded successfully, starting processing for ${fileId}`);
    res.json({ message: 'Video uploaded successfully', fileId });
  } catch (error) {
    console.error('❌ Error starting video processing:', error);
    res.status(500).json({ error: 'Failed to process video' });
  }
});

app.get('/status/:fileId', (req, res) => {
  const { fileId } = req.params;
  const status = processingStatus.get(fileId);
  
  if (!status) {
    console.log(`❌ Status requested for unknown file: ${fileId}`);
    return res.status(404).json({ error: 'File not found' });
  }

  console.log(`📊 Status check for ${fileId}: ${status.status}`);
  res.json(status);
});

app.get('/results/:fileId', (req, res) => {
  const { fileId } = req.params;
  const status = processingStatus.get(fileId);
  
  if (!status) {
    console.log(`❌ Results requested for unknown file: ${fileId}`);
    return res.status(404).json({ error: 'File not found' });
  }

  if (status.status !== 'completed') {
    console.log(`⚠️ Results requested but processing not complete for ${fileId}`);
    return res.status(400).json({ error: 'Processing not complete' });
  }

  console.log(`✅ Sending results for ${fileId}: ${status.events.length} events found`);
  res.json({ events: status.events });
});

// New route to clear uploads
app.post('/clear', async (req, res) => {
  try {
    console.log('🧹 Clearing uploads directory...');
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const framesDir = path.join(uploadsDir, 'frames');
    
    // Clear frames directory
    if (await fs.stat(framesDir).catch(() => false)) {
      await fs.rm(framesDir, { recursive: true, force: true });
      console.log('✅ Frames directory cleared');
    }
    
    // Clear uploads directory
    const files = await fs.readdir(uploadsDir);
    for (const file of files) {
      if (file !== 'frames') { // Skip the frames directory
        await fs.unlink(path.join(uploadsDir, file));
      }
    }
    
    // Clear processing status
    processingStatus.clear();
    
    console.log('✅ Uploads directory cleared');
    res.json({ message: 'Uploads cleared successfully' });
  } catch (error) {
    console.error('❌ Error clearing uploads:', error);
    res.status(500).json({ error: 'Failed to clear uploads' });
  }
});

async function processVideo(fileId: string, videoPath: string) {
  try {
    console.log(`🎥 Starting frame extraction for ${fileId}`);
    // Extract frames
    const frames = await videoProcessor.extractFrames(videoPath);
    console.log(`✅ Extracted ${frames.length} frames from video`);
    
    // Update status with total frames
    processingStatus.set(fileId, {
      status: 'processing',
      events: [],
      message: `Processing ${frames.length} frames...`,
      totalFrames: frames.length,
      processedFrames: 0
    });
    
    // Process each frame with LLM
    const events = [];
    const startTime = Date.now();
    
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      const frameStartTime = Date.now();
      
      // Update processing status
      processingStatus.set(fileId, {
        status: 'processing',
        events,
        message: `Processing frame ${i + 1}/${frames.length} (${Math.round((i / frames.length) * 100)}%)`,
        totalFrames: frames.length,
        processedFrames: i
      });

      const event = await llmService.analyzeFrame(frame.framePath, frame.timestamp);
      const frameTime = Date.now() - frameStartTime;
      
      if (event) {
        console.log(`✅ Found event: ${event.eventType} at ${frame.timestamp} (took ${frameTime}ms)`);
        events.push(event);
        
        // Update status with new event
        processingStatus.set(fileId, {
          status: 'processing',
          events,
          message: `Found ${events.length} events so far (${Math.round(((i + 1) / frames.length) * 100)}% complete)`,
          totalFrames: frames.length,
          processedFrames: i + 1
        });
      } else {
        console.log(`ℹ️ No events in frame at ${frame.timestamp} (took ${frameTime}ms)`);
      }
    }

    const totalTime = Date.now() - startTime;
    console.log(`⏱️ Total processing time: ${totalTime}ms (${Math.round(totalTime / frames.length)}ms per frame)`);

    // Update processing status
    processingStatus.set(fileId, {
      status: 'completed',
      events,
      message: `Processing complete. Found ${events.length} events in ${frames.length} frames.`,
      totalFrames: frames.length,
      processedFrames: frames.length
    });
    console.log(`✅ Video processing completed for ${fileId}: ${events.length} events found`);
  } catch (error) {
    console.error('❌ Error processing video:', error);
    processingStatus.set(fileId, {
      status: 'failed',
      events: [],
      message: 'Processing failed. Please try again.'
    });
  }
}

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
}); 