import React, { useState, useEffect, useRef } from 'react';
import { EventBus } from '../game/EventBus';

const DropZone = ({ 
    label, 
    accept, 
    onFileSelect, 
    multiple = false,
    color = '#00ffff',
    files = []
}: { 
    label: string, 
    accept: string, 
    onFileSelect: (files: File[]) => void, 
    multiple?: boolean,
    color?: string,
    files?: File[]
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setIsDragging(true);
        } else if (e.type === "dragleave") {
            setIsDragging(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            onFileSelect(Array.from(e.dataTransfer.files));
        }
    };

    const handleClick = () => {
        inputRef.current?.click();
    };

    return (
        <div 
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={handleClick}
            style={{
                border: `2px dashed ${isDragging ? '#fff' : color}`,
                backgroundColor: isDragging ? `${color}22` : 'rgba(0,0,0,0.5)',
                borderRadius: '12px',
                padding: '30px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                position: 'relative',
                minHeight: '150px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                boxShadow: isDragging ? `0 0 20px ${color}44` : 'none'
            }}
        >
            <input 
                ref={inputRef}
                type="file" 
                accept={accept} 
                multiple={multiple}
                onChange={(e) => e.target.files && onFileSelect(Array.from(e.target.files))}
                style={{ display: 'none' }}
            />
            
            <div style={{ fontSize: '40px', marginBottom: '10px', opacity: 0.8 }}>
                {multiple ? '🖼️' : '🎵'}
            </div>
            
            <div style={{ 
                fontFamily: 'Arial Black', 
                color: color, 
                textTransform: 'uppercase',
                fontSize: '14px',
                letterSpacing: '1px'
            }}>
                {label}
            </div>

            <div style={{ marginTop: '10px', fontSize: '12px', color: '#888' }}>
                {files.length > 0 ? (
                    <span style={{ color: '#fff' }}>
                        {files.length === 1 ? files[0].name : `${files.length} files selected`}
                    </span>
                ) : (
                    "Drag & Drop or Click to Browse"
                )}
            </div>
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

    const handleGenerate = async () => {
        if (!audioFile) {
            alert('Please upload an MP3 first!');
            return;
        }

        setIsGenerating(true);
        setErrorMessage('');
        setStatus('Scanning Audio Frequency...');

        try {
            // Get audio duration
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const arrayBuffer = await audioFile.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            const duration = audioBuffer.duration;

            setStatus('Processing Visual Assets...');
            const base64Images = await Promise.all(
                images.map(img => new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(img);
                }))
            );

            setStatus('Gemini AI: Designing Level Patterns...');
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt,
                    images: base64Images,
                    duration
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                let errorData;
                try {
                    errorData = JSON.parse(errorText);
                } catch (e) {
                    errorData = { error: `Server Error (${response.status}): ${errorText.substring(0, 100)}` };
                }
                throw new Error(errorData.error || `Server Error: ${response.status}`);
            }

            const levelData = await response.json();
            
            setStatus('Synchronizing Timelines...');
            // Create object URLs for assets
            const audioUrl = URL.createObjectURL(audioFile);
            const imageMappings: Record<string, string> = {};
            
            images.forEach((img, i) => {
                imageMappings[`asset_${i}`] = URL.createObjectURL(img);
            });

            const payload = {
                levelData,
                audioUrl,
                imageMappings
            };

            // "Upload" to local community hub
            const savedLevels = JSON.parse(localStorage.getItem('community_levels') || '[]');
            savedLevels.unshift(payload);
            localStorage.setItem('community_levels', JSON.stringify(savedLevels));

            // Store globally for Game scene to pick up if it's just starting
            (window as any).pendingLevelData = payload;

            EventBus.emit('load-level', payload);
            setIsVisible(false);
        } catch (error: any) {
            console.error('Generation failed:', error);
            setErrorMessage(error.message || 'Unknown error occurred');
            setStatus('Error generating level.');
        } finally {
            setIsGenerating(false);
        }
    };

    if (!isVisible) return null;

    return (
        <div style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: 'rgba(5, 5, 10, 0.98)', 
            backdropFilter: 'blur(10px)',
            color: 'white', display: 'flex',
            flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, fontFamily: 'Arial, sans-serif'
        }}>
            {/* Background decorative elements */}
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '5px', background: 'linear-gradient(90deg, #00ffff, #ff0099)' }}></div>
            
            {isGenerating ? (
                <div style={{ textAlign: 'center', position: 'relative' }}>
                    <div className="spinner"></div>
                    <h2 style={{ 
                        marginTop: '40px', 
                        fontFamily: 'Arial Black', 
                        color: '#fff',
                        fontSize: '24px',
                        letterSpacing: '2px',
                        textTransform: 'uppercase'
                    }}>
                        {status}
                    </h2>
                    <div style={{ marginTop: '10px', color: '#666', fontSize: '14px' }}>Please wait while the AI composes your track</div>
                    <style jsx>{`
                        .spinner {
                            width: 80px;
                            height: 80px;
                            border: 8px solid rgba(255, 255, 255, 0.1);
                            border-left-color: #00ffff;
                            border-right-color: #ff0099;
                            border-radius: 50%;
                            animation: spin 1s linear infinite;
                            margin: 0 auto;
                        }
                        @keyframes spin {
                            0% { transform: rotate(0deg); }
                            100% { transform: rotate(360deg); }
                        }
                    `}</style>
                </div>
            ) : (
                <div style={{ width: '90%', maxWidth: '900px', display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.3s ease-out' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h1 style={{ 
                            fontFamily: 'Arial Black', 
                            fontSize: '36px', 
                            margin: 0,
                            background: 'linear-gradient(45deg, #fff, #aaa)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                        }}>
                            NEW PROJECT
                        </h1>
                        <button 
                            onClick={() => setIsVisible(false)}
                            style={{ 
                                background: 'transparent', 
                                border: '1px solid #333', 
                                color: '#666', 
                                padding: '10px 20px',
                                cursor: 'pointer',
                                borderRadius: '20px',
                                fontSize: '12px',
                                fontWeight: 'bold'
                            }}
                        >
                            CLOSE
                        </button>
                    </div>

                    {errorMessage && (
                        <div style={{ 
                            padding: '15px', 
                            backgroundColor: 'rgba(255, 0, 0, 0.2)', 
                            border: '1px solid #ff0000', 
                            color: '#ffcccc', 
                            borderRadius: '8px',
                            textAlign: 'center',
                            marginBottom: '20px'
                        }}>
                            ⚠️ {errorMessage}
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        {/* Left Column: Inputs */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{ 
                                backgroundColor: '#111', 
                                padding: '20px', 
                                borderRadius: '16px',
                                border: '1px solid #222'
                            }}>
                                <label style={{ 
                                    display: 'block', 
                                    color: '#888', 
                                    fontSize: '12px', 
                                    fontWeight: 'bold', 
                                    marginBottom: '10px',
                                    letterSpacing: '1px'
                                }}>
                                    LEVEL CONCEPT
                                </label>
                                <textarea 
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder="Describe the boss patterns, theme, and atmosphere..."
                                    style={{ 
                                        width: '100%', 
                                        height: '100px', 
                                        backgroundColor: 'transparent', 
                                        color: 'white', 
                                        border: 'none', 
                                        outline: 'none',
                                        fontSize: '16px',
                                        resize: 'none',
                                        fontFamily: 'Arial'
                                    }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '15px' }}>
                                <div style={{ flex: 1 }}>
                                    <DropZone 
                                        label="Upload Audio (MP3)" 
                                        accept="audio/mp3" 
                                        color="#00ffff"
                                        onFileSelect={(f) => setAudioFile(f[0])}
                                        files={audioFile ? [audioFile] : []}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <DropZone 
                                        label="Boss Sprites (PNG)" 
                                        accept="image/*" 
                                        multiple={true}
                                        color="#ff0099"
                                        onFileSelect={setImages}
                                        files={images}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Preview / Info */}
                        <div style={{ 
                            backgroundColor: '#111', 
                            borderRadius: '16px', 
                            padding: '30px',
                            display: 'flex', 
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            border: '1px solid #222',
                            position: 'relative',
                            overflow: 'hidden'
                        }}>
                            <div style={{ 
                                position: 'absolute', 
                                top: 0, 
                                left: 0, 
                                width: '100%', 
                                height: '100%', 
                                backgroundImage: 'radial-gradient(circle at 50% 50%, #1a1a1a 0%, #111 70%)',
                                zIndex: 0
                            }}></div>
                            
                            <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
                                <div style={{ 
                                    width: '60px', 
                                    height: '60px', 
                                    backgroundColor: '#222', 
                                    borderRadius: '12px', 
                                    margin: '0 auto 20px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    ✨
                                </div>
                                <h3 style={{ margin: '0 0 10px', color: '#fff' }}>AI Architect</h3>
                                <p style={{ margin: 0, color: '#666', fontSize: '14px', lineHeight: '1.5' }}>
                                    Gemini will analyze your audio waveform and visual assets to construct a beat-synced level timeline.
                                </p>
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={handleGenerate}
                        style={{
                            marginTop: '20px',
                            padding: '25px', 
                            backgroundColor: '#fff', 
                            color: '#000', 
                            border: 'none', 
                            cursor: 'pointer', 
                            fontSize: '18px', 
                            borderRadius: '12px', 
                            fontFamily: 'Arial Black',
                            letterSpacing: '2px',
                            textTransform: 'uppercase',
                            transition: 'transform 0.1s ease',
                            boxShadow: '0 5px 20px rgba(255,255,255,0.1)'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        INITIALIZE GENERATION
                    </button>
                    
                    <style jsx>{`
                        @keyframes fadeIn {
                            from { opacity: 0; transform: translateY(20px); }
                            to { opacity: 1; transform: translateY(0); }
                        }
                    `}</style>
                </div>
            )}
        </div>
    );
};
