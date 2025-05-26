import React, { useState } from 'react';
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
  onExtractOrConfirmCharacters: () => void; // New
  onGenerateAllCharacterDesigns: () => void; // New
  onGenerateSingleCharacterDesign: (characterId: string) => void; // New
  onApproveCharacterDesign: (characterId: string) => void; // New
  onGenerateVisualStory: () => void;
  currentPhase: GenerationPhase;
}

export function StoryInputForm({
  storyText,
  setStoryText,
  characters,
  setCharacters,
  stylePreferences,
  setStylePreferences,
  onExtractOrConfirmCharacters,
  onGenerateAllCharacterDesigns,
  onGenerateSingleCharacterDesign,
  onApproveCharacterDesign,
  onGenerateVisualStory,
  currentPhase,
}: StoryInputFormProps): React.ReactNode {

  const [userHasInteractedWithChars, setUserHasInteractedWithChars] = useState(false);

  const addCharacter = () => {
    setUserHasInteractedWithChars(true);
    if (characters.length < MAX_CHARACTERS) {
      setCharacters([...characters, { id: generateId(), name: '', appearance: '', attire: '', props: '', isAiExtracted: false }]);
    }
  };

  const updateCharacter = (index: number, updatedCharacter: Character) => {
    setUserHasInteractedWithChars(true);
    const newCharacters = [...characters];
    newCharacters[index] = { ...updatedCharacter, isAiExtracted: false }; // User edit overrides AI extraction flag
    setCharacters(newCharacters);
  };

  const removeCharacter = (id: string) => {
    setUserHasInteractedWithChars(true);
    setCharacters(characters.filter(char => char.id !== id));
  };

  const canProceedToCharacterDesign = storyText.trim() !== '' && (
    currentPhase === GenerationPhase.AWAITING_STORY_INPUT ||
    currentPhase === GenerationPhase.AWAITING_USER_CHARACTER_CONFIRMATION ||
    (currentPhase === GenerationPhase.IDLE && storyText.trim() !== '')
  );

  const canGenerateCharacterDesignsGlobally = characters.length > 0 &&
    characters.some(c => c.name.trim() !== '' && !c.approvedDesignUrl) &&
    (currentPhase === GenerationPhase.AWAITING_USER_CHARACTER_CONFIRMATION || currentPhase === GenerationPhase.AWAITING_CHARACTER_DESIGN_APPROVAL);

  const canGenerateStoryboard = storyText.trim() !== '' &&
    (characters.length === 0 || characters.filter(c => c.name.trim() !== '').every(c => c.approvedDesignUrl)) &&
    (currentPhase === GenerationPhase.AWAITING_CHARACTER_DESIGN_APPROVAL || currentPhase === GenerationPhase.COMPLETE || currentPhase === GenerationPhase.IDLE);

  const isLoading = currentPhase !== GenerationPhase.IDLE &&
                      currentPhase !== GenerationPhase.COMPLETE &&
                      currentPhase !== GenerationPhase.ERROR &&
                      currentPhase !== GenerationPhase.AWAITING_STORY_INPUT &&
                      currentPhase !== GenerationPhase.AWAITING_USER_CHARACTER_CONFIRMATION &&
                      currentPhase !== GenerationPhase.AWAITING_CHARACTER_DESIGN_APPROVAL;

  const isGeneratingAnyCharacterDesigns = currentPhase === GenerationPhase.GENERATING_CHARACTER_DESIGNS || characters.some(c => c.isDesignLoading);


  return (
    <div className="bg-slate-800 p-6 rounded-xl shadow-2xl space-y-6 sticky top-8 max-h-[calc(100vh-4rem)] overflow-y-auto">
      {/* Story Input Section */}
      <div className="p-4 bg-slate-700/30 rounded-lg">
        <h3 className="text-xl font-semibold text-purple-300 mb-3">1. Your Narrative</h3>
        <label htmlFor="storyText" className="block text-sm font-medium text-slate-300 mb-1">
          Paste your full story here:
        </label>
        <textarea
          id="storyText"
          value={storyText}
          onChange={(e) => setStoryText(e.target.value)}
          rows={8}
          className="w-full p-3 bg-slate-600 text-slate-100 border border-slate-500 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors shadow-sm"
          placeholder="The adventure begins..."
          disabled={isLoading}
        />
      </div>

      {/* Character Definition / Extraction Section */}
      <div className="p-4 bg-slate-700/30 rounded-lg">
        <h3 className="text-xl font-semibold text-purple-300 mb-3">2. Define or Discover Characters</h3>
        {!userHasInteractedWithChars && characters.length === 0 && (
          <button
            type="button"
            onClick={onExtractOrConfirmCharacters}
            disabled={!storyText.trim() || isLoading || currentPhase === GenerationPhase.EXTRACTING_CHARACTERS}
            className="w-full mb-3 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md shadow-md disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {currentPhase === GenerationPhase.EXTRACTING_CHARACTERS ? 'Analyzing Story for Characters...' : 'Let AI Suggest Characters from Story'}
          </button>
        )}
        <p className="text-xs text-slate-400 mb-3">
            {userHasInteractedWithChars || characters.length > 0 ? "Manually define or edit characters below." : "Alternatively, add characters manually."}
            You can define up to {MAX_CHARACTERS}.
        </p>

        {characters.map((char, index) => (
          <CharacterInput
            key={char.id}
            character={char}
            index={index}
            onChange={updateCharacter}
            onRemove={removeCharacter}
            onGenerateSingleCharacterDesign={onGenerateSingleCharacterDesign}
            onApproveDesign={onApproveCharacterDesign}
            currentPhase={currentPhase}
            isGeneratingAnyCharacterDesigns={isGeneratingAnyCharacterDesigns}
          />
        ))}
        {characters.length < MAX_CHARACTERS && (
          <button
            type="button"
            onClick={addCharacter}
            disabled={isLoading}
            className="mt-2 w-full flex items-center justify-center px-4 py-2 border border-dashed border-slate-500 text-sm font-medium rounded-md text-slate-300 hover:text-purple-300 hover:border-purple-400 transition-colors disabled:opacity-60"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Character Manually
          </button>
        )}
        {characters.length > 0 && currentPhase === GenerationPhase.AWAITING_USER_CHARACTER_CONFIRMATION && !userHasInteractedWithChars && (
             <button
                type="button"
                onClick={onExtractOrConfirmCharacters} // This effectively becomes "Confirm AI Characters"
                disabled={isLoading}
                className="mt-3 w-full px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md shadow-md disabled:opacity-60"
            >
                Confirm AI Suggested Characters (or Edit Above)
            </button>
        )}
      </div>


      {/* Character Design Generation Button */}
      {(currentPhase === GenerationPhase.AWAITING_USER_CHARACTER_CONFIRMATION || currentPhase === GenerationPhase.AWAITING_CHARACTER_DESIGN_APPROVAL) && characters.some(c => c.name.trim() !== '') && (
        <div className="p-4 bg-slate-700/30 rounded-lg">
            <h3 className="text-xl font-semibold text-purple-300 mb-3">3. Generate Character Visuals</h3>
            <button
                type="button"
                onClick={onGenerateAllCharacterDesigns}
                disabled={!canGenerateCharacterDesignsGlobally || isLoading || isGeneratingAnyCharacterDesigns}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md shadow-lg disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
                {isGeneratingAnyCharacterDesigns ? 'Generating Designs...' : `Generate All Pending Design Sheets (${characters.filter(c=>c.name.trim() && !c.approvedDesignUrl && !c.isDesignLoading).length})`}
            </button>
            <p className="text-xs text-slate-400 mt-2">Click above to generate multi-view design sheets for all defined characters, or generate individually within each character card.</p>
        </div>
      )}


      {/* Style Preferences Section */}
      <div className="p-4 bg-slate-700/30 rounded-lg">
        <h3 className="text-xl font-semibold text-purple-300 mb-3">
            {currentPhase === GenerationPhase.AWAITING_CHARACTER_DESIGN_APPROVAL && characters.length > 0 ? '4. Visual Style' : '3. Visual Style'}
        </h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="artStyle" className="block text-sm font-medium text-slate-300 mb-1">Art Style</label>
            <select
              id="artStyle"
              value={stylePreferences.artStyle}
              onChange={(e) => setStylePreferences({ ...stylePreferences, artStyle: e.target.value as ArtStyle })}
              className="w-full p-3 bg-slate-600 text-slate-100 border border-slate-500 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 shadow-sm"
              disabled={isLoading}
            >
              {AVAILABLE_ART_STYLES.map(style => (
                <option key={style} value={style}>{style}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="moodKeywords" className="block text-sm font-medium text-slate-300 mb-1">Mood/Atmosphere Keywords</label>
            <input
              type="text"
              id="moodKeywords"
              value={stylePreferences.moodKeywords}
              onChange={(e) => setStylePreferences({ ...stylePreferences, moodKeywords: e.target.value })}
              className="w-full p-3 bg-slate-600 text-slate-100 border border-slate-500 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 shadow-sm"
              placeholder="e.g., mysterious, vibrant, dark"
              disabled={isLoading}
            />
          </div>
          <div>
            <label htmlFor="referenceArtists" className="block text-sm font-medium text-slate-300 mb-1">Reference Artists (Optional)</label>
            <input
              type="text"
              id="referenceArtists"
              value={stylePreferences.referenceArtists}
              onChange={(e) => setStylePreferences({ ...stylePreferences, referenceArtists: e.target.value })}
              className="w-full p-3 bg-slate-600 text-slate-100 border border-slate-500 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 shadow-sm"
              placeholder="e.g., Studio Ghibli, Artgerm"
              disabled={isLoading}
            />
          </div>
        </div>
      </div>

      {/* Generate Storyboard Button */}
       <div className="p-4 bg-slate-700/30 rounded-lg mt-6">
         <h3 className="text-xl font-semibold text-purple-300 mb-3">
            {currentPhase === GenerationPhase.AWAITING_CHARACTER_DESIGN_APPROVAL && characters.length > 0 ? '5. Create Storyboard' : '4. Create Storyboard'}
         </h3>
        <button
            type="button"
            onClick={onGenerateVisualStory}
            disabled={!canGenerateStoryboard || isLoading}
            className="w-full px-6 py-4 bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white text-lg font-bold rounded-lg shadow-xl disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-opacity-75"
        >
            {isLoading && (currentPhase === GenerationPhase.DECONSTRUCTING_STORY || currentPhase === GenerationPhase.GENERATING_SCENE_IMAGES) ? 'Creating Storyboard...' : 'Generate Full Visual Storyboard'}
        </button>
        <p className="text-xs text-slate-400 mt-2">
            Ensure all desired character designs are approved before generating the storyboard.
            If no characters are defined, the AI will illustrate scenes based on textual descriptions only.
        </p>
      </div>
    </div>
  );
}

function PlusIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}
