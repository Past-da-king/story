
## types.ts

```typescript
export interface Character {
  id: string;
  name: string;
  appearance: string; // Physical appearance (hair, eyes, build, notable features)
  attire: string;     // Core attire/costume
  props: string;      // Key props or accessories
  // New fields for character design workflow
  generatedDesignUrl?: string; // URL of the AI-generated character sheet
  approvedDesignUrl?: string;  // URL of the user-approved character sheet
  isDesignLoading?: boolean;
  designError?: string;
}

export enum ArtStyle {
  PHOTOREALISTIC = "Photorealistic",
  ANIME = "Anime",
  CARTOONISH = "Cartoonish",
  DARK_FANTASY = "Dark Fantasy",
  IMPRESSIONISTIC = "Impressionistic",
  PIXEL_ART = "Pixel Art",
  CYBERPUNK = "Cyberpunk",
  STEAMPUNK = "Steampunk",
  WATERCOLOR = "Watercolor",
  COMIC_BOOK = "Comic Book",
}

export interface StylePreferences {
  artStyle: ArtStyle;
  moodKeywords: string; // e.g., "mysterious, uplifting, ominous, serene"
  referenceArtists: string; // e.g., "Studio Ghibli, Frank Frazetta"
}

export interface Scene {
  id: string;
  sceneSummary: string;
  charactersInScene: string[];
  settingDescription: string;
  actionDescription: string;
  emotionalBeat: string;
  imagePrompt: string; // This will be the textual prompt for the scene
  imageUrl?: string;
  imageError?: string;
}

export interface DeconstructedStory {
  scenes: Scene[];
}

// For parsing Gemini's structured response for story deconstruction
export interface GeminiSceneResponse {
  sceneSummary: string;
  charactersInScene: string[];
  settingDescription: string;
  actionDescription: string;
  emotionalBeat: string;
  imagePrompt: string;
}

export interface GeminiDeconstructedStoryResponse {
  scenes: GeminiSceneResponse[];
}

// Helper type for reference images passed to the image generation model
export interface ReferenceImagePart {
  inlineData: {
    mimeType: string;
    data: string; // Base64 encoded image data (without the 'data:image/jpeg;base64,' prefix)
  };
}

// New enum to track the current phase of generation
export enum GenerationPhase {
  IDLE,
  AWAITING_CHARACTER_INPUT,
  GENERATING_CHARACTER_DESIGNS,
  AWAITING_CHARACTER_APPROVAL,
  DECONSTRUCTING_STORY,
  GENERATING_SCENE_IMAGES,
  COMPLETE,
  ERROR
}
```

## services/geminiService.ts

```typescript
import { GoogleGenAI, GenerateContentResponse, Content, GenerateContentConfig, Part } from "@google/genai";
import { Character, StylePreferences, GeminiDeconstructedStoryResponse, GeminiSceneResponse, ReferenceImagePart } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("API_KEY environment variable is not set. App will not function correctly.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

function formatCharacterDefinitions(characters: Character[]): string {
  if (characters.length === 0) {
    return "No specific characters defined by the user.";
  }
  return characters.map(char =>
    `- Name: ${char.name}\n  Appearance: ${char.appearance}\n  Attire: ${char.attire}\n  Props: ${char.props}`
  ).join('\n');
}

// --- Character Design Generation ---
export async function generateCharacterSheetImage(
  character: Character, // Only the textual definition
  stylePreferences: StylePreferences
): Promise<string> {
  const prompt = `
Generate a character sheet image for:
Name: ${character.name}
Appearance: ${character.appearance}
Attire: ${character.attire}
Props: ${character.props || 'None'}

