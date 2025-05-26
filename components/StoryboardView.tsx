import React from 'react';
import { Scene } from '../types'; // Removed GenerationPhase as it's now handled by StoryboardViewPage
import { SceneCard } from './SceneCard';

interface StoryboardViewProps {
  scenes: Scene[];
}

export function StoryboardView({ scenes }: StoryboardViewProps): React.ReactNode {
  if (scenes.length === 0) {
    // This component will now likely only be rendered by StoryboardViewPage when scenes exist
    // or if StoryboardViewPage handles the "no scenes generated" message itself.
    // For robustness, keeping a minimal empty state here.
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] bg-slate-800/30 p-8 rounded-lg text-slate-400">
        <p>No scenes to display.</p>
      </div>
    );
  }

  return (
    // Ensure this div allows for vertical scrolling and has a defined height or grows within its container
    <div className="space-y-6 md:space-y-8 py-2">
      {scenes.map((scene, index) => (
        <SceneCard key={scene.id} scene={scene} sceneNumber={index + 1} />
      ))}
    </div>
  );
}
