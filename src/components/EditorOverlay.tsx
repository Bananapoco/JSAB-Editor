import React, { useEffect, useState } from 'react';
import { EventBus } from '../game/EventBus';
import { BuildModeEditor } from './BuildModeEditor';
import { ModeSelectView } from './editor-overlay/ModeSelectView';
import { AIGenerationView } from './editor-overlay/AIGenerationView';
import { SavedBuildProject } from './build-mode/projectStorage';

type OverlayMode = 'ai' | 'build' | 'select';

export const EditorOverlay = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [mode, setMode] = useState<OverlayMode>('select');
  const [prompt, setPrompt] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [images, setImages] = useState<File[]>([]);
  const [bpm, setBpm] = useState<number | ''>('');
  const [temperature, setTemperature] = useState(0.8);
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [initialBuildProject, setInitialBuildProject] = useState<SavedBuildProject | null>(null);

  useEffect(() => {
    const showEditor = () => {
      setInitialBuildProject(null);
      setIsVisible(true);
      setMode('select');
    };

    const showBuildEditor = () => {
      setInitialBuildProject(null);
      setIsVisible(true);
      setMode('build');
    };

    const showBuildProject = (project: SavedBuildProject) => {
      setInitialBuildProject(project);
      setIsVisible(true);
      setMode('build');
    };

    EventBus.on('open-editor', showEditor);
    EventBus.on('open-build-editor', showBuildEditor);
    EventBus.on('open-build-project', showBuildProject);
    return () => {
      EventBus.removeListener('open-editor', showEditor);
      EventBus.removeListener('open-build-editor', showBuildEditor);
      EventBus.removeListener('open-build-project', showBuildProject);
    };
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    EventBus.emit('ui-input-lock:add');
    return () => {
      EventBus.emit('ui-input-lock:remove');
    };
  }, [isVisible]);

  const handleGenerate = async () => {
    if (!audioFile) {
      setError('Please upload an MP3 file first.');
      return;
    }

    setError('');
    setIsGenerating(true);
    setStatus('Scanning Audio Frequency...');

    try {
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
        })),
      );

      setStatus('Claude AI: Designing Level Patterns...');
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          images: base64Images,
          duration,
          bpm: bpm || undefined,
          temperature,
        }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error || `Server error ${response.status}`);
      }

      const levelData = await response.json();

      setStatus('Synchronizing Timelines...');
      const audioUrl = URL.createObjectURL(audioFile);
      const imageMappings: Record<string, string> = {};

      images.forEach((img, i) => {
        imageMappings[`asset_${i}`] = URL.createObjectURL(img);
      });

      const payload = {
        levelData,
        audioUrl,
        imageMappings,
        source: 'ai' as const,
      };

      const savedLevels = JSON.parse(localStorage.getItem('community_levels') || '[]');
      savedLevels.unshift(payload);
      localStorage.setItem('community_levels', JSON.stringify(savedLevels));

      (window as any).pendingLevelData = payload;
      EventBus.emit('load-level', payload);
      setIsVisible(false);
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(`Generation failed: ${msg}`);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isVisible) {
    return null;
  }

  if (mode === 'select') {
    return (
      <ModeSelectView
        onSelectBuild={() => {
          setInitialBuildProject(null);
          setMode('build');
        }}
        onSelectAI={() => setMode('ai')}
        onCancel={() => setIsVisible(false)}
      />
    );
  }

  if (mode === 'build') {
    return (
      <BuildModeEditor
        initialProject={initialBuildProject}
        onClose={() => {
          setIsVisible(false);
          setInitialBuildProject(null);
        }}
        onSwitchToAI={() => {
          setInitialBuildProject(null);
          setMode('ai');
        }}
      />
    );
  }

  return (
    <AIGenerationView
      prompt={prompt}
      bpm={bpm}
      temperature={temperature}
      audioFile={audioFile}
      images={images}
      status={status}
      error={error}
      isGenerating={isGenerating}
      onPromptChange={setPrompt}
      onBpmChange={setBpm}
      onTemperatureChange={setTemperature}
      onAudioFileChange={setAudioFile}
      onImagesChange={setImages}
      onGenerate={handleGenerate}
      onSwitchToBuild={() => setMode('build')}
      onClose={() => setIsVisible(false)}
    />
  );
};
