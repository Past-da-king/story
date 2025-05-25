
import React from 'react';
import { Scene } from '../types';
import { SceneCard } from './SceneCard';

interface StoryboardViewProps {
  scenes: Scene[];
}

export function StoryboardView({ scenes }: StoryboardViewProps): React.ReactNode {
  if (scenes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-slate-800 p-8 rounded-lg shadow-xl min-h-[300px] text-slate-400">
        <EmptyStateIcon className="w-16 h-16 mb-4 text-slate-600" />
        <h3 className="text-xl font-semibold text-slate-300">Your Storyboard Awaits</h3>
        <p>Enter your story and define characters to see them come to life here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-h-[calc(100vh-250px)] overflow-y-auto p-1 pr-3 bg-slate-800/50 rounded-lg shadow-inner">
      {scenes.map((scene, index) => (
        <SceneCard key={scene.id} scene={scene} sceneNumber={index + 1} />
      ))}
    </div>
  );
}

// Simple EmptyStateIcon SVG component (e.g., a film reel or book icon)
function EmptyStateIcon(props: React.SVGProps<SVGSVGElement>): React.ReactNode {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-1.875.375h.008v.008h-.008v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-1.875.375h.008v.008h-.008v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-1.875.375h.008v.008h-.008V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-1.5-1.125a.375.375 0 0 1-.375-.375V10.5a.375.375 0 0 1 .375-.375h1.5a.375.375 0 0 1 .375.375v.375a.375.375 0 0 1-.375.375h-1.5ZM16.5 4.5c0-1.483.695-2.838 1.836-3.707A49.404 49.404 0 0 1 21 3a.75.75 0 0 1 .75.75v16.5a.75.75 0 0 1-.75.75 49.18 49.18 0 0 1-2.664-.207 50.642 50.642 0 0 0-12.172 0A49.179 49.179 0 0 1 3 21a.75.75 0 0 1-.75-.75V3.75A.75.75 0 0 1 3 3c.995 0 1.955.134 2.836.393A4.502 4.502 0 0 1 7.5 4.5c0 1.483-.695 2.838-1.836 3.707A49.403 49.403 0 0 1 3 9a.75.75 0 0 1-.75-.75V3.75A.75.75 0 0 1 3 3c.995 0 1.955.134 2.836.393A4.502 4.502 0 0 1 7.5 4.5c0-1.483.695-2.838 1.836-3.707A49.403 49.403 0 0 1 12 .75a49.403 49.403 0 0 1 2.664-.207A4.502 4.502 0 0 1 16.5 4.5Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
    </svg>
  );
}
