import { useEffect, useState } from 'react';
import { BOARD_SIZE, SHIPS } from '@battleship/shared';

function App() {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Test connection to server
    fetch('http://localhost:3001/health')
      .then(res => res.json())
      .then(() => setConnected(true))
      .catch(() => setConnected(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Battleship</h1>
        <p className="text-gray-400 mb-2">Board Size: {BOARD_SIZE}x{BOARD_SIZE}</p>
        <p className="text-gray-400 mb-4">Ships: {SHIPS.length}</p>
        <div className="flex items-center justify-center gap-2">
          <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm">
            Server {connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default App;
