import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const GD_URL = (process.env.REACT_APP_API_URL || 'http://localhost:5000').replace('/api', '');

const ALL_EVENTS = [
  'joined', 'participant-update', 'participant-left', 'participant-disconnected',
  'room-locked', 'room-full', 'room-locked-announce', 'wait-timer-started', 'ai-joined',
  'prep-phase', 'discussion-start', 'caption', 'ai-message', 'ai-voice',
  'chat-message', 'session-ended', 'evaluation-ready', 'time-warning', 'error',
  'stt-result', 'forward-speech', 'participant-media-update', 'active-speaker-update',
  // WebRTC
  'webrtc-offer', 'webrtc-answer', 'webrtc-ice', 'webrtc-peer-joined',
];

export function useGDSocket({ onEvent } = {}) {
  const socketRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('pragati_token');
    const socket = io(`${GD_URL}/gd`, {
      auth:       { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });
    socketRef.current = socket;

    ALL_EVENTS.forEach(ev => socket.on(ev, data => onEvent?.(ev, data)));

    return () => { socket.disconnect(); };
  // eslint-disable-next-line
  }, []);

  const emit = useCallback((event, data) => {
    socketRef.current?.emit(event, data);
  }, []);

  const getSocketId = useCallback(() => socketRef.current?.id, []);

  return { emit, socket: socketRef, getSocketId };
}
