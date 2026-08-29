"use client";
import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Lock, Mail, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const { signIn, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    setLoading(true); setError('');
    try {
      await signIn(email, password);
    } catch (err: any) {
      setError(err.code === 'auth/invalid-credential' ? 'Invalid email or password.' : 'Login failed. Please try again.');
    } finally { setLoading(false); }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true); setError('');
    try {
      await signInWithGoogle();
    } catch {
      setError('Google sign-in failed. Please try again.');
    } finally { setGoogleLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FAFAFA', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ position: 'fixed', top: '-200px', left: '50%', transform: 'translateX(-50%)', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(255,152,0,0.10) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: '420px', position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'linear-gradient(135deg, #FF9800, #E65100)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '28px', boxShadow: '0 8px 32px rgba(255,152,0,0.3)' }}>🛕</div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: '900', letterSpacing: '2px', color: '#FF9800', marginBottom: '6px' }}>MITSADHANA</h1>
          <p style={{ fontSize: '0.7rem', color: '#71717A', fontWeight: 'bold', letterSpacing: '3px' }}>SACRED ADMIN PORTAL</p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: '36px' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '6px', color: '#18181B', fontWeight: '800' }}>Welcome back</h2>
          <p style={{ color: '#71717A', fontSize: '0.85rem', marginBottom: '28px' }}>Sign in to access the MitSadhana admin portal.</p>

          {/* Google Sign-In Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            style={{
              width: '100%', padding: '14px', backgroundColor: '#FFFFFF',
              border: '1.5px solid #E4E4E7', borderRadius: '12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
              cursor: googleLoading ? 'not-allowed' : 'pointer',
              fontSize: '0.95rem', fontWeight: '700', color: '#18181B', marginBottom: '20px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)', transition: 'all 0.2s ease',
              opacity: googleLoading ? 0.7 : 1,
            }}
          >
            {googleLoading ? (
              <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <svg width="20" height="20" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
            )}
            {googleLoading ? 'Signing in...' : 'Sign in with Google'}
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#E4E4E7' }} />
            <span style={{ fontSize: '0.75rem', color: '#71717A', fontWeight: '600' }}>OR</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#E4E4E7' }} />
          </div>

          <form onSubmit={handleLogin}>
            {/* Email */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '0.7rem', color: '#71717A', fontWeight: '800', letterSpacing: '1px', display: 'block', marginBottom: '8px' }}>EMAIL ADDRESS</label>
              <div style={{ display: 'flex', alignItems: 'center', padding: '0 16px', borderRadius: '10px', border: '1px solid #E4E4E7', backgroundColor: '#F9FAFB' }}>
                <Mail size={16} color="#71717A" style={{ marginRight: '12px', flexShrink: 0 }} />
                <input type="email" placeholder="admin@mitsadhana.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email"
                  style={{ flex: 1, padding: '14px 0', background: 'transparent', border: 'none', color: '#18181B', fontSize: '0.9rem', outline: 'none' }} />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '0.7rem', color: '#71717A', fontWeight: '800', letterSpacing: '1px', display: 'block', marginBottom: '8px' }}>PASSWORD</label>
              <div style={{ display: 'flex', alignItems: 'center', padding: '0 16px', borderRadius: '10px', border: '1px solid #E4E4E7', backgroundColor: '#F9FAFB' }}>
                <Lock size={16} color="#71717A" style={{ marginRight: '12px', flexShrink: 0 }} />
                <input type={showPass ? 'text' : 'password'} placeholder="••••••••••" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password"
                  style={{ flex: 1, padding: '14px 0', background: 'transparent', border: 'none', color: '#18181B', fontSize: '0.9rem', outline: 'none' }} />
                <button type="button" onClick={() => setShowPass(!showPass)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#71717A', padding: '4px' }}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{ padding: '12px 16px', borderRadius: '8px', backgroundColor: '#FEF2F2', border: '1px solid #FEE2E2', color: '#EF4444', fontSize: '0.8rem', marginBottom: '20px' }}>
                ⚠️ {error}
              </div>
            )}

            {/* Submit */}
            <button type="submit" disabled={loading} className="btn-primary"
              style={{ width: '100%', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Lock size={18} />}
              {loading ? 'SIGNING IN...' : 'ACCESS PORTAL'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.75rem', color: '#71717A' }}>
          Restricted access — MitSadhana authorized personnel only
        </p>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
