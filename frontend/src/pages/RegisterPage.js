import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { useAuth } from '../context/AuthContext';

const DEPTS = ['CSE','CSAIML','IT','ECE','Mechanical','Civil','Other'];
const GRAD  = 'linear-gradient(135deg,#531697,#13a1a5)';

function ResumeDropzone({ file, onFile }) {
  const onDrop = useCallback(acc => { if (acc[0]) onFile(acc[0]); }, [onFile]);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf':['.pdf'], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':['.docx'] },
    multiple: false,
  });
  return (
    <div {...getRootProps()} style={{
      border: `2px dashed ${isDragActive ? '#13a1a5' : file ? '#47d372' : '#d0d7e8'}`,
      borderRadius: 14, padding: '28px 16px', textAlign: 'center', cursor: 'pointer',
      background: file ? 'rgba(71,211,114,0.04)' : isDragActive ? 'rgba(19,161,165,0.04)' : '#f8f9fc',
      transition: 'all .2s',
    }}>
      <input {...getInputProps()} />
      <div style={{ fontSize:'2rem', marginBottom:8 }}>{file ? '✅' : '📄'}</div>
      <div style={{ fontSize:'.9rem', fontWeight:700, color: file ? '#2ea854' : '#7a8ba8' }}>
        {file ? file.name : 'Drop your Resume here'}
      </div>
      <div style={{ fontSize:'.75rem', color:'#b0bec9', marginTop:4 }}>
        {file ? 'Click to replace' : 'PDF or DOCX · Max 5MB'}
      </div>
    </div>
  );
}

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name:'', email:'', password:'', confirm:'',
    role:'student', department:'CSE', year:'3',
    prn:'', rollNumber:'', division:'',
    linkedinUrl:'', githubUrl:'', portfolioUrl:'',
  });
  const [resume, setResume]   = useState(null);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const nav = useNavigate();

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  // Input style — red border if field is required and empty
  const inp = (field, extra = {}) => ({
    width:'100%', padding:'10px 14px', borderRadius:9,
    border: `1.5px solid ${(field && !form[field]?.toString().trim()) ? '#ef4444' : '#d0d7e8'}`,
    fontFamily:"'Nunito',sans-serif", fontSize:'.9rem', color:'#0f1a2e',
    background:'#fafbff', outline:'none', boxSizing:'border-box',
    ...extra,
  });
  const lbl = { display:'block', fontSize:'.78rem', fontWeight:700, color:'#3d4e6b', marginBottom:5, fontFamily:"'Syne',sans-serif" };
  const req = { color:'#ef4444', marginLeft:3 };

  function validateStep1() {
    if (!form.name.trim())    { setError('Full Name is required'); return false; }
    if (!form.email.trim())   { setError('Email is required'); return false; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return false; }
    if (form.password !== form.confirm) { setError('Passwords do not match'); return false; }

    if (form.role === 'student') {
      if (!form.prn.trim())        { setError('PRN (Permanent Registration Number) is required'); return false; }
      if (!form.rollNumber.trim()) { setError('Roll Number is required'); return false; }
      if (!/^\d+$/.test(form.rollNumber.trim())) { setError('Roll Number must contain numbers only'); return false; }
      if (!form.division)          { setError('Division is required — select A, B, or C'); return false; }
    }
    return true;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (step === 1) {
      if (!validateStep1()) return;
      if (form.role === 'student') { setStep(2); return; }
      // Faculty/admin: submit directly from step 1
    }

    if (step === 2 && form.role === 'student' && !resume) {
      setError('Please upload your resume to continue');
      return;
    }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('name',       form.name);
      fd.append('email',      form.email);
      fd.append('password',   form.password);
      fd.append('role',       form.role);
      fd.append('department', form.department);

      if (form.role === 'student') {
        fd.append('year',       form.year);
        fd.append('prn',        form.prn.trim());
        fd.append('rollNumber', form.rollNumber.trim());
        fd.append('division',   form.division);
        if (form.linkedinUrl)  fd.append('linkedinUrl',  form.linkedinUrl);
        if (form.githubUrl)    fd.append('githubUrl',    form.githubUrl);
        if (form.portfolioUrl) fd.append('portfolioUrl', form.portfolioUrl);
      }
      if (resume) fd.append('resume', resume);

      const user = await register(fd);
      nav(user.role === 'admin' ? '/dashboard/admin' : '/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight:'100vh',
      background:'linear-gradient(150deg,#f8f9ff,#f0eeff,#e8fdfd)',
      display:'flex', alignItems:'center', justifyContent:'center',
      padding:'24px 16px', position:'relative', overflow:'hidden',
    }}>
      {/* Blobs */}
      <div style={{ position:'fixed', top:'-10%', right:'-5%', width:420, height:420, borderRadius:'60% 40% 70% 30%/50% 60% 40% 50%', background:GRAD, opacity:.07, pointerEvents:'none' }} />
      <div style={{ position:'fixed', bottom:'-10%', left:'-5%', width:360, height:360, borderRadius:'40% 60% 30% 70%/60% 40% 60% 40%', background:'linear-gradient(135deg,#042c5d,#47d372)', opacity:.06, pointerEvents:'none' }} />

      <div style={{ width:'100%', maxWidth:500, position:'relative', zIndex:1 }}>
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:24 }}>
          <a href="/"><img src="/logo.png" alt="PRAGATI" style={{ height:56, objectFit:'contain', filter:'drop-shadow(0 4px 14px rgba(83,22,151,0.18))' }} /></a>
          <p style={{ fontSize:'.83rem', color:'#7a8ba8', marginTop:6, fontFamily:"'Nunito',sans-serif" }}>Create your account — it takes 60 seconds</p>
        </div>

        <div style={{
          background:'#fff', borderRadius:24, padding:'32px 32px',
          boxShadow:'0 8px 48px rgba(4,44,93,0.1)', border:'1px solid rgba(83,22,151,0.08)',
          position:'relative',
        }}>
          {/* Top gradient bar */}
          <div style={{ position:'absolute', top:0, left:'10%', right:'10%', height:3, borderRadius:'0 0 3px 3px', background:'linear-gradient(90deg,#042c5d,#531697,#13a1a5,#47d372)' }} />

          {/* Progress steps for students */}
          {form.role === 'student' && (
            <div style={{ display:'flex', gap:8, marginBottom:24 }}>
              {['Account Info', 'Upload Resume'].map((s, i) => (
                <div key={s} style={{ flex:1 }}>
                  <div style={{ height:4, borderRadius:9, background: step > i ? GRAD : '#e4e8f0', transition:'background .3s' }} />
                  <div style={{ fontSize:'.7rem', color: step > i ? '#531697' : '#b0bec9', fontWeight:700, marginTop:4, textAlign:'center', fontFamily:"'Syne',sans-serif" }}>{s}</div>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit}>

            {/* ─── STEP 1: Account Info ─────────────────────────────── */}
            {step === 1 && (
              <>
                <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1.3rem', marginBottom:20, color:'#0f1a2e' }}>
                  Create your account
                </h2>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>

                  {/* Full Name */}
                  <div style={{ gridColumn:'1/-1' }}>
                    <label style={lbl}>Full Name <span style={req}>*</span></label>
                    <input style={inp('name')} value={form.name} onChange={set('name')} placeholder="Your full name" />
                  </div>

                  {/* Email */}
                  <div style={{ gridColumn:'1/-1' }}>
                    <label style={lbl}>Email <span style={req}>*</span></label>
                    <input style={inp('email')} type="email" value={form.email} onChange={set('email')} placeholder="you@college.edu" />
                  </div>

                  {/* Password */}
                  <div>
                    <label style={lbl}>Password <span style={req}>*</span></label>
                    <input style={inp('password')} type="password" value={form.password} onChange={set('password')} placeholder="Min 6 characters" />
                  </div>

                  {/* Confirm */}
                  <div>
                    <label style={lbl}>Confirm Password <span style={req}>*</span></label>
                    <input style={{ ...inp(), borderColor: form.confirm && form.confirm !== form.password ? '#ef4444' : '#d0d7e8' }}
                      type="password" value={form.confirm} onChange={set('confirm')} placeholder="Repeat password" />
                    {form.confirm && form.confirm !== form.password && (
                      <div style={{ fontSize:'.7rem', color:'#ef4444', marginTop:3 }}>⚠ Passwords do not match</div>
                    )}
                  </div>

                  {/* Role */}
                  <div>
                    <label style={lbl}>Role</label>
                    <select style={inp()} value={form.role} onChange={set('role')}>
                      <option value="student">Student</option>
                      <option value="faculty">Faculty</option>
                    </select>
                  </div>

                  {/* Department */}
                  <div>
                    <label style={lbl}>Department</label>
                    <select style={inp()} value={form.department} onChange={set('department')}>
                      {DEPTS.map(d => <option key={d}>{d}</option>)}
                    </select>
                  </div>

                  {/* ── Student-only fields ── */}
                  {form.role === 'student' && (<>

                    {/* Year */}
                    <div>
                      <label style={lbl}>Year</label>
                      <select style={inp()} value={form.year} onChange={set('year')}>
                        {[1,2,3,4].map(y => <option key={y} value={y}>Year {y}</option>)}
                      </select>
                    </div>

                    {/* Division — MANDATORY, Dropdown A/B/C */}
                    <div>
                      <label style={lbl}>Division <span style={req}>*</span></label>
                      <select
                        style={{ ...inp(), borderColor: !form.division ? '#ef4444' : '#d0d7e8' }}
                        value={form.division}
                        onChange={set('division')}
                        required
                      >
                        <option value="">— Select Division —</option>
                        <option value="A">Division A</option>
                        <option value="B">Division B</option>
                        <option value="C">Division C</option>
                      </select>
                      {!form.division && (
                        <div style={{ fontSize:'.7rem', color:'#ef4444', marginTop:3 }}>⚠ Division is required</div>
                      )}
                    </div>

                    {/* PRN — MANDATORY */}
                    <div style={{ gridColumn:'1/-1' }}>
                      <label style={lbl}>PRN — Permanent Registration Number <span style={req}>*</span></label>
                      <input
                        style={{ ...inp(), borderColor: !form.prn.trim() ? '#ef4444' : '#d0d7e8' }}
                        value={form.prn}
                        onChange={set('prn')}
                        placeholder="e.g. 72310101023"
                        required
                      />
                      {!form.prn.trim() && (
                        <div style={{ fontSize:'.7rem', color:'#ef4444', marginTop:3 }}>⚠ PRN is required</div>
                      )}
                    </div>

                    {/* Roll Number — MANDATORY, NUMERIC ONLY */}
                    <div style={{ gridColumn:'1/-1' }}>
                      <label style={lbl}>
                        Roll Number <span style={req}>*</span>
                        <span style={{ color:'#b0bec9', fontWeight:400, fontSize:'.7rem', marginLeft:6 }}>(numeric only)</span>
                      </label>
                      <input
                        style={{ ...inp(), borderColor: (!form.rollNumber.trim() || !/^\d+$/.test(form.rollNumber.trim())) ? '#ef4444' : '#d0d7e8' }}
                        value={form.rollNumber}
                        onChange={e => { if (/^\d*$/.test(e.target.value)) set('rollNumber')(e); }}
                        placeholder="e.g. 37"
                        inputMode="numeric"
                        pattern="\d+"
                        required
                      />
                      {form.rollNumber && !/^\d+$/.test(form.rollNumber) && (
                        <div style={{ fontSize:'.7rem', color:'#ef4444', marginTop:3 }}>⚠ Roll Number must be numbers only</div>
                      )}
                      {!form.rollNumber && (
                        <div style={{ fontSize:'.7rem', color:'#ef4444', marginTop:3 }}>⚠ Roll Number is required</div>
                      )}
                    </div>

                    {/* Social links header */}
                    <div style={{ gridColumn:'1/-1' }}>
                      <div style={{ padding:'10px 14px', background:'rgba(83,22,151,0.04)', border:'1px solid rgba(83,22,151,0.1)', borderRadius:9 }}>
                        <div style={{ fontSize:'.75rem', fontWeight:800, color:'#531697', fontFamily:"'Syne',sans-serif" }}>
                          🔗 Profile Links <span style={{ color:'#b0bec9', fontWeight:400 }}>(optional — shown on leaderboard)</span>
                        </div>
                      </div>
                    </div>

                    {/* LinkedIn */}
                    <div style={{ gridColumn:'1/-1' }}>
                      <label style={lbl}>LinkedIn URL</label>
                      <input style={inp()} type="url" value={form.linkedinUrl} onChange={set('linkedinUrl')} placeholder="https://linkedin.com/in/yourprofile" />
                    </div>

                    {/* GitHub */}
                    <div>
                      <label style={lbl}>GitHub URL</label>
                      <input style={inp()} type="url" value={form.githubUrl} onChange={set('githubUrl')} placeholder="https://github.com/username" />
                    </div>

                    {/* Portfolio */}
                    <div>
                      <label style={lbl}>Portfolio URL</label>
                      <input style={inp()} type="url" value={form.portfolioUrl} onChange={set('portfolioUrl')} placeholder="https://yourportfolio.com" />
                    </div>

                  </>)}
                </div>
              </>
            )}

            {/* ─── STEP 2: Upload Resume ────────────────────────────── */}
            {step === 2 && form.role === 'student' && (
              <>
                <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1.25rem', marginBottom:8, color:'#0f1a2e' }}>
                  Upload Your Resume
                </h2>
                <p style={{ fontSize:'.83rem', color:'#7a8ba8', marginBottom:18, lineHeight:1.6 }}>
                  Your resume powers <strong style={{ color:'#531697' }}>SkillPath AI</strong> — we extract your skills to personalise your experience.
                </p>
                <ResumeDropzone file={resume} onFile={setResume} />
                <div style={{ marginTop:12, padding:'10px 14px', background:'rgba(19,161,165,0.06)', borderRadius:9, fontSize:'.75rem', color:'#0d7a7e', fontWeight:600 }}>
                  💡 You can update your resume anytime from the SkillPath AI page
                </div>
              </>
            )}

            {/* Error */}
            {error && (
              <div style={{ marginTop:14, background:'#fee2e2', color:'#991b1b', padding:'10px 14px', borderRadius:9, fontSize:'.83rem', fontWeight:600 }}>
                ⚠️ {error}
              </div>
            )}

            {/* Buttons */}
            <div style={{ display:'flex', gap:10, marginTop:20 }}>
              {step === 2 && (
                <button type="button" onClick={() => setStep(1)} style={{ flex:1, padding:'12px', borderRadius:10, border:'1.5px solid #d0d7e8', background:'transparent', color:'#3d4e6b', fontWeight:700, cursor:'pointer', fontFamily:"'Nunito',sans-serif" }}>
                  ← Back
                </button>
              )}
              <button type="submit" disabled={loading} style={{
                flex: step===2 ? 2 : 1, padding:'12px', borderRadius:10, border:'none',
                background: loading ? '#d0d7e8' : GRAD,
                color:'#fff', fontWeight:800, fontSize:'.95rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                fontFamily:"'Nunito',sans-serif",
              }}>
                {loading
                  ? '⏳ Creating account…'
                  : step===1 && form.role==='student'
                    ? 'Next: Upload Resume →'
                    : step===2
                      ? '🚀 Create Account & Start'
                      : '🚀 Create Account'}
              </button>
            </div>
          </form>

          <p style={{ textAlign:'center', marginTop:16, fontSize:'.82rem', color:'#7a8ba8', fontFamily:"'Nunito',sans-serif" }}>
            Already have an account? <a href="/login" style={{ color:'#531697', fontWeight:700 }}>Sign In</a>
          </p>
        </div>
      </div>
    </div>
  );
}
