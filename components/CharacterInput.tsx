import React from 'react';
import { Character, GenerationPhase } from '../types';
import { LoadingSpinner } from './LoadingSpinner';

interface CharacterInputProps {
  character: Character;
  index: number;
  onChange: (index: number, character: Character) => void;
  onRemove: (id: string) => void;
  onGenerateSingleCharacterDesign: (characterId: string) => void;
  onApproveDesign: (characterId: string) => void;
  currentPhase: GenerationPhase;
  isGeneratingAnyCharacterDesigns: boolean; // True if any char design is loading globally
}

export function CharacterInput({
  character,
  index,
  onChange,
  onRemove,
  onGenerateSingleCharacterDesign,
  onApproveDesign,
  currentPhase,
  isGeneratingAnyCharacterDesigns,
}: CharacterInputProps): React.ReactNode {

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onChange(index, { ...character, [e.target.name]: e.target.value });
  };

  const isReadOnly = character.approvedDesignUrl ||
                     currentPhase === GenerationPhase.GENERATING_CHARACTER_DESIGNS ||
                     currentPhase === GenerationPhase.DECONSTRUCTING_STORY ||
                     currentPhase === GenerationPhase.GENERATING_SCENE_IMAGES ||
                     character.isDesignLoading;

  const canGenerateThisDesign = character.name.trim() !== '' && !character.approvedDesignUrl && !character.isDesignLoading && !isGeneratingAnyCharacterDesigns;

  return (
    <div className="p-4 border border-slate-600 rounded-lg mb-4 bg-slate-700/50 shadow-md relative transition-all duration-300 hover:border-purple-500">
      <button
        type="button"
        onClick={() => onRemove(character.id)}
        disabled={isReadOnly || isGeneratingAnyCharacterDesigns}
        className="absolute top-3 right-3 text-slate-400 hover:text-red-500 transition-colors p-1 rounded-full hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed z-10"
        aria-label="Remove character"
      >
        <TrashIcon className="h-5 w-5" />
      </button>

      {character.isAiExtracted && (
        <span className="absolute top-3 left-3 text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">AI Suggested</span>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
        <div>
          <label htmlFor={`charName-${character.id}`} className="block text-xs font-medium text-slate-300 mb-1">
            Character Name
          </label>
          <input
            type="text"
            id={`charName-${character.id}`}
            name="name"
            value={character.name}
            onChange={handleChange}
            readOnly={isReadOnly}
            className={`w-full p-2 bg-slate-600 text-slate-100 border border-slate-500 rounded-md focus:ring-1 focus:ring-purple-500 focus:border-purple-500 text-sm ${isReadOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
            placeholder="e.g., Elara"
          />
        </div>
         <div>
          <label htmlFor={`charAppearance-${character.id}`} className="block text-xs font-medium text-slate-300 mb-1">
            Appearance
          </label>
          <input
            type="text"
            id={`charAppearance-${character.id}`}
            name="appearance"
            value={character.appearance}
            onChange={handleChange}
            readOnly={isReadOnly}
            className={`w-full p-2 bg-slate-600 text-slate-100 border border-slate-500 rounded-md focus:ring-1 focus:ring-purple-500 focus:border-purple-500 text-sm ${isReadOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
            placeholder="e.g., Tall, windswept silver hair"
          />
        </div>
      </div>
      <div className="mb-3">
        <label htmlFor={`charAttire-${character.id}`} className="block text-xs font-medium text-slate-300 mb-1">
          Attire/Costume
        </label>
        <textarea
          id={`charAttire-${character.id}`}
          name="attire"
          value={character.attire}
          onChange={handleChange}
          readOnly={isReadOnly}
          rows={2}
          className={`w-full p-2 bg-slate-600 text-slate-100 border border-slate-500 rounded-md focus:ring-1 focus:ring-purple-500 focus:border-purple-500 text-sm ${isReadOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
          placeholder="e.g., Flowing dark blue cloak, leather boots"
        />
      </div>
      <div className="mb-4">
        <label htmlFor={`charProps-${character.id}`} className="block text-xs font-medium text-slate-300 mb-1">
          Key Props/Accessories
        </label>
        <input
          type="text"
          id={`charProps-${character.id}`}
          name="props"
          value={character.props}
          onChange={handleChange}
          readOnly={isReadOnly}
          className={`w-full p-2 bg-slate-600 text-slate-100 border border-slate-500 rounded-md focus:ring-1 focus:ring-purple-500 focus:border-purple-500 text-sm ${isReadOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
          placeholder="e.g., Ornate staff, glowing amulet"
        />
      </div>

      {/* Character Design Sheet Section */}
      <div className="mt-4 pt-4 border-t border-slate-600">
        <h5 className="text-sm font-semibold text-slate-200 mb-2">Character Design Sheet (Multi-View)</h5>
        {character.isDesignLoading && (
          <div className="flex flex-col items-center justify-center p-4 bg-slate-600/30 rounded-md">
            <LoadingSpinner />
            <p className="text-xs text-slate-300 mt-2">Generating multi-view design...</p>
          </div>
        )}
        {character.designError && !character.isDesignLoading && (
            <div className="text-xs text-red-400 bg-red-800/40 p-3 rounded-md border border-red-700">Error: {character.designError}</div>
        )}

        {(character.generatedDesignUrl || character.approvedDesignUrl) && !character.isDesignLoading && !character.designError && (
          <div className="mb-3 p-2 bg-slate-600/30 rounded-md">
            <img
              src={character.approvedDesignUrl || character.generatedDesignUrl}
              alt={`${character.name} multi-view design`}
              className="w-full h-auto rounded-md border border-slate-500 object-contain max-h-72"
            />
          </div>
        )}

        {!character.approvedDesignUrl && (
          <button
            type="button"
            onClick={() => onGenerateSingleCharacterDesign(character.id)}
            disabled={!canGenerateThisDesign}
            className="w-full text-sm px-4 py-2 mb-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {character.isDesignLoading ? 'Generating...' : (character.generatedDesignUrl ? 'Regenerate Design Sheet' : 'Generate Design Sheet')}
          </button>
        )}

        {character.generatedDesignUrl && !character.approvedDesignUrl && !character.isDesignLoading && (
          <button
            type="button"
            onClick={() => onApproveDesign(character.id)}
            disabled={character.isDesignLoading || isGeneratingAnyCharacterDesigns}
            className="w-full text-sm px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            Approve This Design
          </button>
        )}
         {character.approvedDesignUrl && (
            <div className="text-sm text-green-300 text-center font-semibold p-3 bg-green-800/40 rounded-md border border-green-700">
                <CheckCircleIcon className="h-5 w-5 inline-block mr-2 align-middle" />
                Design Approved!
            </div>
        )}
      </div>
    </div>
  );
}

function TrashIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12.56 0c.342.052.682.107 1.022.166m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
  );
}

function CheckCircleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}
