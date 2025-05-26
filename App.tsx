import React, { useState, useCallback, useEffect } from 'react';
import { StoryInputForm } from './components/StoryInputForm';
import { StoryboardView } from './components/StoryboardView';
import { LoadingSpinner } from './components/LoadingSpinner';
import {
  Character,
  StylePreferences,
  Scene,
  GeminiDeconstructedStoryResponse,
  ReferenceImagePart,
  GenerationPhase,
  AiExtractedCharacterInfo
} from './types';
import {
  extractCharactersFromStory,
  generateMultiViewCharacterSheetImage,
  deconstructStoryAndCreatePrompts,
  generateSceneImageWithReferences
} from './services/geminiService';
import { DEFAULT_STYLE_PREFERENCES, MAX_CHARACTERS } from './constants';

const generateId = (): string => Math.random().toString(36).substr(2, 9);

const getBase64FromDataUrl = (dataUrl: string): string | null => {
  const match = dataUrl.match(/^data:image\/[^;]+;base64,(.+)/);
  return match ? match[1] : null;
};

function App(): React.ReactNode {
  const [storyText, setStoryText] = useState<string>('');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [stylePreferences, setStylePreferences] = useState<StylePreferences>(DEFAULT_STYLE_PREFERENCES);
  const [scenes, setScenes] = useState<Scene[]>([]);

  const [currentPhase, setCurrentPhase] = useState<GenerationPhase>(GenerationPhase.AWAITING_STORY_INPUT);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!process.env.API_KEY) {
      setError("CRITICAL: API Key is missing. Please ensure it's configured in your environment. The app will not function.");
      setCurrentPhase(GenerationPhase.ERROR);
      console.error("API_KEY environment variable is not set.");
    }
  }, []);

  const handleError = (message: string, phaseToSetOnError: GenerationPhase = GenerationPhase.ERROR) => {
    setError(message);
    setCurrentPhase(phaseToSetOnError);
    setLoadingMessage('');
  };

  const handleExtractOrConfirmCharacters = useCallback(async () => {
    if (currentPhase === GenerationPhase.ERROR || !storyText.trim()) {
      if (!storyText.trim()) setError("Please enter a story first.");
      return;
    }
    setError(null);

    // If user has already manually added characters, or AI characters are present, this acts as a confirmation/proceed step
    if (characters.length > 0) {
        setCurrentPhase(GenerationPhase.AWAITING_CHARACTER_DESIGN_APPROVAL);
        setLoadingMessage("Proceed to character design generation or approval.");
        return;
    }

    setCurrentPhase(GenerationPhase.EXTRACTING_CHARACTERS);
    setLoadingMessage('Analyzing story for key characters...');
    try {
      const extractedCharInfos = await extractCharactersFromStory(storyText);
      if (extractedCharInfos && extractedCharInfos.length > 0) {
        const newCharacters: Character[] = extractedCharInfos.slice(0, MAX_CHARACTERS).map(info => ({
          ...info,
          id: generateId(),
          isAiExtracted: true,
        }));
        setCharacters(newCharacters);
        setLoadingMessage('AI suggested characters below. Review, edit, or add more, then proceed to generate designs.');
        setCurrentPhase(GenerationPhase.AWAITING_USER_CHARACTER_CONFIRMATION);
      } else {
        setLoadingMessage('No distinct characters found by AI, or an issue occurred. Please define characters manually if desired, then generate designs.');
        setCurrentPhase(GenerationPhase.AWAITING_USER_CHARACTER_CONFIRMATION); // Still allow manual input
      }
    } catch (err: any) {
      console.error("Error extracting characters:", err);
      handleError(`Character extraction failed: ${err.message}`, GenerationPhase.AWAITING_USER_CHARACTER_CONFIRMATION);
    }
  }, [storyText, characters, currentPhase]);


  const handleGenerateAllCharacterDesigns = useCallback(async () => {
    if (currentPhase === GenerationPhase.ERROR) return;
    setError(null);
    const charsToDesign = characters.filter(c => c.name.trim() && !c.approvedDesignUrl && !c.isDesignLoading);
    if (charsToDesign.length === 0) {
      setLoadingMessage("All named characters have approved designs or no characters to design.");
      setCurrentPhase(GenerationPhase.AWAITING_CHARACTER_DESIGN_APPROVAL); // Or IDLE if no chars
      return;
    }

    setCurrentPhase(GenerationPhase.GENERATING_CHARACTER_DESIGNS);
    setLoadingMessage(`Generating ${charsToDesign.length} character design sheet(s)...`);

    // Set loading state for all characters being processed
    setCharacters(prev => prev.map(c => charsToDesign.find(ctd => ctd.id === c.id) ? { ...c, isDesignLoading: true, designError: undefined, generatedDesignUrl: undefined } : c));

    // Process one by one to manage load and provide better feedback
    for (const char of charsToDesign) {
      setLoadingMessage(`Generating design for ${char.name}...`);
      try {
        const designUrl = await generateMultiViewCharacterSheetImage(char, stylePreferences);
        setCharacters(prev => prev.map(c => c.id === char.id ? { ...c, generatedDesignUrl: designUrl, isDesignLoading: false } : c));
      } catch (err: any) {
        console.error(`Error generating design for ${char.name}:`, err);
        setCharacters(prev => prev.map(c => c.id === char.id ? { ...c, designError: err.message || 'Unknown error', isDesignLoading: false } : c));
      }
    }

    setLoadingMessage('Character designs generated. Please review and approve each.');
    setCurrentPhase(GenerationPhase.AWAITING_CHARACTER_DESIGN_APPROVAL);
  }, [characters, stylePreferences, currentPhase]);

  const handleGenerateSingleCharacterDesign = useCallback(async (characterId: string) => {
    const charToDesign = characters.find(c => c.id === characterId);
    if (!charToDesign || !charToDesign.name.trim() || charToDesign.isDesignLoading || charToDesign.approvedDesignUrl) return;

    setError(null);
    setCurrentPhase(GenerationPhase.GENERATING_CHARACTER_DESIGNS); // Global phase for loading overlay
    setLoadingMessage(`Generating design for ${charToDesign.name}...`);
    setCharacters(prev => prev.map(c => c.id === characterId ? { ...c, isDesignLoading: true, designError: undefined, generatedDesignUrl: undefined } : c));

    try {
      const designUrl = await generateMultiViewCharacterSheetImage(charToDesign, stylePreferences);
      setCharacters(prev => prev.map(c => c.id === characterId ? { ...c, generatedDesignUrl: designUrl, isDesignLoading: false } : c));
    } catch (err: any) {
      console.error(`Error generating design for ${charToDesign.name}:`, err);
      setCharacters(prev => prev.map(c => c.id === characterId ? { ...c, designError: err.message || 'Unknown error', isDesignLoading: false } : c));
    }
    // Determine if all designs are done to change global phase
    const stillLoading = characters.some(c => c.id !== characterId && c.isDesignLoading);
    if (!stillLoading) {
        setCurrentPhase(GenerationPhase.AWAITING_CHARACTER_DESIGN_APPROVAL);
        setLoadingMessage('Character design process updated. Review and approve.');
    }

  }, [characters, stylePreferences]);


  const handleApproveCharacterDesign = useCallback((characterId: string) => {
    setCharacters(prevChars => prevChars.map(c =>
      c.id === characterId && c.generatedDesignUrl
        ? { ...c, approvedDesignUrl: c.generatedDesignUrl, generatedDesignUrl: undefined, designError: undefined, isDesignLoading: false }
        : c
    ));
    // Check if all necessary characters are approved to potentially enable next steps
    // This logic might be better placed in the "Generate Visual Story" button's disabled state
  }, []);


  const handleGenerateVisualStory = useCallback(async () => {
    if (currentPhase === GenerationPhase.ERROR) return;
    if (!storyText.trim()) {
      handleError("Please enter a story.", GenerationPhase.AWAITING_STORY_INPUT);
      return;
    }
    const namedCharacters = characters.filter(c => c.name.trim());
    const unapprovedChars = namedCharacters.filter(c => !c.approvedDesignUrl);
    if (namedCharacters.length > 0 && unapprovedChars.length > 0) {
        handleError(`Please approve designs for all named characters: ${unapprovedChars.map(c=>c.name).join(', ')}`, GenerationPhase.AWAITING_CHARACTER_DESIGN_APPROVAL);
        return;
    }

    setError(null);
    setScenes([]);
    setCurrentPhase(GenerationPhase.DECONSTRUCTING_STORY);
    setLoadingMessage('Deconstructing story and planning scenes...');

    try {
      const deconstructedStoryResponse = await deconstructStoryAndCreatePrompts(storyText, characters, stylePreferences);

      if (!deconstructedStoryResponse || !deconstructedStoryResponse.scenes || deconstructedStoryResponse.scenes.length === 0) {
        handleError("Failed to deconstruct story or no scenes were found. Try a different story or adjust parameters.", GenerationPhase.AWAITING_STORY_INPUT);
        return;
      }

      const initialScenes: Scene[] = deconstructedStoryResponse.scenes.map(s => ({
        ...s,
        id: generateId(),
      }));
      setScenes(initialScenes);
      setCurrentPhase(GenerationPhase.GENERATING_SCENE_IMAGES);

      const updatedScenesWithImages: Scene[] = [];
      for (let i = 0; i < initialScenes.length; i++) {
        const scene = initialScenes[i];
        setLoadingMessage(`Generating image for scene ${i + 1} of ${initialScenes.length}: "${scene.sceneSummary.substring(0, 30)}..."`);

        const referenceImageParts: ReferenceImagePart[] = [];
        scene.charactersInScene.forEach(charNameInScene => {
          const characterDefinition = characters.find(c => c.name === charNameInScene && c.approvedDesignUrl);
          if (characterDefinition && characterDefinition.approvedDesignUrl) {
            const base64Data = getBase64FromDataUrl(characterDefinition.approvedDesignUrl);
            if (base64Data) {
                let mimeType = "image/jpeg"; // Default
                const mimeMatch = characterDefinition.approvedDesignUrl.match(/^data:(image\/[^;]+);base64,/);
                if (mimeMatch && mimeMatch[1]) mimeType = mimeMatch[1];
                referenceImageParts.push({ inlineData: { mimeType: mimeType, data: base64Data } });
            }
          }
        });

        try {
          const imageUrl = await generateSceneImageWithReferences(scene.imagePrompt, referenceImageParts);
          updatedScenesWithImages.push({ ...scene, imageUrl });
        } catch (imgError: any) {
          console.error(`Failed to generate image for scene: ${scene.sceneSummary}`, imgError);
          updatedScenesWithImages.push({ ...scene, imageUrl: undefined, imageError: `Failed to generate image: ${imgError.message || 'Unknown error'}` });
        }
        // Update scenes progressively in UI
         setScenes(prevScenes => {
            const currentSceneIndex = prevScenes.findIndex(s => s.id === scene.id);
            if (currentSceneIndex !== -1) {
                const newScenes = [...prevScenes];
                newScenes[currentSceneIndex] = updatedScenesWithImages.find(us => us.id === scene.id) || newScenes[currentSceneIndex];
                return newScenes;
            }
            return prevScenes;
        });
      }
      setScenes(updatedScenesWithImages); // Final update
      setCurrentPhase(GenerationPhase.COMPLETE);
      setLoadingMessage('Storyboard generation complete!');

    } catch (err: any) {
      console.error("Error generating visual story:", err);
      handleError(`Storyboard generation failed: ${err.message}`);
    }
  }, [storyText, characters, stylePreferences, currentPhase]);

  const isLoadingActivePhase = [
    GenerationPhase.EXTRACTING_CHARACTERS,
    GenerationPhase.GENERATING_CHARACTER_DESIGNS,
    GenerationPhase.DECONSTRUCTING_STORY,
    GenerationPhase.GENERATING_SCENE_IMAGES
  ].includes(currentPhase);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-purple-900 text-slate-100 p-4 md:p-8 flex flex-col items-center font-sans">
      {isLoadingActivePhase && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center z-50 p-4">
          <LoadingSpinner />
          <p className="text-xl text-white mt-6 text-center">{loadingMessage}</p>
        </div>
      )}

      <header className="w-full max-w-6xl mb-10 text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-orange-400 mb-3 tracking-tight" style={{ fontFamily: "'Lora', serif" }}>
          Narrative Illustrator AI
        </h1>
        <p className="text-slate-300 text-lg md:text-xl max-w-3xl mx-auto">
          Craft your story, define or discover characters, approve their visual style, and watch your narrative come to life with AI-generated illustrations.
        </p>
      </header>

      <main className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-5 xl:col-span-4"> {/* Input Form Column */}
          <StoryInputForm
            storyText={storyText}
            setStoryText={setStoryText}
            characters={characters}
            setCharacters={setCharacters}
            stylePreferences={stylePreferences}
            setStylePreferences={setStylePreferences}
            onExtractOrConfirmCharacters={handleExtractOrConfirmCharacters}
            onGenerateAllCharacterDesigns={handleGenerateAllCharacterDesigns}
            onGenerateSingleCharacterDesign={handleGenerateSingleCharacterDesign}
            onApproveCharacterDesign={handleApproveCharacterDesign}
            onGenerateVisualStory={handleGenerateVisualStory}
            currentPhase={currentPhase}
          />
        </div>
        <div className="lg:col-span-7 xl:col-span-8"> {/* Storyboard View Column */}
          {error && currentPhase === GenerationPhase.ERROR && (
            <div className="bg-red-800/70 border border-red-600 text-red-100 p-4 rounded-lg mb-6 shadow-lg" role="alert">
              <strong className="font-bold block text-lg mb-1">An Error Occurred:</strong>
              <span className="block">{error}</span>
            </div>
          )}
          {currentPhase === GenerationPhase.AWAITING_CHARACTER_DESIGN_APPROVAL && characters.some(c => c.name.trim() && c.generatedDesignUrl && !c.approvedDesignUrl) &&
            !isLoadingActivePhase && (
            <div className="bg-yellow-700/70 border border-yellow-500 text-yellow-100 p-4 rounded-lg mb-6 shadow-lg text-center">
              <h4 className="font-semibold text-lg">Action Required</h4>
              <p>Please review and approve character designs in the form on the left before generating the storyboard.</p>
            </div>
          )}
          {currentPhase === GenerationPhase.COMPLETE && scenes.length > 0 && !isLoadingActivePhase && (
            <div className="bg-green-700/70 border border-green-500 text-green-100 p-4 rounded-lg mb-6 shadow-lg text-center">
              <h4 className="font-semibold text-lg">Storyboard Generation Complete!</h4>
              <p>Scroll down to see your visually illustrated scenes.</p>
            </div>
          )}
          <StoryboardView scenes={scenes} currentPhase={currentPhase} />
        </div>
      </main>
      <footer className="w-full max-w-6xl mt-16 pt-8 border-t border-slate-700 text-center text-slate-400 text-sm">
        <p>Powered by Google Gemini AI. Ensure your API_KEY is configured.</p>
        <p>&copy; {new Date().getFullYear()} Narrative Illustrator AI. Visualizing worlds, one prompt at a time.</p>
      </footer>
    </div>
  );
}

export default App;
