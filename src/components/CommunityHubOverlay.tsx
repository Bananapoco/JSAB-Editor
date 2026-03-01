import React, { useState, useEffect } from 'react';
import { EventBus } from '../game/EventBus';

export const CommunityHubOverlay = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [levels, setLevels] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const showHub = () => {
            setIsVisible(true);
            fetchLevels();
        };
        EventBus.on('open-community-hub', showHub);
        return () => {
            EventBus.removeListener('open-community-hub', showHub);
        };
    }, []);

    useEffect(() => {
        if (!isVisible) return;

        EventBus.emit('ui-input-lock:add');
        return () => {
            EventBus.emit('ui-input-lock:remove');
        };
    }, [isVisible]);

    const fetchLevels = async () => {
        setIsLoading(true);
        // In a real app, this would be: await fetch('/api/levels')
        setTimeout(() => {
            const savedLevels = JSON.parse(localStorage.getItem('community_levels') || '[]');
            setLevels(savedLevels);
            setIsLoading(false);
        }, 600);
    };

    const playLevel = (level: any) => {
        EventBus.emit('load-level', {
            levelData: level.levelData,
            audioUrl: level.audioUrl,
            imageMappings: level.imageMappings,
            source: 'community'
        });
        setIsVisible(false);
        EventBus.emit('start-game'); 
    };

    if (!isVisible) return null;

    return (
        <div style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: '#050505', 
            color: 'white', display: 'flex',
            flexDirection: 'column', alignItems: 'center',
            zIndex: 1001, fontFamily: 'Arial, sans-serif',
            overflowY: 'auto',
            paddingTop: '60px'
        }}>
            {/* Header Area */}
            <div style={{ 
                width: '100%', 
                maxWidth: '1200px', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '40px',
                padding: '0 20px'
            }}>
                <div>
                    <h1 style={{ 
                        fontFamily: 'Arial Black', 
                        fontSize: '48px', 
                        margin: 0,
                        letterSpacing: '-2px',
                        color: '#ff0099',
                        textShadow: '0 0 20px rgba(255, 0, 153, 0.5)'
                    }}>
                        COMMUNITY
                    </h1>
                    <div style={{ color: '#666', fontSize: '14px', marginTop: '5px' }}>
                        BROWSE & PLAY USER CREATED LEVELS
                    </div>
                </div>

                <button 
                    onClick={() => setIsVisible(false)}
                    style={{ 
                        backgroundColor: 'transparent', 
                        color: '#fff', 
                        border: '2px solid #333', 
                        padding: '12px 24px',
                        fontSize: '14px', 
                        cursor: 'pointer',
                        borderRadius: '30px',
                        fontFamily: 'Arial Black',
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#fff';
                        e.currentTarget.style.transform = 'scale(1.05)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#333';
                        e.currentTarget.style.transform = 'scale(1)';
                    }}
                >
                    EXIT HUB
                </button>
            </div>

            {/* Content Area */}
            {isLoading ? (
                <div style={{ 
                    flex: 1, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    color: '#444'
                }}>
                    <div className="loader"></div>
                    <p style={{ marginTop: '20px', fontSize: '14px', letterSpacing: '2px' }}>FETCHING DATABASE...</p>
                    <style jsx>{`
                        .loader {
                            width: 40px;
                            height: 40px;
                            border: 4px solid #333;
                            border-top-color: #ff0099;
                            border-radius: 50%;
                            animation: spin 0.8s linear infinite;
                        }
                        @keyframes spin { 100% { transform: rotate(360deg); } }
                    `}</style>
                </div>
            ) : (
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
                    gap: '20px', 
                    width: '100%', 
                    maxWidth: '1200px',
                    padding: '0 20px 60px'
                }}>
                    {levels.length === 0 ? (
                        <div style={{ 
                            gridColumn: '1/-1', 
                            textAlign: 'center', 
                            color: '#444', 
                            padding: '100px 0',
                            border: '2px dashed #222',
                            borderRadius: '20px'
                        }}>
                            <h2 style={{ color: '#666' }}>No Levels Found</h2>
                            <p>Create the first level in the Editor!</p>
                        </div>
                    ) : (
                        levels.map((level, i) => (
                            <div 
                                key={i} 
                                onClick={() => playLevel(level)}
                                className="level-card"
                                style={{ 
                                    backgroundColor: '#111', 
                                    borderRadius: '16px',
                                    overflow: 'hidden',
                                    cursor: 'pointer', 
                                    transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                                    border: '1px solid #222',
                                    position: 'relative'
                                }}
                            >
                                {/* Card Header / Thumbnail Placeholder */}
                                <div style={{ 
                                    height: '140px', 
                                    backgroundColor: '#1a1a1a',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <div style={{ 
                                        width: '120%', 
                                        height: '100%', 
                                        background: `linear-gradient(135deg, ${level.levelData.theme.backgroundColor || '#000'} 0%, #000 100%)`,
                                        opacity: 0.5
                                    }}></div>
                                    <div style={{
                                        position: 'absolute',
                                        fontSize: '40px',
                                        opacity: 0.2
                                    }}>
                                        👾
                                    </div>
                                    <div style={{
                                        position: 'absolute',
                                        bottom: '10px',
                                        right: '10px',
                                        backgroundColor: '#000',
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        fontSize: '10px',
                                        color: '#fff',
                                        fontWeight: 'bold'
                                    }}>
                                        {Math.floor(level.levelData.metadata.duration)}s
                                    </div>
                                </div>

                                {/* Card Body */}
                                <div style={{ padding: '20px' }}>
                                    <h3 style={{ 
                                        margin: '0 0 5px', 
                                        color: '#fff', 
                                        fontSize: '18px',
                                        fontFamily: 'Arial Black',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                    }}>
                                        {level.levelData.metadata.bossName}
                                    </h3>
                                    
                                    <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                                        <span style={{ 
                                            fontSize: '10px', 
                                            backgroundColor: '#222', 
                                            padding: '4px 8px', 
                                            borderRadius: '4px', 
                                            color: '#888' 
                                        }}>
                                            AI GENERATED
                                        </span>
                                        <span style={{ 
                                            fontSize: '10px', 
                                            backgroundColor: '#222', 
                                            padding: '4px 8px', 
                                            borderRadius: '4px', 
                                            color: '#00ffff' 
                                        }}>
                                            HARDCORE
                                        </span>
                                    </div>

                                    <p style={{ 
                                        margin: 0, 
                                        fontSize: '13px', 
                                        color: '#666', 
                                        lineHeight: '1.4',
                                        height: '36px',
                                        overflow: 'hidden',
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical'
                                    }}>
                                        {level.levelData.explanation || "No description provided."}
                                    </p>
                                </div>

                                {/* Hover Overlay */}
                                <div className="play-overlay" style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                    backgroundColor: 'rgba(0,0,0,0.8)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    opacity: 0,
                                    transition: 'opacity 0.2s'
                                }}>
                                    <div style={{
                                        border: '2px solid #fff',
                                        borderRadius: '50%',
                                        width: '60px',
                                        height: '60px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <div style={{
                                            width: 0, 
                                            height: 0, 
                                            borderTop: '10px solid transparent',
                                            borderBottom: '10px solid transparent',
                                            borderLeft: '16px solid #fff',
                                            marginLeft: '4px'
                                        }}></div>
                                    </div>
                                </div>

                                <style jsx>{`
                                    .level-card:hover {
                                        transform: translateY(-5px);
                                        border-color: #ff0099;
                                        box-shadow: 0 10px 30px -10px rgba(255, 0, 153, 0.3);
                                    }
                                    .level-card:hover .play-overlay {
                                        opacity: 1;
                                    }
                                `}</style>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};
