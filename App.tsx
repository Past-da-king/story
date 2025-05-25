
import React, { useState, useCallback } from 'react';
import { StoryInputForm } from './components/StoryInputForm';
import { StoryboardView } from './components/StoryboardView';
import { LoadingSpinner } from './components/LoadingSpinner';
import { Character, StylePreferences, Scene, DeconstructedStory, GeminiDeconstructedStoryResponse } from './types';
import { deconstructStoryAndCreatePrompts, generateImageForScene } from './services/geminiService';
import { DEFAULT_STYLE_PREFERENCES } from './constants';

// Helper to generate unique IDs
const generateId = (): string => Math.random().toString(36).substr(2, 9);

function App(): React.ReactNode {
  const [storyText, setStoryText] = useState<string>('');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [stylePreferences, setStylePreferences] = useState<StylePreferences>(DEFAULT_STYLE_PREFERENCES);
  const [scenes, setScenes] = useState<Scene[]>([]);
  
  const [isLoadingStory, setIsLoadingStory] = useState<boolean>(false);
  const [isLoadingImages, setIsLoadingImages] = useState<boolean>(false);
  const [currentImageLoadingMessage, setCurrentImageLoadingMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const handleGenerateVisualStory = useCallback(async () => {
    if (!storyText.trim()) {
      setError("Please enter a story.");
      return;
    }
    if (!process.env.API_KEY) {
      setError("API Key is missing. Please ensure it's configured in your environment.");
      // In a real app, this would be handled more gracefully, but per instructions, we assume it's set.
      // This check is more for developer awareness.
      console.error("API_KEY environment variable is not set.");
      return;
    }

    setError(null);
    setScenes([]); // Clear previous scenes
    setIsLoadingStory(true);
    setCurrentImageLoadingMessage('Deconstructing story and planning scenes...');

    try {
      const deconstructedStoryResponse: GeminiDeconstructedStoryResponse | null = await deconstructStoryAndCreatePrompts(storyText, characters, stylePreferences);
      
      if (!deconstructedStoryResponse || !deconstructedStoryResponse.scenes || deconstructedStoryResponse.scenes.length === 0) {
        setError("Failed to deconstruct story or no scenes were found. Try a different story or adjust parameters.");
        setIsLoadingStory(false);
        return;
      }
      
      const initialScenes: Scene[] = deconstructedStoryResponse.scenes.map(s => ({
        ...s,
        id: generateId(),
      }));
      setScenes(initialScenes);
      setIsLoadingStory(false);
      setIsLoadingImages(true);

      const updatedScenesWithImages: Scene[] = [];
      for (let i = 0; i < initialScenes.length; i++) {
        const scene = initialScenes[i];
        setCurrentImageLoadingMessage(`Generating image for scene ${i + 1} of ${initialScenes.length}: "${scene.sceneSummary.substring(0,30)}..."`);
        try {
          const imageUrl = await generateImageForScene(scene.imagePrompt);
          updatedScenesWithImages.push({ ...scene, imageUrl });
        } catch (imgError: any) {
          console.error(`Failed to generate image for scene: ${scene.sceneSummary}`, imgError);
          updatedScenesWithImages.push({ ...scene, imageUrl: undefined, imageError: `Failed to generate image: ${imgError.message || 'Unknown error'}` });
        }
        setScenes([...updatedScenesWithImages, ...initialScenes.slice(i + 1)]); // Update scenes progressively
      }
      // Final update to ensure all scenes (with or without images) are set
      setScenes(updatedScenesWithImages);

    } catch (err: any) {
      console.error("Error generating visual story:", err);
      setError(`An error occurred: ${err.message || 'Unknown error'}`);
      setIsLoadingStory(false);
    } finally {
      setIsLoadingImages(false);
      setCurrentImageLoadingMessage('');
    }
  }, [storyText, characters, stylePreferences]);

  const showLoadingOverlay = isLoadingStory || isLoadingImages;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-slate-100 p-4 md:p-8 flex flex-col items-center">
      {showLoadingOverlay && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex flex-col items-center justify-center z-50">
          <LoadingSpinner />
          <p className="text-xl text-white mt-4">{currentImageLoadingMessage || (isLoadingStory ? 'Analyzing your story...' : 'Generating images...')}</p>
        </div>
      )}

      <header className="w-full max-w-6xl mb-8 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 mb-2" style={{fontFamily: "'Lora', serif"}}>
          Narrative Illustrator AI
        </h1>
        <p className="text-slate-400 text-lg">Turn your stories into visual masterpieces.</p>
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
            onSubmit={handleGenerateVisualStory}
            isLoading={isLoadingStory || isLoadingImages}
          />
        </div>
        <div className="md:col-span-8">
          {error && (
            <div className="bg-red-700 border border-red-900 text-white p-4 rounded-md mb-6" role="alert">
              <strong className="font-bold">Error:</strong>
              <span className="block sm:inline ml-2">{error}</span>
            </div>
          )}
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