Style: ${stylePreferences.artStyle}, ${stylePreferences.moodKeywords}.
${stylePreferences.referenceArtists ? `Inspired by the art of ${stylePreferences.referenceArtists}.` : ''}
Show the character in a clear, well-lit, neutral standing pose against a simple, non-distracting background.
Focus on high detail and visual clarity for character features, costume, and any props. This image will be used as a visual reference.
Ensure the output is a single, clear image of the character.
`.trim();

  try {
    const imageGenerationModel = 'gemini-2.0-flash-preview-image-generation';
    const requestContents: Content[] = [{ role: "user", parts: [{ text: prompt }] }];
    const generationConfig: GenerateContentConfig = {
      responseModalities: ["TEXT", "IMAGE"],
      temperature: 0.5, // Character designs should be fairly consistent
    };

    const responseStream = await ai.models.generateContentStream({
      model: imageGenerationModel,
      contents: requestContents,
      config: generationConfig,
    });

    for await (const chunk of responseStream) {
      if (chunk.candidates && chunk.candidates.length > 0) {
        const candidate = chunk.candidates[0];
        if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
          const imagePart = candidate.content.parts.find(
            part => part.inlineData && part.inlineData.mimeType?.startsWith('image/')
          );

          if (imagePart && imagePart.inlineData && imagePart.inlineData.data) {
            const base64ImageBytes: string = imagePart.inlineData.data;
            const mimeType: string = imagePart.inlineData.mimeType!;
            return `data:${mimeType};base64,${base64ImageBytes}`;
          }
        }
      }
    }
    throw new Error("No image data found in the AI response stream for character sheet generation.");

  } catch (error: any) {
    console.error(`Error generating character sheet for ${character.name}:`, error);
    throw new Error(`AI service error during character sheet generation for ${character.name}: ${error.message || 'Unknown error'}`);
  }
}


// --- Story Deconstruction (largely unchanged) ---
export async function deconstructStoryAndCreatePrompts(
  storyText: string,
  characters: Character[], // Textual definitions
  stylePreferences: StylePreferences
): Promise<GeminiDeconstructedStoryResponse | null> {
  const characterDefinitionsString = formatCharacterDefinitions(characters.map(c => ({...c, generatedDesignUrl: undefined, approvedDesignUrl: undefined, isDesignLoading: undefined, designError: undefined }))); // Pass only textual parts

  const masterPrompt = `
You are an expert story deconstructor and prompt engineer for an AI image generator.
Your task is to analyze the provided story, character definitions, and style preferences, then break the story into distinct scenes.
For each scene, you MUST:
1.  Provide a brief scene summary (max 30 words).
2.  List the characters present in the scene. If a character from the provided character definitions is present, use their defined name.
3.  Describe the setting/environment in detail.
4.  Describe the key actions or events.
5.  Identify the dominant emotional beat or mood.
6.  Construct a detailed TEXTUAL image generation prompt for this scene. This prompt should incorporate:
    - The scene's summary, setting, actions, and emotion.
    - Detailed TEXTUAL descriptions of any defined characters present, referencing their provided attributes (appearance, attire, props). For example: "Arin (tall, red hair, green eyes, wearing a tattered brown cloak, carries an ancient grimoire) is..."
    - The user's art style and mood preferences. Example: "${stylePreferences.artStyle} style, ${stylePreferences.moodKeywords}."
    - If user provided reference artists (e.g., "${stylePreferences.referenceArtists}"), include "in the style of ${stylePreferences.referenceArtists}".
    - Aim for a 16:9 aspect ratio.
    - Add descriptive terms like "cinematic lighting", "hyperrealistic details", "dramatic angle" as appropriate for the style and scene to enhance image quality.
    - Maintain TEXTUAL consistency for characters (appearance, attire) if they appear in multiple scenes by reusing their descriptions in the prompts.
    - DO NOT instruct the model to use reference images in this textual prompt; that will be handled separately.

User-defined Character Definitions:
${characterDefinitionsString}

User's Style Preferences:
Art Style: ${stylePreferences.artStyle}
Mood/Atmosphere Keywords: ${stylePreferences.moodKeywords}
Reference Artists: ${stylePreferences.referenceArtists || "None specified"}

Story to Deconstruct:
"""
${storyText}
"""

