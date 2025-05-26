

## types.ts

```typescript
export interface Character {
  id: string;
  name: string;
  appearance: string; // Physical appearance (hair, eyes, build, notable features)
  attire: string;     // Core attire/costume
  props: string;      // Key props or accessories

  // Fields for character design workflow
  isAiExtracted?: boolean;       // Flag if this character's textual description was AI-extracted
  generatedDesignUrl?: string; // URL of the AI-generated multi-view character sheet
  approvedDesignUrl?: string;  // URL of the user-approved character sheet
  isDesignLoading?: boolean;
  designError?: string;
}

// For AI-extracted character textual descriptions
export interface AiExtractedCharacterInfo {
  name: string;
  appearance: string;
  attire: string;
  props: string;
}

export interface AiCharacterExtractionResponse {
    characters: AiExtractedCharacterInfo[];
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
  imagePrompt: string; // Textual prompt for the scene
  imageUrl?: string;
  imageError?: string;
}

export interface DeconstructedStory {
  scenes: Scene[];
}

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

export interface ReferenceImagePart {
  inlineData: {
    mimeType: string;
    data: string; // Base64 encoded image data (without the 'data:image/jpeg;base64,' prefix)
  };
}

export enum GenerationPhase {
  IDLE,
  AWAITING_STORY_INPUT, // Initial state
  EXTRACTING_CHARACTERS,   // AI extracting character text if user didn't provide
  AWAITING_USER_CHARACTER_CONFIRMATION, // User reviews/edits AI extracted character text
  GENERATING_CHARACTER_DESIGNS,
  AWAITING_CHARACTER_DESIGN_APPROVAL,
  DECONSTRUCTING_STORY,
  GENERATING_SCENE_IMAGES,
  COMPLETE,
  ERROR
}
```

## services/geminiService.ts

```typescript
import { GoogleGenAI, GenerateContentResponse, Content, GenerateContentConfig, Part } from "@google/genai";
import { Character, StylePreferences, GeminiDeconstructedStoryResponse, GeminiSceneResponse, ReferenceImagePart, AiCharacterExtractionResponse, AiExtractedCharacterInfo } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("API_KEY environment variable is not set. App will not function correctly.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

function formatCharacterDefinitionsForDeconstruction(characters: Character[]): string {
  if (characters.length === 0) {
    return "No specific characters defined by the user or extracted by AI.";
  }
  return characters.map(char =>
    `- Name: ${char.name}\n  Appearance: ${char.appearance}\n  Attire: ${char.attire}\n  Props: ${char.props}`
  ).join('\n');
}

// --- New: AI Character Extraction from Story ---
export async function extractCharactersFromStory(storyText: string): Promise<AiExtractedCharacterInfo[] | null> {
  const prompt = `
Analyze the following story and identify up to 3-4 main characters. For each character, provide:
1. A plausible Name for the character.
2. A brief textual description of their likely Appearance (e.g., physical traits, hair, build).
3. A brief textual description of their likely Attire based on story context.
4. Any key Props or accessories they might possess.

Story:
"""
${storyText}
"""

Output the result STRICTLY as a JSON object with a single key "characters", which is an array of objects. Each character object MUST have the following structure:
{
  "name": "string",
  "appearance": "string",
  "attire": "string",
  "props": "string"
}
If no distinct characters can be clearly identified, return an empty "characters" array.
Do not include any explanatory text before or after the JSON object.
`.trim();

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-04-17", // Or another suitable text model
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        temperature: 0.6, // Allow for some creative interpretation
      },
    });

    let jsonStr = response.text.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }

    const parsedData = JSON.parse(jsonStr) as AiCharacterExtractionResponse;
    if (!parsedData || !Array.isArray(parsedData.characters)) {
      throw new Error("Invalid JSON structure for AI character extraction: 'characters' array is missing.");
    }
    // Basic validation of extracted character structure
    parsedData.characters.forEach((char: AiExtractedCharacterInfo, index: number) => {
        if (typeof char.name !== 'string' ||
            typeof char.appearance !== 'string' ||
            typeof char.attire !== 'string' ||
            typeof char.props !== 'string') {
            throw new Error(`Invalid structure for AI extracted character ${index + 1}.`);
        }
    });
    return parsedData.characters;

  } catch (error: any) {
    console.error("Error in extractCharactersFromStory:", error);
    if (error.message && error.message.includes("JSON.parse")) {
        throw new Error(`Failed to parse JSON response from AI during character extraction. Raw response: ${error.message.substring(0,200)}...`);
    }
    throw new Error(`AI service error during character extraction: ${error.message || 'Unknown error'}`);
  }
}


// --- Character Design (Multi-View Sheet) Generation ---
export async function generateMultiViewCharacterSheetImage(
  character: Pick<Character, 'name' | 'appearance' | 'attire' | 'props'>, // Textual definition
  stylePreferences: StylePreferences
): Promise<string> {
  const prompt = `
