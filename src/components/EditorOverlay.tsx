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

export const EditorOverlay = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [prompt, setPrompt] = useState('');
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [images, setImages] = useState<File[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [status, setStatus] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        const showEditor = () => setIsVisible(true);
        EventBus.on('open-editor', showEditor);
        return () => {
            EventBus.removeListener('open-editor', showEditor);
        };
    }, []);

    const handleGenerate = async () => {
        if (!audioFile) {
            alert('Please upload an MP3 first!');
            return;
        }

        setIsGenerating(true);
        setErrorMessage('');
        setStatus('INITIALIZING...');

        try {
            // Get audio duration
            setStatus('DECODING AUDIO...');
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const arrayBuffer = await audioFile.arrayBuffer();
            const bufferForDecode = arrayBuffer.slice(0);
            const audioBuffer = await audioContext.decodeAudioData(bufferForDecode);
            const duration = audioBuffer.duration;

            console.log('Audio duration:', duration, 'seconds');

            if (duration < 5) {
                if (!confirm(`Warning: Audio is very short (${duration.toFixed(2)}s). Continue?`)) {
                    setIsGenerating(false);
                    return;
                }
            }

            setStatus('PROCESSING ASSETS...');
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

            const audioBase64 = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(audioFile);
            });

            setStatus('AI GENERATING LEVEL...');
            console.log('Calling /api/generate...');
            
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt,
                    images: base64Images,
                    audioData: audioBase64,
                    duration
                })
            });

            console.log('API Response status:', response.status);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `API Error: ${response.status}`);
            }

            const levelData = await response.json();
            console.log('Level data received:', levelData.metadata?.bossName, 'with', levelData.timeline?.length, 'events');
            
            // Validate we got actual level data
            if (!levelData.timeline || levelData.timeline.length === 0) {
                throw new Error('Generated level has no events');
            }

            setStatus('PREPARING GAME...');
            
            const audioUrl = URL.createObjectURL(audioFile);
            const imageMappings: Record<string, string> = {};
            images.forEach((img, i) => {
                imageMappings[`asset_${i}`] = URL.createObjectURL(img);
            });

            const payload = { levelData, audioUrl, imageMappings };
            
            // Save to local storage
            try {
                const savedLevels = JSON.parse(localStorage.getItem('community_levels') || '[]');
                // Create a serializable version (without blob URLs for storage)
                const storedPayload = {
                    levelData,
                    audioUrl: '', // Can't store blob URLs
                    imageMappings: {}
                };
                savedLevels.unshift(storedPayload);
                // Keep only last 20 levels
                if (savedLevels.length > 20) savedLevels.pop();
                localStorage.setItem('community_levels', JSON.stringify(savedLevels));
            } catch (storageError) {
                console.warn('Could not save to localStorage:', storageError);
            }

            // Set pending data for Game scene
            (window as any).pendingLevelData = payload;

            setStatus('LAUNCHING...');
            
            // Give React a moment to update, then emit events
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // First emit load-level (Game scene will catch this if already active)
            EventBus.emit('load-level', payload);
            
            // Hide overlay
            setIsVisible(false);
            setIsGenerating(false);
            
            console.log('Level loaded and events emitted!');
            
        } catch (error: any) {
            console.error('Generation error:', error);
            setErrorMessage(error.message || 'Unknown error occurred');
            setStatus('ERROR');
            setIsGenerating(false);
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
                                    <p style={{ color: '#888', marginTop: '10px', maxWidth: '400px', textAlign: 'center' }}>
                                        {errorMessage}
                                    </p>
                                    <motion.button 
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => {
                                            setIsGenerating(false);
                                            setErrorMessage('');
                                            setStatus('');
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
                                            width: '100px', height: '100px', border: '10px solid #222', borderTopColor: '#ff0099', 
                                            borderRadius: '50%' 
                                        }}
                                    />
                                    <h2 style={{ fontFamily: 'Arial Black', fontSize: '32px', marginTop: '40px', color: '#fff' }}>
                                        {status}
                                    </h2>
                                    <p style={{ color: '#666', marginTop: '10px' }}>
                                        This may take up to 60 seconds...
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
                                <div style={{ fontFamily: 'Arial Black', fontSize: '20px', marginBottom: '15px', color: '#888' }}>TRACK CONCEPT</div>
                                <input 
                                    type="text" 
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder="Describe your level theme (e.g., 'Neon Cyberpunk Pursuit')..."
                                    style={{ 
                                        width: '100%', padding: '20px', fontSize: '24px', backgroundColor: '#111', border: 'none', borderBottom: '4px solid #333',
                                        color: '#fff', fontFamily: 'Arial', outline: 'none'
                                    }}
                                    onFocus={(e) => e.currentTarget.style.borderBottomColor = '#fff'}
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

                            {/* Actions */}
                            <motion.div 
                                variants={itemVariants}
                                style={{ display: 'flex', gap: '20px', alignItems: 'center' }}
                            >
                                <motion.button 
                                    whileHover={{ scale: 1.02, backgroundColor: 'rgba(0, 255, 255, 0.1)', borderColor: '#00ffff', color: '#00ffff' }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleGenerate}
                                    style={{ 
                                        flex: 2, padding: '30px', backgroundColor: 'transparent', border: '4px solid #333', color: '#666',
                                        fontFamily: 'Arial Black', fontSize: '32px', letterSpacing: '2px',
                                        cursor: 'pointer', transform: 'skew(-10deg)',
                                        transition: 'color 0.2s, border-color 0.2s'
                                    }}
                                >
                                    CREATE
                                </motion.button>

                                <motion.button 
                                    whileHover={{ scale: 1.02, backgroundColor: 'rgba(255, 0, 0, 0.1)', borderColor: '#ff0000', color: '#ff0000' }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setIsVisible(false)}
                                    style={{ 
                                        flex: 1, padding: '30px', backgroundColor: 'transparent', border: '4px solid #333', color: '#666',
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
