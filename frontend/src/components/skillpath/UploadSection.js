import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

function DropZone({ label, icon, file, onFile, accept }) {
  const onDrop = useCallback(accepted => { if (accepted[0]) onFile(accepted[0]); }, [onFile]);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    multiple: false,
  });

  return (
    <div
      {...getRootProps()}
      style={{
        border: `2px dashed ${isDragActive ? '#1a56db' : file ? '#10b981' : '#cbd5e1'}`,
        borderRadius: 12,
        padding: '24px 20px',
        textAlign: 'center',
        cursor: 'pointer',
        background: isDragActive ? '#e8effe' : file ? '#f0fdf4' : '#fafbff',
        transition: 'all .2s',
      }}
    >
      <input {...getInputProps()} />
      <div style={{ fontSize: 32, marginBottom: 8 }}>{file ? '✅' : icon}</div>
      <div style={{ fontWeight: 600, fontSize: '.9rem', color: '#0f172a' }}>{label}</div>
      {file
        ? <div style={{ fontSize: '.8rem', color: '#10b981', marginTop: 4 }}>{file.name}</div>
        : <div style={{ fontSize: '.78rem', color: '#94a3b8', marginTop: 4 }}>Drop or click · PDF / DOCX / TXT</div>
      }
    </div>
  );
}

export default function UploadSection({ onResult, setLoading }) {
  const [resume, setResume] = useState(null);
  const [jdText, setJdText] = useState('');
  const [jdFile, setJdFile] = useState(null);
  const [error, setError] = useState('');
  const [analyzing, setAnalyzing] = useState(false);

  const canSubmit = resume && (jdText.trim() || jdFile);

  async function handleAnalyze() {
    if (!canSubmit) return;
    setAnalyzing(true);
    setLoading(true);
    setError('');

    try {
      const form = new FormData();
      form.append('resume', resume);
      form.append('jdText', jdText || '');
      if (jdFile) form.append('jdFile', jdFile);

      const token = localStorage.getItem('pragati_token');
      const base = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const res = await fetch(`${base}/skillpath/analyze`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Analysis failed');
      }

      const data = await res.json();
      onResult(data.result);
    } catch (e) {
      setError(e.message || 'Something went wrong. Please retry.');
    } finally {
      setAnalyzing(false);
      setLoading(false);
    }
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <DropZone
          label="Your Resume"
          icon="📄"
          file={resume}
          onFile={setResume}
          accept={{ 'application/pdf': ['.pdf'], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'] }}
        />
        <DropZone
          label="Job Description (file)"
          icon="🎯"
          file={jdFile}
          onFile={setJdFile}
          accept={{ 'application/pdf': ['.pdf'], 'text/plain': ['.txt'] }}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: '.85rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>
          Or paste Job Description text
        </label>
        <textarea
          value={jdText}
          onChange={e => setJdText(e.target.value)}
          placeholder="Paste the full job description here..."
          rows={5}
          style={{
            width: '100%', padding: '10px 14px', borderRadius: 10,
            border: '1px solid #e2e8f4', fontFamily: 'inherit',
            fontSize: '.875rem', resize: 'vertical', outline: 'none',
            lineHeight: 1.6, color: '#0f172a',
          }}
        />
      </div>

      {error && (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: '10px 14px', borderRadius: 8, marginBottom: 12, fontSize: '.85rem' }}>
          ⚠ {error}
        </div>
      )}

      <button
        onClick={handleAnalyze}
        disabled={!canSubmit || analyzing}
        style={{
          width: '100%', padding: '12px', borderRadius: 10, border: 'none',
          background: canSubmit && !analyzing ? '#1a56db' : '#cbd5e1',
          color: '#fff', fontWeight: 700, fontSize: '1rem',
          cursor: canSubmit && !analyzing ? 'pointer' : 'not-allowed',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          transition: 'background .2s',
        }}
      >
        {analyzing ? (
          <>
            <span className="spinner" />
            Analyzing your profile…
          </>
        ) : '⚡ Analyze My Skills'}
      </button>
    </div>
  );
}
