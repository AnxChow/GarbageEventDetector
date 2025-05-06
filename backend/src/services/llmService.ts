import OpenAI from 'openai';
import fs from 'fs/promises';

interface Event {
  id: string;
  timestamp: string;
  eventType: string;
  location: string;
  driver: string;
  thumbnailUrl: string;
  reason: string;
}

type EventType = 'inaccessible' | 'overflowing' | 'other' | null;

export class LLMService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async analyzeFrame(framePath: string, timestamp: string, model: string = 'o4-mini'): Promise<Event | null> {
    try {
      // Read the image file
      const imageBuffer = await fs.readFile(framePath);

      // Use the original image for LLM
      const base64Image = imageBuffer.toString('base64');

      // Step 1: Check if there are bins ready for pickup
      const binCheckPrompt = `You are analyzing a single frame from a garbage truck's dashcam at timestamp ${timestamp}.

            Your task is to determine whether **any trash or recycling bins** are visible in the frame.

            ✅ Bins usually appear:
            - In the **bottom-left or bottom-right corner** of the frame (close to the truck)
            - Standing upright on the **side of the road**

            🚫 Ignore:
            - Any part of the garbage truck's **collection mechanism**, such as the front hopper, arm, or containers.
            - Any bins currently in the air or inside the truck

            Return your answer in this exact JSON format:
            { "binsPresent": true/false, "reason": "brief explanation" }
                
                
            Be inclusive — return true if you see any bins, even if they are not perfectly visible or close.
            The bins you identify should NOT be the garbage truck's own collection bin.`;

      const binCheckResponse = await this.openai.chat.completions.create({
        model: model,
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
        ]
        // max_tokens: 500
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
      const issueCheckPrompt = `You are analyzing a frame that contains at least one trash or recycling bin. Please focus only on the black bins on the right side of the road.

Your task is to determine if there is a clear and visible issue worth flagging. 

Check for the following types of events:

---

1. **"inaccessible"** — A bin cannot be picked up because:
   - It is **blocked** by other bins, objects, cars, or a fence.
   - It is **facing the wrong direction** (handles/lid turned away from the truck).
   - ✅ Only report "inaccessible" if the bin is **clearly unreachable or improperly placed**. 

2. **"overflowing"** — A bin is clearly too full:
   - The **lid is propped open** by trash sticking out.
   - Large items or excess waste are **around the bin**.
   - ⚠️ Do **not** confuse the truck's own **front holder or arm** with a bin — only report ground bins.

3. **"safety"** — A visible hazard from the driver's perspective:
   - A **person**, child, or pedestrian is on or near the road.
   - An object is **obstructing the truck's path** (e.g. a bike, debris, animal, etc.). Do not confuse the truck's front holder as an obstruction, only things actually on the road.

4. **"other"** — Any clearly visible, unusual situation not described above.

---

Return your result in this exact JSON format:
{ "eventFound": "inaccessible" | "overflowing" | "safety" | "other" | null, "reason": "brief explanation" }
`;

      const issueCheckResponse = await this.openai.chat.completions.create({
        model: model,
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
        ]
        // max_tokens: 500
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
        reason: issueCheckResult.reason,
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