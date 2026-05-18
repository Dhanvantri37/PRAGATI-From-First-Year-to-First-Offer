import React, { useState, useEffect } from 'react';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner]         = useState(false);
  const [isIOS, setIsIOS]                   = useState(false);
  const [installed, setInstalled]           = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
      setInstalled(true);
      return;
    }

    // Check if already dismissed
    const dismissed = localStorage.getItem('pragati_pwa_dismissed');
    if (dismissed && Date.now() - parseInt(dismissed) < 7 * 24 * 60 * 60 * 1000) return;

    // iOS detection (Safari on iOS doesn't support beforeinstallprompt)
    const ua = navigator.userAgent;
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    if (isIOSDevice) {
      setIsIOS(true);
      setTimeout(() => setShowBanner(true), 3000);
      return;
    }

    // Android/Desktop: listen for install prompt
    const handler = e => {
      e.preventDefault();
      setDeferredPrompt(e);
      setTimeout(() => setShowBanner(true), 3000);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Detect SW update
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        setUpdateAvailable(true);
      });
    }

    // App installed
    window.addEventListener('appinstalled', () => {
      setShowBanner(false);
      setInstalled(true);
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  async function handleInstall() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setInstalled(true);
      setShowBanner(false);
      setDeferredPrompt(null);
    }
  }

  function handleDismiss() {
    setShowBanner(false);
    localStorage.setItem('pragati_pwa_dismissed', Date.now().toString());
  }

  // Update available toast
  if (updateAvailable) {
    return (
      <div style={{ position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)', zIndex:9999, background:'#0f1a2e', borderRadius:14, padding:'12px 18px', color:'#fff', display:'flex', alignItems:'center', gap:12, boxShadow:'0 8px 32px rgba(0,0,0,0.3)', maxWidth:360, width:'calc(100% - 32px)', fontFamily:"'Nunito',sans-serif" }}>
        <span style={{ fontSize:'1.2rem' }}>🔄</span>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:800, fontSize:'.82rem' }}>Update available</div>
          <div style={{ fontSize:'.72rem', opacity:.7, marginTop:2 }}>PRAGATI has been updated</div>
        </div>
        <button onClick={() => window.location.reload()}
          style={{ padding:'6px 14px', borderRadius:8, border:'none', background:'linear-gradient(135deg,#531697,#13a1a5)', color:'#fff', fontWeight:800, cursor:'pointer', fontSize:'.75rem', fontFamily:"'Nunito',sans-serif", whiteSpace:'nowrap' }}>
          Reload
        </button>
      </div>
    );
  }

  if (!showBanner || installed) return null;

  // iOS install instructions
  if (isIOS) {
    return (
      <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:9998, background:'#fff', borderTop:'1px solid #e8edf5', padding:'16px 20px', boxShadow:'0 -8px 32px rgba(0,0,0,0.12)', fontFamily:"'Nunito',sans-serif" }}>
        <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
          <img src="/icon-72x72.png" alt="PRAGATI" style={{ width:48, height:48, borderRadius:12, flexShrink:0 }}/>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.9rem', color:'#0f1a2e', marginBottom:4 }}>Install PRAGATI on your iPhone</div>
            <div style={{ fontSize:'.78rem', color:'#7a8ba8', lineHeight:1.6 }}>
              Tap <strong style={{ color:'#0f1a2e' }}>Share</strong> <span style={{ fontSize:'1rem' }}>□↑</span> at the bottom of Safari, then tap <strong style={{ color:'#0f1a2e' }}>"Add to Home Screen"</strong> <span style={{ fontSize:'.9rem' }}>⊞</span>
            </div>
          </div>
          <button onClick={handleDismiss}
            style={{ width:28, height:28, borderRadius:'50%', border:'1px solid #e8edf5', background:'#f8f9fc', cursor:'pointer', fontSize:'.85rem', color:'#7a8ba8', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            ×
          </button>
        </div>
        {/* Arrow pointing down to share button */}
        <div style={{ textAlign:'center', marginTop:10, fontSize:'.65rem', color:'#b0bec9' }}>
          ↓ Use the Safari Share button below ↓
        </div>
      </div>
    );
  }

  // Android/Desktop install banner
  return (
    <div style={{ position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)', zIndex:9998, background:'#fff', borderRadius:16, padding:'14px 18px', boxShadow:'0 8px 40px rgba(4,44,93,0.18)', display:'flex', alignItems:'center', gap:12, maxWidth:380, width:'calc(100% - 32px)', fontFamily:"'Nunito',sans-serif", border:'1px solid rgba(83,22,151,0.15)' }}>
      <img src="/icon-72x72.png" alt="PRAGATI" style={{ width:44, height:44, borderRadius:10, flexShrink:0 }}/>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.85rem', color:'#0f1a2e' }}>Install PRAGATI App</div>
        <div style={{ fontSize:'.72rem', color:'#7a8ba8', marginTop:2 }}>Works offline · Faster · No browser bar</div>
      </div>
      <div style={{ display:'flex', gap:6, flexShrink:0 }}>
        <button onClick={handleDismiss}
          style={{ padding:'6px 10px', borderRadius:8, border:'1px solid #e8edf5', background:'transparent', color:'#b0bec9', fontWeight:700, cursor:'pointer', fontSize:'.72rem', fontFamily:"'Nunito',sans-serif" }}>
          Later
        </button>
        <button onClick={handleInstall}
          style={{ padding:'6px 14px', borderRadius:8, border:'none', background:'linear-gradient(135deg,#531697,#13a1a5)', color:'#fff', fontWeight:800, cursor:'pointer', fontSize:'.78rem', fontFamily:"'Nunito',sans-serif", whiteSpace:'nowrap' }}>
          📲 Install
        </button>
      </div>
    </div>
  );
}
