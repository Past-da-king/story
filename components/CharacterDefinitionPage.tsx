import React from 'react';
import { Character } from '../types';
import { CharacterDefinitionInput } from './CharacterDefinitionInput';
import { MAX_CHARACTERS } from '../constants';

interface CharacterDefinitionPageProps {
  characters: Character[];
  setCharacters: React.Dispatch<React.SetStateAction<Character[]>>;
  onContinue: () => void;
  onBack: () => void;
  onExtractCharactersFromStory: () => Promise<void>;
  isLoading: boolean;
  aiSuggestionsExist: boolean;
}

const generateId = (): string => 'manual-' + Math.random().toString(36).substr(2, 9); // Prefix manual for clarity

export function CharacterDefinitionPage({
  characters,
  setCharacters,
  onContinue,
  onBack,
  onExtractCharactersFromStory,
  isLoading,
  aiSuggestionsExist
}: CharacterDefinitionPageProps): React.ReactNode {

  const addCharacter = () => {
    if (characters.length < MAX_CHARACTERS) {
      const newChar: Character = {
        id: generateId(), name: '', description: '', gender: '', age: '', hairColor: '', eyeColor: '',
        build: '', personalityTraits: '', clothingStyle: '', distinguishingFeatures: '', habitsMannerisms: '',
        isAiExtracted: false
      };
      setCharacters(prev => [...prev, newChar]);
    }
  };

  const updateCharacterField = (index: number, field: keyof Character, value: string) => {
    setCharacters(prev => {
      const newChars = [...prev];
      // @ts-ignore
      newChars[index][field] = value;
      // If user edits an AI suggested character, it's no longer purely AI extracted in its current state
      if (newChars[index].isAiExtracted) {
        newChars[index].isAiExtracted = false; // Or use a different flag like 'isEdited'
      }
      return newChars;
    });
  };

  const removeCharacter = (id: string) => {
    setCharacters(prev => prev.filter(char => char.id !== id));
  };

  const acceptAiSuggestion = (id: string) => {
      setCharacters(prev => prev.map(char => char.id === id ? {...char, isAiExtracted: false /* Mark as accepted/manual */} : char));
      // Potentially, after accepting all, could auto-proceed or enable next step
  };


  return (
    <div className="w-full max-w-4xl mx-auto p-6 md:p-8 bg-slate-800 rounded-xl shadow-2xl">
      <h2 className="text-3xl md:text-4xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-500 mb-3" style={{ fontFamily: "'Lora', serif" }}>
        Character Descriptions
      </h2>
      <p className="text-center text-slate-300 mb-8">
        Define the characters that will appear in your story. You can manually enter descriptions, use AI suggestions, or edit existing characters.
      </p>

      {!aiSuggestionsExist && characters.length === 0 && (
         <button
            onClick={onExtractCharactersFromStory}
            disabled={isLoading}
            className="w-full mb-6 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-md disabled:opacity-60 transition-colors"
        >
            {isLoading ? 'Analyzing Story for Characters...' : 'Let AI Suggest Characters from Story'}
        </button>
      )}


      {characters.map((char, index) => (
        <CharacterDefinitionInput
          key={char.id}
          character={char}
          index={index}
          onChange={updateCharacterField}
          onRemove={removeCharacter}
          isAiSuggested={char.isAiExtracted}
          onAcceptAiSuggestion={acceptAiSuggestion}
          // onRegenerateAiSuggestion can be added here if we want per-character AI regen
          isLoading={isLoading}
        />
      ))}

      {characters.length < MAX_CHARACTERS && (
        <button
          onClick={addCharacter}
          disabled={isLoading}
          className="w-full mt-4 mb-6 px-6 py-3 border-2 border-dashed border-slate-600 hover:border-purple-500 text-slate-300 hover:text-purple-300 font-medium rounded-lg transition-colors disabled:opacity-60"
        >
          + Add New Character Manually
        </button>
      )}

      <div className="mt-8 flex flex-col sm:flex-row justify-between gap-4">
        <button
          onClick={onBack}
          className="px-8 py-3 bg-slate-600 hover:bg-slate-500 text-white font-semibold rounded-lg shadow-md transition-colors"
        >
          Back to Story
        </button>
        <button
          onClick={onContinue}
          disabled={isLoading || characters.filter(c => c.name.trim() !== '').length === 0} // Must have at least one named character or allow proceeding without
          className="px-8 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold rounded-lg shadow-lg disabled:opacity-60 transition-colors"
        >
          {isLoading ? 'Processing...' : 'Continue to Global Preferences'}
        </button>
      </div>
    </div>
  );
}
