import React, { useState, useEffect } from 'react';
import { EventBus } from '../game/EventBus';
import { motion, AnimatePresence } from 'framer-motion';

export const CommunityHubOverlay = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [levels, setLevels] = useState<any[]>([]);
    const [selectedLevel, setSelectedLevel] = useState<any>(null);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const levelRefs = React.useRef<(HTMLDivElement | null)[]>([]);

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

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                setIsVisible(false);
                return;
            }

            if (levels.length === 0) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => {
                    const newIndex = prev < levels.length - 1 ? prev + 1 : prev;
                    setSelectedLevel(levels[newIndex]);
                    // Scroll into view
                    setTimeout(() => {
                        levelRefs.current[newIndex]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }, 0);
                    return newIndex;
                });
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => {
                    const newIndex = prev > 0 ? prev - 1 : 0;
                    setSelectedLevel(levels[newIndex]);
                    // Scroll into view
                    setTimeout(() => {
                        levelRefs.current[newIndex]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }, 0);
                    return newIndex;
                });
            } else if (e.key === 'Enter' && selectedLevel) {
                e.preventDefault();
                playLevel();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isVisible, levels, selectedLevel]);

    const fetchLevels = async () => {
        setIsLoading(true);
        setTimeout(() => {
            const savedLevels = JSON.parse(localStorage.getItem('community_levels') || '[]');
            setLevels(savedLevels);
            if (savedLevels.length > 0) {
                setSelectedIndex(0);
                setSelectedLevel(savedLevels[0]);
            }
            setIsLoading(false);
        }, 300);
    };

    const playLevel = () => {
        if (!selectedLevel) return;
        EventBus.emit('load-level', {
            levelData: selectedLevel.levelData,
            audioUrl: selectedLevel.audioUrl,
            imageMappings: selectedLevel.imageMappings
        });
        setIsVisible(false);
        EventBus.emit('start-game'); 
    };

    const overlayVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.3 } },
        exit: { opacity: 0 }
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.05,
                delayChildren: 0.2
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, x: -20 },
        visible: { opacity: 1, x: 0 }
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
                        zIndex: 1001, fontFamily: 'Arial, sans-serif',
                        overflow: 'hidden'
                    }}
                >
                    {/* --- TOP BAR --- */}
                    <div style={{ 
                        height: '80px', 
                        backgroundColor: '#31B4BF', 
                        display: 'flex', 
                        alignItems: 'center', 
                        padding: '0 40px',
                        justifyContent: 'space-between',
                        boxShadow: '0 0 20px rgba(0,255,255,0.4)',
                        zIndex: 10,
                        clipPath: 'polygon(0 0, 100% 0, 100% 85%, 98% 100%, 0 100%)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <span style={{ fontSize: '30px', color: 'white', filter: 'brightness(0) invert(1)' }}>🎵</span>
                            <h1 style={{ 
                                margin: 0, 
                                fontFamily: 'Arial Black', 
                                fontSize: '32px', 
                                color: 'white',
                                textTransform: 'uppercase',
                                letterSpacing: '2px'
                            }}>PLAYLIST</h1>
                        </div>
                    </div>

                    {/* --- MAIN CONTENT SPLIT --- */}
                    <div style={{ display: 'flex', flex: 1, height: 'calc(100% - 80px)' }}>
                        
                        {/* --- LEFT COLUMN: TRACK DETAILS --- */}
                        <motion.div 
                            initial={{ x: -50, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.2, duration: 0.4 }}
                            style={{ 
                                width: '400px', 
                                backgroundColor: '#0a0a0a', 
                                borderRight: '2px solid #222',
                                padding: '40px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                boxShadow: '10px 0 30px rgba(0,0,0,0.5)',
                                zIndex: 5
                            }}
                        >
                            {selectedLevel ? (
                                <motion.div
                                    key={selectedLevel.levelData.metadata.bossName}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.3 }}
                                    style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}
                                >
                                    {/* Album Art Placeholder */}
                                    <div style={{ 
                                        width: '300px', 
                                        height: '300px', 
                                        backgroundColor: '#111', 
                                        border: '2px solid #333',
                                        marginBottom: '30px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        position: 'relative',
                                        overflow: 'hidden',
                                        boxShadow: '0 0 20px rgba(0,0,0,0.5)'
                                    }}>
                                        <div style={{ 
                                            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', 
                                            background: 'linear-gradient(135deg, #111 0%, #222 100%)' 
                                        }}></div>
                                        <div style={{ 
                                            fontSize: '80px', 
                                            filter: 'drop-shadow(0 0 10px rgba(255,0,153,0.5))'
                                        }}>👾</div>
                                        
                                        {/* Decorative tech lines */}
                                        <div style={{ position: 'absolute', top: '10%', left: '0', width: '100%', height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
                                        <div style={{ position: 'absolute', bottom: '10%', left: '0', width: '100%', height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
                                    </div>

                                    <h2 style={{ 
                                        margin: '0 0 10px 0', 
                                        fontFamily: 'Arial Black', 
                                        fontSize: '32px', 
                                        color: '#fff', 
                                        textAlign: 'center',
                                        textTransform: 'uppercase',
                                        lineHeight: '1.1',
                                        textShadow: '0 0 10px rgba(255,255,255,0.3)'
                                    }}>
                                        {selectedLevel.levelData.metadata.bossName}
                                    </h2>
                                    
                                    <div style={{ color: '#00ffff', fontFamily: 'Arial Black', fontSize: '16px', marginBottom: '40px', letterSpacing: '1px' }}>
                                        by AI ARCHITECT
                                    </div>

                                    <div style={{ width: '100%', textAlign: 'left', marginBottom: 'auto', padding: '0 20px' }}>
                                        <div style={{ color: '#444', fontSize: '12px', fontFamily: 'Arial Black', marginBottom: '10px' }}>DESCRIPTION</div>
                                        <div style={{ color: '#888', fontSize: '14px', lineHeight: '1.5', fontFamily: 'Arial', maxHeight: '120px', overflowY: 'auto' }}>
                                            {selectedLevel.levelData.explanation || "No description provided."}
                                        </div>
                                    </div>

                                    {/* Play Button */}
                                    <motion.button 
                                        whileHover={{ scale: 1.05, filter: 'brightness(1.2)' }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={playLevel}
                                        style={{
                                            width: '100%',
                                            padding: '20px',
                                            background: 'linear-gradient(90deg, #ff0099, #ff0055)',
                                            border: 'none',
                                            color: '#fff',
                                            fontFamily: 'Arial Black',
                                            fontSize: '24px',
                                            textTransform: 'uppercase',
                                            letterSpacing: '2px',
                                            cursor: 'pointer',
                                            transform: 'skew(-10deg)',
                                            boxShadow: '0 0 20px rgba(255, 0, 153, 0.4)',
                                            marginTop: '20px'
                                        }}
                                    >
                                        START TRACK
                                    </motion.button>
                                </motion.div>
                            ) : (
                                <div style={{ color: '#444', marginTop: '150px', fontFamily: 'Arial Black', fontSize: '20px' }}>
                                    SELECT A TRACK
                                </div>
                            )}
                        </motion.div>

                        {/* --- RIGHT COLUMN: LIST --- */}
                        <div style={{ flex: 1, backgroundColor: '#000', padding: '0', overflowY: 'auto' }}>
                            {/* Header Row */}
                            <div style={{ 
                                display: 'grid', 
                                gridTemplateColumns: '80px 3fr 2fr 100px', 
                                padding: '20px 40px',
                                borderBottom: '2px solid #222',
                                color: '#ff0099',
                                fontFamily: 'Arial Black',
                                fontSize: '14px',
                                textTransform: 'uppercase',
                                letterSpacing: '1px'
                            }}>
                                <div>RANK</div>
                                <div>TRACK TITLE</div>
                                <div>ARTIST</div>
                                <div>TIME</div>
                            </div>

                            {/* List Items */}
                            {levels.length === 0 ? (
                                <div style={{ padding: '60px', textAlign: 'center', color: '#333' }}>
                                    <div style={{ fontSize: '40px', marginBottom: '20px' }}>📂</div>
                                    <div style={{ fontFamily: 'Arial Black', fontSize: '20px' }}>NO LEVELS FOUND</div>
                                    <div style={{ marginTop: '10px' }}>Create your first level in the Editor!</div>
                                </div>
                            ) : (
                                <motion.div
                                    variants={containerVariants}
                                    initial="hidden"
                                    animate="visible"
                                >
                                    {levels.map((level, i) => {
                                        const isSelected = i === selectedIndex;
                                        return (
                                            <motion.div 
                                                key={i}
                                                variants={itemVariants}
                                                ref={(el) => { levelRefs.current[i] = el; }}
                                                onClick={() => {
                                                    setSelectedIndex(i);
                                                    setSelectedLevel(level);
                                                }}
                                                onDoubleClick={playLevel}
                                                style={{
                                                    display: 'grid',
                                                    gridTemplateColumns: '80px 3fr 2fr 100px',
                                                    padding: '25px 40px',
                                                    borderBottom: '1px solid #111',
                                                    backgroundColor: isSelected ? '#111' : 'transparent',
                                                    cursor: 'pointer',
                                                    alignItems: 'center',
                                                    borderLeft: isSelected ? '5px solid #00ffff' : '5px solid transparent'
                                                }}
                                                whileHover={{ backgroundColor: isSelected ? '#111' : '#0a0a0a' }}
                                            >
                                                <div style={{ 
                                                    fontFamily: 'Arial Black', 
                                                    color: isSelected ? '#00ffff' : '#444', 
                                                    fontSize: '20px' 
                                                }}>
                                                    S
                                                </div>
                                                <div style={{ 
                                                    fontSize: '20px', 
                                                    fontFamily: 'Arial Black', 
                                                    textTransform: 'uppercase', 
                                                    color: isSelected ? '#fff' : '#aaa' 
                                                }}>
                                                    {level.levelData.metadata.bossName}
                                                </div>
                                                <div style={{ 
                                                    color: isSelected ? '#00ffff' : '#555', 
                                                    fontFamily: 'Arial Black',
                                                    fontSize: '14px' 
                                                }}>
                                                    AI ARCHITECT
                                                </div>
                                                <div style={{ fontFamily: 'monospace', color: '#666', fontSize: '14px' }}>
                                                    {Math.floor(level.levelData.metadata.duration)}s
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </motion.div>
                            )}
                        </div>
                    </div>

                    {/* --- BOTTOM BAR --- */}
                    <div style={{ 
                        position: 'absolute', bottom: 40, right: 60,
                        zIndex: 20
                    }}>
                        <motion.button 
                            whileHover={{ scale: 1.02, backgroundColor: 'rgba(255, 0, 153, 0.1)', borderColor: '#ff0099', color: '#ff0099' }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setIsVisible(false)}
                            style={{ 
                                padding: '15px 40px', 
                                backgroundColor: 'transparent', 
                                border: '4px solid #333', 
                                color: '#555',
                                fontFamily: 'Arial Black', 
                                fontSize: '20px', 
                                cursor: 'pointer', 
                                transform: 'skew(-10deg)',
                                transition: 'color 0.2s, border-color 0.2s',
                                textTransform: 'uppercase'
                            }}
                        >
                            BACK
                        </motion.button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
