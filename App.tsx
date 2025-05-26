import React, { useState, useCallback, useEffect } from 'react';
import { StoryInputForm } from './components/StoryInputForm';
import { StoryboardView } from './components/StoryboardView';
import { LoadingSpinner } from './components/LoadingSpinner';
import { Character, StylePreferences, Scene, GeminiDeconstructedStoryResponse, ReferenceImagePart, GenerationPhase } from './types';
import {
  deconstructStoryAndCreatePrompts,
  generateCharacterSheetImage,
  generateSceneImageWithReferences
} from './services/geminiService';
import { DEFAULT_STYLE_PREFERENCES } from './constants';

const generateId = (): string => Math.random().toString(36).substr(2, 9);

// Helper to extract base64 data from data URL
const getBase64FromDataUrl = (dataUrl: string): string | null => {
  const match = dataUrl.match(/^data:image\/[^;]+;base64,(.+)/);
  return match ? match[1] : null;
};


function App(): React.ReactNode {
  const [storyText, setStoryText] = useState<string>('');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [stylePreferences, setStylePreferences] = useState<StylePreferences>(DEFAULT_STYLE_PREFERENCES);
  const [scenes, setScenes] = useState<Scene[]>([]);

  const [currentPhase, setCurrentPhase] = useState<GenerationPhase>(GenerationPhase.IDLE);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // API Key Check (moved to useEffect for cleaner render)
  useEffect(() => {
    if (!process.env.API_KEY) {
      setError("CRITICAL: API Key is missing. Please ensure it's configured in your environment. The app will not function.");
      setCurrentPhase(GenerationPhase.ERROR);
      console.error("API_KEY environment variable is not set.");
    }
  }, []);

  const handleGenerateCharacterDesigns = useCallback(async () => {
    if (currentPhase === GenerationPhase.ERROR) return;
    setError(null);
    setCurrentPhase(GenerationPhase.GENERATING_CHARACTER_DESIGNS);
    setLoadingMessage('Generating character designs...');

    const charactersToProcess = characters.filter(c => c.name.trim() !== '' && !c.approvedDesignUrl);
    if (charactersToProcess.length === 0) {
      setLoadingMessage('All named characters already have approved designs or no characters defined to design.');
      setCurrentPhase(GenerationPhase.AWAITING_CHARACTER_APPROVAL); // Or IDLE if none to approve
      return;
    }

    const designPromises = charactersToProcess.map(async (char) => {
      setCharacters(prev => prev.map(c => c.id === char.id ? { ...c, isDesignLoading: true, designError: undefined, generatedDesignUrl: undefined } : c));
      try {
        const designUrl = await generateCharacterSheetImage(char, stylePreferences);
        setCharacters(prev => prev.map(c => c.id === char.id ? { ...c, generatedDesignUrl: designUrl, isDesignLoading: false } : c));
      } catch (err: any) {
        console.error(`Error generating design for ${char.name}:`, err);
        setCharacters(prev => prev.map(c => c.id === char.id ? { ...c, designError: err.message || 'Unknown error', isDesignLoading: false } : c));
      }
    });

    await Promise.all(designPromises);
    setLoadingMessage('Character designs generated. Please review and approve.');
    setCurrentPhase(GenerationPhase.AWAITING_CHARACTER_APPROVAL);

  }, [characters, stylePreferences, currentPhase]);


  const handleGenerateVisualStory = useCallback(async () => {
    if (currentPhase === GenerationPhase.ERROR) return;
    if (!storyText.trim()) {
      setError("Please enter a story.");
      return;
    }
    const unapprovedChars = characters.filter(c => c.name.trim() !== '' && c.generatedDesignUrl && !c.approvedDesignUrl);
    if (unapprovedChars.length > 0) {
        setError(`Please approve or regenerate designs for all characters: ${unapprovedChars.map(c=>c.name).join(', ')}`);
        setCurrentPhase(GenerationPhase.AWAITING_CHARACTER_APPROVAL);
        return;
    }

    setError(null);
    setScenes([]);
    setCurrentPhase(GenerationPhase.DECONSTRUCTING_STORY);
    setLoadingMessage('Deconstructing story and planning scenes...');

    try {
      const deconstructedStoryResponse: GeminiDeconstructedStoryResponse | null = await deconstructStoryAndCreatePrompts(storyText, characters, stylePreferences);

      if (!deconstructedStoryResponse || !deconstructedStoryResponse.scenes || deconstructedStoryResponse.scenes.length === 0) {
        setError("Failed to deconstruct story or no scenes were found. Try a different story or adjust parameters.");
        setCurrentPhase(GenerationPhase.IDLE);
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
                // Determine mimeType from data URL, default to jpeg if not obvious
                let mimeType = "image/jpeg";
                const mimeMatch = characterDefinition.approvedDesignUrl.match(/^data:(image\/[^;]+);base64,/);
                if (mimeMatch && mimeMatch[1]) {
                    mimeType = mimeMatch[1];
                }
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
        // Update scenes progressively
        setScenes(prevScenes => {
            const currentSceneIndex = prevScenes.findIndex(s => s.id === scene.id);
            if (currentSceneIndex !== -1) {
                const newScenes = [...prevScenes];
                newScenes[currentSceneIndex] = updatedScenesWithImages.find(us => us.id === scene.id) || newScenes[currentSceneIndex];
                return newScenes;
            }
            return prevScenes; // Should not happen if initialScenes was set correctly
        });
      }
      setScenes(updatedScenesWithImages); // Final comprehensive update
      setCurrentPhase(GenerationPhase.COMPLETE);
      setLoadingMessage('Storyboard generation complete!');

    } catch (err: any) {
      console.error("Error generating visual story:", err);
      setError(`An error occurred: ${err.message || 'Unknown error'}`);
      setCurrentPhase(GenerationPhase.ERROR);
    } finally {
      if (currentPhase !== GenerationPhase.ERROR && currentPhase !== GenerationPhase.COMPLETE) {
        setCurrentPhase(GenerationPhase.IDLE); // Reset phase if not an error or completion
      }
      if (currentPhase !== GenerationPhase.GENERATING_CHARACTER_DESIGNS && currentPhase !== GenerationPhase.AWAITING_CHARACTER_APPROVAL) {
        setLoadingMessage('');
      }
    }
  }, [storyText, characters, stylePreferences, currentPhase]);

  const isLoading = [
    GenerationPhase.GENERATING_CHARACTER_DESIGNS,
    GenerationPhase.DECONSTRUCTING_STORY,
    GenerationPhase.GENERATING_SCENE_IMAGES
  ].includes(currentPhase);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-slate-100 p-4 md:p-8 flex flex-col items-center">
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex flex-col items-center justify-center z-50">
          <LoadingSpinner />
          <p className="text-xl text-white mt-4">{loadingMessage}</p>
        </div>
      )}

      <header className="w-full max-w-6xl mb-8 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 mb-2" style={{ fontFamily: "'Lora', serif" }}>
          Narrative Illustrator AI
        </h1>
        <p className="text-slate-400 text-lg">Turn your stories into visual masterpieces. Define characters, approve their look, then see your scenes unfold!</p>
      </header>

      <main className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-12 gap-8">
        <div className="md:col-span-4">
          <StoryInputForm
            storyText={storyText}
            setStoryText={setStoryText}
            characters={characters}
            setCharacters={setCharacters}
            stylePreferences={stylePreferences}
            setStylePreferences={setStylePreferences}
            onGenerateCharacterDesigns={handleGenerateCharacterDesigns}
            onGenerateVisualStory={handleGenerateVisualStory}
            currentPhase={currentPhase}
            isLoading={isLoading}
          />
        </div>
        <div className="md:col-span-8">
          {error && (
            <div className="bg-red-700 border border-red-900 text-white p-4 rounded-md mb-6" role="alert">
              <strong className="font-bold">Error:</strong>
              <span className="block sm:inline ml-2">{error}</span>
            </div>
          )}
          {currentPhase === GenerationPhase.COMPLETE && scenes.length > 0 &&
            <div className="bg-green-700 border border-green-900 text-white p-3 rounded-md mb-4 text-center">
              Storyboard Generation Complete!
            </div>
          }
           {currentPhase === GenerationPhase.AWAITING_CHARACTER_APPROVAL && characters.some(c => c.name.trim() && c.generatedDesignUrl && !c.approvedDesignUrl) &&
            <div className="bg-yellow-600 border border-yellow-800 text-white p-3 rounded-md mb-4 text-center">
              Please review and approve character designs in the form on the left before generating the storyboard.
            </div>
          }
          <StoryboardView scenes={scenes} />
        </div>
      </main>
      <footer className="w-full max-w-6xl mt-12 text-center text-slate-500 text-sm">
        <p>Powered by Gemini AI. Ensure your API_KEY is configured.</p>
        <p>&copy; {new Date().getFullYear()} Narrative Illustrator AI</p>
      </footer>
    </div>
  );
}

export default App;
