import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) { setError('Enter your email and password.'); return; }
    setLoading(true);
    setError('');
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err.message || 'Could not log in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FBF8F2', fontFamily: "'Inter', sans-serif" }}>
      <form onSubmit={submit} style={{ background: '#fff', border: '1px solid #E7DFCE', borderRadius: 14, padding: '32px 28px', width: '100%', maxWidth: 360 }}>
        <h1 className="ct-serif" style={{ fontFamily: "'Fraunces', serif", fontSize: 22, color: '#3A2A1D', margin: '0 0 4px', fontWeight: 600 }}>Mahogany client tracker</h1>
        <p style={{ color: '#8A8478', fontSize: 13, margin: '0 0 22px' }}>Sign in to see your pipeline and target.</p>

        <label style={{ fontSize: 12, color: '#6B5F4F', marginBottom: 4, display: 'block' }}>Email</label>
        <input className="ct-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 8, border: '1px solid #D9CFBC', fontSize: 14, marginBottom: 14 }} />

        <label style={{ fontSize: 12, color: '#6B5F4F', marginBottom: 4, display: 'block' }}>Password</label>
        <input className="ct-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 8, border: '1px solid #D9CFBC', fontSize: 14, marginBottom: 14 }} />

        {error && <div style={{ color: '#9C4A1E', fontSize: 13, marginBottom: 14 }}>{error}</div>}

        <button type="submit" disabled={loading}
          style={{ width: '100%', background: '#4A2C2A', color: '#F3EBDD', padding: '10px 16px', borderRadius: 8, fontSize: 14, fontWeight: 500, border: 'none', cursor: 'pointer' }}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
