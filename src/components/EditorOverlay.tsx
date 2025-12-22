import React, { useState, useEffect, useRef } from 'react';
import { EventBus } from '../game/EventBus';
import { motion, AnimatePresence } from 'framer-motion';

const CardInput = ({ 
    label, 
    icon,
    accept, 
    onFileSelect, 
    color = '#00ffff',
    files = []
}: { 
    label: string, 
    icon: string,
    accept: string, 
    onFileSelect: (files: File[]) => void, 
    color?: string,
    files?: File[]
}) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [isHovered, setIsHovered] = useState(false);

    return (
        <motion.div 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => inputRef.current?.click()}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                flex: 1,
                backgroundColor: '#000',
                border: `4px solid ${isHovered ? '#fff' : '#222'}`,
                height: '250px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                cursor: 'pointer',
                transition: 'border-color 0.2s',
                position: 'relative',
                boxShadow: isHovered ? `0 0 30px ${color}44` : 'none'
            }}
        >
            <input 
                ref={inputRef}
                type="file" 
                accept={accept} 
                onChange={(e) => e.target.files && onFileSelect(Array.from(e.target.files))}
                style={{ display: 'none' }}
            />
            
            <div style={{ 
                position: 'absolute', top: 0, left: 0, width: '100%', height: '10px', 
                backgroundColor: color 
            }}></div>

            <div style={{ 
                fontSize: '60px', 
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                filter: isHovered ? 'brightness(1.2)' : 'brightness(1)'
            }}>
                {icon === '🎵' ? (
                    <svg width="60" height="60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 18V5L21 3V16" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <circle cx="6" cy="18" r="3" fill={color}/>
                        <circle cx="18" cy="16" r="3" fill={color}/>
                    </svg>
                ) : icon === '👾' ? (
                    <svg width="60" height="60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="4" y="4" width="16" height="16" rx="2" fill={color}/>
                        <circle cx="9" cy="9" r="1.5" fill="#000"/>
                        <circle cx="15" cy="9" r="1.5" fill="#000"/>
                        <rect x="8" y="13" width="8" height="2" rx="1" fill="#000"/>
                        <rect x="6" y="6" width="2" height="2" rx="0.5" fill="#000"/>
                        <rect x="16" y="6" width="2" height="2" rx="0.5" fill="#000"/>
                        <rect x="6" y="16" width="2" height="2" rx="0.5" fill="#000"/>
                        <rect x="16" y="16" width="2" height="2" rx="0.5" fill="#000"/>
                    </svg>
                ) : (
                    <span>{icon}</span>
                )}
            </div>
            
            <div style={{ 
                fontFamily: 'Arial Black', 
                color: isHovered ? '#fff' : color, 
                fontSize: '24px',
                textTransform: 'uppercase',
                letterSpacing: '1px'
            }}>
                {label}
            </div>

            {files.length > 0 && (
                <div style={{ 
                    marginTop: '15px', 
                    color: '#fff', 
                    fontFamily: 'Arial', 
                    fontSize: '14px',
                    backgroundColor: '#222',
                    padding: '5px 15px',
                    borderRadius: '20px'
                }}>
                    ✓ SELECTED
                </div>
            )}
        </motion.div>
    );
};

