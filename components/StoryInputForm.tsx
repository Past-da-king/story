
import React from 'react';
import { Character, StylePreferences, ArtStyle } from '../types';
import { CharacterInput } from './CharacterInput';
import { AVAILABLE_ART_STYLES, MAX_CHARACTERS } from '../constants';

// Helper to generate unique IDs
const generateId = (): string => Math.random().toString(36).substr(2, 9);

interface StoryInputFormProps {
  storyText: string;
  setStoryText: (text: string) => void;
  characters: Character[];
  setCharacters: (characters: Character[]) => void;
  stylePreferences: StylePreferences;
  setStylePreferences: (preferences: StylePreferences) => void;
  onSubmit: () => void;
  isLoading: boolean;
}

export function StoryInputForm({
  storyText,
  setStoryText,
  characters,
  setCharacters,
  stylePreferences,
  setStylePreferences,
  onSubmit,
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
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold text-slate-200 mb-2">Character Definitions (Optional)</h3>
        <p className="text-xs text-slate-400 mb-3">Define up to {MAX_CHARACTERS} key characters for better visual consistency.</p>
        {characters.map((char, index) => (
          <CharacterInput
            key={char.id}
            character={char}
            onChange={(updatedChar) => updateCharacter(index, updatedChar)}
            onRemove={() => removeCharacter(char.id)}
          />
        ))}
        {characters.length < MAX_CHARACTERS && (
          <button
            type="button"
            onClick={addCharacter}
            className="mt-2 w-full flex items-center justify-center px-4 py-2 border border-dashed border-slate-600 text-sm font-medium rounded-md text-slate-400 hover:text-slate-200 hover:border-slate-500 transition-colors"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Character
          </button>
        )}
      </div>

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
            />
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onSubmit}
        disabled={isLoading || !storyText.trim()}
        className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-md shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-opacity-50"
      >
        {isLoading ? 'Generating...' : 'Generate Visual Story'}
      </button>
    </div>
  );
}


// Simple PlusIcon SVG component
function PlusIcon(props: React.SVGProps<SVGSVGElement>): React.ReactNode {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}
