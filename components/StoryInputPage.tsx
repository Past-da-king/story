import React from 'react';

interface StoryInputPageProps {
  storyText: string;
  setStoryText: (text: string) => void;
  onContinue: () => void;
  isLoading: boolean;
}

export function StoryInputPage({ storyText, setStoryText, onContinue, isLoading }: StoryInputPageProps): React.ReactNode {
  return (
    <div className="w-full max-w-3xl mx-auto p-6 md:p-8 bg-slate-800 rounded-xl shadow-2xl">
      <h2 className="text-3xl md:text-4xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 mb-3" style={{ fontFamily: "'Lora', serif" }}>
        Let's Weave Your Tale
      </h2>
      <p className="text-center text-slate-300 mb-8">
        Pour your imagination onto the page. Describe your characters, settings, and plot twists. The more detail you provide, the richer your illustrated story will be.
      </p>
      <div className="mb-6">
        <label htmlFor="storyNarrative" className="block text-sm font-medium text-slate-300 mb-2 sr-only">
          Your Story Narrative
        </label>
        <textarea
          id="storyNarrative"
          value={storyText}
          onChange={(e) => setStoryText(e.target.value)}
          rows={15}
          className="w-full p-4 bg-slate-700 text-slate-100 border border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors shadow-sm text-base"
          placeholder="Once upon a time, in a land far, far away..."
          disabled={isLoading}
        />
        <p className="text-xs text-slate-400 mt-2 flex items-center">
          <LightBulbIcon className="h-4 w-4 mr-1.5 text-yellow-400" />
          Tip: Try to describe visual details like colors, textures, and emotions.
        </p>
      </div>
      <button
        onClick={onContinue}
        disabled={!storyText.trim() || isLoading}
        className="w-full px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-opacity-50"
      >
        {isLoading ? 'Processing...' : 'Continue to Character Descriptions'}
      </button>
    </div>
  );
}

function LightBulbIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.311V21m-3.75 0q-.164.021-.33.041M12 18q-.164.021-.33.041m4.058-1.344A12.063 12.063 0 0 1 12 16.5m0 0V9.75m0 6.75A12.063 12.063 0 0 0 7.942 16.656M12 9.75L12 9A3 3 0 0 1 9 9V6.75m3 2.25L12 9A3 3 0 0 0 15 9V6.75m-3 2.25A3 3 0 0 0 9 9m3 3L15 9m0 0V6.75m0 0a3 3 0 0 0-3-3h-3a3 3 0 0 0-3 3V9m0 0a3 3 0 0 0 3 3m0 0v.75m6.375-3.375a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
    </svg>
  );
}
