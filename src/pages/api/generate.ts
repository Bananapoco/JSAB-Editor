import type { NextApiRequest, NextApiResponse } from 'next';
import Anthropic from '@anthropic-ai/sdk';
import { jsonrepair } from 'jsonrepair';
import fs from 'fs';
import path from 'path';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ---------------------------------------------------------------------------
// Tool schema — Claude uses this to output a structured LevelData object
// ---------------------------------------------------------------------------

const levelSchema = {
    name: 'create_level',
    description: 'Output a complete JSAB-style level definition with procedural vector shapes.',
    input_schema: {
        type: 'object' as const,
        properties: {
            metadata: {
                type: 'object',
                properties: {
                    bossName: { type: 'string', description: 'Creative boss / level name' },
                    bpm: { type: 'number', description: 'Beats per minute of the song' },
                    duration: { type: 'number', description: 'Song duration in seconds' },
                },
                required: ['bossName', 'duration'],
            },
            theme: {
                type: 'object',
                properties: {
                    enemyColor: { type: 'string', description: 'Hex color for hazards, e.g. #FF0099' },
                    backgroundColor: { type: 'string', description: 'Hex background color, e.g. #0a0010' },
                    playerColor: { type: 'string', description: 'Hex color for the player, e.g. #00ffff' },
                },
                required: ['enemyColor', 'backgroundColor', 'playerColor'],
            },
            timeline: {
                type: 'array',
                description: 'Ordered list of level events. At least 20 events spread across the duration.',
                items: {
                    type: 'object',
                    properties: {
                        timestamp: { type: 'number', description: 'Seconds from audio start when this event triggers' },
                        type: {
                            type: 'string',
                            enum: ['projectile_throw', 'spawn_obstacle', 'screen_shake', 'pulse'],
                        },
                        x: { type: 'number', description: 'World X position (0–1024)' },
                        y: { type: 'number', description: 'World Y position (0–768)' },
                        size: { type: 'number', description: 'Approximate size in pixels' },
                        rotation: { type: 'number', description: 'Initial rotation in degrees' },
                        duration: { type: 'number', description: 'How many seconds this hazard lives' },
                        behavior: {
                            type: 'string',
                            enum: ['homing', 'spinning', 'bouncing', 'static'],
                        },
                        objectDef: {
                            type: 'object',
                            description: 'Optional: full procedural object. Use this for complex or composite shapes.',
                            properties: {
                                x: { type: 'number' },
                                y: { type: 'number' },
                                rotation: { type: 'number' },
                                scale: { type: 'number' },
                                spawnTime: { type: 'number' },
                                despawnTime: { type: 'number' },
                                shape: {
                                    type: 'object',
                                    properties: {
                                        kind: { type: 'string', enum: ['circle', 'rect', 'polygon'] },
                                        radius: { type: 'number' },
                                        width: { type: 'number' },
                                        height: { type: 'number' },
                                        sides: { type: 'number', description: 'For regular polygon (3+ sides)' },
                                        fillColor: { type: 'string' },
                                        glowColor: { type: 'string' },
                                        glowRadius: { type: 'number' },
                                        alpha: { type: 'number' },
                                    },
                                    required: ['kind'],
                                },
                                children: {
                                    type: 'array',
                                    description: 'Sub-shapes composing a complex object (e.g. hammer = handle rect + head rect)',
                                    items: {
                                        type: 'object',
                                        properties: {
                                            offsetX: { type: 'number' },
                                            offsetY: { type: 'number' },
                                            localRotation: { type: 'number' },
                                            localScale: { type: 'number' },
                                            shape: {
                                                type: 'object',
                                                properties: {
                                                    kind: { type: 'string', enum: ['circle', 'rect', 'polygon'] },
                                                    radius: { type: 'number' },
                                                    width: { type: 'number' },
                                                    height: { type: 'number' },
                                                    sides: { type: 'number' },
                                                    fillColor: { type: 'string' },
                                                    glowColor: { type: 'string' },
                                                    glowRadius: { type: 'number' },
                                                },
                                                required: ['kind'],
                                            },
                                        },
                                    },
                                },
                                behaviors: {
                                    type: 'array',
                                    items: {
                                        type: 'object',
                                        properties: {
                                            kind: { type: 'string', enum: ['rotate', 'pulse', 'orbit', 'linearMove', 'homing', 'dieAfter', 'bounce'] },
                                            speed: { type: 'number' },
                                            minScale: { type: 'number' },
                                            maxScale: { type: 'number' },
                                            period: { type: 'number' },
                                            centerX: { type: 'number' },
                                            centerY: { type: 'number' },
                                            radius: { type: 'number' },
                                            angularSpeed: { type: 'number' },
                                            velocityX: { type: 'number' },
                                            velocityY: { type: 'number' },
                                            homingSpeed: { type: 'number' },
                                            lifetime: { type: 'number' },
                                            vx: { type: 'number' },
                                            vy: { type: 'number' },
                                        },
                                        required: ['kind'],
                                    },
                                },
                            },
                            required: ['x', 'y', 'spawnTime'],
                        },
                    },
                    required: ['timestamp', 'type', 'x', 'y'],
                },
            },
            explanation: { type: 'string', description: 'Brief design rationale (1–3 sentences)' },
        },
        required: ['metadata', 'theme', 'timeline'],
    },
};

