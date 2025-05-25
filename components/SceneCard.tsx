
import React, { useState } from 'react';
import { Scene } from '../types';
import { LoadingSpinner } from './LoadingSpinner';

interface SceneCardProps {
  scene: Scene;
  sceneNumber: number;
}

export function SceneCard({ scene, sceneNumber }: SceneCardProps): React.ReactNode {
  const [isDetailsVisible, setIsDetailsVisible] = useState(false);

  return (
    <div className="bg-slate-700/70 p-4 rounded-lg shadow-lg transition-all duration-300 hover:shadow-purple-500/30">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="md:w-1/2 aspect-video bg-slate-600 rounded-md flex items-center justify-center overflow-hidden">
          {scene.imageUrl && !scene.imageError && (
            <img 
              src={scene.imageUrl} 
              alt={`Scene ${sceneNumber}: ${scene.sceneSummary}`} 
              className="w-full h-full object-cover"
            />
          )}
          {!scene.imageUrl && !scene.imageError && (
             <div className="p-4 text-center text-slate-400">
                <LoadingSpinner />
                <p className="mt-2 text-sm">Generating image...</p>
             </div>
          )}
          {scene.imageError && (
            <div className="p-4 text-center text-red-400">
              <ErrorIcon className="w-10 h-10 mx-auto mb-2"/>
              <p className="text-sm font-semibold">Image Generation Failed</p>
              <p className="text-xs">{scene.imageError}</p>
            </div>
          )}
        </div>
        <div className="md:w-1/2">
          <h4 className="text-lg font-semibold text-purple-300 mb-1">
            Scene {sceneNumber}: <span className="text-slate-100">{scene.sceneSummary}</span>
          </h4>
          <button 
            onClick={() => setIsDetailsVisible(!isDetailsVisible)}
            className="text-xs text-purple-400 hover:text-purple-300 mb-2"
          >
            {isDetailsVisible ? 'Hide Details' : 'Show Details'}
          </button>

          {isDetailsVisible && (
             <div className="text-sm text-slate-300 space-y-1 mt-2 max-h-48 overflow-y-auto pr-2">
                <p><strong>Characters:</strong> {scene.charactersInScene.join(', ') || 'N/A'}</p>
                <p><strong>Setting:</strong> {scene.settingDescription}</p>
                <p><strong>Action:</strong> {scene.actionDescription}</p>
                <p><strong>Emotion:</strong> {scene.emotionalBeat}</p>
                <p className="mt-2 pt-2 border-t border-slate-600">
                    <strong className="text-slate-400">Image Prompt:</strong>
                    <span className="text-xs block text-slate-400 break-all">{scene.imagePrompt}</span>
                </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Simple ErrorIcon SVG component
function ErrorIcon(props: React.SVGProps<SVGSVGElement>): React.ReactNode {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
  );
}

