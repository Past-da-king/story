import React, { useState, useCallback, useEffect } from 'react';
import {
  Character, StylePreferences, Scene, ReferenceImagePart, AppView, OperationStatus
  // AiExtractedCharacterInfo is used in the function signature of extractCharactersFromStory,
  // but not directly as a type for state or props within App.tsx itself.
  // If it were used directly for a state, for instance, it would be needed here.
  // For now, its usage is encapsulated within the service call.
} from './types';
import {
  extractCharactersFromStory,
  generateMultiViewCharacterSheetImage,
  deconstructStoryAndCreatePrompts,
  generateSceneImageWithReferences
} from './services/geminiService';
import { DEFAULT_STYLE_PREFERENCES, MAX_CHARACTERS } from './constants';

// Import new Page Components
import { WelcomePage } from './components/WelcomePage';
import { StoryInputPage } from './components/StoryInputPage';
import { CharacterDefinitionPage } from './components/CharacterDefinitionPage';
import { GlobalPreferencesPage } from './components/GlobalPreferencesPage';
import { CharacterDesignReviewPage } from './components/CharacterDesignReviewPage';
import { StoryboardViewPage } from './components/StoryboardViewPage';
import { LoadingSpinner } from './components/LoadingSpinner';

const generateId = (): string => Math.random().toString(36).substr(2, 9);
const getBase64FromDataUrl = (dataUrl: string): string | null => {
  const match = dataUrl.match(/^data:image\/[^;]+;base64,(.+)/);
  return match ? match[1] : null;
};

