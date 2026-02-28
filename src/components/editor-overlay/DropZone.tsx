import React, { useRef, useState } from 'react';

interface DropZoneProps {
  label: string;
  accept: string;
  onFileSelect: (files: File[]) => void;
  multiple?: boolean;
  color?: string;
  files?: File[];
}

export const DropZone: React.FC<DropZoneProps> = ({
  label,
  accept,
  onFileSelect,
  multiple = false,
  color = '#00ffff',
  files = [],
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
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

  return (
    <div
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
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
        boxShadow: isDragging ? `0 0 20px ${color}44` : 'none',
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={e => e.target.files && onFileSelect(Array.from(e.target.files))}
        style={{ display: 'none' }}
      />

      <div style={{ fontSize: '40px', marginBottom: '10px', opacity: 0.8 }}>
        {multiple ? '🖼️' : '🎵'}
      </div>

      <div
        style={{
          fontFamily: 'Arial Black',
          color,
          textTransform: 'uppercase',
          fontSize: '14px',
          letterSpacing: '1px',
        }}
      >
        {label}
      </div>

      <div style={{ marginTop: '10px', fontSize: '12px', color: '#888' }}>
        {files.length > 0 ? (
          <span style={{ color: '#fff' }}>
            {files.length === 1 ? files[0].name : `${files.length} files selected`}
          </span>
        ) : (
          'Drag & Drop or Click to Browse'
        )}
      </div>
    </div>
  );
};
