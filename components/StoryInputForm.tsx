import React from 'react';
import { Character, StylePreferences, ArtStyle, GenerationPhase } from '../types';
import { CharacterInput } from './CharacterInput';
import { AVAILABLE_ART_STYLES, MAX_CHARACTERS } from '../constants';

const generateId = (): string => Math.random().toString(36).substr(2, 9);

interface StoryInputFormProps {
  storyText: string;
  setStoryText: (text: string) => void;
  characters: Character[];
  setCharacters: (characters: Character[]) => void;
  stylePreferences: StylePreferences;
  setStylePreferences: (preferences: StylePreferences) => void;
  onGenerateCharacterDesigns: () => void; // New
  onGenerateVisualStory: () => void; // Renamed from onSubmit
  currentPhase: GenerationPhase;
  isLoading: boolean; // General loading for story/scene generation
}

export function StoryInputForm({
  storyText,
  setStoryText,
  characters,
  setCharacters,
  stylePreferences,
  setStylePreferences,
  onGenerateCharacterDesigns,
  onGenerateVisualStory,
  currentPhase,
  isLoading,
}: StoryInputFormProps): React.ReactNode {

  const addCharacter = () => {
    if (characters.length < MAX_CHARACTERS) {
      setCharacters([...characters, { id: generateId(), name: '', appearance: '', attire: '', props: '' }]);
    }
  };

  const updateCharacter = (index: number, updatedCharacter: Character) => {
    const newCharacters = [...characters];
    newCharacters[index] = updatedCharacter;
    setCharacters(newCharacters);
  };

  const removeCharacter = (id: string) => {
    setCharacters(characters.filter(char => char.id !== id));
  };

  // Specific handlers for CharacterInput to update character designs
  const handleGenerateCharacterDesign = (charId: string) => {
    const charIndex = characters.findIndex(c => c.id === charId);
    if (charIndex === -1 || !characters[charIndex].name.trim()) {
      alert("Please provide a name for the character before generating a design.");
      return;
    }
    // The actual API call will be managed in App.tsx
    // Here we just signal App.tsx via a more specific callback if needed,
    // or App.tsx can manage it by passing down a single function that takes charId.
    // For simplicity, App.tsx will iterate and call the service.
    // This callback is for CharacterInput to notify its parent (App.tsx directly or indirectly)
    // For now, the main "Generate Character Designs" button in this form will trigger all.
  };

  const handleApproveCharacterDesign = (charId: string) => {
    setCharacters(prevChars => prevChars.map(c =>
      c.id === charId ? { ...c, approvedDesignUrl: c.generatedDesignUrl, generatedDesignUrl: undefined, designError: undefined } : c
    ));
  };

  const handleRegenerateCharacterDesign = (charId: string) => {
     // App.tsx will handle the regeneration logic.
     // This function is essentially a signal to re-trigger generation for this char.
     // The parent (App.tsx) will need to manage this.
     // We can simplify CharacterInput by just having one "generate/regenerate" button
     // and App.tsx decides what to do based on character state.
     // For now, let App.tsx handle this specific character regeneration via its overall character generation logic.
  };


  const canGenerateCharacterDesigns = characters.length > 0 && characters.some(c => c.name.trim() !== '' && !c.approvedDesignUrl) && !isLoading;
  const allCharactersDesignedOrSkipped = characters.every(c => c.approvedDesignUrl || !c.name.trim());
  const canGenerateStoryboard = storyText.trim() !== '' && (characters.length === 0 || allCharactersDesignedOrSkipped) && !isLoading;


  return (
    <div className="bg-slate-800 p-6 rounded-lg shadow-2xl space-y-6">
      <div>
        <label htmlFor="storyText" className="block text-sm font-medium text-slate-300 mb-1">
          Your Story
        </label>
        <textarea
          id="storyText"
          value={storyText}
          onChange={(e) => setStoryText(e.target.value)}
          rows={10}
          className="w-full p-3 bg-slate-700 text-slate-100 border border-slate-600 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
          placeholder="Paste your story here. The AI will break it into scenes."
          disabled={isLoading || currentPhase === GenerationPhase.GENERATING_CHARACTER_DESIGNS || currentPhase === GenerationPhase.AWAITING_CHARACTER_APPROVAL}
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold text-slate-200 mb-2">Character Definitions</h3>
        <p className="text-xs text-slate-400 mb-3">Define up to {MAX_CHARACTERS} key characters. Generate and approve their designs before creating the storyboard.</p>
        {characters.map((char, index) => (
          <CharacterInput
            key={char.id}
            character={char}
            onChange={(updatedChar) => updateCharacter(index, updatedChar)}
            onRemove={() => removeCharacter(char.id)}
            // Pass down functions for App.tsx to handle API calls
            onGenerateDesign={() => { /* App.tsx will handle this specific call via a new button or iterate */}}
            onApproveDesign={() => handleApproveCharacterDesign(char.id)}
            onRegenerateDesign={() => { /* App.tsx will handle this specific call */}}
            isGeneratingStory={isLoading && (currentPhase === GenerationPhase.DECONSTRUCTING_STORY || currentPhase === GenerationPhase.GENERATING_SCENE_IMAGES)}
          />
        ))}
        {characters.length < MAX_CHARACTERS && (
          <button
            type="button"
            onClick={addCharacter}
            disabled={isLoading}
            className="mt-2 w-full flex items-center justify-center px-4 py-2 border border-dashed border-slate-600 text-sm font-medium rounded-md text-slate-400 hover:text-slate-200 hover:border-slate-500 transition-colors disabled:opacity-50"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Character
          </button>
        )}
      </div>
       {characters.length > 0 && (
        <button
            type="button"
            onClick={onGenerateCharacterDesigns}
            disabled={!canGenerateCharacterDesigns || isLoading || currentPhase === GenerationPhase.GENERATING_CHARACTER_DESIGNS}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 ease-in-out"
        >
            {currentPhase === GenerationPhase.GENERATING_CHARACTER_DESIGNS ? 'Generating Designs...' : 'Generate Character Designs'}
        </button>
       )}


      <div>
        <h3 className="text-lg font-semibold text-slate-200 mb-2">Style Preferences</h3>
        <div className="space-y-3">
          <div>
            <label htmlFor="artStyle" className="block text-sm font-medium text-slate-300 mb-1">
              Art Style
            </label>
            <select
              id="artStyle"
              value={stylePreferences.artStyle}
              onChange={(e) => setStylePreferences({ ...stylePreferences, artStyle: e.target.value as ArtStyle })}
              className="w-full p-3 bg-slate-700 text-slate-100 border border-slate-600 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              disabled={isLoading}
            >
              {AVAILABLE_ART_STYLES.map(style => (
                <option key={style} value={style}>{style}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="moodKeywords" className="block text-sm font-medium text-slate-300 mb-1">
              Mood/Atmosphere Keywords
            </label>
            <input
              type="text"
              id="moodKeywords"
              value={stylePreferences.moodKeywords}
              onChange={(e) => setStylePreferences({ ...stylePreferences, moodKeywords: e.target.value })}
              className="w-full p-3 bg-slate-700 text-slate-100 border border-slate-600 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="e.g., mysterious, uplifting, ominous"
              disabled={isLoading}
            />
          </div>
          <div>
            <label htmlFor="referenceArtists" className="block text-sm font-medium text-slate-300 mb-1">
              Reference Artists (Optional)
            </label>
            <input
              type="text"
              id="referenceArtists"
              value={stylePreferences.referenceArtists}
              onChange={(e) => setStylePreferences({ ...stylePreferences, referenceArtists: e.target.value })}
              className="w-full p-3 bg-slate-700 text-slate-100 border border-slate-600 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="e.g., Studio Ghibli, Van Gogh"
              disabled={isLoading}
            />
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onGenerateVisualStory}
        disabled={!canGenerateStoryboard || isLoading || currentPhase === GenerationPhase.GENERATING_CHARACTER_DESIGNS}
        className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-md shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-opacity-50"
      >
        {isLoading && (currentPhase === GenerationPhase.DECONSTRUCTING_STORY || currentPhase === GenerationPhase.GENERATING_SCENE_IMAGES) ? 'Generating Storyboard...' : 'Generate Visual Storyboard'}
      </button>
    </div>
  );
}

function PlusIcon(props: React.SVGProps<SVGSVGElement>): React.ReactNode {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}