Generate a single character sheet image for:
Name: ${character.name}
Appearance: ${character.appearance}
Attire: ${character.attire}
Props: ${character.props || 'None'}

Style: ${stylePreferences.artStyle}, ${stylePreferences.moodKeywords}.
${stylePreferences.referenceArtists ? `Inspired by the art of ${stylePreferences.referenceArtists}.` : ''}

The image MUST show the character from multiple angles:
1.  Front view (full body, neutral pose)
2.  Side view (full body, profile)
3.  Back view (full body)
4.  A 3/4 or diagonal view (full body, slightly dynamic or characteristic pose if appropriate, otherwise neutral)

All views should be on a plain, blank, or simple non-distracting white or light grey background.
Focus on high detail, consistent appearance across all views, and visual clarity for character features, costume, and any props.
This image will be used as a strong visual reference for subsequent scene illustrations.
The overall image composition should clearly present these multiple views, perhaps arranged in a grid or sequence.
`.trim();

  try {
    const imageGenerationModel = 'gemini-2.0-flash-preview-image-generation';
    const requestContents: Content[] = [{ role: "user", parts: [{ text: prompt }] }];
    const generationConfig: GenerateContentConfig = {
      responseModalities: ["TEXT", "IMAGE"],
      temperature: 0.4, // Aim for more precise execution of the multi-view request
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
    throw new Error("No image data found for multi-view character sheet.");

  } catch (error: any) {
    console.error(`Error generating multi-view sheet for ${character.name}:`, error);
    throw new Error(`AI service error during multi-view sheet generation for ${character.name}: ${error.message || 'Unknown error'}`);
  }
}

// --- Story Deconstruction (remains similar, ensures textual prompts) ---
export async function deconstructStoryAndCreatePrompts(
  storyText: string,
  characters: Character[],
  stylePreferences: StylePreferences
): Promise<GeminiDeconstructedStoryResponse | null> {
  const characterDefinitionsString = formatCharacterDefinitionsForDeconstruction(characters);

  const masterPrompt = `
You are an expert story deconstructor and prompt engineer for an AI image generator.
Your task is to analyze the provided story, character definitions, and style preferences, then break the story into distinct scenes.
For each scene, you MUST:
1.  Provide a brief scene summary (max 30 words).
2.  List the characters present in the scene by their defined names.
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
    - DO NOT instruct the model to use reference images in this textual prompt; that will be handled separately when the actual image generation occurs.

User-defined or AI-extracted Character Definitions:
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
        throw new Error("Invalid JSON structure from AI story deconstruction: 'scenes' array is missing.");
    }
    parsedData.scenes.forEach((scene: GeminiSceneResponse, index: number) => {
        if (typeof scene.sceneSummary !== 'string' || !Array.isArray(scene.charactersInScene) || typeof scene.settingDescription !== 'string' || typeof scene.actionDescription !== 'string' || typeof scene.emotionalBeat !== 'string' || typeof scene.imagePrompt !== 'string') {
            throw new Error(`Invalid structure for deconstructed scene ${index + 1}.`);
        }
    });
    return parsedData;
  } catch (error: any) {
    console.error("Error in deconstructStoryAndCreatePrompts:", error);
    if (error.message && error.message.includes("JSON.parse")) {
        throw new Error(`Failed to parse JSON response from AI during story deconstruction. Raw: ${error.message.substring(0,200)}...`);
    }
    throw new Error(`AI service error during story deconstruction: ${error.message || 'Unknown error'}`);
  }
}

