import type { NextApiRequest, NextApiResponse } from 'next';
import { VertexAI } from '@google-cloud/vertexai';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
  maxDuration: 120,
};

// Initialize Vertex AI with explicit credentials
function getVertexAIClient() {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.VITE_GOOGLE_CLOUD_PROJECT;
  const location = process.env.GOOGLE_CLOUD_LOCATION || process.env.VITE_GOOGLE_CLOUD_LOCATION || 'us-central1';
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.VITE_GOOGLE_APPLICATION_CREDENTIALS;

  console.log('='.repeat(60));
  console.log('[IMAGEN CONFIG]');
  console.log(`Project ID: ${projectId ? 'Set' : 'MISSING'}`);
  console.log(`Location: ${location}`);
  console.log(`Credentials Path: ${credentialsPath ? 'Set' : 'Using ADC/Environment'}`);
  console.log('='.repeat(60));

  if (!projectId) {
    throw new Error('Missing Project ID. Set GOOGLE_CLOUD_PROJECT in .env.local');
  }

  const vertexOptions: any = {
    project: projectId,
    location: location,
  };

  // Explicitly set credentials path if provided
  if (credentialsPath) {
    vertexOptions.googleAuthOptions = {
      keyFilename: credentialsPath
    };
  }

  try {
    const vertex = new VertexAI(vertexOptions);
    return vertex;
  } catch (error: any) {
    console.error('[IMAGEN INIT ERROR]', error);
    throw new Error(`Failed to initialize Vertex AI: ${error.message}`);
  }
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
  console.log('[IMAGEN API] Starting image generation via Vertex AI');
  console.log(`[IMAGEN API] Prompt: "${prompt}"`);
  console.log(`[IMAGEN API] Style: ${style}, Count: ${count}`);

  // Enhance prompt for JSAB aesthetic
  const jsabPrompt = style === 'jsab' 
    ? `${prompt}. Style: Minimalist geometric shape, neon pink (#FF0099) glowing edges on black background, clean vector art, simple game asset silhouette, Just Shapes and Beats aesthetic, no gradients, bold flat colors`
    : prompt;

  try {
    const vertexAI = getVertexAIClient();

    console.log('[IMAGEN API] Getting model imagen-3.0-generate-001...');
    const model = vertexAI.getGenerativeModel({
      model: 'imagen-3.0-generate-001',
    });

    const startTime = Date.now();
    console.log('[IMAGEN API] Generating content...');
    
    const response = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: jsabPrompt }] }],
    });
    
    const apiTime = Date.now() - startTime;
    console.log(`[IMAGEN API] Imagen responded in ${apiTime}ms`);
    
    const result = await response.response;
    
    let images: string[] = [];
    
    if (result.candidates?.[0]?.content?.parts) {
      images = result.candidates[0].content.parts
        .filter((p: any) => p.inlineData?.data)
        .map((p: any) => p.inlineData.data);
    }
    
    if ((result as any).predictions) {
      images = ((result as any).predictions || [])
        .map((p: any) => p.bytesBase64Encoded || p.image?.bytesBase64Encoded)
        .filter(Boolean);
    }

    if (images.length > 0) {
      console.log(`[IMAGEN API] SUCCESS: Returning ${images.length} images`);
      return res.status(200).json({ 
        images,
        count: images.length,
        prompt: jsabPrompt,
        source: 'vertex-ai'
      });
    }
    
    console.log('[IMAGEN API] No images returned from Vertex AI');
    res.status(500).json({ 
      error: 'No images generated',
      details: 'Vertex AI returned a successful response but no image data found.'
    });

  } catch (error: any) {
    console.error('[IMAGEN API] ERROR:', error.message);
    
    // Check specifically for Vertex AI auth errors
    if (error.message.includes('Could not load the default credentials') || 
        error.message.includes('Missing Project ID') ||
        error.message.includes('Unable to authenticate')) {
      return res.status(503).json({ 
        error: 'Vertex AI Configuration Missing', 
        code: 'VERTEX_AUTH_ERROR',
        details: 'Check GOOGLE_CLOUD_PROJECT and GOOGLE_APPLICATION_CREDENTIALS in .env.local',
        rawError: error.message
      });
    }

    res.status(500).json({ 
      error: 'Image generation failed',
      details: error.message 
    });
  }
}
