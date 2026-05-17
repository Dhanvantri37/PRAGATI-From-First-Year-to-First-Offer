import React, { useEffect, useRef, useState } from 'react';

const GRAD = 'linear-gradient(135deg,#531697,#13a1a5)';

/**
 * Shown before the GD room loads.
 * Requests mic + camera, shows preview, then calls onReady(stream).
 */
export default function MediaPermissionGate({ roomCode, userName, onReady, onSkip }) {
  const videoRef       = useRef(null);
  const streamRef      = useRef(null);
  const [step, setStep]       = useState('prompt');   // prompt | preview | error
  const [micOk, setMicOk]     = useState(false);
  const [camOk, setCamOk]     = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [errMsg, setErrMsg]   = useState('');

  async function requestMedia() {
    setStep('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      streamRef.current = stream;
      setMicOk(true); setCamOk(true); setStep('preview');
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch {
      // Try audio only
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        streamRef.current = audioStream;
        setMicOk(true); setCamOk(false); setIsCamOff(true); setStep('preview');
      } catch (e2) {
        setErrMsg('Could not access microphone. Please allow microphone permission and reload.');
        setStep('error');
      }
    }
  }

  function toggleMic() {
    const muted = !isMuted;
    streamRef.current?.getAudioTracks().forEach(t => { t.enabled = !muted; });
    setIsMuted(muted);
  }

  function toggleCam() {
    const off = !isCamOff;
    streamRef.current?.getVideoTracks().forEach(t => { t.enabled = !off; });
    setIsCamOff(off);
  }

  function joinNow() {
    onReady(streamRef.current, { isMuted, isCamOff });
  }

  useEffect(() => () => {
    // Don't stop stream here — pass ownership to GDRoomPage
  }, []);

  // ── PROMPT SCREEN ────────────────────────────────────────────────────────
  if (step === 'prompt' || step === 'requesting') return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f1a2e', padding: 24 }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: '40px 36px', maxWidth: 440, width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🎤</div>
        <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '1.5rem', color: '#0f1a2e', marginBottom: 8 }}>
          Join GD Session
        </div>
        <div style={{ fontSize: '.85rem', color: '#7a8ba8', marginBottom: 6 }}>Room Code</div>
        <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '1.3rem', color: '#531697', background: 'rgba(83,22,151,0.08)', padding: '6px 20px', borderRadius: 10, display: 'inline-block', marginBottom: 20 }}>{roomCode}</div>
        <div style={{ fontSize: '.9rem', color: '#3d4e6b', marginBottom: 24, lineHeight: 1.6 }}>
          PRAGATI needs access to your <strong>microphone</strong> and <strong>camera</strong> for the Group Discussion.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {[['🎙️','Microphone','To speak and be heard by participants'],['📹','Camera','To show your live video to others']].map(([ic, name, desc]) => (
            <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, background: '#f8faff', border: '1px solid #e8edf5', textAlign: 'left' }}>
              <span style={{ fontSize: 20 }}>{ic}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: '.85rem', color: '#0f1a2e' }}>{name}</div>
                <div style={{ fontSize: '.75rem', color: '#7a8ba8' }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
        <button onClick={requestMedia} disabled={step === 'requesting'}
          style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: GRAD, color: '#fff', fontWeight: 800, fontFamily: "'Nunito',sans-serif", fontSize: '1rem', cursor: step === 'requesting' ? 'wait' : 'pointer', marginBottom: 10 }}>
          {step === 'requesting' ? '⏳ Requesting…' : '🔓 Allow & Continue'}
        </button>
        <button onClick={() => onSkip()} style={{ width: '100%', padding: '10px', borderRadius: 10, border: '1.5px solid #d0d7e8', background: 'transparent', color: '#7a8ba8', fontWeight: 700, fontFamily: "'Nunito',sans-serif", cursor: 'pointer', fontSize: '.88rem' }}>
          Join without camera (voice only)
        </button>
      </div>
    </div>
  );

  // ── ERROR ─────────────────────────────────────────────────────────────────
  if (step === 'error') return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f1a2e', padding: 24 }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: '40px 36px', maxWidth: 440, width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '1.3rem', color: '#0f1a2e', marginBottom: 12 }}>Permission Required</div>
        <div style={{ color: '#7a8ba8', marginBottom: 24, lineHeight: 1.6 }}>{errMsg}</div>
        <button onClick={() => onSkip()} style={{ padding: '12px 28px', borderRadius: 12, border: 'none', background: GRAD, color: '#fff', fontWeight: 800, fontFamily: "'Nunito',sans-serif", cursor: 'pointer' }}>
          Continue Without Camera
        </button>
      </div>
    </div>
  );

  // ── PREVIEW SCREEN ────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f1a2e', padding: 24 }}>
      <div style={{ background: '#1a2640', borderRadius: 20, padding: '32px 28px', maxWidth: 520, width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
        <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '1.3rem', color: '#fff', marginBottom: 20 }}>Ready to join?</div>

        {/* Camera preview */}
        <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', background: '#0f1a2e', marginBottom: 20, aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {camOk && !isCamOff ? (
            <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: GRAD, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', fontFamily: "'Syne',sans-serif", fontWeight: 800, color: '#fff' }}>
                {userName?.[0]?.toUpperCase() || '?'}
              </div>
              <div style={{ color: '#7a8ba8', fontSize: '.85rem' }}>{isCamOff ? 'Camera off' : 'Camera not available'}</div>
            </div>
          )}
          {/* Name badge */}
          <div style={{ position: 'absolute', bottom: 10, left: 12, background: 'rgba(0,0,0,0.65)', color: '#fff', padding: '4px 12px', borderRadius: 20, fontSize: '.78rem', fontWeight: 700 }}>{userName}</div>
        </div>

        {/* Media controls */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginBottom: 24 }}>
          <ControlBtn icon={isMuted ? '🔇' : '🎙️'} label={isMuted ? 'Unmute' : 'Mute'} active={isMuted} onClick={toggleMic} />
          {camOk && <ControlBtn icon={isCamOff ? '📷' : '📹'} label={isCamOff ? 'Start Camera' : 'Stop Camera'} active={isCamOff} onClick={toggleCam} />}
        </div>

        {/* Status row */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 24 }}>
          <StatusBadge ok={micOk && !isMuted} label="Microphone" />
          <StatusBadge ok={camOk && !isCamOff} label="Camera" />
        </div>

        <button onClick={joinNow}
          style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: '#1a9c3e', color: '#fff', fontWeight: 800, fontFamily: "'Nunito',sans-serif", fontSize: '1.05rem', cursor: 'pointer', marginBottom: 10 }}>
          ✅ Join Now
        </button>
        <div style={{ fontSize: '.75rem', color: '#4a5a7a' }}>Room Code: <strong style={{ color: '#13a1a5' }}>{roomCode}</strong></div>
      </div>
    </div>
  );
}

function ControlBtn({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '10px 16px', borderRadius: 12, border: 'none', background: active ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.1)', cursor: 'pointer' }}>
      <span style={{ fontSize: 22 }}>{icon}</span>
      <span style={{ fontSize: '.68rem', color: active ? '#ef4444' : '#9ab0c8', fontWeight: 700, fontFamily: "'Nunito',sans-serif" }}>{label}</span>
    </button>
  );
}

function StatusBadge({ ok, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.78rem', color: ok ? '#47d372' : '#ef4444', fontWeight: 700 }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: ok ? '#47d372' : '#ef4444' }} />
      {label}
    </div>
  );
}
