import type { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '15mb',
    },
  },
  maxDuration: 180,
};

// Initialize Google Generative AI
function getGenAIClient() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('Missing Gemini API Key. Set GEMINI_API_KEY in .env.local');
  }

  return new GoogleGenerativeAI(apiKey);
}

// Schema for Gemini structured output
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
          type: { type: SchemaType.STRING, description: "Event type. Examples include: laser_beam, spike_ring, projectile_throw, wave, spawn_obstacle, expanding_circle, pulse, particle_burst, screen_shake. Feel free to invent new types that fit JSAB's geometric, rhythm-based style (e.g., 'triangle_trail)" },
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

  const { prompt, images, audioData, duration, bpm, rhythmPeaks, audioAnalysis } = req.body;
  const levelDuration = Math.min(duration || 60, 300);
  
  const detectedBpm = bpm || 120;
  const beatsTotal = Math.floor((detectedBpm / 60) * levelDuration);
  const maxEvents = Math.min(Math.max(beatsTotal, 40), 120);

  console.log('='.repeat(60));
  console.log('[GENERATE API] Starting level generation via Google Gemini API');
  console.log(`[GENERATE API] Duration: ${levelDuration}s, BPM: ${detectedBpm}, Max Events: ${maxEvents}`);
  
  try {
    const genAI = getGenAIClient();

    const model = genAI.getGenerativeModel({
      model: "gemini-3-pro-preview",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema as any,
        maxOutputTokens: 8192,
        temperature: 0.5,
      },
    });

    // Build rhythm peaks info for the prompt
    let rhythmInfo = '';
    if (rhythmPeaks && rhythmPeaks.length > 0) {
      rhythmInfo = `
## DETECTED RHYTHM PEAKS (High energy moments)
The following timestamps have been detected as high-energy peaks in the audio:
${rhythmPeaks.slice(0, 30).map((p: number) => `- ${p.toFixed(2)}s`).join('\n')}
${rhythmPeaks.length > 30 ? `... and ${rhythmPeaks.length - 30} more peaks` : ''}

IMPORTANT: Most intense attacks (spike_ring, laser_beam, dense projectile patterns) at these timestamps
`;
    }

    let analysisInfo = '';
    if (audioAnalysis) {
      analysisInfo = `
## AUDIO ANALYSIS
- Detected BPM: ${audioAnalysis.bpm || detectedBpm}
- Energy Profile: ${audioAnalysis.energyProfile || 'unknown'}
- Key Sections:
  * Intro: 0-${Math.floor(levelDuration * 0.1)}s (GENTLE - few attacks)
  * Build: ${Math.floor(levelDuration * 0.1)}-${Math.floor(levelDuration * 0.3)}s (INCREASING density)
  * Peak/Drop: ${Math.floor(levelDuration * 0.3)}-${Math.floor(levelDuration * 0.7)}s (INTENSE - max attacks)
  * Breakdown: ${Math.floor(levelDuration * 0.7)}-${Math.floor(levelDuration * 0.85)}s (MODERATE)
  * Finale: ${Math.floor(levelDuration * 0.85)}-${levelDuration}s (CLIMAX then wind down)
`;
    }

    const systemPrompt = `
You are an expert level designer for "Just Shapes & Beats" (JSAB), creating FULLY DYNAMIC fun levels that are perfectly synchronized to music.

## CRITICAL OUTPUT RULES - FOLLOW EXACTLY:
- All numeric values MUST be reasonable, human-readable whole numbers or simple decimals (max 3 digits total).
- Examples of valid numbers: 30, 150, 2.5, 0.3
- NEVER use scientific notation, extremely long decimals, or numbers with more than 50 digits total.
- NEVER output a number larger than 10000 or with excessive precision.
- If unsure about a value, use a safe default (e.g., size: 100, thickness: 30, speed: 80).
- Every JSON object must close properly with } and arrays with ] — no trailing content or garbage after the final }.

## YOUR MISSION
Analyze the provided audio track and create a level where every attack, every pattern, every visual element is choreographed to the music. Player should feel like they're DANCING through danger.

## REQUIREMENTS

### Visual Style (NON-NEGOTIABLE)
- ALL dangerous elements: **#FF0099** (Neon Hot Pink) - NO OTHER COLORS FOR HAZARDS
- Shapes: ONLY geometric primitives (circles, squares, triangles, lines)
- NO complex graphics, NO realistic elements

### Coordinate System
- Logical space: **1024 x 768** pixels
- X range: 0 to 1024
- Y range: 0 to 768
- Screen center: (512, 384)
- Safe zones for player spawn: 400-600 X, 300-500 Y (avoid sudden attacks here)

### Fairness & Warning System
- EVERY attack must have a warning period (delay: 0.2-1.0 seconds)
- During warning: Lowered opacity, gradually changing to peak opacity (0% to 100%) (non-dangerous)
- After warning: object becomes PINK and SOLID (dangerous)
- Visual cues: fade-in, pulse before attack, or brief flash
- NO instant kills, NO unfair surprise attacks

${rhythmInfo}
${analysisInfo}

## Examples of event types (non-exhaustive. Be creative, coming up with new moves. Build off user's input (Example: "User: Cat-themed boss" --> scratch-marks))

### High-Energy Events (for drops, choruses, intense moments)
- **laser_beam**: Sweeping beams, rotation 0-360, thickness 15-40
- **spike_ring**: Circular spike patterns, count 8-16, spinning, bouncing off edges of screen violently
- **projectile_throw** with behavior "homing": Tracking missiles
- **wave**: Screen-wide horizontal bars

### Medium-Energy Events (for verses, build-ups)
- **spawn_obstacle**: Static or bouncing blocks
- **expanding_circle**: Growing ring hazards
- **projectile_throw** with behavior "sweep": Moving projectiles

### Low-Energy Events (for intros, breakdowns)
- **pulse**: Visual beat indicators (non-damaging)
- **particle_burst**: Decorative explosions
- **screen_shake**: Impact emphasis

## Behvaior examples (non-exhaustive. Be creative, coming up with new moves. Build off user's input (Example: "User: Make a hypnotic themed level" --> spiral))
- **homing**: Tracks player, speed 50-150 (slow chase, beatable)
- **spinning**: Rotates in place, rotationSpeed in degrees/sec
- **bouncing**: Pulses to beat, pulseCount = beats to pulse
- **sweep**: Moves from (x,y) to (targetX, targetY)
- **expand**: Grows larger over duration
- **oscillate**: Moves back/forth, oscillationFreq = cycles/sec

## MUSIC SYNCHRONIZATION RULES

1. **Beat Sync**: Place attacks on beat timestamps (every ${(60/detectedBpm).toFixed(3)}s at ${detectedBpm} BPM)
2. **Drop Sync**: Concentrate 3-5 attacks at each rhythm peak
3. **Phrase Sync**: Group attacks in 4 or 8 beat phrases
4. **Energy Matching**:
   - INTENSE sections → Dense patterns, fast attacks, spike_ring, lasers
   - CALM sections → Sparse patterns, slow movement, expanding circles
   - EMOTIONAL sections → Graceful sweeping, pulsing visuals

## USER'S CREATIVE DIRECTION
"${prompt || 'Create an exciting rhythm-based level that feels like a battle dance'}"

Generate EXACTLY ${maxEvents} events spread across 0 to ${levelDuration} seconds.
Every timestamp must be between 0 and ${levelDuration}.
Every attack needs delay (0.2-1.0) for fairness.
Vary attack types - don't repeat same patterns.`;

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
      console.log(`[GENERATE API] Adding ${images.length} images to request...`);
      images.forEach((img: {data: string, type: string}, idx: number) => {
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
    
    // Remove markdown code blocks if present
    if (responseText.startsWith('```json')) {
      responseText = responseText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (responseText.startsWith('```')) {
      responseText = responseText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    responseText = responseText.trim();

    // Emergency fixes for common hallucinations
    // Truncate insane long numbers (e.g., 500000...000)
    responseText = responseText.replace(/(\d)\d{50,}/g, '$130');                    // Huge integers → 30
    responseText = responseText.replace(/([0-9.e+-]{50,})/g, '30');                  // Any crazy float/scientific → 30

    // Remove trailing commas before } or ]
    responseText = responseText.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');

    // Remove any trailing garbage after final }
    const lastBrace = responseText.lastIndexOf('}');
    if (lastBrace !== -1) {
      responseText = responseText.substring(0, lastBrace + 1);
    }

    // Additional JSON cleaning - fix remaining common AI formatting errors
    // Remove any BOM or zero-width characters
    responseText = responseText.replace(/^\uFEFF/, '').replace(/[\u200B-\u200D\uFEFF]/g, '');

    let levelData;
    try {
      levelData = JSON.parse(responseText);
    } catch (parseError: any) {
      console.error('[GENERATE API] JSON Parse Error:', parseError.message);
      console.error('[GENERATE API] First 500 chars of response:', responseText.substring(0, 500));
      console.error('[GENERATE API] Last 500 chars of response:', responseText.substring(Math.max(0, responseText.length - 500)));
      
      // Save the problematic response to a temporary variable for debugging
      console.error('[GENERATE API] Full response length:', responseText.length);
      
      throw new Error(`Failed to parse AI response as JSON even after cleanup: ${parseError.message}`);
    }

    // Validate and enforce JSAB style
    if (!levelData.theme) {
      levelData.theme = {
        enemyColor: "#FF0099",
        backgroundColor: "#0a0a0f",
        playerColor: "#00FFFF"
      };
    } else {
      levelData.theme.enemyColor = "#FF0099";
      levelData.theme.playerColor = "#00FFFF";
    }
    
    if (!levelData.metadata) {
      levelData.metadata = {
        bossName: prompt || 'AI Generated Level',
        bpm: detectedBpm,
        duration: levelDuration,
        energy: 'dynamic'
      };
    } else {
      levelData.metadata.bpm = levelData.metadata.bpm || detectedBpm;
      levelData.metadata.duration = levelDuration;
    }
    
    // Validate timeline
    if (!levelData.timeline || !Array.isArray(levelData.timeline)) {
      throw new Error('AI did not generate a valid timeline');
    }

    // Filter and validate events
    levelData.timeline = levelData.timeline.filter((event: any) => {
      return event && 
             typeof event.timestamp === 'number' && 
             typeof event.type === 'string' &&
             typeof event.x === 'number' &&
             typeof event.y === 'number' &&
             event.timestamp >= 0 &&
             event.timestamp <= levelDuration;
    });

    // Ensure all events have warning delay
    levelData.timeline = levelData.timeline.map((event: any) => ({
      ...event,
      delay: event.delay ?? 0.3,
      x: Math.max(0, Math.min(1024, event.x)),
      y: Math.max(0, Math.min(768, event.y)),
    }));

    levelData.timeline.sort((a: any, b: any) => a.timestamp - b.timestamp);
    
    console.log(`[GENERATE API] SUCCESS: Generated ${levelData.timeline.length} events`);
    res.status(200).json(levelData);

  } catch (error: any) {
    console.error('[GENERATE API] ERROR:', error.message);
    
    // Check specifically for API Key errors
    if (error.message.includes('API Key') || 
        error.message.includes('API_KEY')) {
      return res.status(503).json({ 
        error: 'Gemini API Configuration Missing', 
        code: 'GEMINI_AUTH_ERROR',
        details: 'Check GEMINI_API_KEY in .env.local',
        rawError: error.message
      });
    }

    res.status(500).json({ 
      error: 'Level generation failed', 
      details: error.message 
    });
  }
}
