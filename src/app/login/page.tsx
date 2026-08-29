"use client";
import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Lock, Mail, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await signIn(email, password);
    } catch (err: any) {
      const msg = err.code === 'auth/invalid-credential' 
        ? 'Invalid email or password.' 
        : 'Login failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: 'var(--background)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      {/* Background ambient glow */}
      <div style={{
        position: 'fixed', top: '-200px', left: '50%', transform: 'translateX(-50%)',
        width: '600px', height: '600px',
        background: 'radial-gradient(circle, rgba(255,152,0,0.10) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />

      <div style={{ width: '100%', maxWidth: '400px', position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '20px',
            background: 'linear-gradient(135deg, #FF9800, #E65100)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', fontSize: '28px',
            boxShadow: '0 8px 32px rgba(255,152,0,0.3)'
          }}>🛕</div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: '900', letterSpacing: '2px', color: 'var(--primary)', marginBottom: '6px' }}>
            MITSADHANA
          </h1>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'bold', letterSpacing: '3px' }}>
            SACRED ADMIN PORTAL
          </p>
        </div>

        {/* Card */}
        <div className="card glass" style={{ padding: '40px' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '6px', color: '#18181B' }}>Welcome back</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '30px' }}>
            Sign in with your admin credentials to continue.
          </p>

          <form onSubmit={handleLogin}>
            {/* Email */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'bold', letterSpacing: '1px', display: 'block', marginBottom: '8px' }}>
                EMAIL ADDRESS
              </label>
              <div style={{ display: 'flex', alignItems: 'center', padding: '0 16px', borderRadius: '10px', border: '1px solid #E4E4E7', backgroundColor: '#F9FAFB' }}>
                <Mail size={16} color="#71717A" style={{ marginRight: '12px', flexShrink: 0 }} />
                <input
                  type="email"
                  placeholder="admin@mitsadhana.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  style={{
                    flex: 1, padding: '14px 0', background: 'transparent',
                    border: 'none', color: '#18181B', fontSize: '0.9rem', outline: 'none'
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'bold', letterSpacing: '1px', display: 'block', marginBottom: '8px' }}>
                PASSWORD
              </label>
              <div style={{ display: 'flex', alignItems: 'center', padding: '0 16px', borderRadius: '10px', border: '1px solid #E4E4E7', backgroundColor: '#F9FAFB' }}>
                <Lock size={16} color="#71717A" style={{ marginRight: '12px', flexShrink: 0 }} />
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  style={{
                    flex: 1, padding: '14px 0', background: 'transparent',
                    border: 'none', color: '#18181B', fontSize: '0.9rem', outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#71717A', padding: '4px' }}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{ 
                padding: '12px 16px', borderRadius: '8px', 
                backgroundColor: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.2)',
                color: '#FF6B6B', fontSize: '0.8rem', marginBottom: '20px'
              }}>
                ⚠️ {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ 
                width: '100%', padding: '16px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Lock size={18} />}
              {loading ? 'SIGNING IN...' : 'ACCESS PORTAL'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Restricted access — MitSadhana authorized personnel only
        </p>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
