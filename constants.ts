import { ArtStyle, ColorPalette, StylePreferences } from './types';

export const AVAILABLE_ART_STYLES: ArtStyle[] = [
  ArtStyle.REALISTIC,
  ArtStyle.CARTOON,
  ArtStyle.ANIME,
  ArtStyle.ABSTRACT,
  ArtStyle.PHOTOREALISTIC,
  ArtStyle.DARK_FANTASY,
  ArtStyle.WATERCOLOR,
  ArtStyle.COMIC_BOOK,
  ArtStyle.CYBERPUNK,
  ArtStyle.PIXEL_ART,
];

export const AVAILABLE_COLOR_PALETTES: ColorPalette[] = [
  ColorPalette.VIBRANT,
  ColorPalette.PASTEL,
  ColorPalette.MONOCHROME,
  ColorPalette.EARTHY,
];

export const DEFAULT_STYLE_PREFERENCES: StylePreferences = {
  artStyle: ArtStyle.REALISTIC,
  colorPalette: ColorPalette.VIBRANT,
  moodKeywords: "cinematic lighting, detailed", // Kept from previous structure for flexibility
  referenceArtists: "", // Kept from previous structure for flexibility
};

export const MAX_CHARACTERS = 5; // Or adjust as needed