Output the result STRICTLY as a JSON object with a single key "scenes", which is an array of objects. Each scene object MUST have the following structure:
{
  "sceneSummary": "string",
  "charactersInScene": ["string"],
  "settingDescription": "string",
  "actionDescription": "string",
  "emotionalBeat": "string",
  "imagePrompt": "string"
}
Ensure the output is valid JSON. Do not include any explanatory text before or after the JSON object.
Break the story into a reasonable number of scenes, typically between 3 and 7 scenes, depending on story length and logical breaks.
Focus on creating vivid and descriptive textual image prompts.
`;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-04-17",
      contents: [{ role: "user", parts: [{ text: masterPrompt }] }],
      config: {
        responseMimeType: "application/json",
        temperature: 0.5,
      },
    });

    let jsonStr = response.text.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }

    const parsedData = JSON.parse(jsonStr) as GeminiDeconstructedStoryResponse;

    if (!parsedData || !Array.isArray(parsedData.scenes)) {
        throw new Error("Invalid JSON structure received from AI: 'scenes' array is missing.");
    }
    parsedData.scenes.forEach((scene: GeminiSceneResponse, index: number) => {
        if (typeof scene.sceneSummary !== 'string' ||
            !Array.isArray(scene.charactersInScene) ||
            typeof scene.settingDescription !== 'string' ||
            typeof scene.actionDescription !== 'string' ||
            typeof scene.emotionalBeat !== 'string' ||
            typeof scene.imagePrompt !== 'string') {
            throw new Error(`Invalid structure for scene ${index + 1}. Required fields are missing or have incorrect types.`);
        }
    });
    return parsedData;
  } catch (error: any) {
    console.error("Error in deconstructStoryAndCreatePrompts:", error);
    if (error.message && error.message.includes("JSON.parse")) {
        throw new Error(`Failed to parse JSON response from AI. Raw response: ${error.message.substring(0,500)}...`);
    }
    throw new Error(`AI service error during story deconstruction: ${error.message || 'Unknown error'}`);
  }
}

// --- Scene Image Generation with Optional Character References ---
export async function generateSceneImageWithReferences(
  textPrompt: string, // The textual prompt for the scene
  referenceImageParts: ReferenceImagePart[] = [] // Array of approved character images (base64 data)
): Promise<string> {
  try {
    const imageGenerationModel = 'gemini-2.0-flash-preview-image-generation';

    // Prepare parts for multimodal input
    const parts: Part[] = [{ text: textPrompt }];
    referenceImageParts.forEach(refImgPart => {
        parts.push(refImgPart);
    });

    // Add a clarifying instruction if reference images are provided
    if (referenceImageParts.length > 0) {
        parts.unshift({ text: "Generate an image based on the following textual description. Use the subsequent provided character image(s) as a strong visual reference for their appearance and attire in this scene:" });
    }


    const requestContents: Content[] = [{ role: "user", parts: parts }];

    const generationConfig: GenerateContentConfig = {
      responseModalities: ["TEXT", "IMAGE"],
    };

    const responseStream = await ai.models.generateContentStream({
      model: imageGenerationModel,
      contents: requestContents,
      config: generationConfig,
    });

    for await (const chunk of responseStream) {
      if (chunk.candidates && chunk.candidates.length > 0) {
        const candidate = chunk.candidates[0];
        if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
          const imagePartFound = candidate.content.parts.find(
            part => part.inlineData && part.inlineData.mimeType?.startsWith('image/')
          );

          if (imagePartFound && imagePartFound.inlineData && imagePartFound.inlineData.data) {
            const base64ImageBytes: string = imagePartFound.inlineData.data;
            const mimeType: string = imagePartFound.inlineData.mimeType!;
            return `data:${mimeType};base64,${base64ImageBytes}`;
          }
        }
      }
    }
    throw new Error("No image data found in the AI response stream for scene generation.");

  } catch (error: any) {
    console.error("Error in generateSceneImageWithReferences:", error);
    if (error.message && (error.message.includes("SAFETY") || error.message.includes("PROHIBITED_CONTENT"))) {
        throw new Error(`Scene image generation failed due to safety reasons or prohibited content. Prompt: "${textPrompt.substring(0, 100)}..."`);
    }
    throw new Error(`AI service error during scene image generation: ${error.message || 'Unknown error'}. Prompt: "${textPrompt.substring(0,100)}..."`);
  }
}
```

## components/CharacterInput.tsx