// --- Scene Image Generation with Approved Character Sheet References ---
export async function generateSceneImageWithReferences(
  textPrompt: string,
  referenceImageParts: ReferenceImagePart[] = []
): Promise<string> {
  try {
    const imageGenerationModel = 'gemini-2.0-flash-preview-image-generation';
    const parts: Part[] = [];

    // Add a clarifying instruction if reference images are provided
    if (referenceImageParts.length > 0) {
        parts.push({ text: "Generate an image based on the following textual description. For any characters mentioned, use the subsequent provided character sheet image(s) as a strong visual reference for their appearance, attire, and overall design in this scene. Adapt pose and expression to the scene's context:" });
    }
    parts.push({ text: textPrompt }); // Main textual prompt for the scene

    referenceImageParts.forEach(refImgPart => {
        parts.push(refImgPart); // Add the character sheet image data
    });

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
    throw new Error("No image data found in AI response for scene generation.");
  } catch (error: any)
 {
    console.error("Error in generateSceneImageWithReferences:", error);
    if (error.message && (error.message.includes("SAFETY") || error.message.includes("PROHIBITED_CONTENT"))) {
        throw new Error(`Scene image generation failed due to safety reasons. Prompt: "${textPrompt.substring(0, 100)}..."`);
    }
    throw new Error(`AI service error during scene image generation: ${error.message || 'Unknown error'}. Prompt: "${textPrompt.substring(0,100)}..."`);
  }
}
```

## components/CharacterInput.tsx

```typescript
import React from 'react';
import { Character, GenerationPhase } from '../types';
import { LoadingSpinner } from './LoadingSpinner';

interface CharacterInputProps {
  character: Character;
  index: number;
  onChange: (index: number, character: Character) => void;
  onRemove: (id: string) => void;
  onGenerateSingleCharacterDesign: (characterId: string) => void;
  onApproveDesign: (characterId: string) => void;
  currentPhase: GenerationPhase;
  isGeneratingAnyCharacterDesigns: boolean; // True if any char design is loading globally
}

