import { useState } from 'react';

interface RoomViewProps {
  roomCode: string;
  playerCount: number;
  onCancel: () => void;
}

export function RoomView({ roomCode, playerCount, onCancel }: RoomViewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-gray-900 to-blue-900 text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-gray-800 rounded-lg p-8 shadow-xl">
          <h2 className="text-2xl font-bold mb-6 text-center">
            {playerCount === 1 ? 'Waiting for Opponent' : 'Room Ready!'}
          </h2>

          <div className="mb-6">
            <label className="block text-sm text-gray-400 mb-2 text-center">
              Room Code
            </label>
            <div className="bg-gray-900 rounded-lg p-6 border-2 border-blue-500">
              <div className="text-5xl font-bold font-mono text-center tracking-wider text-blue-400 mb-4">
                {roomCode}
              </div>
              <button
                onClick={handleCopy}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg transition flex items-center justify-center gap-2"
              >
                {copied ? (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span>Copy to Clipboard</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-sm">You</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${playerCount === 2 ? 'bg-green-500' : 'bg-gray-600 animate-pulse'}`}></div>
                <span className="text-sm">Opponent</span>
              </div>
            </div>
          </div>

          {playerCount === 1 && (
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 text-gray-400">
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-sm">Share the code with a friend to start playing</span>
              </div>
            </div>
          )}

          {playerCount === 2 && (
            <div className="text-center mb-6 p-4 bg-green-500/20 border border-green-500 rounded-lg">
              <span className="text-green-400 font-medium">Both players connected!</span>
            </div>
          )}

          <button
            onClick={onCancel}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition"
          >
            Leave Room
          </button>
        </div>
      </div>
    </div>
  );
}
