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
