import { useState } from 'react';

interface OnlineLobbyProps {
  onCreateRoom: () => void;
  onJoinRoom: (code: string) => void;
  onBack: () => void;
  error?: string;
}

export function OnlineLobby({ onCreateRoom, onJoinRoom, onBack, error }: OnlineLobbyProps) {
  const [roomCode, setRoomCode] = useState('');
  const [showJoin, setShowJoin] = useState(false);

  const handleJoin = () => {
    if (roomCode.trim().length === 6) {
      onJoinRoom(roomCode.trim().toUpperCase());
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (value.length <= 6) {
      setRoomCode(value);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-gray-900 to-blue-900 text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full px-2">
        <button
          onClick={onBack}
          className="mb-6 sm:mb-8 text-gray-400 hover:text-white active:text-gray-200 transition flex items-center gap-2 touch-manipulation"
          style={{ minHeight: '44px' }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span>Back</span>
        </button>

        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 sm:mb-8 text-center">
          Play Online
        </h2>

        {!showJoin ? (
          <div className="space-y-3 sm:space-y-4">
            <button
              onClick={onCreateRoom}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 active:from-green-700 active:to-emerald-700 text-white font-bold py-4 px-6 sm:px-8 rounded-lg shadow-lg transform transition hover:scale-105 active:scale-95 touch-manipulation"
              style={{ minHeight: '44px' }}
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-sm sm:text-base">Create Room</span>
              </div>
            </button>

            <button
              onClick={() => setShowJoin(true)}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 active:from-blue-700 active:to-indigo-700 text-white font-bold py-4 px-6 sm:px-8 rounded-lg shadow-lg transform transition hover:scale-105 active:scale-95 touch-manipulation"
              style={{ minHeight: '44px' }}
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                <span className="text-sm sm:text-base">Join Room</span>
              </div>
            </button>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg p-4 sm:p-6 shadow-xl">
            <h3 className="text-lg sm:text-xl font-bold mb-4">Enter Room Code</h3>
            
            <input
              type="text"
              value={roomCode}
              onChange={handleCodeChange}
              placeholder="ABCD12"
              className="w-full bg-gray-900 text-white text-xl sm:text-2xl font-mono text-center py-3 sm:py-4 px-4 rounded-lg border-2 border-gray-700 focus:border-blue-500 focus:outline-none mb-4 touch-manipulation"
              style={{ minHeight: '44px' }}
              maxLength={6}
              autoFocus
            />

            {error && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg text-sm text-red-200">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowJoin(false);
                  setRoomCode('');
                }}
                className="flex-1 bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-white font-bold py-3 px-4 sm:px-6 rounded-lg transition touch-manipulation"
                style={{ minHeight: '44px' }}
              >
                Cancel
              </button>
              <button
                onClick={handleJoin}
                disabled={roomCode.length !== 6}
                className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 active:from-blue-700 active:to-indigo-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 sm:px-6 rounded-lg transition touch-manipulation"
                style={{ minHeight: '44px' }}
              >
                Join
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
