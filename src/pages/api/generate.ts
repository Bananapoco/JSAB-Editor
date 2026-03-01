import type { NextApiRequest, NextApiResponse } from 'next';
import Anthropic from '@anthropic-ai/sdk';
import { jsonrepair } from 'jsonrepair';
import fs from 'fs';
import path from 'path';
import { levelSchema, levelHeaderSchema, timelineSegmentSchema } from '../../server/generateSchemas';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { prompt, images, duration, bpm } = req.body as {
        prompt: string;
        images?: string[];
        duration: number;
        bpm?: number;
    };

    try {
        // Build the user message content (text + optional images for vision)
        // Compute beat grid info for the prompt
        const beatSec = bpm ? 60 / bpm : null;
        const requestedTemperature = typeof (req.body as any)?.temperature === 'number'
            ? (req.body as any).temperature
            : 0.8;
        const temperature = Math.max(0, Math.min(1, requestedTemperature));
        const headerTemperature = Math.min(0.4, temperature);
        const bpmInfo = bpm
            ? `\n\nBPM: ${bpm} (one beat = ${beatSec!.toFixed(4)}s). CRITICAL: Every event timestamp MUST land on a beat subdivision. Use these grid values:\n- Whole note (4 beats): ${(beatSec! * 4).toFixed(4)}s\n- Half note (2 beats): ${(beatSec! * 2).toFixed(4)}s\n- Quarter note (1 beat): ${beatSec!.toFixed(4)}s\n- 8th note (½ beat): ${(beatSec! / 2).toFixed(4)}s\n- 16th note (¼ beat): ${(beatSec! / 4).toFixed(4)}s\n\nVary the rhythm: heavy attacks on quarter notes during drops/choruses, lighter 8th/16th patterns during buildups, sparse half/whole note hits during calm sections. NOT every single beat — leave breathing room.`
            : '\n\nNo BPM provided — spread events roughly evenly with natural rhythm variation.';

        // Keep event count within realistic token limits for LLM tool output.
        // Very high counts (e.g. duration * 6 on long songs) can cause timeline omission.
        const targetEvents = Math.min(240, Math.max(48, Math.floor(duration * 1.1)));
        const minSetPieceEvents = Math.max(6, Math.floor(targetEvents * 0.1));
        const userContent: Anthropic.MessageParam['content'] = [
            {
                type: 'text',
                text: `Create a bullet-hell JSAB-style level for this concept: "${prompt}"\n\nSong duration: ${duration} seconds. This is a BULLET HELL game — the screen should always have multiple active hazards. Generate around ${targetEvents} timeline events (minimum 48, maximum 260). Timestamps must be between 0 and ${duration}. Multiple events CAN share the same timestamp (simultaneous spawns). At peak intensity, spawn 3-5 objects on the same beat.${bpmInfo}\n\nIMPORTANT OUTPUT SIZE RULES:\n- Keep most events compact: use timestamp, type, x, y, size, rotation, duration, behavior.\n- objectDef is optional. Use objectDef for special set-piece attacks (at least ${minSetPieceEvents} events total across the full level).\n- If objectDef is used, include a visible shape or children.\n- Translate important nouns/themes into geometry. Example: cat boss = composite body/head/ears/paws/tail; stars = polygon points; planets = large circles + ring children.\n- ALL hazards are procedural vector shapes (no image assets).
- Legacy behavior field options: homing, spinning, bouncing, static, sweep, bomb.`,
            },
        ];

        for (const img of images ?? []) {
            const data = img.includes(',') ? img.split(',')[1] : img;
            userContent.push({
                type: 'image',
                source: { type: 'base64', media_type: 'image/jpeg', data },
            });
        }

        // Step 1: Generate compact level header (metadata/theme/explanation).
        const headerResponse = await client.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 2048,
            temperature: headerTemperature,
            system: `You are an expert level designer for "Just Shapes & Beats" style rhythm games.
Output ONLY metadata, theme, and a short explanation. Do not output timeline.`,
            tools: [levelHeaderSchema],
            tool_choice: { type: 'tool', name: 'create_level_header' },
            messages: [{ role: 'user', content: userContent }],
        });

        const headerToolUse = headerResponse.content.find(b => b.type === 'tool_use') as Anthropic.ToolUseBlock | undefined;
        if (!headerToolUse) {
            throw new Error('Claude did not return a level header tool_use block');
        }
        console.log(`[Claude/header] stop_reason=${headerResponse.stop_reason}`);

        let header: any;
        try {
            header = headerToolUse.input;
            if (typeof header === 'string') {
                header = JSON.parse(jsonrepair(header));
            }
        } catch (e) {
            console.error('Failed to parse/repair level header:', e);
            throw new Error('The AI generated an invalid level header JSON.');
        }

        // Step 2: Generate timeline in smaller windows to avoid max_tokens truncation.
        const maxWindowSec = 10;
        const windowCount = Math.max(2, Math.ceil(duration / maxWindowSec));
        const eventsPerWindow = Math.max(4, Math.min(12, Math.ceil(targetEvents / windowCount)));
        const timelineSystemPrompt = `Generate only timeline events for the given time range.
Rules:
- Screen is 1366x768
- Events should be varied and playable
- Bullet hell
- ALL hazards are procedural vector shape (circle, rect, polygon, or composite children). No image assets.
- Complex shapes (like a hammer) can be composed of multiple shapes (example: narrow handle rect + wide head rect on top)
- EVERY objectDef MUST have a "shape" field (top-level) or "children" with shapes. Objects without shapes are invisible and broken.
- Use polygon points when needed to form stars, claws, ears, tails, rings, and other recognizable silhouettes.
- RHYTHM: All attack timestamps MUST be quantized to beat subdivisions (quarter, 8th, or 16th notes). Vary density:
  * Calm/intro sections: sparse attacks on whole/half notes with breathing room
  * Buildups: increasing density with 8th notes, anticipation patterns
  * Drops/choruses: dense quarter-note and 8th-note attacks, screen shakes
  * Breakdowns: 16th-note flurries mixed with pauses for emphasis
  * NEVER attack on every single beat nonstop — use silence and contrast for impact
- For composite shapes (e.g. rotating hammer, gear, saw blade, spiral arm), define children with offsetX/offsetY.
- Behaviors: rotate (continuous spin), pulse (scale breathing), orbit (circle a point), linearMove (constant velocity), homing (track player), bounce (ricochet off walls), bomb (grow then explode into particles), dieAfter (lifetime in seconds).
- objectDef.behaviors can combine multiple behaviors (e.g. rotate + orbit for a spinning orbiting object).
- ALWAYS include a dieAfter behavior with a reasonable lifetime (2-8 seconds) so objects don't accumulate forever.
- Place hazards at varied positions — edges, center, diagonals — not just one spot.
- screen_shake events add dramatic impact at key moments (drops, phase changes).
- Output timeline sorted by timestamp`;

        const requestTimelineWindow = async (
            start: number,
            end: number,
            desiredEvents: number,
        ): Promise<any[]> => {
            const segmentPrompt = `Create timeline events for this level concept: "${prompt}".
Time window: ${start.toFixed(3)}s to ${end.toFixed(3)}s (inclusive).
Generate about ${desiredEvents} events for THIS window only.
Keep most events compact, but include set-piece objectDefs in this window.
Target 10-20% set-piece objectDef events for motif-heavy shapes and attacks.
Each set-piece objectDef must include visible shape and/or children and at least one behavior.
Translate the prompt's nouns/adjectives into literal geometry (silhouettes/patterns), not only text flavor.
Timestamps must stay within the window and align to beat subdivisions when BPM is provided.${bpmInfo}
Output ONLY via create_timeline_segment tool.`;

            const segmentResponse = await client.messages.create({
                model: 'claude-sonnet-4-6',
                max_tokens: 8192,
                temperature,
                system: timelineSystemPrompt,
                tools: [timelineSegmentSchema],
                tool_choice: { type: 'tool', name: 'create_timeline_segment' },
                messages: [{ role: 'user', content: [{ type: 'text', text: segmentPrompt }] }],
            });

            const segmentToolUse = segmentResponse.content.find(b => b.type === 'tool_use') as Anthropic.ToolUseBlock | undefined;
            if (!segmentToolUse) {
                console.warn(`[Claude/timeline] window ${start.toFixed(2)}-${end.toFixed(2)} no tool_use`);
                return [];
            }

            let segmentResult: any;
            try {
                segmentResult = segmentToolUse.input;
                if (typeof segmentResult === 'string') {
                    segmentResult = JSON.parse(jsonrepair(segmentResult));
                }
            } catch (e) {
                console.warn(`[Claude/timeline] window ${start.toFixed(2)}-${end.toFixed(2)} parse error`, e);
                return [];
            }

            const segmentTimeline = Array.isArray(segmentResult.timeline) ? segmentResult.timeline : [];
            console.log(
                `[Claude/timeline] window ${start.toFixed(2)}-${end.toFixed(2)} stop_reason=${segmentResponse.stop_reason} events=${segmentTimeline.length}`,
            );
            return segmentTimeline;
        };

        const generateTimelineSegments = async () => {
            const mergedTimeline: any[] = [];

            for (let i = 0; i < windowCount; i++) {
                const start = (duration / windowCount) * i;
                const end = i === windowCount - 1 ? duration : (duration / windowCount) * (i + 1);
                const segmentTimeline = await requestTimelineWindow(start, end, eventsPerWindow);
                mergedTimeline.push(...segmentTimeline);
            }
            return mergedTimeline;
        };
        const mergedTimeline = await generateTimelineSegments();

        const timeline = mergedTimeline
            .filter((e: any) => e && typeof e.timestamp === 'number')
            .map((e: any) => ({
                ...e,
                timestamp: Math.max(0, Math.min(duration, e.timestamp)),
            }))
            .sort((a: any, b: any) => a.timestamp - b.timestamp);

        if (timeline.length === 0) {
            throw new Error('AI returned no timeline events after segmented generation.');
        }

        const result: any = {
            metadata: {
                bossName: header?.metadata?.bossName || 'Generated Boss',
                duration: header?.metadata?.duration || duration,
                bpm: header?.metadata?.bpm || bpm,
            },
            theme: {
                enemyColor: header?.theme?.enemyColor || '#ff0099',
                backgroundColor: header?.theme?.backgroundColor || '#000000',
                playerColor: header?.theme?.playerColor || '#00ffff',
            },
            explanation: header?.explanation || 'Generated by Claude.',
            timeline,
        };

        console.log('--- AGENT LEVEL GENERATION OUTPUT SUMMARY ---');
        console.log(`Boss Name: ${result.metadata?.bossName || 'Unknown'}`);
        console.log(`Timeline Events: ${result.timeline?.length || 0}`);
        console.log(`Duration: ${result.metadata?.duration?.toFixed(2) || '?' }s`);
        console.log(`BPM: ${result.metadata?.bpm || '?'}`);
        console.log(`Temperature: ${temperature.toFixed(2)}`);
        
        // Write the FULL JSON to a file in the workspace root so it's not truncated by terminal buffers
        try {
            const logPath = path.join(process.cwd(), 'last_generated_level.json');
            fs.writeFileSync(logPath, JSON.stringify(result, null, 2));
            console.log(`FULL JSON saved to: ${logPath}`);
        } catch (fileErr) {
            console.warn('Failed to save full JSON to file:', fileErr);
            // Fallback: log the first 20 events only if it's too huge
            console.log('Full JSON (truncated for console if needed):');
            console.log(JSON.stringify(result, null, 2));
        }
        console.log('--------------------------------------------');

        // Ensure timeline is always an array
        if (!Array.isArray(result.timeline)) result.timeline = [];
        // Inject user-provided BPM into metadata if the AI didn't set it
        if (bpm && result.metadata && !result.metadata.bpm) {
            result.metadata.bpm = bpm;
        }

        res.status(200).json(result);
    } catch (error: any) {
        console.error('Claude generation error:', error);
        res.status(500).json({ error: error.message });
    }
}
