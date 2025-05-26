import React from 'react';

interface WelcomePageProps {
  onStartCreating: () => void;
}

export function WelcomePage({ onStartCreating }: WelcomePageProps): React.ReactNode {
  return (
    <div className="text-center py-16 px-4">
      <h1 className="text-5xl md:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-orange-400 mb-6" style={{ fontFamily: "'Lora', serif" }}>
        Transform Your Stories into Visual Masterpieces
      </h1>
      <p className="text-slate-300 text-xl md:text-2xl mb-10 max-w-3xl mx-auto">
        Bring your narratives to life with AI-powered illustrations. Simply input your story, and watch as it transforms into a sequence of visually stunning scenes.
      </p>
      <button
        onClick={onStartCreating}
        className="px-10 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-xl font-semibold rounded-lg shadow-xl transition-transform transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-indigo-400 focus:ring-opacity-50"
      >
        Start Creating
      </button>
    </div>
  );
}