function App(): React.ReactNode {
  const [currentView, setCurrentView] = useState<AppView>('welcome');
  const [storyText, setStoryText] = useState<string>('');
  const [storyTitle, _setStoryTitle] = useState<string>('My Illustrated Story'); // _setStoryTitle to indicate it's not directly used yet
  const [characters, setCharacters] = useState<Character[]>([]);
  const [stylePreferences, setStylePreferences] = useState<StylePreferences>(DEFAULT_STYLE_PREFERENCES);
  const [scenes, setScenes] = useState<Scene[]>([]);

  const [operationStatus, setOperationStatus] = useState<OperationStatus>(OperationStatus.IDLE);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [globalError, setGlobalError] = useState<string | null>(null);

  useEffect(() => {
    if (!process.env.API_KEY) {
      setGlobalError("CRITICAL: API Key is missing. App will not function.");
      setOperationStatus(OperationStatus.ERROR);
    }
  }, []);

  const resetToWelcome = () => {
    setStoryText('');
    setCharacters([]);
    setScenes([]);
    setStylePreferences(DEFAULT_STYLE_PREFERENCES);
    setGlobalError(null);
    setOperationStatus(OperationStatus.IDLE);
    setLoadingMessage('');
    setCurrentView('welcome');
  };

  const handleError = (message: string) => {
    setGlobalError(message);
    setOperationStatus(OperationStatus.ERROR);
    setLoadingMessage('');
  };

  // --- Workflow Step Handlers ---
  const handleStartCreating = () => setCurrentView('storyInput');

  const handleStorySubmitted = async () => {
    if (operationStatus === OperationStatus.ERROR && globalError?.includes("API Key")) {
        handleError("API Key is missing. Cannot proceed.");
        return;
    }
    if (!storyText.trim()) {
      setGlobalError("Please enter a story first.");
      setOperationStatus(OperationStatus.IDLE);
      return;
    }

    setGlobalError(null);
    setOperationStatus(OperationStatus.LOADING);
    setLoadingMessage('Analyzing story for characters...');

    try {
      const extracted = await extractCharactersFromStory(storyText);
      if (extracted && extracted.length > 0) {
        setCharacters(extracted.slice(0, MAX_CHARACTERS).map((ec): Character => ({ // Added explicit return type Character
          ...ec,
          id: generateId(),
          isAiExtracted: true,
          // Initialize other optional fields from Character interface if needed
          description: ec.description || '',
          gender: ec.gender || '',
          age: ec.age || '',
          hairColor: ec.hairColor || '',
          eyeColor: ec.eyeColor || '',
          build: ec.build || '',
          personalityTraits: ec.personalityTraits || '',
          clothingStyle: ec.clothingStyle || '',
          distinguishingFeatures: ec.distinguishingFeatures || '',
          habitsMannerisms: ec.habitsMannerisms || '',
        })));
      } else {
        setCharacters([]);
      }
      setCurrentView('characterDefinition');
      setOperationStatus(OperationStatus.IDLE);
      setLoadingMessage('');
    } catch (e: any) {
      handleError(`Failed to extract characters: ${e.message}`);
    }
  };

  const handleCharactersDefined = () => setCurrentView('globalPreferences');
  const handlePreferencesSet = () => {
    if (operationStatus === OperationStatus.ERROR && globalError?.includes("API Key")) return;
    setGlobalError(null);
    setOperationStatus(OperationStatus.IDLE);
    const namedChars = characters.filter((c: Character) => c.name && c.name.trim() !== '');
    if (namedChars.length > 0) {
        setCurrentView('characterDesignReview');
        const charsNeedingDesign = namedChars.filter((c: Character) => !c.generatedDesignImageUrl && !c.approvedDesignImageUrl);
        if(charsNeedingDesign.length > 0) handleGenerateAllCharacterDesigns(charsNeedingDesign);
    } else {
        handleGenerateStoryboard();
    }
  };

  const handleGenerateAllCharacterDesigns = useCallback(async (charsToDesignOverride?: Character[]) => {
    if (operationStatus === OperationStatus.ERROR && globalError?.includes("API Key")) return;
    const charsToDesign = charsToDesignOverride || characters.filter((c: Character) => c.name.trim() && !c.approvedDesignImageUrl && !c.isDesignLoading);
    if (charsToDesign.length === 0) {
        setLoadingMessage("No characters need design generation at this time.");
        return;
    }

    setGlobalError(null);
    setOperationStatus(OperationStatus.LOADING);
    setLoadingMessage(`Generating ${charsToDesign.length} character design sheet(s)...`);
    setCharacters(prev => prev.map((c: Character) => charsToDesign.find((ctd: Character) => ctd.id === c.id) ? { ...c, isDesignLoading: true, designError: undefined, generatedDesignImageUrl: undefined } : c));

    for (const char of charsToDesign) {
      if(!char.name.trim()) continue;
      setLoadingMessage(`Generating design for ${char.name}...`);
      try {
        const designUrl = await generateMultiViewCharacterSheetImage(char, stylePreferences);
        setCharacters(prev => prev.map((c: Character) => c.id === char.id ? { ...c, generatedDesignImageUrl: designUrl, isDesignLoading: false } : c));
      } catch (err: any) {
        setCharacters(prev => prev.map((c: Character) => c.id === char.id ? { ...c, designError: err.message || 'Unknown error', isDesignLoading: false } : c));
      }
    }
    setOperationStatus(OperationStatus.IDLE);
    setLoadingMessage('Character designs updated. Please review.');
  }, [characters, stylePreferences, operationStatus, globalError]);


  const handleRegenerateSingleCharacterDesign = useCallback(async (characterId: string) => {
    if (operationStatus === OperationStatus.ERROR && globalError?.includes("API Key")) return;
    const charToDesign = characters.find((c: Character) => c.id === characterId);
    if (!charToDesign || !charToDesign.name.trim()) return;

    setGlobalError(null);
    setOperationStatus(OperationStatus.LOADING);
    setLoadingMessage(`Regenerating design for ${charToDesign.name}...`);
    setCharacters(prev => prev.map((c: Character) => c.id === characterId ? { ...c, isDesignLoading: true, designError: undefined, generatedDesignImageUrl: undefined, approvedDesignImageUrl: undefined } : c));
    try {
      const designUrl = await generateMultiViewCharacterSheetImage(charToDesign, stylePreferences);
      setCharacters(prev => prev.map((c: Character) => c.id === characterId ? { ...c, generatedDesignImageUrl: designUrl, isDesignLoading: false } : c));
    } catch (err: any) {
      setCharacters(prev => prev.map((c: Character) => c.id === characterId ? { ...c, designError: err.message || 'Unknown error', isDesignLoading: false } : c));
    } finally {
      setOperationStatus(OperationStatus.IDLE);
      setLoadingMessage('Character design updated.');
    }
  }, [characters, stylePreferences, operationStatus, globalError]);

  const handleApproveCharacterDesign = useCallback((characterId: string) => {
    setCharacters((prevChars: Character[]) => prevChars.map((c: Character) =>
      c.id === characterId && c.generatedDesignImageUrl
        ? { ...c, approvedDesignImageUrl: c.generatedDesignImageUrl, generatedDesignImageUrl: undefined, designError: undefined, isDesignLoading: false }
        : c
    ));
  }, []);

  const handleGenerateStoryboard = useCallback(async () => {
    if (operationStatus === OperationStatus.ERROR && globalError?.includes("API Key")) return;
    const namedCharacters = characters.filter((c: Character) => c.name && c.name.trim() !== '');
    if (namedCharacters.length > 0 && namedCharacters.some((c: Character) => !c.approvedDesignImageUrl)) {
      setGlobalError("Please approve all named character designs before generating the storyboard.");
      setOperationStatus(OperationStatus.IDLE);
      setCurrentView('characterDesignReview');
      return;
    }

    setGlobalError(null);
    setOperationStatus(OperationStatus.LOADING);
    setLoadingMessage('Deconstructing story...');
    setScenes([]);

    try {
      const deconstructed = await deconstructStoryAndCreatePrompts(storyText, characters, stylePreferences);
      if (!deconstructed || deconstructed.scenes.length === 0) {
        handleError("Failed to deconstruct story or no scenes found.");
        setCurrentView('characterDesignReview');
        return;
      }
      const initialScenes: Scene[] = deconstructed.scenes.map(s => ({ ...s, id: generateId() }));
      setScenes(initialScenes);
      setCurrentView('storyboardDisplay');
      setLoadingMessage('Generating scene images...');

      const updatedScenes: Scene[] = [];
      for (let i = 0; i < initialScenes.length; i++) {
        const scene = initialScenes[i];
        setLoadingMessage(`Generating image ${i + 1}/${initialScenes.length}: "${scene.sceneSummary.substring(0, 25)}..."`);
        const refImgParts: ReferenceImagePart[] = [];
        scene.charactersInScene.forEach(name => {
          const charDef = characters.find((c: Character) => c.name === name && c.approvedDesignImageUrl);
          if (charDef?.approvedDesignImageUrl) {
            const base64 = getBase64FromDataUrl(charDef.approvedDesignImageUrl);
            const mimeMatch = charDef.approvedDesignImageUrl.match(/^data:(image\/[^;]+);base64,/);
            if (base64 && mimeMatch && mimeMatch[1]) {
              refImgParts.push({ inlineData: { mimeType: mimeMatch[1], data: base64 } });
            }
          }
        });
        try {
          const imgUrl = await generateSceneImageWithReferences(scene.imagePrompt, stylePreferences, refImgParts);
          updatedScenes.push({ ...scene, imageUrl: imgUrl });
        } catch (e: any) {
          updatedScenes.push({ ...scene, imageError: e.message || 'Image generation failed' });
        }
        setScenes((prev: Scene[]) => { // Explicitly type prev
            const newScenes = [...prev];
            const sceneIndex = newScenes.findIndex(s => s.id === scene.id);
            if (sceneIndex !== -1) {
                newScenes[sceneIndex] = updatedScenes.find(us => us.id === scene.id) || newScenes[sceneIndex];
            }
            return newScenes;
        });
      }
      setOperationStatus(OperationStatus.SUCCESS);
      setLoadingMessage('Storyboard complete!');
    } catch (e: any) {
      handleError(`Storyboard generation failed: ${e.message}`);
      setCurrentView('storyboardDisplay');
    }
  }, [storyText, characters, stylePreferences, operationStatus, globalError]);


  const renderCurrentView = () => {
    const allowInteraction = !(operationStatus === OperationStatus.ERROR && globalError?.includes("API Key"));

    switch (currentView) {
      case 'storyInput':
        return <StoryInputPage storyText={storyText} setStoryText={setStoryText} onContinue={handleStorySubmitted} isLoading={operationStatus === OperationStatus.LOADING && allowInteraction} />;
      case 'characterDefinition':
        return <CharacterDefinitionPage characters={characters} setCharacters={setCharacters} onContinue={handleCharactersDefined} onBack={() => setCurrentView('storyInput')} onExtractCharactersFromStory={handleStorySubmitted} isLoading={operationStatus === OperationStatus.LOADING && allowInteraction} aiSuggestionsExist={characters.some((c: Character) => c.isAiExtracted)} />;
      case 'globalPreferences':
        return <GlobalPreferencesPage preferences={stylePreferences} setPreferences={setStylePreferences} onContinue={handlePreferencesSet} onBack={() => setCurrentView('characterDefinition')} isLoading={operationStatus === OperationStatus.LOADING && allowInteraction} />;
      case 'characterDesignReview':
        return <CharacterDesignReviewPage characters={characters} onRegenerateDesign={handleRegenerateSingleCharacterDesign} onApproveDesign={handleApproveCharacterDesign} onContinue={handleGenerateStoryboard} onBack={() => setCurrentView('globalPreferences')} isLoading={operationStatus === OperationStatus.LOADING && allowInteraction} onGenerateMissingDesigns={() => handleGenerateAllCharacterDesigns()} />;
      case 'storyboardDisplay':
        return <StoryboardViewPage scenes={scenes} storyTitle={storyTitle} isLoading={operationStatus === OperationStatus.LOADING && allowInteraction} onRestart={resetToWelcome} />;
      case 'welcome':
      default:
        return <WelcomePage onStartCreating={handleStartCreating} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-purple-900 text-slate-100 flex flex-col font-sans">
        <header className="py-4 px-6 md:px-8 bg-slate-900/80 backdrop-blur-md shadow-lg sticky top-0 z-40">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
                <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500" style={{ fontFamily: "'Lora', serif" }}>
                    StoryCraft AI
                </h1>
                <nav className="space-x-4 md:space-x-6">
                    {currentView !== 'welcome' && <button onClick={resetToWelcome} className="text-slate-300 hover:text-purple-300 transition-colors text-sm">New Story</button>}
                </nav>
            </div>
        </header>

        {operationStatus === OperationStatus.LOADING && (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex flex-col items-center justify-center z-50 p-4">
            <LoadingSpinner />
            <p className="text-xl text-white mt-6 text-center">{loadingMessage}</p>
            </div>
        )}
        {globalError && (
             <div className="fixed top-20 left-1/2 -translate-x-1/2 w-11/12 max-w-md bg-red-600 border border-red-700 text-white p-4 rounded-lg shadow-xl z-[60]">
                <div className="flex items-center justify-between">
                    <strong className="font-semibold">Error:</strong>
                    <button onClick={() => { setGlobalError(null); if(operationStatus === OperationStatus.ERROR && !globalError?.includes("API Key")) setOperationStatus(OperationStatus.IDLE);}} className="text-red-200 hover:text-white text-2xl leading-none">×</button>
                </div>
                <p className="mt-1 text-sm">{globalError}</p>
            </div>
        )}

        <main className="flex-grow w-full container mx-auto px-4 py-8 md:py-12">
            {renderCurrentView()}
        </main>

        <footer className="w-full py-6 text-center text-slate-400 text-xs border-t border-slate-700 bg-slate-900">
            © {new Date().getFullYear()} StoryCraft AI. All rights reserved.
        </footer>
    </div>
  );
}

export default App;