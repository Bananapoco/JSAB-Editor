import type { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { jsonrepair } from 'jsonrepair';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '15mb',
    },
  },
  maxDuration: 180,
};

function getGenAIClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing Gemini API Key. Set GEMINI_API_KEY in .env.local');
  }
  return new GoogleGenerativeAI(apiKey);
}

const schema = {
  description: "Level Data for a Just Shapes & Beats style rhythm game",
  type: SchemaType.OBJECT,
  properties: {
    metadata: {
      type: SchemaType.OBJECT,
      properties: {
        name: { type: SchemaType.STRING, description: "Name of the level or boss" },
        bpm: { type: SchemaType.NUMBER, description: "Beats per minute of the track. Use whole numbers." },
        duration: { type: SchemaType.NUMBER, description: "Total duration in seconds. Use whole numbers." },
        energy: { type: SchemaType.STRING, description: "Overall energy level (low, medium, high, dynamic)" },
      },
      required: ["name", "duration", "bpm"],
    },
    theme: {
      type: SchemaType.OBJECT,
      properties: {
        enemyColor: { type: SchemaType.STRING, description: "Color for dangerous elements (Hex code. Always #FF0099)" },
      },
      required: ["enemyColor"],
    },
    timeline: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          timestamp: { type: SchemaType.NUMBER, description: "Time in seconds (0 to duration). Max 2 decimal places." },
          type: { type: SchemaType.STRING, description: "Event type. Examples include: laser_beam, spike_ring, projectile_throw, wave, spawn_obstacle, expanding_circle, pulse, particle_burst, screen_shake. Feel free to invent new types that fit JSAB's geometric, rhythm-based style (e.g., 'triangle_trail')" },
          x: { type: SchemaType.NUMBER, description: "X position (0-1024). Whole numbers only." },
          y: { type: SchemaType.NUMBER, description: "Y position (0-768). Whole numbers only." },
          size: { type: SchemaType.NUMBER, description: "Size/radius in pixels. Reasonable range: 20 to 300. Whole numbers only." },
          rotation: { type: SchemaType.NUMBER, description: "Initial rotation in degrees (0-360). Whole numbers only." },
          duration: { type: SchemaType.NUMBER, description: "How long the event lasts in seconds. Use simple decimals like 0.5" },
          behavior: { type: SchemaType.STRING, description: "Movement behavior. Examples: homing, spinning, bouncing, sweep, expand, oscillate. Invent new behaviors if they enhance creativity (e.g., 'spiral' or 'echo')" },
          targetX: { type: SchemaType.NUMBER, description: "Destination X (0-1024). Whole numbers only." },
          targetY: { type: SchemaType.NUMBER, description: "Destination Y. Whole numbers only." },
          speed: { type: SchemaType.NUMBER, description: "Movement speed. Range 50-300. Use whole numbers only." },
          count: { type: SchemaType.NUMBER, description: "Number of objects (e.g., in a burst or ring). Range 1-20. Whole numbers only." },
          angle: { type: SchemaType.NUMBER, description: "Angle in degrees (0-360). Whole numbers only." },
          delay: { type: SchemaType.NUMBER, description: "Warning period before attack is dangerous (0.2-0.5). Simple decimals only." },
          thickness: { type: SchemaType.NUMBER, description: "Thickness of beams or outlined attacks in pixels. Range 10-60. Whole numbers only." },
          pulseCount: { type: SchemaType.NUMBER, description: "Number of pulses for bouncing behavior. Whole numbers only." },
          rotationSpeed: { type: SchemaType.NUMBER, description: "Rotation speed in degrees/sec. Range -360 to 360. Whole numbers only." },
          oscillationFreq: { type: SchemaType.NUMBER, description: "Frequency for oscillation. Use simple decimals like 1.5." },
        },
        required: ["timestamp", "type", "x", "y"],
      },
    },
    explanation: { type: SchemaType.STRING, description: "Brief explanation of the level design choices" },
  },
  required: ["metadata", "theme", "timeline"],
} as const;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, images, audioData, duration } = req.body;
  const levelDuration = Math.min(duration || 60, 300);

  const maxEvents = Math.min(Math.max(Math.floor(levelDuration / 1.2), 30), 100);

  console.log('='.repeat(60));
  console.log('[GENERATE API] Starting level generation via Google Gemini API');
  console.log(`[GENERATE API] Duration: ${levelDuration}s, Target Events: ${maxEvents}`);

  try {
    const genAI = getGenAIClient();

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-pro-latest",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema as any,
        maxOutputTokens: 8192,
        temperature: 0.6,
      },
    });

    let rhythmInfo = '';
    if (audioData) {
      rhythmInfo = `
        Analyze the provided audio track directly and accurately detect the BPM (whole number), major rhythm peaks/drops, and overall song structure.
        Place the most intense and complex attacks precisely on the strongest beats and drops you detect — this is critical for impact.
      `;
    }

    const systemPrompt = `
You are an expert level designer for "Just Shapes & Beats" (JSAB), creating FULLY DYNAMIC fun levels that are perfectly synchronized to music.

## CRITICAL OUTPUT RULES
- Output ONLY valid, complete JSON. Start with { and end with }. No extra text or markdown.
- Use simple whole numbers or decimals (e.g., 120, 2.5, 0.3). Never scientific notation or excessive precision.
- Safe defaults if unsure (size: 100, speed: 100, delay: 0.3).
- Ensure timeline has approximately ${maxEvents} events (a few less is okay).

## MISSION
Create a level where every attack and pattern feels like it's dancing with the music.

### Coordinate System
- Screen: 1024 × 768 pixels, center (512, 384)
- Avoid instant attacks near center at the start

### Fairness & Warning System
- EVERY dangerous attack must have a warning (delay: 0.2–0.5 seconds)
- During warning: semi-transparent, non-damaging
- After delay: solid hot pink and dangerous

${rhythmInfo}

## EVENT TYPES & BEHAVIORS
Use classic JSAB events when they fit (laser_beam, spike_ring, wave, projectile_throw, expanding_circle, pulse, etc.).
Feel free to invent new geometric attacks inspired by the music and prompt (e.g., "claw_scratch", "hypnotic_spiral").
Common behaviors: homing, spinning, bouncing, sweep, expand, oscillate, spiral — invent others if needed.

## SYNC RULES
- Sync tightly to the detected beat grid
- Cluster intense events on major drops/peaks
- Vary density: dense in high-energy, sparse in calm sections

## USER DIRECTION
"${prompt || 'Create an exciting rhythm-based boss battle'}"

Generate events spread across the full ${levelDuration} seconds. Vary patterns and keep it fair and fun.`;

    const parts: any[] = [{ text: systemPrompt }];

    if (audioData) {
      console.log('[GENERATE API] Adding audio data to request...');
      parts.push({
        inlineData: {
          mimeType: "audio/mp3",
          data: audioData.split(',')[1]
        }
      });
    }

    if (images && images.length > 0) {
      console.log(`[GENERATE API] Adding ${images.length} image(s) to request...`);
      images.forEach((img: { data: string; type: string }) => {
        parts.push({
          inlineData: {
            mimeType: img.type,
            data: img.data.split(',')[1],
          },
        });
      });
    }

    console.log('[GENERATE API] Calling Gemini...');
    const startTime = Date.now();

    const result = await model.generateContent({
      contents: [{ role: "user", parts }]
    });
    const response = await result.response;

    const apiTime = Date.now() - startTime;
    console.log(`[GENERATE API] AI responded in ${apiTime}ms`);

    let responseText = response.text().trim();

    // Remove markdown code blocks if present (common even with JSON mode)
    if (responseText.startsWith('```json')) {
      responseText = responseText.slice(7, -3).trim();
    } else if (responseText.startsWith('```')) {
      responseText = responseText.slice(3, -3).trim();
    }

    let levelData: any;

    // Try parsing clean JSON first
    try {
      levelData = JSON.parse(responseText);
    } catch (initialError) {
      // If direct parse fails, use jsonrepair as safety net
      console.warn('[GENERATE API] Direct JSON parse failed, attempting repair...');
      try {
        const repaired = jsonrepair(responseText);
        levelData = JSON.parse(repaired);
        console.log('[GENERATE API] JSON repaired successfully');
      } catch (repairError: any) {
        console.error('[GENERATE API] JSON repair failed:', repairError.message);
        console.error('[GENERATE API] Original response snippet:', responseText.substring(0, 500));
        throw new Error('Failed to parse or repair AI JSON response');
      }
    }

    // Enforce theme
    if (!levelData.theme) {
      levelData.theme = { enemyColor: "#FF0099" };
    } else {
      levelData.theme.enemyColor = "#FF0099";
    }

    // Enforce metadata (preserve AI-detected BPM)
    if (!levelData.metadata) {
      levelData.metadata = {
        name: prompt || 'AI Generated Level',
        bpm: 120,
        duration: levelDuration,
        energy: 'dynamic'
      };
    } else {
      levelData.metadata.duration = levelDuration;
      if (!levelData.metadata.name) levelData.metadata.name = prompt || 'AI Generated Level';
      if (!levelData.metadata.energy) levelData.metadata.energy = 'dynamic';
    }

    // Validate and clean timeline
    if (!levelData.timeline || !Array.isArray(levelData.timeline)) {
      throw new Error('AI did not generate a valid timeline');
    }

    levelData.timeline = levelData.timeline
      .filter((event: any) =>
        event &&
        typeof event.timestamp === 'number' &&
        typeof event.type === 'string' &&
        typeof event.x === 'number' &&
        typeof event.y === 'number' &&
        event.timestamp >= 0 &&
        event.timestamp <= levelDuration
      )
      .map((event: any) => ({
        ...event,
        delay: event.delay ?? 0.3,
        x: Math.max(0, Math.min(1024, event.x)),
        y: Math.max(0, Math.min(768, event.y)),
      }))
      .sort((a: any, b: any) => a.timestamp - b.timestamp);

    // Final success log
    console.log(`[GENERATE API] SUCCESS: Duration: ${levelDuration}s, BPM: ${levelData.metadata.bpm}, Events: ${levelData.timeline.length}, Name: "${levelData.metadata.name}"`);

    res.status(200).json(levelData);
  } catch (error: any) {
    console.error('[GENERATE API] ERROR:', error.message);
    res.status(500).json({
      error: 'Level generation failed',
      details: error.message
    });
  }
}