const levelHeaderSchema = {
    name: 'create_level_header',
    description: 'Output level metadata/theme/explanation only. No timeline.',
    input_schema: {
        type: 'object' as const,
        properties: {
            metadata: {
                type: 'object',
                properties: {
                    bossName: { type: 'string' },
                    bpm: { type: 'number' },
                    duration: { type: 'number' },
                },
                required: ['bossName', 'duration'],
            },
            theme: {
                type: 'object',
                properties: {
                    enemyColor: { type: 'string' },
                    backgroundColor: { type: 'string' },
                    playerColor: { type: 'string' },
                },
                required: ['enemyColor', 'backgroundColor', 'playerColor'],
            },
            explanation: { type: 'string' },
        },
        required: ['metadata', 'theme', 'explanation'],
    },
};

const timelineSegmentSchema = {
    name: 'create_timeline_segment',
    description: 'Output only timeline events for a given time range.',
    input_schema: {
        type: 'object' as const,
        properties: {
            timeline: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        timestamp: { type: 'number' },
                        type: { type: 'string', enum: ['projectile_throw', 'spawn_obstacle', 'screen_shake', 'pulse'] },
                        x: { type: 'number' },
                        y: { type: 'number' },
                        size: { type: 'number' },
                        rotation: { type: 'number' },
                        duration: { type: 'number' },
                        behavior: { type: 'string', enum: ['homing', 'spinning', 'bouncing', 'static'] },
                    },
                    required: ['timestamp', 'type', 'x', 'y'],
                },
            },
        },
        required: ['timeline'],
    },
};

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
        const bpmInfo = bpm
            ? `\n\nBPM: ${bpm} (one beat = ${beatSec!.toFixed(4)}s). CRITICAL: Every event timestamp MUST land on a beat subdivision. Use these grid values:\n- Whole note (4 beats): ${(beatSec! * 4).toFixed(4)}s\n- Half note (2 beats): ${(beatSec! * 2).toFixed(4)}s\n- Quarter note (1 beat): ${beatSec!.toFixed(4)}s\n- 8th note (½ beat): ${(beatSec! / 2).toFixed(4)}s\n- 16th note (¼ beat): ${(beatSec! / 4).toFixed(4)}s\n\nVary the rhythm: heavy attacks on quarter notes during drops/choruses, lighter 8th/16th patterns during buildups, sparse half/whole note hits during calm sections. NOT every single beat — leave breathing room.`
            : '\n\nNo BPM provided — spread events roughly evenly with natural rhythm variation.';

        // Keep event count within realistic token limits for LLM tool output.
        // Very high counts (e.g. duration * 6 on long songs) can cause timeline omission.
        const targetEvents = Math.min(240, Math.max(48, Math.floor(duration * 1.1)));
        const userContent: Anthropic.MessageParam['content'] = [
            {
                type: 'text',
                text: `Create a bullet-hell JSAB-style level for this concept: "${prompt}"\n\nSong duration: ${duration} seconds. This is a BULLET HELL game — the screen should always have multiple active hazards. Generate around ${targetEvents} timeline events (minimum 48, maximum 260). Timestamps must be between 0 and ${duration}. Multiple events CAN share the same timestamp (simultaneous spawns). At peak intensity, spawn 3-5 objects on the same beat.${bpmInfo}\n\nIMPORTANT OUTPUT SIZE RULES:\n- Keep most events compact: use timestamp, type, x, y, size, rotation, duration, behavior.\n- objectDef is optional. Use objectDef only for special set-piece attacks (about 5-15 events total).\n- If objectDef is used, include a visible shape/children.\n- ALL hazards are procedural vector shapes (no image assets).`,
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

        // Step 2: Generate timeline in small segments to avoid max_tokens cutoffs.
        const segmentCount = duration > 240 ? 5 : duration > 150 ? 4 : duration > 90 ? 3 : 2;
        const eventsPerSegment = Math.max(24, Math.ceil(targetEvents / segmentCount));
        const mergedTimeline: any[] = [];

        for (let i = 0; i < segmentCount; i++) {
            const start = (duration / segmentCount) * i;
            const end = i === segmentCount - 1 ? duration : (duration / segmentCount) * (i + 1);
            const segmentPrompt = `Create timeline events for this level concept: "${prompt}".
Time window: ${start.toFixed(3)}s to ${end.toFixed(3)}s (inclusive).
Generate about ${eventsPerSegment} events for THIS window only.
Use compact events only (timestamp,type,x,y,size,rotation,duration,behavior). No objectDef in this mode.
Timestamps must stay within the window and align to beat subdivisions when BPM is provided.${bpmInfo}
Output ONLY via create_timeline_segment tool.`;

            const segmentResponse = await client.messages.create({
                model: 'claude-sonnet-4-6',
                max_tokens: 4096,
                system: `Generate only timeline events for the given time range.
Rules:
- Screen is 1024x768
- Events should be varied and playable
- Use screen_shake sparingly at impactful moments
- Output timeline sorted by timestamp`,
                tools: [timelineSegmentSchema],
                tool_choice: { type: 'tool', name: 'create_timeline_segment' },
                messages: [{ role: 'user', content: [{ type: 'text', text: segmentPrompt }] }],
            });

            const segmentToolUse = segmentResponse.content.find(b => b.type === 'tool_use') as Anthropic.ToolUseBlock | undefined;
            if (!segmentToolUse) {
                throw new Error(`Claude did not return timeline tool_use for segment ${i + 1}/${segmentCount}`);
            }

            let segmentResult: any;
            try {
                segmentResult = segmentToolUse.input;
                if (typeof segmentResult === 'string') {
                    segmentResult = JSON.parse(jsonrepair(segmentResult));
                }
            } catch (e) {
                console.error(`Failed to parse/repair timeline segment ${i + 1}:`, e);
                throw new Error(`The AI generated invalid timeline JSON for segment ${i + 1}.`);
            }

            const segmentTimeline = Array.isArray(segmentResult.timeline) ? segmentResult.timeline : [];
            console.log(`[Claude/timeline] segment ${i + 1}/${segmentCount} stop_reason=${segmentResponse.stop_reason} events=${segmentTimeline.length}`);
            mergedTimeline.push(...segmentTimeline);
        }

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
