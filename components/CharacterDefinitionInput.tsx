import React from 'react';
import { Character } from '../types';

interface CharacterDefinitionInputProps {
  character: Character;
  index: number;
  onChange: (index: number, field: keyof Character, value: string) => void;
  onRemove: (id: string) => void;
  isAiSuggested?: boolean;
  onAcceptAiSuggestion?: (id: string) => void; // Optional, if direct accept is needed
  onRegenerateAiSuggestion?: (id: string) => void; // Optional
  isLoading?: boolean;
}

// Fields from mockup 2.png for Character Definition
const characterFields: Array<{ key: keyof Character; label: string; placeholder: string; type?: 'textarea' | 'text' }> = [
  { key: 'name', label: 'Name', placeholder: 'e.g., Anya', type: 'text' },
  { key: 'description', label: 'Description', placeholder: 'e.g., A brave knight with a mysterious past...', type: 'textarea' },
  { key: 'gender', label: 'Gender', placeholder: 'e.g., Female, Male, Non-binary', type: 'text' },
  { key: 'age', label: 'Age', placeholder: 'e.g., 25, Ancient, Ageless', type: 'text' },
  { key: 'hairColor', label: 'Hair Color', placeholder: 'e.g., Raven black, Fiery red', type: 'text' },
  { key: 'eyeColor', label: 'Eye Color', placeholder: 'e.g., Emerald green, Icy blue', type: 'text' },
  { key: 'build', label: 'Build', placeholder: 'e.g., Athletic, Slender, Imposing', type: 'text' },
  { key: 'personalityTraits', label: 'Personality Traits', placeholder: 'e.g., Brave, Curious, Stoic, Humorous', type: 'textarea' },
  { key: 'clothingStyle', label: 'Clothing Style', placeholder: 'e.g., Practical adventurer\'s gear, Regal attire', type: 'textarea' },
  { key: 'distinguishingFeatures', label: 'Distinguishing Features', placeholder: 'e.g., Scar above left eye, Always wears a silver locket', type: 'textarea' },
  { key: 'habitsMannerisms', label: 'Habits/Mannerisms', placeholder: 'e.g., Taps fingers when thinking, Often quotes ancient proverbs', type: 'textarea' },
];


export function CharacterDefinitionInput({
  character,
  index,
  onChange,
  onRemove,
  isAiSuggested,
  onAcceptAiSuggestion,
  onRegenerateAiSuggestion,
  isLoading
}: CharacterDefinitionInputProps): React.ReactNode {

  const handleInputChange = (field: keyof Character, value: string) => {
    onChange(index, field, value);
  };

  return (
    <div className="p-5 border border-slate-600 rounded-lg mb-6 bg-slate-700/40 shadow-lg relative">
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-lg font-semibold text-purple-300">
          Character {index + 1}: {character.name || "Unnamed"}
          {isAiSuggested && !character.id.startsWith('manual-') && <span className="ml-2 text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">AI Suggested</span>}
        </h4>
        <button
          type="button"
          onClick={() => onRemove(character.id)}
          disabled={isLoading}
          className="text-red-400 hover:text-red-300 disabled:opacity-50"
          aria-label="Remove character"
        >
          <TrashIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
        {characterFields.map(fieldInfo => (
          <div key={fieldInfo.key} className={fieldInfo.type === 'textarea' ? 'md:col-span-2' : ''}>
            <label htmlFor={`${fieldInfo.key}-${character.id}`} className="block text-xs font-medium text-slate-300 mb-1">
              {fieldInfo.label}
            </label>
            {fieldInfo.type === 'textarea' ? (
              <textarea
                id={`${fieldInfo.key}-${character.id}`}
                name={fieldInfo.key}
                value={character[fieldInfo.key] as string || ''}
                onChange={(e) => handleInputChange(fieldInfo.key, e.target.value)}
                rows={2}
                className="w-full p-2 bg-slate-600 text-slate-100 border border-slate-500 rounded-md focus:ring-1 focus:ring-purple-500 text-sm shadow-sm"
                placeholder={fieldInfo.placeholder}
                disabled={isLoading}
              />
            ) : (
              <input
                type="text"
                id={`${fieldInfo.key}-${character.id}`}
                name={fieldInfo.key}
                value={character[fieldInfo.key] as string || ''}
                onChange={(e) => handleInputChange(fieldInfo.key, e.target.value)}
                className="w-full p-2 bg-slate-600 text-slate-100 border border-slate-500 rounded-md focus:ring-1 focus:ring-purple-500 text-sm shadow-sm"
                placeholder={fieldInfo.placeholder}
                disabled={isLoading}
              />
            )}
          </div>
        ))}
      </div>
      {isAiSuggested && onAcceptAiSuggestion && onRegenerateAiSuggestion && (
        <div className="mt-4 flex gap-3">
            <button
                type="button"
                onClick={() => onRegenerateAiSuggestion(character.id)}
                disabled={isLoading}
                className="flex-1 px-4 py-2 border border-slate-500 text-slate-300 hover:bg-slate-600 rounded-md text-sm disabled:opacity-50"
            >
                <RefreshCwIcon className="h-4 w-4 mr-2 inline"/>Regenerate AI Suggestion
            </button>
            <button
                type="button"
                onClick={() => onAcceptAiSuggestion(character.id)} // Assuming accept means removing the 'isAiSuggested' flag internally
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm disabled:opacity-50"
            >
                <CheckIcon className="h-4 w-4 mr-2 inline"/>Accept Suggestion
            </button>
        </div>
      )}
    </div>
  );
}

// Placeholder Icons (should be actual SVG components or from a library)
const TrashIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const RefreshCwIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 10V7a4 4 0 00-4-4h-1M4 14v3a4 4 0 004 4h1m0-14v4h4m-4-4L4 9m0 0l4 4m0 0H4m16 1L20 5m0 0l-4-4m4 4H8" /></svg>;
const CheckIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>;

