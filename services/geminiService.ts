import { GoogleGenAI, GenerateContentResponse, Content, GenerateContentConfig, Part } from "@google/genai";
import { Character, StylePreferences, GeminiDeconstructedStoryResponse, GeminiSceneResponse, ReferenceImagePart, AiCharacterExtractionResponse, AiExtractedCharacterInfo } from '../types';
import { MAX_CHARACTERS } from '../constants'; // <--- ADD THIS IMPORT

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("API_KEY environment variable is not set. App will not function correctly.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

// Helper to format detailed character descriptions for prompts
function formatDetailedCharacterForPrompt(character: Pick<Character, 'name' | 'description' | 'gender' | 'age' | 'hairColor' | 'eyeColor' | 'build' | 'personalityTraits' | 'clothingStyle' | 'distinguishingFeatures' | 'habitsMannerisms'>): string {
  return `
Name: ${character.name}
Description: ${character.description}
Gender: ${character.gender || 'Not specified'}
Age: ${character.age || 'Not specified'}
Hair Color: ${character.hairColor || 'Not specified'}
Eye Color: ${character.eyeColor || 'Not specified'}
Build: ${character.build || 'Not specified'}
Personality: ${character.personalityTraits || 'Not specified'}
Clothing Style: ${character.clothingStyle || 'Not specified'}
Distinguishing Features: ${character.distinguishingFeatures || 'Not specified'}
Habits/Mannerisms: ${character.habitsMannerisms || 'Not specified'}
`.trim();
}


export async function extractCharactersFromStory(storyText: string): Promise<AiExtractedCharacterInfo[] | null> {
  const prompt = `
Analyze the following story and identify up to ${MAX_CHARACTERS} main characters. For each character, provide:
1.  Name: A plausible name for the character.
2.  Description: A brief overall description (1-2 sentences).
3.  Gender: (e.g., Female, Male, Non-binary, Unspecified).
4.  Age: A descriptive age (e.g., Young adult, Middle-aged, Elderly, Ageless, Child).
5.  Hair Color: (e.g., Raven black, Fiery red, Blonde).
6.  Eye Color: (e.g., Emerald green, Icy blue).
7.  Build: (e.g., Athletic, Slender, Imposing, Average).
8.  Personality Traits: Key personality traits (2-3 words, e.g., Brave, Curious, Stoic, Humorous).
9.  Clothing Style: General style of clothing (e.g., Practical adventurer's gear, Regal attire, Simple peasant clothes).
10. Distinguishing Features: Any unique visual features (e.g., Scar above left eye, Always wears a silver locket).
11. Habits/Mannerisms: Brief notable habits or mannerisms (e.g., Taps fingers when thinking, Often quotes ancient proverbs).

Story:
"""
${storyText}
"""

Output the result STRICTLY as a JSON object with a single key "characters", which is an array of objects. Each character object MUST have the following structure:
{
  "name": "string",
  "description": "string",
  "gender": "string",
  "age": "string",
  "hairColor": "string",
  "eyeColor": "string",
  "build": "string",
  "personalityTraits": "string",
  "clothingStyle": "string",
  "distinguishingFeatures": "string",
  "habitsMannerisms": "string"
}
If no distinct characters can be clearly identified, or fewer than ${MAX_CHARACTERS} are clear, return only those identified. If none, return an empty "characters" array.
Do not include any explanatory text before or after the JSON object.
`.trim();

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-04-17",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { responseMimeType: "application/json", temperature: 0.5 },
    });
    let jsonStr = response.text.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) jsonStr = match[2].trim();
    const parsedData = JSON.parse(jsonStr) as AiCharacterExtractionResponse;
    if (!parsedData || !Array.isArray(parsedData.characters)) {
      throw new Error("Invalid JSON: 'characters' array missing.");
    }
    parsedData.characters.forEach((char: AiExtractedCharacterInfo) => {
        if (typeof char.name !== 'string' || typeof char.description !== 'string') { // Basic check
            throw new Error(`Invalid structure for AI extracted character.`);
        }
    });
    return parsedData.characters;
  } catch (error: any) {
    console.error("Error in extractCharactersFromStory:", error);
    throw new Error(`AI character extraction failed: ${error.message || 'Unknown error'}`);
  }
}

export async function generateMultiViewCharacterSheetImage(
  character: Character, // Full character object with new fields
  stylePreferences: StylePreferences
): Promise<string> {
  const characterDetails = formatDetailedCharacterForPrompt(character);
  const prompt = `
Generate a single, high-quality character sheet image for the following character:
${characterDetails}

Art Style: ${stylePreferences.artStyle}.
Color Palette: Emphasize a ${stylePreferences.colorPalette.toLowerCase()} color scheme for the character's attire and aura, if applicable.
Mood/Atmosphere (for character portrayal): ${stylePreferences.moodKeywords}.
${stylePreferences.referenceArtists ? `Visual style inspired by ${stylePreferences.referenceArtists}.` : ''}

The image MUST clearly display the character from multiple angles:
1.  Full body front view (neutral or characteristic pose).
2.  Full body side view (profile).
3.  Full body back view.
4.  Full body 3/4 view or a slightly dynamic pose that showcases their personality or key props.

All views must be on a plain, blank, simple light grey, or non-distracting white background.
Ensure high detail, consistent appearance (face, attire, props) across all views.
This image serves as a definitive visual reference. The layout should be clean, presenting these views clearly (e.g., arranged in a row or a 2x2 grid within the single image).
`.trim();

  try {
    const imageGenerationModel = 'gemini-2.0-flash-preview-image-generation';
    const requestContents: Content[] = [{ role: "user", parts: [{ text: prompt }] }];
    const generationConfig: GenerateContentConfig = {
      responseModalities: ["TEXT", "IMAGE"], temperature: 0.3 // Lower temp for more adherence
    };
    const responseStream = await ai.models.generateContentStream({ model: imageGenerationModel, contents: requestContents, config: generationConfig });
    for await (const chunk of responseStream) {
      const imagePart = chunk.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.mimeType?.startsWith('image/'));
      if (imagePart?.inlineData?.data) {
        return `data:${imagePart.inlineData.mimeType!};base64,${imagePart.inlineData.data}`;
      }
    }
    throw new Error("No image data in multi-view sheet response.");
  } catch (error: any) {
    console.error(`Error generating sheet for ${character.name}:`, error);
    throw new Error(`AI sheet generation for ${character.name} failed: ${error.message || 'Unknown'}`);
  }
}

