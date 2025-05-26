// Existing types might need slight adjustments, new ones are added

export interface Character {
  id: string;
  // Fields from mockup 2.png
  description: string;
  name: string;
  gender: string;
  age: string; // e.g., "25", "Ancient", "Ageless"
  hairColor: string;
  eyeColor: string;
  build: string; // e.g., "Athletic", "Slender", "Imposing"
  personalityTraits: string;
  clothingStyle: string;
  distinguishingFeatures: string;
  habitsMannerisms: string;

  // Fields for character design workflow
  isAiExtracted?: boolean;       // Flag if this character's textual description was AI-extracted
  generatedDesignImageUrl?: string; // URL of the AI-generated multi-view character sheet
  approvedDesignImageUrl?: string;  // URL of the user-approved character sheet
  isDesignLoading?: boolean;
  designError?: string;
}

export interface AiExtractedCharacterInfo {
  // Matches the fields in Character for AI extraction
  name: string;
  description: string;
  gender: string;
  age: string;
  hairColor: string;
  eyeColor: string;
  build: string;
  personalityTraits: string;
  clothingStyle: string;
  distinguishingFeatures: string;
  habitsMannerisms: string;
}

export interface AiCharacterExtractionResponse {
    characters: AiExtractedCharacterInfo[];
}

export enum ArtStyle {
  REALISTIC = "Realistic",
  CARTOON = "Cartoon",
  ANIME = "Anime",
  ABSTRACT = "Abstract",
  // Adding previous styles for broader options, can be curated
  PHOTOREALISTIC = "Photorealistic",
  DARK_FANTASY = "Dark Fantasy",
  IMPRESSIONISTIC = "Impressionistic",
  PIXEL_ART = "Pixel Art",
  CYBERPUNK = "Cyberpunk",
  STEAMPUNK = "Steampunk",
  WATERCOLOR = "Watercolor",
  COMIC_BOOK = "Comic Book",
}

export enum ColorPalette {
  VIBRANT = "Vibrant",
  PASTEL = "Pastel",
  MONOCHROME = "Monochrome",
  EARTHY = "Earthy",
}

export interface StylePreferences { // Corresponds to Global Preferences mockup
  artStyle: ArtStyle;
  colorPalette: ColorPalette;
  // Optional: Default Character Appearance (Gender, Age Range)
  // Optional: Default Scene Settings (Lighting, Mood)
  // For simplicity, sticking to artStyle and colorPalette from the main sections of mockup 3
  // Mood keywords and reference artists can be part of a more advanced per-story or global setting.
  // The current app structure had moodKeywords and referenceArtists, let's keep them for flexibility.
  moodKeywords: string;
  referenceArtists: string;
}

export interface Scene {
  id: string;
  sceneSummary: string;
  charactersInScene: string[]; // Names of characters
  settingDescription: string;
  actionDescription: string;
  emotionalBeat: string;
  imagePrompt: string; // Textual prompt for the scene
  imageUrl?: string;
  imageError?: string;
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

// Represents the current view/page in the multi-step creation process
export type AppView =
  | 'welcome'
  | 'storyInput'
  | 'characterDefinition'
  | 'globalPreferences'
  | 'characterDesignReview'
  | 'storyboardDisplay';

// More granular state for loading and operations
export enum OperationStatus {
  IDLE,
  LOADING,
  SUCCESS,
  ERROR
}
