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
      <div style={{ fontSize:'.9rem', fontWeight:700, color: file ? '#2ea854' : 'var(--text-3)' }}>
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
    fontFamily:"'Nunito',sans-serif", fontSize:'.9rem', color:'var(--text)',
    background:'#fafbff', outline:'none', boxSizing:'border-box',
    ...extra,
  });
  const lbl = { display:'block', fontSize:'.78rem', fontWeight:700, color:'var(--text-2)', marginBottom:5, fontFamily:"'Syne',sans-serif" };
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

      <style>{`
        @media (max-width: 600px) {
          .register-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <div style={{ width:'100%', maxWidth:500, position:'relative', zIndex:1 }}>
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:24 }}>
          <a href="/"><img src="/logo.png" alt="PRAGATI" style={{ height:56, objectFit:'contain', filter:'drop-shadow(0 4px 14px rgba(83,22,151,0.18))' }} /></a>
          <p style={{ fontSize:'.83rem', color:'var(--text-3)', marginTop:6, fontFamily:"'Nunito',sans-serif" }}>Create your account — it takes 60 seconds</p>
        </div>

        <div style={{
          background:'#fff', borderRadius:24, padding:'32px 32px',
          boxShadow:'0 8px 48px rgba(4,44,93,0.1)', border:'1px solid rgba(83,22,151,0.08)',
          position:'relative',
        }}>
          {/* Top gradient bar */}
          <div style={{ position:'absolute', top:0, left:'10%', right:'10%', height:3, borderRadius:'0 0 3px 3px', background:'linear-gradient(90deg,#042c5d,#531697,#13a1a5,#47d372)' }} />

          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>🚫</div>
            <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '1.4rem', color: 'var(--text)', marginBottom: 16 }}>
              New User Registration Disabled
            </h2>
            <p style={{ fontSize: '.95rem', color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 12 }}>
              PRAGATI access is currently limited to authorized students and faculty only.
            </p>
            <p style={{ fontSize: '.95rem', color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 24 }}>
              If you have already received credentials from your institution, please log in using your registered email and password.
            </p>
            <div style={{ padding: '12px', background: '#fff3cd', color: '#856404', borderRadius: 8, fontSize: '.9rem', fontWeight: 600 }}>
              For account access, contact your department/admin.
            </div>
          </div>

          <p style={{ textAlign:'center', marginTop:16, fontSize:'.82rem', color:'var(--text-3)', fontFamily:"'Nunito',sans-serif" }}>
            Already have an account? <a href="/login" style={{ color:'#531697', fontWeight:700 }}>Sign In</a>
          </p>
        </div>
      </div>
    </div>
  );
}
