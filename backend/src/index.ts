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
  frames?: any[];
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

  console.log(`✅ Sending results for ${fileId}: ${status.events.length} events found, ${status.frames?.length || 0} frames`);
  res.json({ events: status.events, frames: status.frames || [] });
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

// Add this route after the other routes
app.post('/feedback/:fileId/:frameId', (req, res) => {
  const { fileId, frameId } = req.params;
  const { humanFeedback } = req.body;
  const status = processingStatus.get(fileId);
  if (!status || !status.frames) {
    return res.status(404).json({ error: 'File or frames not found' });
  }
  const frame = status.frames.find(f => f.id === frameId);
  if (!frame) {
    return res.status(404).json({ error: 'Frame not found' });
  }
  frame.humanFeedback = humanFeedback;
  res.json({ message: 'Feedback saved', frame });
});

// Add this route after the feedback route for frames
app.post('/event-feedback/:fileId/:eventId', (req, res) => {
  const { fileId, eventId } = req.params;
  const { humanFeedback } = req.body;
  const status = processingStatus.get(fileId);
  if (!status || !status.events) {
    return res.status(404).json({ error: 'File or events not found' });
  }
  const event = status.events.find(e => e.id === eventId);
  if (!event) {
    return res.status(404).json({ error: 'Event not found' });
  }
  event.humanFeedback = humanFeedback;
  res.json({ message: 'Event feedback saved', event });
});

async function processVideo(fileId: string, videoPath: string) {
  try {
    console.log(`🎥 Starting frame extraction for ${fileId}`);
    // Extract frames
    const frames = await videoProcessor.extractFrames(videoPath);
    console.log(`✅ Extracted ${frames.length} frames from video`);

    // We'll build up frameObjs as we process each frame
    const frameObjs = [];
    const events = [];
    const startTime = Date.now();

    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      const frameStartTime = Date.now();
      let event: any = await llmService.analyzeFrame(frame.framePath, frame.timestamp);
      const frameTime = Date.now() - frameStartTime;

      let reason = 'not flagged';
      let eventType = undefined;
      let location = '[gps location here]'; // Placeholder, update if you have real data
      if (event) {
        reason = event.reason || 'flagged by model';
        eventType = event.eventType;
        location = event.location || location;
        events.push({
          ...event,
          reason,
          location,
          thumbnailUrl: `uploads/${path.relative('uploads', frame.framePath).replace(/\\/g, '/')}`,
        });
      }
      frameObjs.push({
        id: `${fileId}-frame-${i}`,
        timestamp: frame.timestamp,
        thumbnailUrl: `uploads/${path.relative('uploads', frame.framePath).replace(/\\/g, '/')}`,
        reason,
        eventType: eventType || 'not flagged',
        location,
      });

      // Update processing status
      processingStatus.set(fileId, {
        status: 'processing',
        events,
        frames: frameObjs,
        message: `Processing frame ${i + 1}/${frames.length} (${Math.round((i / frames.length) * 100)}%)`,
        totalFrames: frames.length,
        processedFrames: i
      });
    }

    const totalTime = Date.now() - startTime;
    console.log(`⏱️ Total processing time: ${totalTime}ms (${Math.round(totalTime / frames.length)}ms per frame)`);

    // Update processing status
    processingStatus.set(fileId, {
      status: 'completed',
      events,
      frames: frameObjs,
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
      frames: [],
      message: 'Processing failed. Please try again.'
    });
  }
}

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
}); 