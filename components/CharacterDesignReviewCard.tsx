import React from 'react';
import { Character } from '../types';
import { LoadingSpinner } from './LoadingSpinner';

interface CharacterDesignReviewCardProps {
  character: Character;
  onRegenerate: (characterId: string) => void;
  onApprove: (characterId: string) => void;
  isLoadingGlobal: boolean; // If any global process is running
}

export function CharacterDesignReviewCard({ character, onRegenerate, onApprove, isLoadingGlobal }: CharacterDesignReviewCardProps) {
  const canInteract = !character.isDesignLoading && !isLoadingGlobal;

  return (
    <div className="bg-slate-700/50 p-5 rounded-xl shadow-xl border border-slate-600 mb-8">
      <h3 className="text-2xl font-semibold text-purple-300 mb-4">
        Character: {character.name}
        {character.isDesignLoading && <span className="text-sm ml-2 text-slate-400">(Generating...)</span>}
        {character.designError && <span className="text-sm ml-2 text-red-400">(Error)</span>}
        {character.approvedDesignImageUrl && <span className="text-sm ml-2 text-green-400">(Approved ✔)</span>}
      </h3>

      <div className="aspect-[16/9] bg-slate-600 rounded-lg flex items-center justify-center overflow-hidden mb-4 border border-slate-500">
        {character.isDesignLoading && <LoadingSpinner />}
        {!character.isDesignLoading && character.designError && (
          <div className="text-center text-red-400 p-4">
            <p className="font-semibold">Design Generation Failed</p>
            <p className="text-xs mt-1">{character.designError}</p>
          </div>
        )}
        {!character.isDesignLoading && !character.designError && (character.generatedDesignImageUrl || character.approvedDesignImageUrl) && (
          <img
            src={character.approvedDesignImageUrl || character.generatedDesignImageUrl}
            alt={`${character.name} - Multi-view Design Sheet`}
            className="w-full h-full object-contain" // object-contain to see the whole sheet
          />
        )}
        {!character.isDesignLoading && !character.designError && !character.generatedDesignImageUrl && !character.approvedDesignImageUrl && (
          <p className="text-slate-400">Design not generated yet.</p>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-end">
        <button
          onClick={() => onRegenerate(character.id)}
          disabled={!canInteract || character.approvedDesignImageUrl}
          className="px-6 py-2 border border-purple-500 text-purple-300 hover:bg-purple-500 hover:text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {character.isDesignLoading ? 'Generating...' : 'Regenerate Design'}
        </button>
        {!character.approvedDesignImageUrl && (character.generatedDesignImageUrl || character.designError) && (
             <button
                onClick={() => onApprove(character.id)}
                disabled={!canInteract || !character.generatedDesignImageUrl || character.isDesignLoading} // Can't approve if no generated image or error
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                Approve Design
            </button>
        )}
      </div>
    </div>
  );
}
