"use client";
import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Lock, Mail, Eye, EyeOff, Loader2, Sparkles } from 'lucide-react';

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
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F7FAF8',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Ambient Radial Glows (Emerald & Champagne) */}
      <div style={{
        position: 'fixed',
        top: '-150px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '720px',
        height: '720px',
        background: 'radial-gradient(circle, rgba(4, 120, 87, 0.14) 0%, rgba(212, 175, 55, 0.08) 50%, transparent 70%)',
        pointerEvents: 'none'
      }} />

      <div style={{ width: '100%', maxWidth: '430px', position: 'relative', zIndex: 1 }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '68px',
            height: '68px',
            borderRadius: '22px',
            background: 'linear-gradient(135deg, #02241C 0%, #04382C 50%, #047857 100%)',
            border: '2px solid rgba(212, 175, 55, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            fontSize: '32px',
            boxShadow: '0 8px 30px rgba(4, 120, 87, 0.32)'
          }}>
            🪔
          </div>
          <h1 style={{
            fontSize: '1.9rem',
            fontWeight: '900',
            letterSpacing: '2.5px',
            color: '#064032',
            marginBottom: '4px',
            fontFamily: 'Cinzel, Georgia, serif'
          }}>
            MITSADHANA
          </h1>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#FCF9F1',
            padding: '4px 14px',
            borderRadius: '99px',
            border: '1px solid rgba(212, 175, 55, 0.35)'
          }}>
            <Sparkles size={11} color="#D4AF37" />
            <span style={{ fontSize: '0.66rem', color: '#9A7424', fontWeight: '800', letterSpacing: '2px' }}>
              ROYAL ADMIN PORTAL
            </span>
          </div>
        </div>

        {/* Auth Card */}
        <div className="card glass" style={{
          padding: '36px',
          border: '1.5px solid rgba(212, 175, 55, 0.32)',
          boxShadow: '0 16px 45px rgba(6, 78, 59, 0.08), 0 4px 14px rgba(212, 175, 55, 0.06)'
        }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '6px', color: '#0B251C', fontWeight: '800' }}>
            Admin Authentication
          </h2>
          <p style={{ color: '#53695E', fontSize: '0.86rem', marginBottom: '26px' }}>
            Sign in with authorized credentials to manage the sacred ecosystem.
          </p>

          {/* Google Sign-In Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            style={{
              width: '100%',
              padding: '13px',
              backgroundColor: '#FFFFFF',
              border: '1.5px solid #DFEAE3',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              cursor: googleLoading ? 'not-allowed' : 'pointer',
              fontSize: '0.92rem',
              fontWeight: '700',
              color: '#0B251C',
              marginBottom: '20px',
              boxShadow: '0 2px 8px rgba(6, 78, 59, 0.05)',
              transition: 'all 0.2s ease',
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
            {googleLoading ? 'Verifying with Google...' : 'Sign in with Google'}
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#DFEAE3' }} />
            <span style={{ fontSize: '0.72rem', color: '#7B9185', fontWeight: '700', letterSpacing: '0.5px' }}>OR PASSWORD</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#DFEAE3' }} />
          </div>

          <form onSubmit={handleLogin}>
            {/* Email */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '0.7rem', color: '#53695E', fontWeight: '800', letterSpacing: '1px', display: 'block', marginBottom: '8px' }}>
                ADMIN EMAIL
              </label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                padding: '0 16px',
                borderRadius: '12px',
                border: '1.5px solid #DFEAE3',
                backgroundColor: '#FFFFFF',
                boxShadow: '0 1px 3px rgba(6, 78, 59, 0.04)'
              }}>
                <Mail size={16} color="#047857" style={{ marginRight: '12px', flexShrink: 0 }} />
                <input
                  type="email"
                  placeholder="admin@mitsadhana.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  style={{ flex: 1, padding: '13px 0', background: 'transparent', border: 'none', color: '#0B251C', fontSize: '0.9rem', outline: 'none' }}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: '22px' }}>
              <label style={{ fontSize: '0.7rem', color: '#53695E', fontWeight: '800', letterSpacing: '1px', display: 'block', marginBottom: '8px' }}>
                SECRET PASSWORD
              </label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                padding: '0 16px',
                borderRadius: '12px',
                border: '1.5px solid #DFEAE3',
                backgroundColor: '#FFFFFF',
                boxShadow: '0 1px 3px rgba(6, 78, 59, 0.04)'
              }}>
                <Lock size={16} color="#047857" style={{ marginRight: '12px', flexShrink: 0 }} />
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  style={{ flex: 1, padding: '13px 0', background: 'transparent', border: 'none', color: '#0B251C', fontSize: '0.9rem', outline: 'none' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7B9185' }}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                backgroundColor: '#FEF2F2',
                border: '1px solid #FEE2E2',
                color: '#DC2626',
                padding: '12px',
                borderRadius: '10px',
                fontSize: '0.82rem',
                fontWeight: '600',
                marginBottom: '18px'
              }}>
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{
                width: '100%',
                padding: '13px',
                fontSize: '0.95rem',
                letterSpacing: '0.5px',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  AUTHENTICATING...
                </>
              ) : (
                'ENTER SACRED PORTAL →'
              )}
            </button>
          </form>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
