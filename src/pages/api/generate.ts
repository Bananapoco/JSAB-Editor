import type { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');

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
        },
        required: ["timestamp", "type", "x", "y"],
      },
    },
    explanation: { type: SchemaType.STRING },
  },
  required: ["metadata", "theme", "timeline"],
} as const;

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
  maxDuration: 120,
};

// Helper to safely parse JSON with recovery attempts
function safeJSONParse(text: string): any {
  // First, try direct parse
  try {
    return JSON.parse(text);
  } catch (e) {
    console.log('Direct JSON parse failed, attempting recovery...');
  }

  // Try to extract JSON from markdown code blocks
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1]);
    } catch (e) {
      console.log('Markdown extraction failed');
    }
  }

  // Try to find JSON object boundaries
  const startIdx = text.indexOf('{');
  const endIdx = text.lastIndexOf('}');
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    try {
      return JSON.parse(text.slice(startIdx, endIdx + 1));
    } catch (e) {
      console.log('Boundary extraction failed');
    }
  }

  // Try to fix common JSON issues
  let fixed = text
    .replace(/,\s*}/g, '}')
    .replace(/,\s*]/g, ']')
    .replace(/'/g, '"')
    .replace(/\n/g, ' ')
    .replace(/\t/g, ' ');

  try {
    const start = fixed.indexOf('{');
    const end = fixed.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
      return JSON.parse(fixed.slice(start, end + 1));
    }
  } catch (e) {
    console.log('Fixed JSON parse also failed');
  }

  throw new Error('Could not parse JSON response from AI');
}

