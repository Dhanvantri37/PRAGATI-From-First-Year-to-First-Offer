import React, { useEffect, useRef, useState } from 'react';

const GRAD = 'linear-gradient(135deg,#531697,#13a1a5)';

// ── Animated AI Face Component for GD ───────────────────────────────────────
function AIFaceTile({ participant, isActiveSpeaker, size }) {
  const [blink, setBlink] = useState(false);
  useEffect(() => {
    const interval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 150);
    }, 3500 + Math.random() * 2000);
    return () => clearInterval(interval);
  }, []);

  const [mouthHeight, setMouthHeight] = useState(2);
  useEffect(() => {
    if (!isActiveSpeaker) {
      setMouthHeight(2);
      return;
    }
    const interval = setInterval(() => {
      setMouthHeight(Math.random() * 8 + 3);
    }, 120);
    return () => clearInterval(interval);
  }, [isActiveSpeaker]);

  const isPriya = participant?.name?.includes('Priya');
  const isVikram = participant?.name?.includes('Vikram');
  
  let eyeLeft = 56.35, eyeRight = 66.21, eyeTop = 36.23;
  let mouthLeft = 50.00, mouthTop = 62.00;
  let skinTone = '#dfb495';
  let lipColor = '#a65c56';

  if (isPriya) {
    eyeLeft = 45.31; eyeRight = 54.30; eyeTop = 32.62;
    skinTone = '#eec2a3'; lipColor = '#c86a62'; mouthTop = 59.00;
  } else if (isVikram) {
    eyeLeft = 44.04; eyeRight = 53.61; eyeTop = 30.38;
    skinTone = '#cca080'; lipColor = '#8c463c'; mouthTop = 60.00;
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <img src={participant?.avatarUrl || '/arjun_sharma.png'} alt="AI Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      {/* Eyes */}
      <div style={{ position: 'absolute', left: `${eyeLeft}%`, top: `${eyeTop}%`, width: '4%', height: blink ? '2%' : '0%', background: skinTone, borderRadius: '50%', transform: 'translate(-50%,-50%)', transition: 'height 0.1s' }} />
      <div style={{ position: 'absolute', left: `${eyeRight}%`, top: `${eyeTop}%`, width: '4%', height: blink ? '2%' : '0%', background: skinTone, borderRadius: '50%', transform: 'translate(-50%,-50%)', transition: 'height 0.1s' }} />
      {/* Mouth */}
      {isActiveSpeaker && (
        <div style={{ position: 'absolute', left: `${mouthLeft}%`, top: `${mouthTop}%`, width: '12%', height: `${mouthHeight}%`, background: '#47121b', border: `2px solid ${lipColor}`, borderRadius: '50%', transform: 'translate(-50%,-50%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
           <div style={{ width: '70%', height: '10%', background: '#fff', position: 'absolute', top: '2px' }} />
        </div>
      )}
    </div>
  );
}

/**
 * A single participant video tile — Google Meet style.
 * stream        — MediaStream (null for AI or no camera)
 * participant   — { name, isAI, isMuted, isCameraOff, userId }
 * isActiveSpeaker — bool
 * isLocal       — bool (flip video horizontally)
 * size          — 'large' | 'small' (controls layout)
 */
export default function VideoTile({ stream, participant, isActiveSpeaker, isLocal, size = 'small', style = {} }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream]);

  const showVideo = !!stream && !participant?.isCameraOff && !participant?.isAI;
  const name = participant?.name || 'Unknown';
  const initial = name[0]?.toUpperCase() || '?';

  const borderColor = isActiveSpeaker ? '#47d372' : participant?.isAI ? '#13a1a5' : 'transparent';
  const borderWidth = isActiveSpeaker ? 3 : participant?.isAI ? 2 : 0;

  return (
    <div style={{
      position: 'relative',
      borderRadius: 14,
      overflow: 'hidden',
      background: participant?.isAI ? '#0a2233' : '#1a2640',
      border: `${borderWidth}px solid ${borderColor}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      aspectRatio: '16/9',
      transition: 'border-color 0.2s ease',
      boxShadow: isActiveSpeaker ? `0 0 16px ${borderColor}55` : '0 2px 8px rgba(0,0,0,0.3)',
      ...style,
    }}>
      {/* Always render video element if stream exists — keeps audio alive even when camera is off */}
      {stream && (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={isLocal}
            style={{
              width: '100%', height: '100%', objectFit: 'cover',
              transform: isLocal ? 'scaleX(-1)' : 'none',
              opacity: showVideo ? 1 : 0,
              position: showVideo ? 'relative' : 'absolute',
              pointerEvents: showVideo ? 'auto' : 'none',
              zIndex: showVideo ? 2 : 0,
            }}
          />
          {!isLocal && (
            <audio
              ref={(audioEl) => {
                if (audioEl && stream && audioEl.srcObject !== stream) {
                  audioEl.srcObject = stream;
                  audioEl.play().catch(() => {});
                }
              }}
              autoPlay
              playsInline
              style={{ display: 'none' }}
            />
          )}
        </>
      )}

      {/* Avatar fallback — shown when camera is off or no video */}
      {!showVideo && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: size === 'large' ? 80 : 52,
            height: size === 'large' ? 80 : 52,
            borderRadius: '50%',
            background: participant?.isAI ? 'rgba(19,161,165,0.25)' : GRAD,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: participant?.isAI ? '1.8rem' : (size === 'large' ? '2rem' : '1.3rem'),
            fontFamily: "'Syne',sans-serif", fontWeight: 800, color: '#fff',
            overflow: 'hidden'
          }}>
            {participant?.isAI ? (
               participant?.avatarUrl ? <AIFaceTile participant={participant} isActiveSpeaker={isActiveSpeaker} size={size} /> : '🤖'
            ) : initial}
          </div>
          {size === 'large' && (
            <div style={{ color: '#9ab0c8', fontSize: '.8rem', fontWeight: 700 }}>
              {participant?.isCameraOff ? 'Camera off' : 'No video'}
            </div>
          )}
        </div>
      )}

      {/* Name bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '24px 10px 8px',
        background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        {participant?.isMuted && (
          <span style={{ fontSize: '.75rem', color: '#ef4444', background: 'rgba(0,0,0,0.6)', borderRadius: 4, padding: '1px 5px' }}>🔇</span>
        )}
        <span style={{ fontSize: '.78rem', fontWeight: 700, color: '#fff', fontFamily: "'Nunito',sans-serif", textShadow: '0 1px 3px rgba(0,0,0,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {participant?.isAI ? `🤖 ${name}` : name}
          {isLocal && <span style={{ color: '#13a1a5', marginLeft: 4 }}>(you)</span>}
        </span>
        {isActiveSpeaker && !participant?.isMuted && (
          <span style={{ fontSize: '.7rem', color: '#47d372', fontWeight: 800 }}>● LIVE</span>
        )}
      </div>
    </div>
  );
}
