import React, { useState, useEffect, useRef } from 'react';
import { EventBus } from '../game/EventBus';

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
        <div 
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
                transition: 'all 0.2s',
                position: 'relative',
                transform: isHovered ? 'scale(1.02)' : 'scale(1)',
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
            
            {/* Colored Top Bar */}
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
        </div>
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

    useEffect(() => {
        if (!isVisible) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !isGenerating) {
                e.preventDefault();
                setIsVisible(false);
                EventBus.emit('go-to-main-menu');
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isVisible, isGenerating]);

    const handleGenerate = async () => {
        if (!audioFile) {
            alert('Please upload an MP3 first!');
            return;
        }

        setIsGenerating(true);
        setErrorMessage('');
        setStatus('INITIALIZING DUAL-MODEL PIPELINE...');

        try {
            // Get audio duration
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const arrayBuffer = await audioFile.arrayBuffer();
            const bufferForDecode = arrayBuffer.slice(0);
            const audioBuffer = await audioContext.decodeAudioData(bufferForDecode);
            const duration = audioBuffer.duration;

            if (duration < 5) {
                if (!confirm(`Warning: Audio is very short (${duration.toFixed(2)}s). Continue?`)) {
                    setIsGenerating(false);
                    return;
                }
            }

            setStatus('ANALYZING AUDIO WAVEFORM & ASSETS...');
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

            setStatus('GEMINI 3: CONSTRUCTING LEVEL GEOMETRY...');
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

            if (!response.ok) throw new Error('Generation Failed');

            const levelData = await response.json();
            
            setStatus('FINALIZING SYNC...');
            const audioUrl = URL.createObjectURL(audioFile);
            const imageMappings: Record<string, string> = {};
            images.forEach((img, i) => {
                imageMappings[`asset_${i}`] = URL.createObjectURL(img);
            });

            const payload = { levelData, audioUrl, imageMappings };
            
            const savedLevels = JSON.parse(localStorage.getItem('community_levels') || '[]');
            savedLevels.unshift(payload);
            localStorage.setItem('community_levels', JSON.stringify(savedLevels));
            (window as any).pendingLevelData = payload;

            EventBus.emit('load-level', payload);
            setIsVisible(false);
        } catch (error: any) {
            setErrorMessage(error.message || 'Unknown error occurred');
            setStatus('SYSTEM FAILURE');
        } finally {
            setIsGenerating(false);
        }
    };

    if (!isVisible) return null;

    return (
        <div style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: '#000', 
            color: 'white', display: 'flex',
            flexDirection: 'column',
            zIndex: 1000, fontFamily: 'Arial, sans-serif'
        }}>
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
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ 
                        width: '100px', height: '100px', border: '10px solid #222', borderTopColor: '#ff0099', 
                        borderRadius: '50%', animation: 'spin 1s linear infinite' 
                    }}></div>
                    <h2 style={{ fontFamily: 'Arial Black', fontSize: '32px', marginTop: '40px', color: '#fff' }}>{status}</h2>
                    <style jsx>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
                </div>
            ) : (
                <div style={{ flex: 1, padding: '60px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '50px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
                    
                    {/* Prompt Input */}
                    <div>
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
                    </div>

                    {/* Cards Container */}
                    <div style={{ display: 'flex', gap: '40px' }}>
                        <CardInput 
                            label="AUDIO TRACK" 
                            icon="🎵"
                            accept="audio/mp3" 
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
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                        <button 
                            onClick={handleGenerate}
                            style={{ 
                                flex: 2, padding: '30px', backgroundColor: 'transparent', border: '4px solid #333', color: '#666',
                                fontFamily: 'Arial Black', fontSize: '32px', letterSpacing: '2px',
                                cursor: 'pointer', transform: 'skew(-10deg)',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#00ffff'; e.currentTarget.style.color = '#00ffff'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.color = '#666'; }}
                        >
                            CREATE
                        </button>

                        <button 
                            onClick={() => setIsVisible(false)}
                            style={{ 
                                flex: 1, padding: '30px', backgroundColor: 'transparent', border: '4px solid #333', color: '#666',
                                fontFamily: 'Arial Black', fontSize: '24px', cursor: 'pointer', transform: 'skew(-10deg)'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#ff0000'; e.currentTarget.style.color = '#ff0000'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.color = '#666'; }}
                        >
                            BACK
                        </button>
                    </div>

                </div>
            )}
        </div>
    );
};
