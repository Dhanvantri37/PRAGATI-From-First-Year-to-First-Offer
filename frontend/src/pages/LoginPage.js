import React, { useState } from 'react';
// navigation is handled by AppRoutes after user state updates
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [form, setForm]       = useState({ email: '', password: '' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({});
  const { login } = useAuth();
  
  const [mode, setMode] = useState('login'); // 'login' or 'forgot'
  const [forgotMsg, setForgotMsg] = useState('');

  const set = k => e => {
    setForm(f => ({ ...f, [k]: e.target.value }));
    if (error) setError(''); // clear error when user starts typing
    if (forgotMsg) setForgotMsg('');
  };
  const touch = k => () => setTouched(t => ({ ...t, [k]: true }));

  // Client-side validation before hitting API
  function validate() {
    if (!form.email.trim()) return 'Please enter your email address.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Please enter a valid email address.';
    if (mode === 'login') {
      if (!form.password) return 'Please enter your password.';
      if (form.password.length < 6) return 'Password must be at least 6 characters.';
    }
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setLoading(true); setError(''); setForgotMsg('');
    try {
      if (mode === 'forgot') {
        const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
        const res = await fetch(`${API}/auth/forgot-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: form.email.trim() })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to reset password');
        setForgotMsg('All set 🎉 We’ve sent a temporary password to your email 📩. Please check your inbox to continue ✔️');
        setTimeout(() => setMode('login'), 3000);
      } else {
        await login(form.email.trim(), form.password);
      }
    } catch (err) {
      const raw = err.message || 'Action failed. Please try again.';
      setError(raw);
    } finally { setLoading(false); }
  }

  const INP = (field) => ({
    style: {
      width: '100%', padding: '11px 14px', borderRadius: 9,
      border: `1.5px solid ${touched[field] && !form[field] ? '#ef4444' : '#d0d7e8'}`,
      fontFamily: "'Nunito',sans-serif", fontSize: '.9rem', outline: 'none',
      background: '#fafbff', transition: 'border .15s, box-shadow .15s',
      color: 'var(--text)',
    }
  });

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: "'Nunito',sans-serif" }}>

      {/* ── Left panel ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 5%', position: 'relative', overflow: 'hidden', background: 'linear-gradient(150deg,#f8f9ff,#f0eeff,#e8fdfd)' }}>
        <div style={{ position: 'absolute', top: '-15%', right: '-10%', width: 400, height: 400, borderRadius: '60% 40% 70% 30%/50% 60% 40% 50%', background: 'linear-gradient(135deg,#531697,#13a1a5)', opacity: .07 }} />
        <div style={{ position: 'absolute', bottom: '-10%', left: '-10%', width: 300, height: 300, borderRadius: '40% 60% 30% 70%/60% 40% 60% 40%', background: 'linear-gradient(135deg,#042c5d,#47d372)', opacity: .06 }} />

        <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 420 }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <a href="/"><img src="/logo.png" alt="PRAGATI" style={{ height: 60, objectFit: 'contain', filter: 'drop-shadow(0 6px 20px rgba(83,22,151,0.18))' }} /></a>
            <p style={{ fontSize: '.83rem', color: 'var(--text-3)', marginTop: 8, fontFamily: "'Nunito',sans-serif" }}>
              {mode === 'login' ? 'Sign in to your account' : 'Reset your password'}
            </p>
          </div>

          <div style={{ background: '#fff', borderRadius: 22, padding: '32px', boxShadow: '0 8px 48px rgba(4,44,93,0.10)', border: '1px solid rgba(83,22,151,0.08)', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, left: '10%', right: '10%', height: 3, borderRadius: '0 0 3px 3px', background: 'linear-gradient(90deg,#042c5d,#531697,#13a1a5,#47d372)' }} />

            <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '1.4rem', color: 'var(--text)', marginBottom: 6 }}>
              {mode === 'login' ? 'Welcome back' : 'Forgot Password?'}
            </h2>
            <p style={{ fontSize: '.83rem', color: 'var(--text-3)', marginBottom: 24 }}>
              {mode === 'login' ? 'Your placement journey continues here' : "We'll email you a temporary secure password"}
            </p>

            {/* Error / Success messages */}
            {error && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 10, padding: '11px 14px', marginBottom: 18 }}>
                <span style={{ fontSize: '1rem', flexShrink: 0, marginTop: 1 }}>⚠️</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '.83rem', color: '#991b1b' }}>{error}</div>
                  {mode === 'login' && (error.includes('email or password') || error.includes('Incorrect')) && (
                    <div style={{ fontSize: '.75rem', color: '#b91c1c', marginTop: 3 }}>
                      Hint: Demo passwords end in <strong>@123</strong> (e.g. Admin@123)
                    </div>
                  )}
                </div>
              </div>
            )}
            {forgotMsg && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: '#dcfce7', border: '1.5px solid #86efac', borderRadius: 10, padding: '11px 14px', marginBottom: 18 }}>
                <span style={{ fontSize: '1rem', flexShrink: 0, marginTop: 1 }}>✅</span>
                <div style={{ fontWeight: 700, fontSize: '.83rem', color: '#166534' }}>{forgotMsg}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div style={{ marginBottom: mode === 'login' ? 16 : 22 }}>
                <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 700, color: 'var(--text-2)', marginBottom: 5, fontFamily: "'Syne',sans-serif" }}>
                  Email Address
                </label>
                <input
                  type="email" value={form.email} onChange={set('email')} onBlur={touch('email')}
                  placeholder="you@college.edu" autoComplete="email"
                  {...INP('email')}
                  onFocus={e => e.target.style.borderColor = '#13a1a5'}
                  onBlurCapture={e => e.target.style.borderColor = touched.email && !form.email ? '#ef4444' : '#d0d7e8'}
                />
              </div>

              {mode === 'login' && (
                <div style={{ marginBottom: 22 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <label style={{ fontSize: '.78rem', fontWeight: 700, color: 'var(--text-2)', fontFamily: "'Syne',sans-serif" }}>
                      Password
                    </label>
                    <span 
                      onClick={() => { setMode('forgot'); setError(''); setForgotMsg(''); }} 
                      style={{ fontSize: '.75rem', color: '#531697', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Forgot Password?
                    </span>
                  </div>
                  <input
                    type="password" value={form.password} onChange={set('password')} onBlur={touch('password')}
                    placeholder="••••••••" autoComplete="current-password"
                    {...INP('password')}
                    onFocus={e => e.target.style.borderColor = '#13a1a5'}
                    onBlurCapture={e => e.target.style.borderColor = '#d0d7e8'}
                  />
                </div>
              )}

              <button type="submit" disabled={loading}
                style={{ width: '100%', padding: '13px', borderRadius: 10, border: 'none', background: loading ? '#d0d7e8' : 'linear-gradient(135deg,#531697,#13a1a5)', color: '#fff', fontWeight: 800, fontSize: '.95rem', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: "'Nunito',sans-serif", transition: 'all .2s' }}>
                {loading
                  ? <><span style={{ width: 16, height: 16, border: '2.5px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', animation: '_lspin .7s linear infinite', display: 'inline-block' }} />Please wait…</>
                  : mode === 'login' ? 'Sign In →' : 'Send New Password'}
              </button>
            </form>

            <p style={{ textAlign: 'center', marginTop: 20, fontSize: '.83rem', color: 'var(--text-3)' }}>
              {mode === 'login' ? (
                <>New here? <a href="/register" style={{ color: '#531697', fontWeight: 700, textDecoration: 'none' }}>Create account</a></>
              ) : (
                <>Remember your password? <span onClick={() => { setMode('login'); setError(''); setForgotMsg(''); }} style={{ color: '#531697', fontWeight: 700, cursor: 'pointer' }}>Back to Sign In</span></>
              )}
            </p>
          </div>


        </div>
      </div>

      {/* ── Right info panel ── */}
      <div className="hide-on-mobile" style={{ width: 420, flexShrink: 0, background: 'linear-gradient(160deg,#042c5d,#531697,#13a1a5)', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 44px', color: '#fff', overflow: 'hidden', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 30% 80%,rgba(71,211,114,0.1),transparent 50%),radial-gradient(circle at 80% 20%,rgba(19,161,165,0.15),transparent 40%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 36, background: 'rgba(255,255,255,0.12)', padding: '8px 16px', borderRadius: 12 }}>
            <img src="/logo.png" alt="PRAGATI" style={{ height: 36, objectFit: 'contain' }} />
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '.95rem', color: '#fff', letterSpacing: '.06em' }}>PRAGATI</div>
          </div>
          <h3 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '1.55rem', marginBottom: 10, lineHeight: 1.25 }}>Empowering Your<br />Placement Journey</h3>
          <p style={{ color: 'rgba(255,255,255,0.72)', lineHeight: 1.7, marginBottom: 36, fontSize: '.9rem' }}>Resume analysis, skill gap insights, company prep, and AI interview coaching — all in one platform.</p>
          {[
            ['🧠', 'SkillPath AI', 'ATS score + skill gaps + learning pathway'],
            ['💻', 'Daily Practice', 'Problems matched to your level'],
            ['🏢', 'Company Intel', 'Round-by-round prep guides'],
            ['🎤', 'AI Interview Prep', 'Gemini-powered personalised coaching'],
          ].map(([icon, title, desc]) => (
            <div key={title} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>{icon}</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '.85rem', color: '#fff', marginBottom: 2 }}>{title}</div>
                <div style={{ fontSize: '.75rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`@keyframes _lspin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
