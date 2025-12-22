import type { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
  maxDuration: 120,
};

// Initialize Google Generative AI
function getGenAIClient() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('Missing Gemini API Key. Set GEMINI_API_KEY in .env.local');
  }

  return new GoogleGenerativeAI(apiKey);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, style = 'jsab', count = 1 } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  console.log('='.repeat(60));
  console.log('[ASSETS API] Starting geometric asset generation via Gemini SVG');
  console.log(`[ASSETS API] Prompt: "${prompt}"`);
  console.log(`[ASSETS API] Style: ${style}, Count: ${count}`);

  try {
    const genAI = getGenAIClient();
    const model = genAI.getGenerativeModel({ model: "gemini-3-pro-preview" });

    // Since standard Gemini API doesn't support Imagen, we'll generate SVG code
    // that fits the JSAB aesthetic perfectly (vector, clean, geometric)
    const svgPrompt = `
      You are an expert vector artist for a "Just Shapes & Beats" style game.
      Create a boss character sprite based on this description: "${prompt}".
      
      REQUIREMENTS:
      1. Output ONLY raw SVG code. No markdown, no explanation.
      2. Style: Minimalist, geometric, dangerous.
      3. Colors: Primary usage of Neon Pink (#FF0099) and White (#FFFFFF). Black background (#000000) is optional but helps contrast.
      4. Viewbox: 512x512.
      5. The shape should be centered and scalable.
      6. Use simple primitives (circles, rects, paths) for a clean look.
    `;

    console.log('[ASSETS API] Requesting SVG generation...');
    const startTime = Date.now();
    
    const result = await model.generateContent(svgPrompt);
    const response = await result.response;
    let text = response.text();
    
    const apiTime = Date.now() - startTime;
    console.log(`[ASSETS API] Gemini responded in ${apiTime}ms`);

    // Clean up markdown formatting if present
    text = text.trim();
    if (text.startsWith('```svg')) {
      text = text.replace(/^```svg\s*/, '').replace(/\s*```$/, '');
    } else if (text.startsWith('```xml')) {
      text = text.replace(/^```xml\s*/, '').replace(/\s*```$/, '');
    } else if (text.startsWith('```')) {
      text = text.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    text = text.trim();

    // Extract SVG from response (in case Gemini adds extra text despite instructions)
    let svgContent = text;
    const svgMatch = text.match(/<svg[\s\S]*?<\/svg>/);
    if (svgMatch) {
      svgContent = svgMatch[0];
    } else {
      console.warn('[ASSETS API] No SVG tags found in response, using full text');
      console.log('[ASSETS API] First 200 chars:', text.substring(0, 200));
    }

    // Validate SVG has basic structure
    if (!svgContent.includes('<svg')) {
      throw new Error('Generated content does not contain valid SVG markup');
    }

    // Convert SVG string to Base64 for the frontend to consume as an image
    const base64Svg = Buffer.from(svgContent).toString('base64');
    const dataUrl = `data:image/svg+xml;base64,${base64Svg}`; // Frontend expects this format or raw base64

    // Return as a single image since Gemini generates one response at a time
    // The frontend expects an array of base64 strings
    console.log('[ASSETS API] SUCCESS: Generated SVG asset');
    
    return res.status(200).json({ 
      images: [base64Svg], // Frontend decodes this
      count: 1,
      prompt: prompt,
      source: 'gemini-svg-fallback'
    });

  } catch (error: any) {
    console.error('[ASSETS API] ERROR:', error.message);
    
    if (error.message.includes('API Key') || error.message.includes('API_KEY')) {
      return res.status(503).json({ 
        error: 'Gemini API Configuration Missing', 
        code: 'GEMINI_AUTH_ERROR',
        details: 'Check GEMINI_API_KEY in .env.local',
        rawError: error.message
      });
    }

    res.status(500).json({ 
      error: 'Asset generation failed', 
      details: error.message 
    });
  }
}
