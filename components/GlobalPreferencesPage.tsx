import React from 'react';
// Corrected imports: Types from 'types.ts', Constants from 'constants.ts'
import { StylePreferences, ArtStyle, ColorPalette } from '../types';
import { AVAILABLE_ART_STYLES, AVAILABLE_COLOR_PALETTES } from '../constants';

interface GlobalPreferencesPageProps {
  preferences: StylePreferences;
  setPreferences: React.Dispatch<React.SetStateAction<StylePreferences>>;
  onContinue: () => void;
  onBack: () => void;
  isLoading: boolean;
}

export function GlobalPreferencesPage({ preferences, setPreferences, onContinue, onBack, isLoading }: GlobalPreferencesPageProps): React.ReactNode {
  const handleStyleChange = <K extends keyof StylePreferences>(key: K, value: StylePreferences[K]) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 md:p-8 bg-slate-800 rounded-xl shadow-2xl">
      <h2 className="text-3xl md:text-4xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-lime-500 mb-3" style={{ fontFamily: "'Lora', serif" }}>
        Global Visual Preferences
      </h2>
      <p className="text-center text-slate-300 mb-8">
        Customize the default settings for character design and scene generation.
      </p>

      <div className="space-y-6">
        {/* Art Style */}
        <div className="p-4 bg-slate-700/50 rounded-lg">
          <label htmlFor="artStyle" className="block text-lg font-medium text-slate-200 mb-2">
            🎨 Art Style
          </label>
          <select
            id="artStyle"
            value={preferences.artStyle}
            onChange={(e) => handleStyleChange('artStyle', e.target.value as ArtStyle)}
            disabled={isLoading}
            className="w-full p-3 bg-slate-600 text-slate-100 border border-slate-500 rounded-md focus:ring-2 focus:ring-emerald-500 text-base"
          >
            {AVAILABLE_ART_STYLES.map(style => <option key={style} value={style}>{style}</option>)}
          </select>
        </div>

        {/* Color Palette */}
        <div className="p-4 bg-slate-700/50 rounded-lg">
          <label htmlFor="colorPalette" className="block text-lg font-medium text-slate-200 mb-2">
            💧 Color Palette
          </label>
          <select
            id="colorPalette"
            value={preferences.colorPalette}
            onChange={(e) => handleStyleChange('colorPalette', e.target.value as ColorPalette)}
            disabled={isLoading}
            className="w-full p-3 bg-slate-600 text-slate-100 border border-slate-500 rounded-md focus:ring-2 focus:ring-emerald-500 text-base"
          >
            {AVAILABLE_COLOR_PALETTES.map(palette => <option key={palette} value={palette}>{palette}</option>)}
          </select>
        </div>

         {/* Mood Keywords - kept for flexibility from original structure */}
        <div className="p-4 bg-slate-700/50 rounded-lg">
            <label htmlFor="moodKeywords" className="block text-lg font-medium text-slate-200 mb-2">
                🎭 Mood/Atmosphere Keywords
            </label>
            <input
                type="text"
                id="moodKeywords"
                value={preferences.moodKeywords}
                onChange={(e) => handleStyleChange('moodKeywords', e.target.value)}
                className="w-full p-3 bg-slate-600 text-slate-100 border border-slate-500 rounded-md focus:ring-2 focus:ring-emerald-500 text-base"
                placeholder="e.g., mysterious, vibrant, dark, cinematic"
                disabled={isLoading}
            />
        </div>

        {/* Reference Artists - kept for flexibility */}
        <div className="p-4 bg-slate-700/50 rounded-lg">
            <label htmlFor="referenceArtists" className="block text-lg font-medium text-slate-200 mb-2">
                🖌️ Reference Artists (Optional)
            </label>
            <input
                type="text"
                id="referenceArtists"
                value={preferences.referenceArtists}
                onChange={(e) => handleStyleChange('referenceArtists', e.target.value)}
                className="w-full p-3 bg-slate-600 text-slate-100 border border-slate-500 rounded-md focus:ring-2 focus:ring-emerald-500 text-base"
                placeholder="e.g., Studio Ghibli, Artgerm, Van Gogh"
                disabled={isLoading}
            />
        </div>
      </div>

      <div className="mt-10 flex flex-col sm:flex-row justify-between gap-4">
        <button
          onClick={onBack}
          className="px-8 py-3 bg-slate-600 hover:bg-slate-500 text-white font-semibold rounded-lg shadow-md transition-colors"
        >
          Back to Characters
        </button>
        <button
          onClick={onContinue}
          disabled={isLoading}
          className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-semibold rounded-lg shadow-lg disabled:opacity-50 transition-colors"
        >
          {isLoading ? 'Saving...' : 'Continue to Character Design Review'}
        </button>
      </div>
    </div>
  );
}