export function CharacterInput({
  character,
  index,
  onChange,
  onRemove,
  onGenerateSingleCharacterDesign,
  onApproveDesign,
  currentPhase,
  isGeneratingAnyCharacterDesigns,
}: CharacterInputProps): React.ReactNode {

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onChange(index, { ...character, [e.target.name]: e.target.value });
  };

  const isReadOnly = character.approvedDesignUrl ||
                     currentPhase === GenerationPhase.GENERATING_CHARACTER_DESIGNS ||
                     currentPhase === GenerationPhase.DECONSTRUCTING_STORY ||
                     currentPhase === GenerationPhase.GENERATING_SCENE_IMAGES ||
                     character.isDesignLoading;

  const canGenerateThisDesign = character.name.trim() !== '' && !character.approvedDesignUrl && !character.isDesignLoading && !isGeneratingAnyCharacterDesigns;

  return (
    <div className="p-4 border border-slate-600 rounded-lg mb-4 bg-slate-700/50 shadow-md relative transition-all duration-300 hover:border-purple-500">
      <button
        type="button"
        onClick={() => onRemove(character.id)}
        disabled={isReadOnly || isGeneratingAnyCharacterDesigns}
        className="absolute top-3 right-3 text-slate-400 hover:text-red-500 transition-colors p-1 rounded-full hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed z-10"
        aria-label="Remove character"
      >
        <TrashIcon className="h-5 w-5" />
      </button>

      {character.isAiExtracted && (
        <span className="absolute top-3 left-3 text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">AI Suggested</span>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
        <div>
          <label htmlFor={`charName-${character.id}`} className="block text-xs font-medium text-slate-300 mb-1">
            Character Name
          </label>
          <input
            type="text"
            id={`charName-${character.id}`}
            name="name"
            value={character.name}
            onChange={handleChange}
            readOnly={isReadOnly}
            className={`w-full p-2 bg-slate-600 text-slate-100 border border-slate-500 rounded-md focus:ring-1 focus:ring-purple-500 focus:border-purple-500 text-sm ${isReadOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
            placeholder="e.g., Elara"
          />
        </div>
         <div>
          <label htmlFor={`charAppearance-${character.id}`} className="block text-xs font-medium text-slate-300 mb-1">
            Appearance
          </label>
          <input
            type="text"
            id={`charAppearance-${character.id}`}
            name="appearance"
            value={character.appearance}
            onChange={handleChange}
            readOnly={isReadOnly}
            className={`w-full p-2 bg-slate-600 text-slate-100 border border-slate-500 rounded-md focus:ring-1 focus:ring-purple-500 focus:border-purple-500 text-sm ${isReadOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
            placeholder="e.g., Tall, windswept silver hair"
          />
        </div>
      </div>
      <div className="mb-3">
        <label htmlFor={`charAttire-${character.id}`} className="block text-xs font-medium text-slate-300 mb-1">
          Attire/Costume
        </label>
        <textarea
          id={`charAttire-${character.id}`}
          name="attire"
          value={character.attire}
          onChange={handleChange}
          readOnly={isReadOnly}
          rows={2}
          className={`w-full p-2 bg-slate-600 text-slate-100 border border-slate-500 rounded-md focus:ring-1 focus:ring-purple-500 focus:border-purple-500 text-sm ${isReadOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
          placeholder="e.g., Flowing dark blue cloak, leather boots"
        />
      </div>
      <div className="mb-4">
        <label htmlFor={`charProps-${character.id}`} className="block text-xs font-medium text-slate-300 mb-1">
          Key Props/Accessories
        </label>
        <input
          type="text"
          id={`charProps-${character.id}`}
          name="props"
          value={character.props}
          onChange={handleChange}
          readOnly={isReadOnly}
          className={`w-full p-2 bg-slate-600 text-slate-100 border border-slate-500 rounded-md focus:ring-1 focus:ring-purple-500 focus:border-purple-500 text-sm ${isReadOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
          placeholder="e.g., Ornate staff, glowing amulet"
        />
      </div>

      {/* Character Design Sheet Section */}
      <div className="mt-4 pt-4 border-t border-slate-600">
        <h5 className="text-sm font-semibold text-slate-200 mb-2">Character Design Sheet (Multi-View)</h5>
        {character.isDesignLoading && (
          <div className="flex flex-col items-center justify-center p-4 bg-slate-600/30 rounded-md">
            <LoadingSpinner />
            <p className="text-xs text-slate-300 mt-2">Generating multi-view design...</p>
          </div>
        )}
        {character.designError && !character.isDesignLoading && (
            <div className="text-xs text-red-400 bg-red-800/40 p-3 rounded-md border border-red-700">Error: {character.designError}</div>
        )}

        {(character.generatedDesignUrl || character.approvedDesignUrl) && !character.isDesignLoading && !character.designError && (
          <div className="mb-3 p-2 bg-slate-600/30 rounded-md">
            <img
              src={character.approvedDesignUrl || character.generatedDesignUrl}
              alt={`${character.name} multi-view design`}
              className="w-full h-auto rounded-md border border-slate-500 object-contain max-h-72"
            />
          </div>
        )}

        {!character.approvedDesignUrl && (
          <button
            type="button"
            onClick={() => onGenerateSingleCharacterDesign(character.id)}
            disabled={!canGenerateThisDesign}
            className="w-full text-sm px-4 py-2 mb-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {character.isDesignLoading ? 'Generating...' : (character.generatedDesignUrl ? 'Regenerate Design Sheet' : 'Generate Design Sheet')}
          </button>
        )}

        {character.generatedDesignUrl && !character.approvedDesignUrl && !character.isDesignLoading && (
          <button
            type="button"
            onClick={() => onApproveDesign(character.id)}
            disabled={character.isDesignLoading || isGeneratingAnyCharacterDesigns}
            className="w-full text-sm px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            Approve This Design
          </button>
        )}
         {character.approvedDesignUrl && (
            <div className="text-sm text-green-300 text-center font-semibold p-3 bg-green-800/40 rounded-md border border-green-700">
                <CheckCircleIcon className="h-5 w-5 inline-block mr-2 align-middle" />
                Design Approved!
            </div>
        )}
      </div>
    </div>
  );
}

function TrashIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12.56 0c.342.052.682.107 1.022.166m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
  );
}

function CheckCircleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}
```

## components/StoryInputForm.tsx

```typescript
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
```

## App.tsx

```typescript
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
```

## components/StoryboardView.tsx

```typescript
import React from 'react';
import { Scene, GenerationPhase } from '../types';
import { SceneCard } from './SceneCard';

interface StoryboardViewProps {
  scenes: Scene[];
  currentPhase: GenerationPhase;
}

export function StoryboardView({ scenes, currentPhase }: StoryboardViewProps): React.ReactNode {
  const showEmptyState = scenes.length === 0 &&
    (currentPhase === GenerationPhase.AWAITING_STORY_INPUT ||
     currentPhase === GenerationPhase.IDLE ||
     currentPhase === GenerationPhase.AWAITING_USER_CHARACTER_CONFIRMATION ||
     currentPhase === GenerationPhase.AWAITING_CHARACTER_DESIGN_APPROVAL ||
     currentPhase === GenerationPhase.COMPLETE // Complete but no scenes (e.g. deconstruction failed)
    );


  if (showEmptyState) {
    let title = "Your Storyboard Awaits";
    let message = "Enter your story, define characters (or let AI find them), approve designs, and generate your visual narrative.";

    if(currentPhase === GenerationPhase.AWAITING_USER_CHARACTER_CONFIRMATION && scenes.length === 0) {
        title = "Confirm or Define Characters";
        message = "Review AI-suggested characters or add your own in the form. Then, generate their visual designs.";
    } else if (currentPhase === GenerationPhase.AWAITING_CHARACTER_DESIGN_APPROVAL && scenes.length === 0 ) {
        title = "Approve Character Designs";
        message = "Character design sheets are being generated or awaiting your approval. Once approved, you can generate the storyboard.";
    }


    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-slate-800/60 p-8 rounded-xl shadow-xl text-slate-400 border border-slate-700">
        <EmptyStateIcon className="w-20 h-20 mb-6 text-slate-600" />
        <h3 className="text-2xl font-semibold text-slate-200 mb-2">{title}</h3>
        <p className="text-center max-w-md">{message}</p>
      </div>
    );
  }

  if (scenes.length === 0 && (currentPhase === GenerationPhase.DECONSTRUCTING_STORY || currentPhase === GenerationPhase.GENERATING_SCENE_IMAGES)) {
    return (
         <div className="flex flex-col items-center justify-center min-h-[400px] bg-slate-800/60 p-8 rounded-xl shadow-xl text-slate-400 border border-slate-700">
            {/* Spinner will be in global overlay, so just a message here */}
            <p className="text-xl text-slate-300">Preparing your storyboard scenes...</p>
        </div>
    )
  }


  return (
    <div className="space-y-8 max-h-[calc(100vh-12rem)] md:max-h-[calc(100vh-8rem)] overflow-y-auto p-2 pr-4 bg-slate-800/30 rounded-xl shadow-inner border border-slate-700/50">
      {scenes.map((scene, index) => (
        <SceneCard key={scene.id} scene={scene} sceneNumber={index + 1} />
      ))}
    </div>
  );
}

function EmptyStateIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
       <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5h18M4.502 10.5A2.25 2.25 0 112.25 12.75v1.065c0 .75.592 1.387 1.338 1.451L4.53 15.75M19.502 10.5A2.25 2.25 0 1021.75 12.75v1.065c0 .75-.592 1.387-1.338 1.451L19.47 15.75" />
    </svg>
  );
}
```
