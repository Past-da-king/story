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
