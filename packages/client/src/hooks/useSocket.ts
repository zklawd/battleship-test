import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

export interface ReconnectState {
  sessionId: string;
  roomCode: string;
}

export function useSocket() {
  const [connected, setConnected] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [reconnecting, setReconnecting] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const reconnectAttemptedRef = useRef(false);

  useEffect(() => {
    socketRef.current = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      setConnected(true);
      
      // Try to reconnect to existing session if available
      const storedSessionId = sessionStorage.getItem('battleship_session_id');
      const storedRoomCode = sessionStorage.getItem('battleship_room_code');
      
      if (storedSessionId && storedRoomCode && !reconnectAttemptedRef.current) {
        console.log('Attempting to reconnect to existing session...');
        setReconnecting(true);
        reconnectAttemptedRef.current = true;
        socket.emit('attempt-reconnect', {
          sessionId: storedSessionId,
          roomCode: storedRoomCode
        });
      }
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
      setConnected(false);
      reconnectAttemptedRef.current = false;
    });

    socket.on('session-created', (data: { sessionId: string }) => {
      console.log('Session created:', data.sessionId);
      setSessionId(data.sessionId);
      sessionStorage.setItem('battleship_session_id', data.sessionId);
    });

    socket.on('reconnect-success', () => {
      console.log('Reconnection successful');
      setReconnecting(false);
    });

    socket.on('reconnect-failed', (data: { message: string }) => {
      console.error('Reconnection failed:', data.message);
      setReconnecting(false);
      reconnectAttemptedRef.current = false;
      // Clear stored session data on reconnect failure
      sessionStorage.removeItem('battleship_session_id');
      sessionStorage.removeItem('battleship_room_code');
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const saveRoomCode = useCallback((roomCode: string) => {
    sessionStorage.setItem('battleship_room_code', roomCode);
  }, []);

  const clearSession = useCallback(() => {
    sessionStorage.removeItem('battleship_session_id');
    sessionStorage.removeItem('battleship_room_code');
    reconnectAttemptedRef.current = false;
  }, []);

  return {
    socket: socketRef.current,
    connected,
    sessionId,
    reconnecting,
    saveRoomCode,
    clearSession
  };
}
