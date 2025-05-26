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
