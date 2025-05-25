
export interface Character {
  id: string;
  name: string;
  appearance: string; // Physical appearance (hair, eyes, build, notable features)
  attire: string;     // Core attire/costume
  props: string;      // Key props or accessories
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
  imagePrompt: string;
  imageUrl?: string;
  imageError?: string; 
}

export interface DeconstructedStory {
  scenes: Scene[];
}

// For parsing Gemini's structured response
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
