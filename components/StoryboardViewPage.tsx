import React from 'react';
import { Scene } from '../types';
import { StoryboardView } from './StoryboardView'; // Assuming this is updated for scrollable list

interface StoryboardViewPageProps {
  scenes: Scene[];
  storyTitle: string; // Assuming we can get a title
  isLoading: boolean;
  onRestart: () => void;
}

export function StoryboardViewPage({ scenes, storyTitle, isLoading, onRestart }: StoryboardViewPageProps): React.ReactNode {
  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-6">
      <div className="text-center mb-8">
        <h2 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500 mb-2" style={{ fontFamily: "'Lora', serif" }}>
          Your Illustrated Story
        </h2>
        {storyTitle && <p className="text-2xl text-slate-300">{storyTitle || "Untitled Story"}</p>}
      </div>

      {isLoading && scenes.length === 0 && ( /* Initial loading for storyboard */
        <div className="text-center text-slate-300 p-10">
            <LoadingSpinner />
            <p className="mt-4 text-xl">Generating your visual storyboard...</p>
        </div>
      )}

      {!isLoading && scenes.length === 0 && (
          <div className="text-center text-slate-400 p-10 bg-slate-800 rounded-lg">
              <p className="text-xl">No scenes generated for the storyboard.</p>
              <p>This might be due to an issue in story deconstruction or if the story was too short.</p>
          </div>
      )}

      {scenes.length > 0 && <StoryboardView scenes={scenes} currentPhase={'storyboardDisplay' as any} />} {/* Pass a relevant phase if needed */}

      <div className="mt-10 text-center">
        <button
          onClick={onRestart}
          className="px-10 py-3 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white font-semibold rounded-lg shadow-md transition-colors"
        >
          Create Another Story
        </button>
      </div>
    </div>
  );
}

// Dummy LoadingSpinner if not already globally available
function LoadingSpinner() {
    return <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-purple-500 mx-auto"></div>;
}