```typescript
import React from 'react';
import { Character } from '../types';
import { LoadingSpinner } from './LoadingSpinner'; // Assuming this exists

interface CharacterInputProps {
  character: Character;
  onChange: (character: Character) => void;
  onRemove: () => void;
  onGenerateDesign: () => void;
  onApproveDesign: () => void;
  onRegenerateDesign: () => void; // New prop
  isGeneratingStory: boolean; // To disable during full story generation
}

export function CharacterInput({
  character,
  onChange,
  onRemove,
  onGenerateDesign,
  onApproveDesign,
  onRegenerateDesign,
  isGeneratingStory
}: CharacterInputProps): React.ReactNode {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onChange({ ...character, [e.target.name]: e.target.value });
  };

  const canEditText = !character.approvedDesignUrl && !character.isDesignLoading && !isGeneratingStory;

  return (
    <div className="p-4 border border-slate-700 rounded-md mb-4 space-y-3 bg-slate-700/30 relative">
      <button
        type="button"
        onClick={onRemove}
        disabled={isGeneratingStory || character.isDesignLoading}
        className="absolute top-2 right-2 text-slate-500 hover:text-red-400 transition-colors p-1 rounded-full hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Remove character"
      >
        <TrashIcon className="h-5 w-5" />
      </button>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor={`charName-${character.id}`} className="block text-xs font-medium text-slate-400 mb-1">
            Name
          </label>
          <input
            type="text"
            id={`charName-${character.id}`}
            name="name"
            value={character.name}
            onChange={handleChange}
            readOnly={!canEditText}
            className={`w-full p-2 bg-slate-600 text-slate-100 border border-slate-500 rounded-md focus:ring-1 focus:ring-purple-500 focus:border-purple-500 text-sm ${!canEditText ? 'opacity-70 cursor-not-allowed' : ''}`}
            placeholder="e.g., Arin"
          />
        </div>
        <div>
          <label htmlFor={`charAppearance-${character.id}`} className="block text-xs font-medium text-slate-400 mb-1">
            Appearance
          </label>
          <input
            type="text"
            id={`charAppearance-${character.id}`}
            name="appearance"
            value={character.appearance}
            onChange={handleChange}
            readOnly={!canEditText}
            className={`w-full p-2 bg-slate-600 text-slate-100 border border-slate-500 rounded-md focus:ring-1 focus:ring-purple-500 focus:border-purple-500 text-sm ${!canEditText ? 'opacity-70 cursor-not-allowed' : ''}`}
            placeholder="e.g., Tall, red hair, green eyes"
          />
        </div>
      </div>

      <div>
        <label htmlFor={`charAttire-${character.id}`} className="block text-xs font-medium text-slate-400 mb-1">
          Attire/Costume
        </label>
        <input
          type="text"
          id={`charAttire-${character.id}`}
          name="attire"
          value={character.attire}
          onChange={handleChange}
          readOnly={!canEditText}
          className={`w-full p-2 bg-slate-600 text-slate-100 border border-slate-500 rounded-md focus:ring-1 focus:ring-purple-500 focus:border-purple-500 text-sm ${!canEditText ? 'opacity-70 cursor-not-allowed' : ''}`}
          placeholder="e.g., Tattered brown cloak"
        />
      </div>
      <div>
        <label htmlFor={`charProps-${character.id}`} className="block text-xs font-medium text-slate-400 mb-1">
          Key Props/Accessories
        </label>
        <input
          type="text"
          id={`charProps-${character.id}`}
          name="props"
          value={character.props}
          onChange={handleChange}
          readOnly={!canEditText}
          className={`w-full p-2 bg-slate-600 text-slate-100 border border-slate-500 rounded-md focus:ring-1 focus:ring-purple-500 focus:border-purple-500 text-sm ${!canEditText ? 'opacity-70 cursor-not-allowed' : ''}`}
          placeholder="e.g., Ancient grimoire"
        />
      </div>

      {/* Character Design Section */}
      <div className="mt-4 pt-3 border-t border-slate-600">
        <h5 className="text-sm font-semibold text-slate-300 mb-2">Character Design</h5>
        {character.isDesignLoading && (
          <div className="flex flex-col items-center justify-center p-4">
            <LoadingSpinner />
            <p className="text-xs text-slate-400 mt-2">Generating design...</p>
          </div>
        )}
        {character.designError && !character.isDesignLoading && (
            <div className="text-xs text-red-400 bg-red-900/30 p-2 rounded-md">Error: {character.designError}</div>
        )}

        {(character.generatedDesignUrl || character.approvedDesignUrl) && !character.isDesignLoading && !character.designError && (
          <div className="mb-2">
            <img
              src={character.approvedDesignUrl || character.generatedDesignUrl}
              alt={`${character.name} design`}
              className="w-full h-auto rounded-md border border-slate-500 object-contain max-h-60"
            />
          </div>
        )}

        {!character.approvedDesignUrl && (
          <button
            type="button"
            onClick={character.generatedDesignUrl ? onRegenerateDesign : onGenerateDesign}
            disabled={character.isDesignLoading || isGeneratingStory || !character.name.trim()}
            className="w-full text-xs px-3 py-1.5 mb-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {character.isDesignLoading ? 'Generating...' : (character.generatedDesignUrl ? 'Regenerate Design' : 'Generate Design')}
          </button>
        )}

        {character.generatedDesignUrl && !character.approvedDesignUrl && !character.isDesignLoading && (
          <button
            type="button"
            onClick={onApproveDesign}
            disabled={character.isDesignLoading || isGeneratingStory}
            className="w-full text-xs px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Approve Design
          </button>
        )}
         {character.approvedDesignUrl && (
            <p className="text-xs text-green-400 text-center font-semibold p-2 bg-green-900/30 rounded-md">Design Approved!</p>
        )}
      </div>
    </div>
  );
}

// Simple TrashIcon SVG component
function TrashIcon(props: React.SVGProps<SVGSVGElement>): React.ReactNode {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12.56 0c.342.052.682.107 1.022.166m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
  );
}
```

## components/StoryInputForm.tsx

```typescript
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
```

## App.tsx

```typescript
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
```
