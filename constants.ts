
import { ArtStyle } from './types';

export const AVAILABLE_ART_STYLES: ArtStyle[] = [
  ArtStyle.PHOTOREALISTIC,
  ArtStyle.ANIME,
  ArtStyle.CARTOONISH,
  ArtStyle.DARK_FANTASY,
  ArtStyle.IMPRESSIONISTIC,
  ArtStyle.PIXEL_ART,
  ArtStyle.CYBERPUNK,
  ArtStyle.STEAMPUNK,
  ArtStyle.WATERCOLOR,
  ArtStyle.COMIC_BOOK,
];

export const DEFAULT_STYLE_PREFERENCES: import('./types').StylePreferences = {
  artStyle: ArtStyle.PHOTOREALISTIC,
  moodKeywords: "cinematic lighting, detailed",
  referenceArtists: "",
};

export const MAX_CHARACTERS = 5;
