import React from 'react';
import { Character } from '../types';
import { LoadingSpinner } from './LoadingSpinner'; // Assuming this exists

interface CharacterInputProps {
  character: Character;
  onChange: (character: Character) => void;
  onRemove: () => void;
  onGenerateDesign: () => void;
  onApproveDesign: () => void;
  onRegenerateDesign: () => void; // New prop
  isGeneratingStory: boolean; // To disable during full story generation
}

export function CharacterInput({
  character,
  onChange,
  onRemove,
  onGenerateDesign,
  onApproveDesign,
  onRegenerateDesign,
  isGeneratingStory
}: CharacterInputProps): React.ReactNode {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onChange({ ...character, [e.target.name]: e.target.value });
  };

  const canEditText = !character.approvedDesignUrl && !character.isDesignLoading && !isGeneratingStory;

  return (
    <div className="p-4 border border-slate-700 rounded-md mb-4 space-y-3 bg-slate-700/30 relative">
      <button
        type="button"
        onClick={onRemove}
        disabled={isGeneratingStory || character.isDesignLoading}
        className="absolute top-2 right-2 text-slate-500 hover:text-red-400 transition-colors p-1 rounded-full hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Remove character"
      >
        <TrashIcon className="h-5 w-5" />
      </button>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor={`charName-${character.id}`} className="block text-xs font-medium text-slate-400 mb-1">
            Name
          </label>
          <input
            type="text"
            id={`charName-${character.id}`}
            name="name"
            value={character.name}
            onChange={handleChange}
            readOnly={!canEditText}
            className={`w-full p-2 bg-slate-600 text-slate-100 border border-slate-500 rounded-md focus:ring-1 focus:ring-purple-500 focus:border-purple-500 text-sm ${!canEditText ? 'opacity-70 cursor-not-allowed' : ''}`}
            placeholder="e.g., Arin"
          />
        </div>
        <div>
          <label htmlFor={`charAppearance-${character.id}`} className="block text-xs font-medium text-slate-400 mb-1">
            Appearance
          </label>
          <input
            type="text"
            id={`charAppearance-${character.id}`}
            name="appearance"
            value={character.appearance}
            onChange={handleChange}
            readOnly={!canEditText}
            className={`w-full p-2 bg-slate-600 text-slate-100 border border-slate-500 rounded-md focus:ring-1 focus:ring-purple-500 focus:border-purple-500 text-sm ${!canEditText ? 'opacity-70 cursor-not-allowed' : ''}`}
            placeholder="e.g., Tall, red hair, green eyes"
          />
        </div>
      </div>

      <div>
        <label htmlFor={`charAttire-${character.id}`} className="block text-xs font-medium text-slate-400 mb-1">
          Attire/Costume
        </label>
        <input
          type="text"
          id={`charAttire-${character.id}`}
          name="attire"
          value={character.attire}
          onChange={handleChange}
          readOnly={!canEditText}
          className={`w-full p-2 bg-slate-600 text-slate-100 border border-slate-500 rounded-md focus:ring-1 focus:ring-purple-500 focus:border-purple-500 text-sm ${!canEditText ? 'opacity-70 cursor-not-allowed' : ''}`}
          placeholder="e.g., Tattered brown cloak"
        />
      </div>
      <div>
        <label htmlFor={`charProps-${character.id}`} className="block text-xs font-medium text-slate-400 mb-1">
          Key Props/Accessories
        </label>
        <input
          type="text"
          id={`charProps-${character.id}`}
          name="props"
          value={character.props}
          onChange={handleChange}
          readOnly={!canEditText}
          className={`w-full p-2 bg-slate-600 text-slate-100 border border-slate-500 rounded-md focus:ring-1 focus:ring-purple-500 focus:border-purple-500 text-sm ${!canEditText ? 'opacity-70 cursor-not-allowed' : ''}`}
          placeholder="e.g., Ancient grimoire"
        />
      </div>

      {/* Character Design Section */}
      <div className="mt-4 pt-3 border-t border-slate-600">
        <h5 className="text-sm font-semibold text-slate-300 mb-2">Character Design</h5>
        {character.isDesignLoading && (
          <div className="flex flex-col items-center justify-center p-4">
            <LoadingSpinner />
            <p className="text-xs text-slate-400 mt-2">Generating design...</p>
          </div>
        )}
        {character.designError && !character.isDesignLoading && (
            <div className="text-xs text-red-400 bg-red-900/30 p-2 rounded-md">Error: {character.designError}</div>
        )}

        {(character.generatedDesignUrl || character.approvedDesignUrl) && !character.isDesignLoading && !character.designError && (
          <div className="mb-2">
            <img
              src={character.approvedDesignUrl || character.generatedDesignUrl}
              alt={`${character.name} design`}
              className="w-full h-auto rounded-md border border-slate-500 object-contain max-h-60"
            />
          </div>
        )}

        {!character.approvedDesignUrl && (
          <button
            type="button"
            onClick={character.generatedDesignUrl ? onRegenerateDesign : onGenerateDesign}
            disabled={character.isDesignLoading || isGeneratingStory || !character.name.trim()}
            className="w-full text-xs px-3 py-1.5 mb-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {character.isDesignLoading ? 'Generating...' : (character.generatedDesignUrl ? 'Regenerate Design' : 'Generate Design')}
          </button>
        )}

        {character.generatedDesignUrl && !character.approvedDesignUrl && !character.isDesignLoading && (
          <button
            type="button"
            onClick={onApproveDesign}
            disabled={character.isDesignLoading || isGeneratingStory}
            className="w-full text-xs px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Approve Design
          </button>
        )}
         {character.approvedDesignUrl && (
            <p className="text-xs text-green-400 text-center font-semibold p-2 bg-green-900/30 rounded-md">Design Approved!</p>
        )}
      </div>
    </div>
  );
}

// Simple TrashIcon SVG component
function TrashIcon(props: React.SVGProps<SVGSVGElement>): React.ReactNode {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12.56 0c.342.052.682.107 1.022.166m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
  );
}
