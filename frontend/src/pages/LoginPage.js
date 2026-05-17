import React, { useState } from 'react';
// navigation is handled by AppRoutes after user state updates
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [form, setForm]       = useState({ email: '', password: '' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({});
  const { login } = useAuth();

  const set = k => e => {
    setForm(f => ({ ...f, [k]: e.target.value }));
    if (error) setError(''); // clear error when user starts typing
  };
  const touch = k => () => setTouched(t => ({ ...t, [k]: true }));

  // Client-side validation before hitting API
  function validate() {
    if (!form.email.trim()) return 'Please enter your email address.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Please enter a valid email address.';
    if (!form.password) return 'Please enter your password.';
    if (form.password.length < 6) return 'Password must be at least 6 characters.';
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setLoading(true); setError('');
    try {
      // After login() resolves, setUser() has been called inside AuthContext.
      // AppRoutes watches user state and auto-redirects — no nav() needed here.
      await login(form.email.trim(), form.password);
    } catch (err) {
      // err.message is the exact backend message (e.g. "Invalid credentials")
      const raw = err.message || 'Login failed. Please try again.';
      // Make backend messages more user-friendly
      if (raw.toLowerCase().includes('credentials') || raw.toLowerCase().includes('invalid')) {
        setError('Incorrect email or password. Please check and try again.');
      } else if (raw.toLowerCase().includes('deactivated')) {
        setError('Your account has been deactivated. Contact the administrator.');
      } else if (raw.toLowerCase().includes('network') || raw.toLowerCase().includes('fetch')) {
        setError('Cannot connect to the server. Please check your connection.');
      } else {
        setError(raw);
      }
    } finally { setLoading(false); }
  }

  const INP = (field) => ({
    style: {
      width: '100%', padding: '11px 14px', borderRadius: 9,
      border: `1.5px solid ${touched[field] && !form[field] ? '#ef4444' : '#d0d7e8'}`,
      fontFamily: "'Nunito',sans-serif", fontSize: '.9rem', outline: 'none',
      background: '#fafbff', transition: 'border .15s, box-shadow .15s',
      color: '#0f1a2e',
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
            <p style={{ fontSize: '.83rem', color: '#7a8ba8', marginTop: 8, fontFamily: "'Nunito',sans-serif" }}>Sign in to your account</p>
          </div>

          <div style={{ background: '#fff', borderRadius: 22, padding: '32px', boxShadow: '0 8px 48px rgba(4,44,93,0.10)', border: '1px solid rgba(83,22,151,0.08)', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, left: '10%', right: '10%', height: 3, borderRadius: '0 0 3px 3px', background: 'linear-gradient(90deg,#042c5d,#531697,#13a1a5,#47d372)' }} />

            <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '1.4rem', color: '#0f1a2e', marginBottom: 6 }}>Welcome back</h2>
            <p style={{ fontSize: '.83rem', color: '#7a8ba8', marginBottom: 24 }}>Your placement journey continues here</p>

            {/* Error message — prominent, clear, with icon */}
            {error && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 10, padding: '11px 14px', marginBottom: 18 }}>
                <span style={{ fontSize: '1rem', flexShrink: 0, marginTop: 1 }}>⚠️</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '.83rem', color: '#991b1b' }}>{error}</div>
                  {(error.includes('email or password') || error.includes('Incorrect')) && (
                    <div style={{ fontSize: '.75rem', color: '#b91c1c', marginTop: 3 }}>
                      Hint: Demo passwords end in <strong>@123</strong> (e.g. Admin@123)
                    </div>
                  )}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 700, color: '#3d4e6b', marginBottom: 5, fontFamily: "'Syne',sans-serif" }}>
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

              <div style={{ marginBottom: 22 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <label style={{ fontSize: '.78rem', fontWeight: 700, color: '#3d4e6b', fontFamily: "'Syne',sans-serif" }}>
                    Password
                  </label>
                </div>
                <input
                  type="password" value={form.password} onChange={set('password')} onBlur={touch('password')}
                  placeholder="••••••••" autoComplete="current-password"
                  {...INP('password')}
                  onFocus={e => e.target.style.borderColor = '#13a1a5'}
                  onBlurCapture={e => e.target.style.borderColor = '#d0d7e8'}
                />
              </div>

              <button type="submit" disabled={loading}
                style={{ width: '100%', padding: '13px', borderRadius: 10, border: 'none', background: loading ? '#d0d7e8' : 'linear-gradient(135deg,#531697,#13a1a5)', color: '#fff', fontWeight: 800, fontSize: '.95rem', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: "'Nunito',sans-serif", transition: 'all .2s' }}>
                {loading
                  ? <><span style={{ width: 16, height: 16, border: '2.5px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', animation: '_lspin .7s linear infinite', display: 'inline-block' }} />Signing in…</>
                  : 'Sign In →'}
              </button>
            </form>

            <p style={{ textAlign: 'center', marginTop: 20, fontSize: '.83rem', color: '#7a8ba8' }}>
              New here? <a href="/register" style={{ color: '#531697', fontWeight: 700, textDecoration: 'none' }}>Create account</a>
            </p>
          </div>

          {/* Demo hint box */}
          <div style={{ marginTop: 14, padding: '11px 16px', background: 'rgba(19,161,165,0.06)', border: '1px solid rgba(19,161,165,0.15)', borderRadius: 10, fontSize: '.73rem', color: '#3d4e6b' }}>
            <div style={{ fontWeight: 700, color: '#0d7a7e', marginBottom: 4 }}>🔑 Demo Credentials</div>
            <div>admin@pragati.edu · faculty@pragati.edu · student@pragati.edu</div>
            <div style={{ marginTop: 2, color: '#7a8ba8' }}>Password: <strong>Admin@123 / Faculty@123 / Student@123</strong></div>
          </div>
        </div>
      </div>

      {/* ── Right info panel ── */}
      <div style={{ width: 420, flexShrink: 0, background: 'linear-gradient(160deg,#042c5d,#531697,#13a1a5)', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 44px', color: '#fff', overflow: 'hidden', position: 'relative' }}>
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

      <style>{`@keyframes _lspin{to{transform:rotate(360deg)}} @media(max-width:768px){div[style*="width:420"]{display:none}}`}</style>
    </div>
  );
}
