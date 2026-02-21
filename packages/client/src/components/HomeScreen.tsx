interface HomeScreenProps {
  onPlayAI: () => void;
  onPlayOnline: () => void;
}

export function HomeScreen({ onPlayAI, onPlayOnline }: HomeScreenProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-gray-900 to-blue-900 text-white flex items-center justify-center p-4">
      <div className="text-center max-w-md w-full px-2">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-3 sm:mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-400">
          Battleship
        </h1>
        <p className="text-gray-400 mb-8 sm:mb-12 text-base sm:text-lg px-4">
          Sink all enemy ships to win
        </p>
        
        <div className="space-y-3 sm:space-y-4">
          <button
            onClick={onPlayAI}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 active:from-cyan-700 active:to-blue-700 text-white font-bold py-4 px-6 sm:px-8 rounded-lg shadow-lg transform transition hover:scale-105 active:scale-95 touch-manipulation"
            style={{ minHeight: '44px' }}
          >
            <div className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="text-sm sm:text-base">Play vs AI</span>
            </div>
          </button>

          <button
            onClick={onPlayOnline}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 active:from-purple-700 active:to-pink-700 text-white font-bold py-4 px-6 sm:px-8 rounded-lg shadow-lg transform transition hover:scale-105 active:scale-95 touch-manipulation"
            style={{ minHeight: '44px' }}
          >
            <div className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
              <span className="text-sm sm:text-base">Play Online</span>
            </div>
          </button>
        </div>

        <div className="mt-8 sm:mt-12 text-xs text-gray-500 px-4">
          No account required • Play anywhere
        </div>
      </div>
    </div>
  );
}
