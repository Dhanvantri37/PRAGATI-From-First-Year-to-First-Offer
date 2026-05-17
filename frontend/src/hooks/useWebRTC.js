import { useRef, useCallback, useEffect } from 'react';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

/**
 * Manages a WebRTC mesh of peer connections.
 * emit   — socket emit function from useGDSocket
 * onStream(socketId, stream)  — called when a remote stream arrives
 * onStreamRemoved(socketId)   — called when a peer disconnects
 */
export function useWebRTC({ emit, roomCode, userId, onStream, onStreamRemoved }) {
  const localStreamRef = useRef(null);
  const peersRef       = useRef({});   // socketId → RTCPeerConnection
  const socketIdRef    = useRef(null);

  // ── Get local media ──────────────────────────────────────────────────────
  const getLocalStream = useCallback(async ({ audio = true, video = true } = {}) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio, video });
      localStreamRef.current = stream;
      return stream;
    } catch (err) {
      console.warn('[WebRTC] getUserMedia failed:', err.message);
      return null;
    }
  }, []);

  // ── Create a peer connection to another socket ──────────────────────────
  const createPeer = useCallback((remoteSocketId, isInitiator) => {
    if (peersRef.current[remoteSocketId]) return peersRef.current[remoteSocketId];

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peersRef.current[remoteSocketId] = pc;

    // Add local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    // ICE candidates
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        emit('webrtc-ice', {
          roomCode, toSocketId: remoteSocketId,
          candidate, fromSocketId: socketIdRef.current,
        });
      }
    };

    // Remote stream
    pc.ontrack = ({ streams }) => {
      if (streams?.[0]) onStream?.(remoteSocketId, streams[0]);
    };

    pc.onconnectionstatechange = () => {
      if (['disconnected','failed','closed'].includes(pc.connectionState)) {
        onStreamRemoved?.(remoteSocketId);
        pc.close();
        delete peersRef.current[remoteSocketId];
      }
    };

    if (isInitiator) {
      pc.onnegotiationneeded = async () => {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        emit('webrtc-offer', {
          roomCode, toSocketId: remoteSocketId,
          offer: pc.localDescription, fromSocketId: socketIdRef.current,
        });
      };
    }

    return pc;
  }, [emit, roomCode, onStream, onStreamRemoved]);

  // ── Handle incoming WebRTC events ────────────────────────────────────────
  const handleWebRTCEvent = useCallback(async (ev, data) => {
    switch (ev) {
      case 'webrtc-peer-joined': {
        // A new peer announced themselves — we initiate
        const pc = createPeer(data.socketId, true);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        emit('webrtc-offer', {
          roomCode, toSocketId: data.socketId,
          offer: pc.localDescription, fromSocketId: socketIdRef.current,
        });
        break;
      }
      case 'webrtc-offer': {
        const pc = createPeer(data.fromSocketId, false);
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        emit('webrtc-answer', {
          roomCode, toSocketId: data.fromSocketId,
          answer: pc.localDescription, fromSocketId: socketIdRef.current,
        });
        break;
      }
      case 'webrtc-answer': {
        const pc = peersRef.current[data.fromSocketId];
        if (pc) await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        break;
      }
      case 'webrtc-ice': {
        const pc = peersRef.current[data.fromSocketId];
        if (pc && data.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(() => {});
        }
        break;
      }
      default: break;
    }
  }, [createPeer, emit, roomCode]);

  // ── Announce self to room ────────────────────────────────────────────────
  const announceReady = useCallback((mySocketId) => {
    socketIdRef.current = mySocketId;
    emit('webrtc-ready', { roomCode, userId });
  }, [emit, roomCode, userId]);

  // ── Toggle audio/video ───────────────────────────────────────────────────
  const setMuted = useCallback((muted) => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !muted; });
  }, []);

  const setCameraOff = useCallback((off) => {
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = !off; });
  }, []);

  // ── Cleanup ──────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      Object.values(peersRef.current).forEach(pc => pc.close());
      localStreamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  return { getLocalStream, announceReady, handleWebRTCEvent, setMuted, setCameraOff, localStreamRef };
}