// Generate fallback level data when API fails
function generateFallbackLevel(duration: number, prompt: string): any {
  const bpm = 120;
  const timeline: any[] = [];
  const eventCount = Math.min(Math.floor(duration * 1.5), 60);
  
  const eventTypes = ['projectile_throw', 'spawn_obstacle', 'expanding_circle', 'wave', 'pulse'];
  const behaviors = ['static', 'sweep', 'homing', 'bouncing', 'spinning'];
  
  for (let i = 0; i < eventCount; i++) {
    const timestamp = (i / eventCount) * duration;
    const type = eventTypes[i % eventTypes.length];
    
    const event: any = {
      timestamp,
      type,
      x: 100 + Math.random() * 824,
      y: 100 + Math.random() * 568,
      size: 30 + Math.random() * 40,
      duration: 1 + Math.random() * 2,
      delay: 0.3,
    };
    
    if (type === 'projectile_throw') {
      event.behavior = behaviors[Math.floor(Math.random() * behaviors.length)];
      event.targetX = Math.random() * 1024;
      event.targetY = Math.random() * 768;
      event.speed = 150 + Math.random() * 150;
    } else if (type === 'wave') {
      event.thickness = 30;
      event.behavior = 'sweep';
    }
    
    timeline.push(event);
  }
  
  // Add screen shakes
  const beatInterval = 60 / bpm;
  for (let t = beatInterval * 4; t < duration; t += beatInterval * 8) {
    timeline.push({
      timestamp: t,
      type: 'screen_shake',
      x: 512,
      y: 384,
      duration: 0.2,
    });
  }
  
  timeline.sort((a, b) => a.timestamp - b.timestamp);
  
  return {
    metadata: {
      bossName: prompt || 'Generated Level',
      bpm,
      duration,
      energy: 'building',
    },
    theme: {
      enemyColor: '#FF0099',
      backgroundColor: '#0a0a0f',
      playerColor: '#00FFFF',
    },
    timeline,
    explanation: 'Procedurally generated level.',
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, images, audioData, duration } = req.body;
  const levelDuration = Math.min(duration || 60, 300);
  const maxEvents = Math.min(Math.floor(levelDuration * 1.5), 80);

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-3-pro",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema as any,
        maxOutputTokens: 8192,
      },
    });

    const systemPrompt = `
You are an expert level designer for "Just Shapes & Beats" (JSAB), a rhythm-based bullet-hell game.

## CRITICAL REQUIREMENTS

### Output Constraints
- Generate EXACTLY ${maxEvents} events maximum
- Keep response compact
- All timestamps between 0 and ${levelDuration}

### Colors (STRICTLY ENFORCED)
- ALL hazards: #FF0099 (Hot Pink)
- Background: Dark (#0a0a0f, #111122)
- Player: #00FFFF (Cyan)

### Coordinates
- Space: 1024x768 pixels
- x: 0-1024, y: 0-768
- Center: (512, 384)

## EVENT TYPES
Valid types: projectile_throw, spawn_obstacle, laser_beam, expanding_circle, wave, wall, spike_ring, particle_burst, screen_shake, pulse

## BEHAVIORS
Valid behaviors: homing, spinning, bouncing, static, sweep, expand, contract, oscillate

## PROPERTIES
- timestamp: seconds (0 to ${levelDuration})
- type: event type string
- x, y: coordinates (required)
- size: 20-150 pixels
- duration: 0.5-4 seconds
- delay: 0.2-0.5 seconds (warning time)
- speed: 50-400
- count: 4-16 (for multi-part patterns)
- thickness: 10-50 (for lasers/walls)
- rotation: 0-360 degrees
- targetX, targetY: destination coordinates

## DESIGN RULES
1. Match song energy - fast songs get dense patterns, slow songs get graceful movements
2. Every attack needs warning (delay: 0.3)
3. Start gentle, build complexity
4. Give breathing room after intense sections

User request: "${prompt || 'Create an exciting rhythm-based level'}"

Generate a COMPLETE level JSON with ${maxEvents} events spread across ${levelDuration} seconds.`;

    const parts: any[] = [{ text: systemPrompt }];

    if (audioData) {
      parts.push({
        inlineData: {
          mimeType: "audio/mp3",
          data: audioData.split(',')[1]
        }
      });
    }

    if (images && images.length > 0) {
      images.forEach((img: {data: string, type: string}) => {
        parts.push({
          inlineData: {
            mimeType: img.type,
            data: img.data.split(',')[1],
          },
        });
      });
    }

    console.log('Generating level for duration:', levelDuration, 'seconds, max events:', maxEvents);
    
    const result = await model.generateContent({ contents: [{ role: "user", parts }] });
    const response = await result.response;
    const responseText = response.text();
    
    console.log('Response length:', responseText.length, 'chars');
    
    let levelData;
    try {
      levelData = safeJSONParse(responseText);
    } catch (parseError) {
      console.error('JSON Parse failed, using fallback level');
      levelData = generateFallbackLevel(levelDuration, prompt);
    }

    // Validate and fix
    if (!levelData.theme) {
      levelData.theme = {
        enemyColor: "#FF0099",
        backgroundColor: "#0a0a0f",
        playerColor: "#00FFFF"
      };
    } else {
      levelData.theme.enemyColor = "#FF0099";
    }
    
    if (!levelData.metadata) {
      levelData.metadata = {
        bossName: prompt || 'AI Generated Level',
        bpm: 120,
        duration: levelDuration,
        energy: 'building'
      };
    }
    
    if (!levelData.timeline || !Array.isArray(levelData.timeline) || levelData.timeline.length === 0) {
      levelData.timeline = generateFallbackLevel(levelDuration, prompt).timeline;
    } else {
      levelData.timeline.sort((a: any, b: any) => a.timestamp - b.timestamp);
      levelData.timeline = levelData.timeline.filter((event: any) => {
        return event && 
               typeof event.timestamp === 'number' && 
               typeof event.type === 'string' &&
               typeof event.x === 'number' &&
               typeof event.y === 'number';
      });
    }
    
    console.log('Generated', levelData.timeline.length, 'events');

    res.status(200).json(levelData);
  } catch (error: any) {
    console.error('Gemini Generation Error:', error.message);
    console.log('Returning fallback level');
    const fallbackLevel = generateFallbackLevel(levelDuration, prompt);
    res.status(200).json(fallbackLevel);
  }
}
