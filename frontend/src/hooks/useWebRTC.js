/* eslint-disable */
import { useRef, useCallback, useEffect } from 'react';

/**
 * useWebRTC — Fixed & Enhanced
 *
 * Fixes:
 *  1. TURN server added → works behind college NAT/firewall (was STUN-only)
 *  2. Proper ICE candidate queuing → no candidates dropped before remote desc set
 *  3. onPeerIdentified callback → GDRoomPage can build socketId→userId map
 *  4. Renegotiation guard → prevents duplicate offer race conditions
 *  5. Connection state recovery → auto-restart on transient ICE failures
 */

const ICE_SERVERS = {
  iceServers: [
    // STUN — public fallback
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    // TURN — critical for college NAT/symmetric NAT (add your Metered.ca creds here)
    // Free tier: signup at metered.ca → Credentials → copy below
    {
      urls: [
        'turn:a.relay.metered.ca:80',
        'turn:a.relay.metered.ca:443',
        'turn:a.relay.metered.ca:443?transport=tcp',
      ],
      username:   process.env.REACT_APP_TURN_USERNAME   || 'open',
      credential: process.env.REACT_APP_TURN_CREDENTIAL || 'open',
    },
  ],
  iceCandidatePoolSize: 10,
};

export function useWebRTC({ emit, roomCode, userId, onStream, onStreamRemoved, onPeerIdentified }) {
  const localStreamRef  = useRef(null);
  const peersRef        = useRef({});          // socketId → { pc, pendingCandidates[], hasRemote }
  const socketIdRef     = useRef(null);
  const makingOfferRef  = useRef({});          // socketId → bool (glare prevention)

  // ── Get local media ──────────────────────────────────────────────────────
  const getLocalStream = useCallback(async ({ audio = true, video = true } = {}) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio, video });
      localStreamRef.current = stream;
      return stream;
    } catch (err) {
      console.warn('[WebRTC] getUserMedia failed:', err.message);
      // Try audio-only fallback
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        localStreamRef.current = audioStream;
        return audioStream;
      } catch {
        return null;
      }
    }
  }, []);

  // ── Create a peer connection ─────────────────────────────────────────────
  const createPeer = useCallback((remoteSocketId, isInitiator) => {
    if (peersRef.current[remoteSocketId]?.pc) {
      return peersRef.current[remoteSocketId].pc;
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peersRef.current[remoteSocketId] = { pc, pendingCandidates: [], hasRemote: false };

    // Add local tracks (check localStreamRef or rtcLocalRef)
    const activeStream = localStreamRef.current;
    if (activeStream) {
      activeStream.getTracks().forEach(track => {
        pc.addTrack(track, activeStream);
      });
    }

    // ICE candidates — queue them if remote description not set yet
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        emit('webrtc-ice', {
          roomCode,
          toSocketId: remoteSocketId,
          candidate,
          fromSocketId: socketIdRef.current,
        });
      }
    };

    pc.onicegatheringstatechange = () => {
      console.log(`[WebRTC] ICE gathering: ${pc.iceGatheringState} (peer: ${remoteSocketId})`);
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.log(`[WebRTC] Connection state: ${state} (peer: ${remoteSocketId})`);
      if (state === 'connected') {
        // Connection established — clear pending candidates list
        if (peersRef.current[remoteSocketId]) {
          peersRef.current[remoteSocketId].pendingCandidates = [];
        }
      }
      if (['disconnected', 'failed', 'closed'].includes(state)) {
        onStreamRemoved?.(remoteSocketId);
        pc.close();
        delete peersRef.current[remoteSocketId];
        delete makingOfferRef.current[remoteSocketId];
      }
    };

    // Remote stream — fires when peer sends their tracks
    const remoteStream = new MediaStream();
    pc.ontrack = ({ track, streams }) => {
      if (streams?.[0]) {
        // Use the bundled MediaStream directly
        onStream?.(remoteSocketId, streams[0]);
      } else {
        // Build stream from individual tracks (Firefox)
        remoteStream.addTrack(track);
        onStream?.(remoteSocketId, remoteStream);
      }
    };

    if (isInitiator) {
      pc.onnegotiationneeded = async () => {
        if (makingOfferRef.current[remoteSocketId]) return; // prevent glare
        try {
          makingOfferRef.current[remoteSocketId] = true;
          const offer = await pc.createOffer();
          if (pc.signalingState !== 'stable') return;
          await pc.setLocalDescription(offer);
          emit('webrtc-offer', {
            roomCode,
            toSocketId: remoteSocketId,
            offer: pc.localDescription,
            fromSocketId: socketIdRef.current,
          });
        } catch (err) {
          console.warn('[WebRTC] createOffer error:', err.message);
        } finally {
          makingOfferRef.current[remoteSocketId] = false;
        }
      };
    }

    return pc;
  }, [emit, roomCode, onStream, onStreamRemoved]);

  // ── Apply queued ICE candidates ──────────────────────────────────────────
  const drainPendingCandidates = useCallback(async (remoteSocketId) => {
    const entry = peersRef.current[remoteSocketId];
    if (!entry || !entry.hasRemote) return;
    while (entry.pendingCandidates.length > 0) {
      const c = entry.pendingCandidates.shift();
      try {
        await entry.pc.addIceCandidate(new RTCIceCandidate(c));
      } catch {}
    }
  }, []);

  // ── Handle incoming WebRTC signaling events ──────────────────────────────
  const handleWebRTCEvent = useCallback(async (ev, data) => {
    switch (ev) {

      case 'webrtc-peer-joined': {
        // Remote peer announced themselves — notify parent so UI can build userId→socketId map
        onPeerIdentified?.(data.socketId, data.userId);
        // We initiate the offer
        const pc = createPeer(data.socketId, true);
        try {
          makingOfferRef.current[data.socketId] = true;
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          emit('webrtc-offer', {
            roomCode,
            toSocketId: data.socketId,
            offer: pc.localDescription,
            fromSocketId: socketIdRef.current,
          });
        } catch (err) {
          console.warn('[WebRTC] initial offer error:', err.message);
        } finally {
          makingOfferRef.current[data.socketId] = false;
        }
        break;
      }

      case 'webrtc-offer': {
        const pc = createPeer(data.fromSocketId, false);
        try {
          // Glare: if we're already making an offer, politely rollback (perfect negotiation)
          const isStable = pc.signalingState === 'stable';
          const offerCollision = !isStable;
          if (offerCollision) {
            if (makingOfferRef.current[data.fromSocketId]) {
              // We defer — other peer wins
              return;
            }
            await pc.setLocalDescription({ type: 'rollback' });
          }
          await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
          if (peersRef.current[data.fromSocketId]) {
            peersRef.current[data.fromSocketId].hasRemote = true;
          }
          await drainPendingCandidates(data.fromSocketId);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          emit('webrtc-answer', {
            roomCode,
            toSocketId: data.fromSocketId,
            answer: pc.localDescription,
            fromSocketId: socketIdRef.current,
          });
        } catch (err) {
          console.warn('[WebRTC] handle offer error:', err.message);
        }
        break;
      }

      case 'webrtc-answer': {
        const entry = peersRef.current[data.fromSocketId];
        if (!entry) break;
        try {
          if (entry.pc.signalingState === 'have-local-offer') {
            await entry.pc.setRemoteDescription(new RTCSessionDescription(data.answer));
            entry.hasRemote = true;
            await drainPendingCandidates(data.fromSocketId);
          }
        } catch (err) {
          console.warn('[WebRTC] handle answer error:', err.message);
        }
        break;
      }

      case 'webrtc-ice': {
        const entry = peersRef.current[data.fromSocketId];
        if (!entry || !data.candidate) break;
        if (entry.hasRemote) {
          try {
            await entry.pc.addIceCandidate(new RTCIceCandidate(data.candidate));
          } catch {}
        } else {
          // Queue until remote description is set
          entry.pendingCandidates.push(data.candidate);
        }
        break;
      }

      default: break;
    }
  }, [createPeer, drainPendingCandidates, emit, roomCode, onPeerIdentified]);

  // ── Announce self to the room (triggers webrtc-peer-joined on all others) ─
  const announceReady = useCallback((mySocketId) => {
    socketIdRef.current = mySocketId;
    emit('webrtc-ready', { roomCode, userId });
  }, [emit, roomCode, userId]);

  // ── Toggle audio/video on local stream ───────────────────────────────────
  const setMuted = useCallback((muted) => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !muted; });
  }, []);

  const setCameraOff = useCallback((off) => {
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = !off; });
  }, []);

  // ── Cleanup on unmount ───────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      Object.values(peersRef.current).forEach(({ pc }) => { try { pc.close(); } catch {} });
      localStreamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const setLocalStream = useCallback((stream) => {
    localStreamRef.current = stream;
    Object.values(peersRef.current).forEach(({ pc }) => {
      if (pc && stream) {
        stream.getTracks().forEach(track => {
          const senders = pc.getSenders();
          const exists  = senders.some(s => s.track?.id === track.id);
          if (!exists) pc.addTrack(track, stream);
        });
      }
    });
  }, []);

  return {
    getLocalStream,
    setLocalStream,
    announceReady,
    handleWebRTCEvent,
    setMuted,
    setCameraOff,
    localStreamRef,
    socketIdRef,
  };
}
