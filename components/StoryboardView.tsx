import React from 'react';
import { Scene, GenerationPhase } from '../types';
import { SceneCard } from './SceneCard';

interface StoryboardViewProps {
  scenes: Scene[];
  currentPhase: GenerationPhase;
}

export function StoryboardView({ scenes, currentPhase }: StoryboardViewProps): React.ReactNode {
  const showEmptyState = scenes.length === 0 &&
    (currentPhase === GenerationPhase.AWAITING_STORY_INPUT ||
     currentPhase === GenerationPhase.IDLE ||
     currentPhase === GenerationPhase.AWAITING_USER_CHARACTER_CONFIRMATION ||
     currentPhase === GenerationPhase.AWAITING_CHARACTER_DESIGN_APPROVAL ||
     currentPhase === GenerationPhase.COMPLETE // Complete but no scenes (e.g. deconstruction failed)
    );


  if (showEmptyState) {
    let title = "Your Storyboard Awaits";
    let message = "Enter your story, define characters (or let AI find them), approve designs, and generate your visual narrative.";

    if(currentPhase === GenerationPhase.AWAITING_USER_CHARACTER_CONFIRMATION && scenes.length === 0) {
        title = "Confirm or Define Characters";
        message = "Review AI-suggested characters or add your own in the form. Then, generate their visual designs.";
    } else if (currentPhase === GenerationPhase.AWAITING_CHARACTER_DESIGN_APPROVAL && scenes.length === 0 ) {
        title = "Approve Character Designs";
        message = "Character design sheets are being generated or awaiting your approval. Once approved, you can generate the storyboard.";
    }


    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-slate-800/60 p-8 rounded-xl shadow-xl text-slate-400 border border-slate-700">
        <EmptyStateIcon className="w-20 h-20 mb-6 text-slate-600" />
        <h3 className="text-2xl font-semibold text-slate-200 mb-2">{title}</h3>
        <p className="text-center max-w-md">{message}</p>
      </div>
    );
  }

  if (scenes.length === 0 && (currentPhase === GenerationPhase.DECONSTRUCTING_STORY || currentPhase === GenerationPhase.GENERATING_SCENE_IMAGES)) {
    return (
         <div className="flex flex-col items-center justify-center min-h-[400px] bg-slate-800/60 p-8 rounded-xl shadow-xl text-slate-400 border border-slate-700">
            {/* Spinner will be in global overlay, so just a message here */}
            <p className="text-xl text-slate-300">Preparing your storyboard scenes...</p>
        </div>
    )
  }


  return (
    <div className="space-y-8 max-h-[calc(100vh-12rem)] md:max-h-[calc(100vh-8rem)] overflow-y-auto p-2 pr-4 bg-slate-800/30 rounded-xl shadow-inner border border-slate-700/50">
      {scenes.map((scene, index) => (
        <SceneCard key={scene.id} scene={scene} sceneNumber={index + 1} />
      ))}
    </div>
  );
}

function EmptyStateIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
       <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5h18M4.502 10.5A2.25 2.25 0 112.25 12.75v1.065c0 .75.592 1.387 1.338 1.451L4.53 15.75M19.502 10.5A2.25 2.25 0 1021.75 12.75v1.065c0 .75-.592 1.387-1.338 1.451L19.47 15.75" />
    </svg>
  );
}
