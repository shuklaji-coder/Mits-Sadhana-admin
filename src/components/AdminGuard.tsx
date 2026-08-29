"use client";
import { useAuth } from '@/lib/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  // isAdmin verified from Firestore users/{uid}.role === 'admin'
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (loading) return;

    if (!user) {
      setIsAdmin(null);
      if (pathname !== '/login') router.push('/login');
      return;
    }

    if (pathname === '/login') {
      router.push('/');
      return;
    }

    setIsAdmin(null);
    getDoc(doc(db, 'users', user.uid))
      .then((snap) => {
        if (cancelled) return;
        setIsAdmin(snap.exists() && snap.data().role === 'admin');
      })
      .catch((err) => {
        console.error('Admin role check failed:', err);
        if (!cancelled) setIsAdmin(false);
      });

    return () => { cancelled = true; };
  }, [user, loading, pathname, router]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: 'var(--background)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '14px',
          background: 'linear-gradient(135deg, #D4A843, #B8860B)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '24px', animation: 'pulse 1.5s ease-in-out infinite'
        }}>🛕</div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', letterSpacing: '2px' }}>LOADING PORTAL...</p>
        <style>{`
          @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.6;transform:scale(0.95)} }
        `}</style>
      </div>
    );
  }

  // On login page, don't wrap with sidebar layout
  if (pathname === '/login') {
    return <>{children}</>;
  }

  // Not authenticated → redirect handled above, show nothing while redirecting
  if (!user) return null;

  // Role still being resolved → keep loading state
  if (isAdmin === null) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: 'var(--background)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.9rem',
        color: 'var(--text-muted)'
      }}>Verifying admin access...</div>
    );
  }

  // Authenticated but not an admin → block access (do NOT expose the portal)
  if (isAdmin === false) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: 'var(--background)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <div style={{ fontSize: '40px' }}>⛔</div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Access denied — admin only.</p>
      </div>
    );
  }

  return <>{children}</>;
}