// Audio analysis utilities
async function analyzeAudio(audioBuffer: AudioBuffer): Promise<{
    bpm: number;
    peaks: number[];
    energyProfile: string;
}> {
    console.log('[AUDIO ANALYSIS] Starting BPM and peak detection...');
    
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    const duration = audioBuffer.duration;
    
    // Calculate energy in windows for beat detection
    const windowSize = Math.floor(sampleRate * 0.02); // 20ms windows
    const hopSize = Math.floor(windowSize / 2);
    const energies: number[] = [];
    
    for (let i = 0; i < channelData.length - windowSize; i += hopSize) {
        let energy = 0;
        for (let j = 0; j < windowSize; j++) {
            energy += channelData[i + j] ** 2;
        }
        energies.push(Math.sqrt(energy / windowSize));
    }
    
    // Normalize energies
    const maxEnergy = Math.max(...energies);
    const normalizedEnergies = energies.map(e => e / maxEnergy);
    
    // Find peaks (potential beats)
    const threshold = 0.5;
    const minPeakDistance = Math.floor(sampleRate / hopSize * 0.2); // 200ms minimum between peaks
    const peakIndices: number[] = [];
    
    for (let i = 1; i < normalizedEnergies.length - 1; i++) {
        if (normalizedEnergies[i] > threshold &&
            normalizedEnergies[i] > normalizedEnergies[i - 1] &&
            normalizedEnergies[i] > normalizedEnergies[i + 1]) {
            
            if (peakIndices.length === 0 || i - peakIndices[peakIndices.length - 1] > minPeakDistance) {
                peakIndices.push(i);
            }
        }
    }
    
    // Convert peak indices to timestamps
    const peaks = peakIndices.map(i => (i * hopSize) / sampleRate);
    
    // Estimate BPM from peak intervals
    let bpm = 120; // Default
    if (peaks.length > 2) {
        const intervals: number[] = [];
        for (let i = 1; i < Math.min(peaks.length, 50); i++) {
            intervals.push(peaks[i] - peaks[i - 1]);
        }
        
        // Find most common interval using histogram
        const intervalCounts = new Map<number, number>();
        intervals.forEach(interval => {
            const roundedInterval = Math.round(interval * 20) / 20; // Round to 0.05s
            intervalCounts.set(roundedInterval, (intervalCounts.get(roundedInterval) || 0) + 1);
        });
        
        let mostCommonInterval = 0.5;
        let maxCount = 0;
        intervalCounts.forEach((count, interval) => {
            if (count > maxCount && interval > 0.2 && interval < 2) {
                maxCount = count;
                mostCommonInterval = interval;
            }
        });
        
        bpm = Math.round(60 / mostCommonInterval);
        
        // Adjust to common BPM ranges
        while (bpm < 60) bpm *= 2;
        while (bpm > 200) bpm /= 2;
    }
    
    // Determine energy profile
    const firstThird = normalizedEnergies.slice(0, Math.floor(normalizedEnergies.length / 3));
    const lastThird = normalizedEnergies.slice(-Math.floor(normalizedEnergies.length / 3));
    const avgFirst = firstThird.reduce((a, b) => a + b, 0) / firstThird.length;
    const avgLast = lastThird.reduce((a, b) => a + b, 0) / lastThird.length;
    
    let energyProfile = 'dynamic';
    if (avgLast > avgFirst * 1.5) energyProfile = 'building';
    else if (avgFirst > avgLast * 1.5) energyProfile = 'fading';
    else if (avgFirst > 0.6 && avgLast > 0.6) energyProfile = 'intense';
    else if (avgFirst < 0.4 && avgLast < 0.4) energyProfile = 'calm';
    
    console.log(`[AUDIO ANALYSIS] Detected BPM: ${bpm}`);
    console.log(`[AUDIO ANALYSIS] Found ${peaks.length} rhythm peaks`);
    console.log(`[AUDIO ANALYSIS] Energy profile: ${energyProfile}`);
    
    return { bpm, peaks, energyProfile };
}