export async function deconstructStoryAndCreatePrompts(
  storyText: string,
  characters: Character[], // Now full character objects
  stylePreferences: StylePreferences
): Promise<GeminiDeconstructedStoryResponse | null> {
  const characterDefinitionsString = characters.length > 0
    ? "Key Characters Defined:\n" + characters.map(formatDetailedCharacterForPrompt).join('\n\n')
    : "No specific characters were pre-defined. Describe characters generally based on story context if they appear in a scene.";

  const masterPrompt = `
You are an expert story deconstructor. Analyze the story, character definitions, and style preferences to break the story into distinct scenes.
For each scene, provide:
1.  sceneSummary: Brief summary (max 30 words).
2.  charactersInScene: Array of names of characters present.
3.  settingDescription: Detailed setting description.
4.  actionDescription: Key actions or events.
5.  emotionalBeat: Dominant emotional mood.
6.  imagePrompt: A detailed TEXTUAL image generation prompt for this scene. This prompt should incorporate:
    - The scene's summary, setting, actions, and emotion.
    - For any characters listed in 'charactersInScene' that are also in the 'Key Characters Defined' list, ensure their textual description in this prompt aligns with their detailed definition (e.g., "Anya, the brave knight with emerald green eyes and practical adventurer's gear, ...").
    - Art Style: ${stylePreferences.artStyle}.
    - Color Palette: Evoke a ${stylePreferences.colorPalette.toLowerCase()} color palette.
    - Mood/Atmosphere: ${stylePreferences.moodKeywords}.
    - Reference Artists: ${stylePreferences.referenceArtists ? `Style influenced by ${stylePreferences.referenceArtists}.` : ''}
    - Aim for a 16:9 aspect ratio. Add terms like "cinematic lighting," "dramatic angle."
    - DO NOT mention using reference images in this textual prompt; that is handled separately.

Key Characters Defined:
${characterDefinitionsString}

Story to Deconstruct:
"""
${storyText}
"""

Output STRICTLY as a JSON object with a single key "scenes", an array of objects, each with "sceneSummary", "charactersInScene", "settingDescription", "actionDescription", "emotionalBeat", "imagePrompt".
No explanatory text before or after the JSON.
`.trim();
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-04-17",
      contents: [{ role: "user", parts: [{ text: masterPrompt }] }],
      config: { responseMimeType: "application/json", temperature: 0.5 },
    });
    let jsonStr = response.text.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) jsonStr = match[2].trim();
    const parsedData = JSON.parse(jsonStr) as GeminiDeconstructedStoryResponse;
    if (!parsedData || !Array.isArray(parsedData.scenes)) throw new Error("Invalid deconstruction: 'scenes' missing.");
    // Add more validation as needed
    return parsedData;
  } catch (error: any) {
    console.error("Error in deconstructStoryAndCreatePrompts:", error);
    throw new Error(`Story deconstruction failed: ${error.message || 'Unknown error'}`);
  }
}

export async function generateSceneImageWithReferences(
  textPrompt: string,
  stylePreferences: StylePreferences, // Pass global style preferences too
  referenceImageParts: ReferenceImagePart[] = []
): Promise<string> {
  try {
    const imageGenerationModel = 'gemini-2.0-flash-preview-image-generation';
    const parts: Part[] = [];

    let refinedTextPrompt = textPrompt;
    // Prepend style info to the main text prompt for the scene itself
    refinedTextPrompt = `Art Style: ${stylePreferences.artStyle}. Color Palette: ${stylePreferences.colorPalette.toLowerCase()}. Mood: ${stylePreferences.moodKeywords}. ${stylePreferences.referenceArtists ? `Influence: ${stylePreferences.referenceArtists}.` : ''} Scene: ${textPrompt}`;


    if (referenceImageParts.length > 0) {
        parts.push({ text: "Generate an image for the following scene description. For any characters mentioned, use the subsequent character sheet image(s) as a strong visual reference for their appearance, attire, and overall design. Adapt their pose and expression to the scene's context, but maintain their core visual identity from the reference sheet(s)." });
    }
    parts.push({ text: refinedTextPrompt });

    referenceImageParts.forEach(refImgPart => parts.push(refImgPart));

    const requestContents: Content[] = [{ role: "user", parts: parts }];
    const generationConfig: GenerateContentConfig = {
      responseModalities: ["TEXT", "IMAGE"], temperature: 0.45
    };
    const responseStream = await ai.models.generateContentStream({ model: imageGenerationModel, contents: requestContents, config: generationConfig });
    for await (const chunk of responseStream) {
      const imagePartFound = chunk.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.mimeType?.startsWith('image/'));
      if (imagePartFound?.inlineData?.data) {
        return `data:${imagePartFound.inlineData.mimeType!};base64,${imagePartFound.inlineData.data}`;
      }
    }
    throw new Error("No image data in scene generation response.");
  } catch (error: any) {
    console.error("Error in generateSceneImageWithReferences:", error);
    throw new Error(`Scene image generation failed: ${error.message || 'Unknown error'}`);
  }
}