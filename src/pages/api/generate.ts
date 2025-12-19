import type { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');

const schema = {
  description: "Level Data for a Just Shapes & Beats style game",
  type: SchemaType.OBJECT,
  properties: {
    metadata: {
      type: SchemaType.OBJECT,
      properties: {
        bossName: { type: SchemaType.STRING },
        bpm: { type: SchemaType.NUMBER },
        duration: { type: SchemaType.NUMBER },
        assetMapping: {
          type: SchemaType.OBJECT,
          additionalProperties: { type: SchemaType.STRING },
        },
      },
      required: ["bossName", "duration"],
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
          type: {
            type: SchemaType.STRING,
            enum: ["projectile_throw", "spawn_obstacle", "boss_move", "screen_shake", "pulse"],
          },
          x: { type: SchemaType.NUMBER },
          y: { type: SchemaType.NUMBER },
          size: { type: SchemaType.NUMBER },
          rotation: { type: SchemaType.NUMBER },
          duration: { type: SchemaType.NUMBER },
          assetId: { type: SchemaType.STRING },
          behavior: {
            type: SchemaType.STRING,
            enum: ["homing", "spinning", "bouncing", "static", "sweep"],
          },
        },
        required: ["timestamp", "type", "x", "y"],
      },
    },
    explanation: { type: SchemaType.STRING },
  },
  required: ["metadata", "theme", "timeline"],
};

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
  maxDuration: 60, // Increase timeout for AI generation (optional, if on Vercel Pro)
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, images, duration } = req.body;

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-pro",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    const systemPrompt = `
      You are an expert level designer for a rhythm-based action game similar to "Just Shapes & Beats".
      Your task is to create a complete level timeline based on a user's description and optional images of boss/obstacles.
      
      Game Mechanics:
      - Screen size is 1024x768.
      - The level duration is exactly ${duration} seconds.
      - Attacks MUST synchronize with the music rhythm (standard 4/4 time if BPM is not clear).
      - Use "projectile_throw" for fast attacks, "spawn_obstacle" for static/bouncing hazards, "boss_move" to reposition the boss.
      - "screen_shake" and "pulse" add visual energy.
      - Color palette should be cohesive. Default JSAB enemy color is pink (#FF0099).
      
      Instructions:
      1. Analyze the user's prompt: "${prompt}"
      2. If images are provided, map them to assetIds like "asset_0", "asset_1" etc. and describe their behaviors.
      3. Create a dense timeline with at least 15-30 events spread across the duration, intensifying during "drops" or "choruses".
      4. Ensure all timestamps are between 0 and ${duration}.
      5. Provide a brief explanation of your design choices in the "explanation" field.
    `;

    const contents = [
      {
        role: "user",
        parts: [
          { text: systemPrompt },
          ...(images || []).map((img: string) => ({
            inlineData: {
              mimeType: "image/jpeg",
              data: img.split(',')[1], // Remove base64 prefix
            },
          })),
        ],
      },
    ];

    const result = await model.generateContent({ contents });
    const response = await result.response;
    const levelData = JSON.parse(response.text());

    res.status(200).json(levelData);
  } catch (error: any) {
    console.error('Gemini Generation Error:', error);
    res.status(500).json({ error: error.message });
  }
}