// Generate boss sprite via Imagen 3
async function generateBossSprite(prompt: string): Promise<string | null> {
    console.log('[IMAGEN] Generating boss sprite for:', prompt);
    
    try {
        const response = await fetch('/api/generate-assets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: `Boss character for rhythm game: ${prompt}`,
                style: 'jsab',
                count: 1
            })
        });
        
        console.log('[IMAGEN] API Response status:', response.status);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('[IMAGEN] API Error:', errorData);
            return null;
        }
        
        const data = await response.json();
        console.log('[IMAGEN] Response data:', {
            imageCount: data.images?.length || 0,
            message: data.message,
            debug: data.debug
        });
        
        if (data.images && data.images.length > 0) {
            // Convert base64 to blob URL for immediate use
            const base64 = data.images[0];
            const binaryString = atob(base64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: 'image/png' });
            const blobUrl = URL.createObjectURL(blob);
            console.log('[IMAGEN] Created blob URL for boss sprite');
            return blobUrl;
        }
        
        console.log('[IMAGEN] No images in response');
        return null;
    } catch (error: any) {
        console.error('[IMAGEN] Failed to generate boss sprite:', error.message);
        return null;
    }
}

export const EditorOverlay = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [prompt, setPrompt] = useState('');
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [images, setImages] = useState<File[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [status, setStatus] = useState('');
    const [subStatus, setSubStatus] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const showEditor = () => setIsVisible(true);
        EventBus.on('open-editor', showEditor);
        return () => {
            EventBus.removeListener('open-editor', showEditor);
        };
    }, []);

    const handleGenerate = async () => {
        if (!audioFile) {
            alert('Please upload an audio track first!');
            return;
        }

        setIsGenerating(true);
        setErrorMessage('');
        setStatus('INITIALIZING');
        setSubStatus('Preparing audio analysis...');
        setProgress(5);

        // Emit event to switch to PIXL Sugar Rush during generation
        EventBus.emit('level-generation-start');

        try {
            // Step 1: Decode audio
            setStatus('ANALYZING AUDIO');
            setSubStatus('Decoding waveform...');
            setProgress(10);
            
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const arrayBuffer = await audioFile.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
            const duration = audioBuffer.duration;

            console.log('[EDITOR] Audio duration:', duration, 'seconds');
            console.log('[EDITOR] Sample rate:', audioBuffer.sampleRate);

            if (duration < 5) {
                if (!confirm(`Warning: Audio is very short (${duration.toFixed(2)}s). Continue?`)) {
                    setIsGenerating(false);
                    return;
                }
            }

            // Step 2: Analyze BPM and rhythm
            setSubStatus('Detecting BPM and rhythm peaks...');
            setProgress(20);
            
            const audioAnalysis = await analyzeAudio(audioBuffer);
            console.log('[EDITOR] Audio analysis complete:', audioAnalysis);
            
            setSubStatus(`Detected ${audioAnalysis.bpm} BPM, ${audioAnalysis.peaks.length} peaks`);
            setProgress(30);

            // Step 3: Convert audio to base64
            setSubStatus('Encoding audio data...');
            setProgress(35);
            
            const audioBase64 = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(audioFile);
            });

            // Step 4: Process uploaded images
            setSubStatus('Processing uploaded assets...');
            setProgress(40);
            
            const base64Images = await Promise.all(
                images.map(img => new Promise<{data: string, type: string}>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve({
                        data: reader.result as string,
                        type: img.type || 'image/png'
                    });
                    reader.readAsDataURL(img);
                }))
            );

            // Step 5: Generate boss sprite via Imagen 3 (if no images provided)
            let generatedBossUrl: string | null = null;
            if (images.length === 0 && prompt) {
                setStatus('GENERATING BOSS');
                setSubStatus('Creating boss sprite with Imagen 3...');
                setProgress(45);
                
                generatedBossUrl = await generateBossSprite(prompt);
                if (generatedBossUrl) {
                    console.log('[EDITOR] Boss sprite generated successfully');
                    setSubStatus('Boss sprite created!');
                } else {
                    console.log('[EDITOR] Boss sprite generation failed, continuing without');
                    setSubStatus('Boss sprite skipped, using geometric shapes');
                }
                setProgress(55);
            }

            // Step 6: Generate level with Gemini
            setStatus('AI LEVEL DESIGN');
            setSubStatus('Gemini is choreographing attacks to your music...');
            setProgress(60);

            console.log('[EDITOR] Calling /api/generate with analysis data...');
            
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt,
                    images: base64Images,
                    audioData: audioBase64,
                    duration,
                    bpm: audioAnalysis.bpm,
                    rhythmPeaks: audioAnalysis.peaks,
                    audioAnalysis: {
                        bpm: audioAnalysis.bpm,
                        energyProfile: audioAnalysis.energyProfile,
                        peakCount: audioAnalysis.peaks.length
                    }
                })
            });

            console.log('[EDITOR] API Response status:', response.status);
            setProgress(80);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('[EDITOR] API Error:', errorData);
                
                if (errorData.code === 'VERTEX_AUTH_ERROR') {
                    throw new Error('VERTEX_AUTH_ERROR');
                }
                
                throw new Error(errorData.error || errorData.details || `API Error: ${response.status}`);
            }

            const levelData = await response.json();
            console.log('[EDITOR] Level data received:', {
                bossName: levelData.metadata?.bossName,
                eventCount: levelData.timeline?.length,
                bpm: levelData.metadata?.bpm
            });
            
            if (!levelData.timeline || levelData.timeline.length === 0) {
                throw new Error('AI generated empty level - please try again');
            }

            setStatus('PREPARING GAME');
            setSubStatus(`${levelData.timeline.length} attacks choreographed!`);
            setProgress(90);

            // Step 7: Create blob URLs for assets
            const audioUrl = URL.createObjectURL(audioFile);
            const imageMappings: Record<string, string> = {};
            
            // Add uploaded images
            images.forEach((img, i) => {
                imageMappings[`asset_${i}`] = URL.createObjectURL(img);
            });
            
            // Add generated boss sprite if available
            if (generatedBossUrl) {
                imageMappings['generated_boss'] = generatedBossUrl;
            }

            const payload = { levelData, audioUrl, imageMappings };
            
            // Save to local storage
            try {
                const savedLevels = JSON.parse(localStorage.getItem('community_levels') || '[]');
                const storedPayload = {
                    levelData,
                    audioUrl: '',
                    imageMappings: {},
                    createdAt: new Date().toISOString()
                };
                savedLevels.unshift(storedPayload);
                if (savedLevels.length > 20) savedLevels.pop();
                localStorage.setItem('community_levels', JSON.stringify(savedLevels));
            } catch (storageError) {
                console.warn('[EDITOR] Could not save to localStorage:', storageError);
            }

            // Set pending data for Game scene
            (window as any).pendingLevelData = payload;

            setStatus('LAUNCHING');
            setSubStatus('Get ready to dance through danger!');
            setProgress(100);
            
            await new Promise(resolve => setTimeout(resolve, 500));
            
            EventBus.emit('load-level', payload);
            setIsVisible(false);
            setIsGenerating(false);
            
            console.log('[EDITOR] Level loaded successfully!');
            
        } catch (error: any) {
            console.error('[EDITOR] Generation error:', error);
            setErrorMessage(error.message || 'Unknown error occurred');
            setStatus('ERROR');
            setSubStatus('');
            setProgress(0);
        }
    };

    const overlayVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.3 } },
        exit: { opacity: 0 }
    };

    const contentVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 30 },
        visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    variants={overlayVariants}
                    style={{
                        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                        backgroundColor: '#000', 
                        color: 'white', display: 'flex',
                        flexDirection: 'column',
                        zIndex: 1000, fontFamily: 'Arial, sans-serif'
                    }}
                >
                    {/* Header */}
                    <div style={{ 
                        height: '100px', display: 'flex', alignItems: 'center', padding: '0 60px',
                        background: 'linear-gradient(90deg, #31B4BF, #2A9FA8)',
                        clipPath: 'polygon(0 0, 100% 0, 95% 100%, 0 100%)'
                    }}>
                        <h1 style={{ 
                            fontFamily: 'Arial Black', fontSize: '48px', margin: 0, color: '#fff',
                            textTransform: 'uppercase', letterSpacing: '-2px'
                        }}>
                            NEW PROJECT
                        </h1>
                    </div>

                    {isGenerating ? (
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
                        >
                            {status === 'ERROR' ? (
                                <>
                                    <div style={{ 
                                        width: '100px', height: '100px', 
                                        border: '10px solid #ff0000', 
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '50px'
                                    }}>
                                        ✕
                                    </div>
                                    <h2 style={{ fontFamily: 'Arial Black', fontSize: '32px', marginTop: '40px', color: '#ff0000' }}>
                                        GENERATION FAILED
                                    </h2>
                                    
                                    {errorMessage === 'VERTEX_AUTH_ERROR' ? (
                                        <div style={{ 
                                            backgroundColor: '#220000', 
                                            padding: '20px', 
                                            borderRadius: '8px',
                                            marginTop: '20px',
                                            maxWidth: '600px',
                                            border: '1px solid #ff0000',
                                            textAlign: 'left'
                                        }}>
                                            <h3 style={{ color: '#ff0000', marginTop: 0 }}>VERTEX AI AUTHENTICATION FAILED</h3>
                                            <p style={{ color: '#ccc', lineHeight: '1.6' }}>
                                                To use Vertex AI (Gemini & Imagen), you must configure Application Default Credentials.
                                            </p>
                                            <ol style={{ color: '#ccc', paddingLeft: '20px' }}>
                                                <li>Check <code>.env.local</code> in <code>template-nextjs/</code></li>
                                                <li>Ensure <code>GOOGLE_CLOUD_PROJECT</code> is set</li>
                                                <li>Ensure <code>GOOGLE_APPLICATION_CREDENTIALS</code> points to your JSON key file</li>
                                            </ol>
                                            <p style={{ color: '#888', fontSize: '14px', marginTop: '15px' }}>
                                                See <code>README-API-SETUP.md</code> for details.
                                            </p>
                                        </div>
                                    ) : (
                                        <p style={{ color: '#888', marginTop: '10px', maxWidth: '500px', textAlign: 'center' }}>
                                            {errorMessage}
                                        </p>
                                    )}

                                    <motion.button 
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => {
                                            setIsGenerating(false);
                                            setErrorMessage('');
                                            setStatus('');
                                            setSubStatus('');
                                            setProgress(0);
                                        }}
                                        style={{ 
                                            marginTop: '30px',
                                            padding: '15px 40px', 
                                            backgroundColor: 'transparent', 
                                            border: '3px solid #ff0099', 
                                            color: '#ff0099',
                                            fontFamily: 'Arial Black', 
                                            fontSize: '20px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        TRY AGAIN
                                    </motion.button>
                                </>
                            ) : (
                                <>
                                    <motion.div 
                                        animate={{ rotate: 360 }}
                                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                                        style={{ 
                                            width: '100px', height: '100px', 
                                            border: '10px solid #222', 
                                            borderTopColor: '#ff0099', 
                                            borderRadius: '50%' 
                                        }}
                                    />
                                    <h2 style={{ fontFamily: 'Arial Black', fontSize: '32px', marginTop: '40px', color: '#fff' }}>
                                        {status}
                                    </h2>
                                    <p style={{ color: '#888', marginTop: '10px', fontSize: '18px' }}>
                                        {subStatus}
                                    </p>
                                    
                                    {/* Progress bar */}
                                    <div style={{ 
                                        width: '400px', 
                                        height: '8px', 
                                        backgroundColor: '#222', 
                                        marginTop: '30px',
                                        borderRadius: '4px',
                                        overflow: 'hidden'
                                    }}>
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${progress}%` }}
                                            transition={{ duration: 0.3 }}
                                            style={{ 
                                                height: '100%', 
                                                backgroundColor: '#ff0099',
                                                borderRadius: '4px'
                                            }}
                                        />
                                    </div>
                                    <p style={{ color: '#666', marginTop: '10px', fontSize: '14px' }}>
                                        {progress}%
                                    </p>
                                </>
                            )}
                        </motion.div>
                    ) : (
                        <motion.div 
                            variants={contentVariants}
                            initial="hidden"
                            animate="visible"
                            style={{ flex: 1, padding: '60px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '50px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}
                        >
                            
                            {/* Prompt Input */}
                            <motion.div variants={itemVariants}>
                                <div style={{ fontFamily: 'Arial Black', fontSize: '20px', marginBottom: '15px', color: '#888' }}>
                                    TRACK CONCEPT
                                    <span style={{ fontSize: '14px', color: '#555', marginLeft: '15px', fontFamily: 'Arial' }}>
                                        (Describes the boss/level theme for AI)
                                    </span>
                                </div>
                                <input 
                                    type="text" 
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder="e.g., 'Neon Cyberpunk Boss', 'Geometric Nightmare', 'Pulse Monster'..."
                                    style={{ 
                                        width: '100%', padding: '20px', fontSize: '24px', backgroundColor: '#111', border: 'none', borderBottom: '4px solid #333',
                                        color: '#fff', fontFamily: 'Arial', outline: 'none'
                                    }}
                                    onFocus={(e) => e.currentTarget.style.borderBottomColor = '#ff0099'}
                                    onBlur={(e) => e.currentTarget.style.borderBottomColor = '#333'}
                                />
                            </motion.div>

                            {/* Cards Container */}
                            <motion.div 
                                variants={itemVariants}
                                style={{ display: 'flex', gap: '40px' }}
                            >
                                <CardInput 
                                    label="AUDIO TRACK" 
                                    icon="🎵"
                                    accept="audio/*" 
                                    color="#00ffff"
                                    onFileSelect={(f) => setAudioFile(f[0])}
                                    files={audioFile ? [audioFile] : []}
                                />
                                <CardInput 
                                    label="BOSS ASSETS" 
                                    icon="👾"
                                    accept="image/*" 
                                    color="#ff0099"
                                    onFileSelect={setImages}
                                    files={images}
                                />
                            </motion.div>
                            
                            <motion.p 
                                variants={itemVariants}
                                style={{ color: '#555', fontSize: '14px', textAlign: 'center', marginTop: '-30px' }}
                            >
                                Boss assets are optional — AI will generate sprites via Imagen 3 if none provided
                            </motion.p>

                            {/* Actions */}
                            <motion.div 
                                variants={itemVariants}
                                style={{ display: 'flex', gap: '20px', alignItems: 'center' }}
                            >
                                <motion.button 
                                    whileHover={{ scale: 1.02, backgroundColor: 'rgba(255, 0, 153, 0.1)', borderColor: '#ff0099', color: '#ff0099' }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleGenerate}
                                    style={{ 
                                        flex: 2, padding: '30px', backgroundColor: 'transparent', border: '4px solid #333', color: '#666',
                                        fontFamily: 'Arial Black', fontSize: '32px', letterSpacing: '2px',
                                        cursor: 'pointer', transform: 'skew(-10deg)',
                                        transition: 'color 0.2s, border-color 0.2s'
                                    }}
                                >
                                    CREATE LEVEL
                                </motion.button>

                                <motion.button 
                                    whileHover={{ scale: 1.02, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: '#555', color: '#888' }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setIsVisible(false)}
                                    style={{ 
                                        flex: 1, padding: '30px', backgroundColor: 'transparent', border: '4px solid #333', color: '#555',
                                        fontFamily: 'Arial Black', fontSize: '24px', cursor: 'pointer', transform: 'skew(-10deg)',
                                        transition: 'color 0.2s, border-color 0.2s'
                                    }}
                                >
                                    BACK
                                </motion.button>
                            </motion.div>

                        </motion.div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
};
