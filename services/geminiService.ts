
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Character, StylePreferences, Scene, GeminiDeconstructedStoryResponse, GeminiSceneResponse } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("API_KEY environment variable is not set. App will not function correctly.");
  // Throw an error or handle this more gracefully in a real app, 
  // but per instructions, we assume it's set.
}

const ai = new GoogleGenAI({ apiKey: API_KEY! }); // Use non-null assertion as we assume it's set

function formatCharacterDefinitions(characters: Character[]): string {
  if (characters.length === 0) {
    return "No specific characters defined by the user.";
  }
  return characters.map(char => 
    `- Name: ${char.name}\n  Appearance: ${char.appearance}\n  Attire: ${char.attire}\n  Props: ${char.props}`
  ).join('\n');
}

export async function deconstructStoryAndCreatePrompts(
  storyText: string,
  characters: Character[],
  stylePreferences: StylePreferences
): Promise<GeminiDeconstructedStoryResponse | null> {
  const characterDefinitionsString = formatCharacterDefinitions(characters);

  const masterPrompt = `
You are an expert story deconstructor and prompt engineer for an AI image generator.
Your task is to analyze the provided story, character definitions, and style preferences, then break the story into distinct scenes.
For each scene, you MUST:
1.  Provide a brief scene summary (max 30 words).
2.  List the characters present in the scene. If a character from the provided character definitions is present, use their defined name.
3.  Describe the setting/environment in detail.
4.  Describe the key actions or events.
5.  Identify the dominant emotional beat or mood.
6.  Construct a detailed image generation prompt for this scene. This prompt should incorporate:
    - The scene's summary, setting, actions, and emotion.
    - Detailed descriptions of any defined characters present, referencing their provided attributes (appearance, attire, props). For example: "Arin (tall, red hair, green eyes, wearing a tattered brown cloak, carries an ancient grimoire) is..."
    - The user's art style and mood preferences. Example: "${stylePreferences.artStyle} style, ${stylePreferences.moodKeywords}."
    - If user provided reference artists (e.g., "${stylePreferences.referenceArtists}"), include "in the style of ${stylePreferences.referenceArtists}".
    - Aim for a 16:9 aspect ratio.
    - Add descriptive terms like "cinematic lighting", "hyperrealistic details", "dramatic angle" as appropriate for the style and scene to enhance image quality.
    - Maintain consistency for characters (appearance, attire) if they appear in multiple scenes by reusing their descriptions in the prompts.

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
Focus on creating vivid and descriptive image prompts.
For example, if a character "Luna" is defined as "short, blue hair, wears a silver jumpsuit", and the scene involves her in a futuristic city, the image prompt might be:
"Luna (short, blue hair, wears a silver jumpsuit) stands on a neon-lit balcony overlooking a sprawling futuristic cityscape at night. Flying vehicles zoom past. ${stylePreferences.artStyle} style, ${stylePreferences.moodKeywords}, vibrant neon colors, cinematic."
`;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-04-17", // Use specified model
      contents: masterPrompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.5, // Adjust for creativity vs. precision
      },
    });

    let jsonStr = response.text.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s; // Matches ```json ... ``` or ``` ... ```
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim(); 
    }

    const parsedData = JSON.parse(jsonStr) as GeminiDeconstructedStoryResponse;
    
    // Validate structure
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

export async function generateImageForScene(prompt: string): Promise<string> {
  try {
    const response = await ai.models.generateImages({
      model: 'imagen-3.0-generate-002',
      prompt: prompt,
      config: { 
        numberOfImages: 1, 
        outputMimeType: 'image/jpeg', // JPEG is generally smaller
        // You can add aspect ratio here if supported, e.g. "16:9" but Imagen 3 might derive from prompt
      },
    });

    if (response.generatedImages && response.generatedImages.length > 0 && response.generatedImages[0].image.imageBytes) {
      const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
      return `data:image/jpeg;base64,${base64ImageBytes}`;
    } else {
      throw new Error("No image generated or image data missing.");
    }
  } catch (error: any) {
    console.error("Error in generateImageForScene:", error);
    throw new Error(`AI service error during image generation: ${error.message || 'Unknown error'}`);
  }
}
