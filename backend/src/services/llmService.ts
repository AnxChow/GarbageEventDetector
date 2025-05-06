import OpenAI from 'openai';
import fs from 'fs/promises';

interface Event {
  id: string;
  timestamp: string;
  eventType: string;
  location: string;
  driver: string;
  thumbnailUrl: string;
}

type EventType = 'inaccessible' | 'overflowing' | 'other' | null;

export class LLMService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async analyzeFrame(framePath: string, timestamp: string): Promise<Event | null> {
    try {
      // Read the image file and convert to base64
      const imageBuffer = await fs.readFile(framePath);
      const base64Image = imageBuffer.toString('base64');

      // Step 1: Check if there are bins ready for pickup
      const binCheckPrompt = `You are analyzing a single frame from a garbage truck's dashcam at timestamp ${timestamp}.

      Your task is to determine whether there are any **trash bins** that meet the following criteria:
      
      1. The bin is **close to the side of the truck** and appears to be the **next target for pickup**.
      2. The bin is **clearly visible and identifiable** as a standard trash bin.
      
      🚫 Ignore:
      - Any part of the garbage truck's **collection mechanism**, such as the front hopper, arm, or containers.
      - Any bins far ahead or on the opposite side of the street.
      
      ✅ Focus only on the **side of the truck visible in the frame**, and only if the bins appear to be **immediately ready for pickup**.
      
      IMPORTANT: Return ONLY a valid JSON object in this exact format, with no additional text or markdown:
      {"binsPresent": true/false, "reason": "brief explanation"}
      
      Be conservative. Only return "binsPresent": true if there is clear and confident visual evidence of bins on the ground, at the side, ready to be serviced. The bins you identify should NOT be the garbage truck's own collection bin.`;

      const binCheckResponse = await this.openai.chat.completions.create({
        model: "gpt-4.1-2025-04-14",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: binCheckPrompt },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 500
      });

      let binCheckResult;
      try {
        const content = binCheckResponse.choices[0].message.content || '{"binsPresent": false}';
        // Remove any markdown code block syntax if present
        const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
        binCheckResult = JSON.parse(cleanContent);
      } catch (error) {
        console.error('Error parsing bin check response:', error);
        console.log('Raw response:', binCheckResponse.choices[0].message.content);
        binCheckResult = { binsPresent: false, reason: "Error parsing response" };
      }

      console.log(`Bin check at ${timestamp}: ${binCheckResult.binsPresent ? 'Bins found' : 'No bins'} - ${binCheckResult.reason}`);

      // If no bins are present, return null
      if (!binCheckResult.binsPresent) {
        return null;
      }

      // Step 2: Check for specific issues with the bins
      const issueCheckPrompt = `You are analyzing a frame that has been confirmed to contain trash bins ready for pickup. 
      Your task is to determine if there are any clear issues that would prevent normal pickup.

      Check for the following issues, but only if they are clearly visible and unambiguous:

      1. **"inaccessible"** — The bin is on the ground and will not be accessible for pick up because:
         - It is blocked by another object (e.g. another bin, car, pole, fence).
         - It is distanced from the pickup area or squeezed between objects with no visible space for the arm.

      2. **"overflowing"** — The bin is on the ground and clearly overfilled:
         - The lid is visibly propped open by large trash items.
         - Trash is sticking out, visibly overflowing, or surrounding the bin.
         - ⚠️ Do not report "overflowing" if the lid is only slightly open, or the bin looks full but not spilling.

      IMPORTANT: Return ONLY a valid JSON object in this exact format, with no additional text or markdown:
      {"eventFound": "inaccessible" | "overflowing" | "other" | null, "reason": "brief explanation"}

      Be conservative — if it is not clearly visible and unambiguous, return null.`;

      const issueCheckResponse = await this.openai.chat.completions.create({
        model: "gpt-4.1-2025-04-14",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: issueCheckPrompt },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 500
      });

      let issueCheckResult;
      try {
        const content = issueCheckResponse.choices[0].message.content || '{"eventFound": null}';
        // Remove any markdown code block syntax if present
        const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
        issueCheckResult = JSON.parse(cleanContent);
      } catch (error) {
        console.error('Error parsing issue check response:', error);
        console.log('Raw response:', issueCheckResponse.choices[0].message.content);
        issueCheckResult = { eventFound: null, reason: "Error parsing response" };
      }

      console.log(`Issue check at ${timestamp}: ${issueCheckResult.eventFound || 'No issues'} - ${issueCheckResult.reason}`);

      // Only return an event if we found a specific issue
      if (!issueCheckResult.eventFound) {
        return null;
      }

      return {
        id: Date.now().toString(),
        timestamp,
        eventType: issueCheckResult.eventFound,
        location: "[gps location here]", // You can update this if you want to extract location
        driver: "[driver name here]", // You can update this if you want to extract driver info
        thumbnailUrl: framePath
      };
    } catch (error) {
      console.error('Error analyzing frame:', error);
      return null;
    }
  }
} 