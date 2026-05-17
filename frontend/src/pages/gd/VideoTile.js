import React, { useEffect, useRef } from 'react';

const GRAD = 'linear-gradient(135deg,#531697,#13a1a5)';

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
      {/* Video */}
      {showVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          style={{
            width: '100%', height: '100%', objectFit: 'cover',
            transform: isLocal ? 'scaleX(-1)' : 'none',
          }}
        />
      ) : (
        /* Avatar fallback */
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: size === 'large' ? 80 : 52,
            height: size === 'large' ? 80 : 52,
            borderRadius: '50%',
            background: participant?.isAI ? 'rgba(19,161,165,0.25)' : GRAD,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: participant?.isAI ? '1.8rem' : (size === 'large' ? '2rem' : '1.3rem'),
            fontFamily: "'Syne',sans-serif", fontWeight: 800, color: '#fff',
          }}>
            {participant?.isAI ? '🤖' : initial}
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
