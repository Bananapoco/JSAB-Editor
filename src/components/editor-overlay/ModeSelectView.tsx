import React from 'react';

interface ModeSelectViewProps {
  onSelectBuild: () => void;
  onSelectAI: () => void;
  onCancel: () => void;
}

export const ModeSelectView: React.FC<ModeSelectViewProps> = ({
  onSelectBuild,
  onSelectAI,
  onCancel,
}) => {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(5, 5, 10, 0.95)',
        backdropFilter: 'blur(15px)',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        fontFamily: 'Arial Black, sans-serif',
      }}
    >
      <div style={{ display: 'flex', gap: '40px', animation: 'fadeIn 0.4s ease-out' }}>
        <button
          onClick={onSelectBuild}
          style={{
            width: '300px',
            height: '200px',
            background: 'rgba(0, 255, 255, 0.1)',
            border: '4px solid #00ffff',
            color: '#00ffff',
            fontSize: '32px',
            cursor: 'pointer',
            borderRadius: '12px',
            transition: 'all 0.2s ease',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '15px',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = '#00ffff';
            e.currentTarget.style.color = '#000';
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(0, 255, 255, 0.1)';
            e.currentTarget.style.color = '#00ffff';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <span style={{ fontSize: '50px' }}>🛠</span>
          BUILD
        </button>

        <button
          onClick={onSelectAI}
          style={{
            width: '300px',
            height: '200px',
            background: 'rgba(255, 0, 153, 0.1)',
            border: '4px solid #ff0099',
            color: '#ff0099',
            fontSize: '32px',
            cursor: 'pointer',
            borderRadius: '12px',
            transition: 'all 0.2s ease',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '15px',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = '#ff0099';
            e.currentTarget.style.color = '#000';
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(255, 0, 153, 0.1)';
            e.currentTarget.style.color = '#ff0099';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <span style={{ fontSize: '50px' }}>✨</span>
          ASSIST
        </button>
      </div>

      <button
        onClick={onCancel}
        style={{
          marginTop: '50px',
          background: 'transparent',
          border: 'none',
          color: '#444',
          cursor: 'pointer',
          fontSize: '18px',
          letterSpacing: '2px',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.color = '#fff';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.color = '#444';
        }}
      >
        CANCEL
      </button>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};
