import React from 'react';
import { Character } from '../types';
import { CharacterDesignReviewCard } from './CharacterDesignReviewCard';

interface CharacterDesignReviewPageProps {
  characters: Character[];
  onRegenerateDesign: (characterId: string) => void;
  onApproveDesign: (characterId: string) => void;
  onContinue: () => void;
  onBack: () => void;
  isLoading: boolean; // Global loading state
  onGenerateMissingDesigns: () => void; // To generate sheets for those not yet attempted
}

export function CharacterDesignReviewPage({
  characters,
  onRegenerateDesign,
  onApproveDesign,
  onContinue,
  onBack,
  isLoading,
  onGenerateMissingDesigns
}: CharacterDesignReviewPageProps): React.ReactNode {
  const namedCharacters = characters.filter(c => c.name && c.name.trim() !== '');
  const allNamedApproved = namedCharacters.length > 0 && namedCharacters.every(c => c.approvedDesignImageUrl);
  const hasMissingDesigns = namedCharacters.some(c => !c.generatedDesignImageUrl && !c.approvedDesignImageUrl && !c.isDesignLoading && !c.designError);

  return (
    <div className="w-full max-w-5xl mx-auto p-6 md:p-8">
      <h2 className="text-3xl md:text-4xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-500 mb-8" style={{ fontFamily: "'Lora', serif" }}>
        Review Character Designs
      </h2>

      {namedCharacters.length === 0 && (
        <p className="text-center text-slate-300 mb-6">No characters defined to review. Please go back and define characters first.</p>
      )}

      {hasMissingDesigns && (
         <button
            onClick={onGenerateMissingDesigns}
            disabled={isLoading}
            className="w-full mb-8 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md disabled:opacity-60 transition-colors"
        >
            {isLoading ? 'Generating...' : `Generate Missing Design Sheets (${namedCharacters.filter(c => !c.generatedDesignImageUrl && !c.approvedDesignImageUrl).length})`}
        </button>
      )}


      {namedCharacters.map(character => (
        <CharacterDesignReviewCard
          key={character.id}
          character={character}
          onRegenerate={onRegenerateDesign}
          onApprove={onApproveDesign}
          isLoadingGlobal={isLoading}
        />
      ))}

      <div className="mt-10 flex flex-col sm:flex-row justify-between gap-4">
        <button
          onClick={onBack}
          className="px-8 py-3 bg-slate-600 hover:bg-slate-500 text-white font-semibold rounded-lg shadow-md transition-colors"
        >
          Back to Preferences
        </button>
        <button
          onClick={onContinue}
          disabled={isLoading || !allNamedApproved && namedCharacters.length > 0}
          className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-sky-600 hover:from-cyan-600 hover:to-sky-700 text-white font-semibold rounded-lg shadow-lg disabled:opacity-60 transition-colors"
        >
          {isLoading ? 'Processing...' : 'Continue to Storyboard Generation'}
        </button>
      </div>
       {namedCharacters.length > 0 && !allNamedApproved && (
        <p className="text-center text-yellow-400 mt-4 text-sm">
          Please approve designs for all named characters before proceeding.
        </p>
      )}
    </div>
  );
}
