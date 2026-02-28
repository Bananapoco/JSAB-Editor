import React from 'react';
import { DropZone } from './DropZone';

interface AIGenerationViewProps {
  prompt: string;
  bpm: number | '';
  temperature: number;
  audioFile: File | null;
  images: File[];
  status: string;
  error: string;
  isGenerating: boolean;
  onPromptChange: (value: string) => void;
  onBpmChange: (value: number | '') => void;
  onTemperatureChange: (value: number) => void;
  onAudioFileChange: (file: File | null) => void;
  onImagesChange: (files: File[]) => void;
  onGenerate: () => void;
  onSwitchToBuild: () => void;
  onClose: () => void;
}

export const AIGenerationView: React.FC<AIGenerationViewProps> = ({
  prompt,
  bpm,
  temperature,
  audioFile,
  images,
  status,
  error,
  isGenerating,
  onPromptChange,
  onBpmChange,
  onTemperatureChange,
  onAudioFileChange,
  onImagesChange,
  onGenerate,
  onSwitchToBuild,
  onClose,
}) => {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(5, 5, 10, 0.98)',
        backdropFilter: 'blur(10px)',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '5px',
          background: 'linear-gradient(90deg, #00ffff, #ff0099)',
        }}
      />

      {isGenerating ? (
        <div style={{ textAlign: 'center', position: 'relative' }}>
          <div className="spinner" />
          <h2
            style={{
              marginTop: '40px',
              fontFamily: 'Arial Black',
              color: '#fff',
              fontSize: '24px',
              letterSpacing: '2px',
              textTransform: 'uppercase',
            }}
          >
            {status}
          </h2>
          <div style={{ marginTop: '10px', color: '#666', fontSize: '14px' }}>
            Please wait while the AI composes your track
          </div>
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
              0% {
                transform: rotate(0deg);
              }
              100% {
                transform: rotate(360deg);
              }
            }
          `}</style>
        </div>
      ) : (
        <div
          style={{
            width: '90%',
            maxWidth: '900px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            animation: 'fadeIn 0.3s ease-out',
          }}
        >
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <button
              style={{
                padding: '8px 28px',
                background: 'linear-gradient(135deg, #00ffff22, #00ffff11)',
                border: '1px solid #00ffff',
                color: '#00ffff',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '11px',
                fontFamily: 'Arial Black',
                letterSpacing: '2px',
                boxShadow: '0 0 12px rgba(0,255,255,0.15)',
              }}
            >
              ✨ AI MODE
            </button>
            <button
              onClick={onSwitchToBuild}
              style={{
                padding: '8px 28px',
                background: 'transparent',
                border: '1px solid #333',
                color: '#555',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '11px',
                fontFamily: 'Arial Black',
                letterSpacing: '2px',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#FF0099';
                e.currentTarget.style.color = '#FF0099';
                e.currentTarget.style.boxShadow = '0 0 12px rgba(255,0,153,0.15)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = '#333';
                e.currentTarget.style.color = '#555';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              BUILD MODE
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h1
              style={{
                fontFamily: 'Arial Black',
                fontSize: '36px',
                margin: 0,
                background: 'linear-gradient(45deg, #fff, #aaa)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              NEW PROJECT
            </h1>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: '1px solid #333',
                color: '#666',
                padding: '10px 20px',
                cursor: 'pointer',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 'bold',
              }}
            >
              CLOSE
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div
                style={{
                  backgroundColor: '#111',
                  padding: '20px',
                  borderRadius: '16px',
                  border: '1px solid #222',
                }}
              >
                <label
                  style={{
                    display: 'block',
                    color: '#888',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    marginBottom: '10px',
                    letterSpacing: '1px',
                  }}
                >
                  LEVEL CONCEPT
                </label>
                <textarea
                  value={prompt}
                  onChange={e => onPromptChange(e.target.value)}
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
                    fontFamily: 'Arial',
                  }}
                />
              </div>

              <div
                style={{
                  backgroundColor: '#111',
                  padding: '14px 20px',
                  borderRadius: '12px',
                  border: '1px solid #222',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <label
                  style={{
                    color: '#888',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    letterSpacing: '1px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  BPM
                </label>
                <input
                  type="number"
                  min={30}
                  max={300}
                  value={bpm}
                  onChange={e => onBpmChange(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="e.g. 128"
                  style={{
                    flex: 1,
                    backgroundColor: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: '#fff',
                    fontSize: '16px',
                    fontFamily: 'monospace',
                  }}
                />
                <span style={{ color: '#555', fontSize: '11px' }}>Attacks sync to this tempo</span>
              </div>

              <div
                style={{
                  backgroundColor: '#111',
                  padding: '16px 20px',
                  borderRadius: '12px',
                  border: '1px solid #222',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label
                    style={{
                      color: '#888',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      letterSpacing: '1px',
                    }}
                  >
                    CREATIVITY
                  </label>
                  <span style={{ color: '#00ffff', fontFamily: 'monospace', fontSize: '12px' }}>
                    {temperature.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={temperature}
                  onChange={e => onTemperatureChange(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#555', fontSize: '11px' }}>
                  <span>Stable</span>
                  <span>Creative</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '15px' }}>
                <div style={{ flex: 1 }}>
                  <DropZone
                    label="Upload Audio (MP3)"
                    accept="audio/mp3"
                    color="#00ffff"
                    onFileSelect={files => onAudioFileChange(files[0] ?? null)}
                    files={audioFile ? [audioFile] : []}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <DropZone
                    label="Boss Sprites (PNG)"
                    accept="image/*"
                    multiple
                    color="#ff0099"
                    onFileSelect={onImagesChange}
                    files={images}
                  />
                </div>
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#111',
                borderRadius: '16px',
                padding: '30px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                border: '1px solid #222',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  backgroundImage: 'radial-gradient(circle at 50% 50%, #1a1a1a 0%, #111 70%)',
                  zIndex: 0,
                }}
              />

              <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
                <div
                  style={{
                    width: '60px',
                    height: '60px',
                    backgroundColor: '#222',
                    borderRadius: '12px',
                    margin: '0 auto 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  ✨
                </div>
                <h3 style={{ margin: '0 0 10px', color: '#fff' }}>AI Architect</h3>
                <p style={{ margin: 0, color: '#666', fontSize: '14px', lineHeight: '1.5' }}>
                  Claude Sonnet will analyze your audio and any reference images to compose a beat-synced
                  procedural level timeline.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={onGenerate}
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
              boxShadow: '0 5px 20px rgba(255,255,255,0.1)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'scale(1.02)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            INITIALIZE GENERATION
          </button>

          {error && (
            <div
              style={{
                marginTop: '12px',
                padding: '12px 20px',
                backgroundColor: 'rgba(255,0,0,0.15)',
                border: '1px solid rgba(255,0,0,0.4)',
                borderRadius: '8px',
                color: '#ff6666',
                fontSize: '13px',
                textAlign: 'center',
              }}
            >
              {error}
            </div>
          )}

          <style jsx>{`
            @keyframes fadeIn {
              from {
                opacity: 0;
                transform: translateY(20px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
          `}</style>
        </div>
      )}
    </div>
  );
};
