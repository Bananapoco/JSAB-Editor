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
        bossName: { type: SchemaType.STRING },
        bpm: { type: SchemaType.NUMBER },
        duration: { type: SchemaType.NUMBER },
        energy: { type: SchemaType.STRING },
      },
      required: ["bossName", "duration", "bpm"],
    },
    theme: {
      type: SchemaType.OBJECT,
      properties: {
        enemyColor: { type: SchemaType.STRING },
        backgroundColor: { type: SchemaType.STRING },
        playerColor: { type: SchemaType.STRING },
      },
      required: ["enemyColor", "backgroundColor", "playerColor"],
    },
    timeline: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          timestamp: { type: SchemaType.NUMBER },
          type: { type: SchemaType.STRING },
          x: { type: SchemaType.NUMBER },
          y: { type: SchemaType.NUMBER },
          size: { type: SchemaType.NUMBER },
          rotation: { type: SchemaType.NUMBER },
          duration: { type: SchemaType.NUMBER },
          behavior: { type: SchemaType.STRING },
          targetX: { type: SchemaType.NUMBER },
          targetY: { type: SchemaType.NUMBER },
          speed: { type: SchemaType.NUMBER },
          count: { type: SchemaType.NUMBER },
          angle: { type: SchemaType.NUMBER },
          delay: { type: SchemaType.NUMBER },
          thickness: { type: SchemaType.NUMBER },
          pulseCount: { type: SchemaType.NUMBER },
          rotationSpeed: { type: SchemaType.NUMBER },
          oscillationFreq: { type: SchemaType.NUMBER },
        },
        required: ["timestamp", "type", "x", "y"],
      },
    },
    explanation: { type: SchemaType.STRING },
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
        temperature: 0.9,
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

IMPORTANT: Place your most intense attacks (spike_ring, laser_beam, dense projectile patterns) at these exact timestamps!
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
You are an expert level designer for "Just Shapes & Beats" (JSAB), creating FULLY DYNAMIC levels that are perfectly synchronized to music.

## YOUR MISSION
Analyze the provided audio track and create a level where every attack, every pattern, every visual element is choreographed to the music. The player should feel like they're DANCING through danger.

## ABSOLUTE REQUIREMENTS - JSAB STYLE

### Visual Style (NON-NEGOTIABLE)
- ALL dangerous elements: **#FF0099** (Neon Hot Pink) - NO OTHER COLORS FOR HAZARDS
- Shapes: ONLY geometric primitives (circles, squares, triangles, lines)
- NO complex graphics, NO realistic elements

### Coordinate System (CRITICAL)
- Logical space: **1024 x 768** pixels
- X range: 0 to 1024
- Y range: 0 to 768
- Screen center: (512, 384)
- Safe zones for player spawn: 400-600 X, 300-500 Y (avoid sudden attacks here)

### Fairness & Warning System (ESSENTIAL)
- EVERY attack must have a warning period (delay: 0.2-0.5 seconds)
- During warning: object appears WHITE and TRANSPARENT
- After warning: object becomes PINK and SOLID (dangerous)
- Visual cues: fade-in, pulse before attack, or brief flash
- NO instant kills, NO unfair surprise attacks

${rhythmInfo}
${analysisInfo}

## EVENT TYPES & WHEN TO USE THEM

### High-Energy Events (for drops, choruses, intense moments)
- **laser_beam**: Sweeping beams, rotation 0-360, thickness 15-40
- **spike_ring**: Circular spike patterns, count 8-16, spinning
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

## BEHAVIOR PARAMETERS (for dynamic movement)
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
Every attack needs delay (0.2-0.5) for fairness.
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
    
    const responseText = response.text();
    const levelData = JSON.parse(responseText);

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
