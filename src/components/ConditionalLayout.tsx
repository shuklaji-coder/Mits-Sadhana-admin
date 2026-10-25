"use client";
import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import { useAuth } from '@/lib/auth-context';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2, Menu, Sparkles } from 'lucide-react';

export default function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user && pathname !== '/login') {
        router.push('/login');
      } else if (user && pathname === '/login') {
        router.push('/');
      }
    }
  }, [user, loading, pathname, router]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F7FAF8',
        gap: '16px'
      }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #02241C 0%, #064032 50%, #047857 100%)',
          border: '1.5px solid #D4AF37',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '26px',
          boxShadow: '0 8px 24px rgba(4, 120, 87, 0.25)'
        }}>
          🪔
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Loader2 className="spin" size={18} color="#047857" />
          <span style={{
            fontSize: '0.8rem',
            letterSpacing: '2px',
            fontWeight: '800',
            color: '#064032'
          }}>
            INITIALIZING ROYAL PORTAL...
          </span>
        </div>
        <style>{`.spin { animation: rotate 1.2s linear infinite; } @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user && pathname !== '/login') {
    return null;
  }

  if (pathname === '/login') {
    return <main>{children}</main>;
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F7FAF8' }}>
      {/* Mobile Top Navigation Header */}
      <header className="mobile-header" style={{
        height: '64px',
        backgroundColor: '#02241C',
        borderBottom: '1px solid rgba(212, 175, 55, 0.22)',
        padding: '0 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 30,
        boxShadow: '0 2px 14px rgba(2, 36, 28, 0.25)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => setSidebarOpen(true)}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(212, 175, 55, 0.3)',
              borderRadius: '10px',
              padding: '8px',
              cursor: 'pointer',
              color: '#F7EFCF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Menu size={20} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '16px' }}>🪔</span>
            <span style={{
              fontFamily: 'Cinzel, Georgia, serif',
              fontWeight: '900',
              fontSize: '1.15rem',
              color: '#F7EFCF',
              letterSpacing: '1.5px'
            }}>
              MITSADHANA
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ 
            backgroundColor: 'rgba(212, 175, 55, 0.15)', 
            border: '1px solid rgba(212, 175, 55, 0.35)',
            padding: '5px 12px', 
            borderRadius: '99px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <Sparkles size={12} color="#D4AF37" />
            <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#FDE68A', letterSpacing: '0.5px' }}>ROYAL ADMIN</span>
          </div>
        </div>
      </header>

      {/* Sidebar Component */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <main className="main-content" style={{
        minHeight: '100vh',
        transition: 'all 0.3s ease'
      }}>
        {children}
      </main>

      {/* CSS Media Queries for Responsive Layout */}
      <style jsx global>{`
        @media (min-width: 1024px) {
          .mobile-header {
            display: none !important;
          }
          .main-content {
            margin-left: 265px !important;
            width: calc(100% - 265px) !important;
            padding: 36px 42px !important;
          }
          .sidebar {
            transform: translateX(0) !important;
          }
          .mobile-close-btn {
            display: none !important;
          }
        }
        @media (max-width: 1023px) {
          .mobile-header {
            display: flex !important;
          }
          .main-content {
            margin-left: 0 !important;
            width: 100% !important;
            padding: 82px 18px 36px 18px !important;
          }
          .sidebar {
            transform: translateX(-100%);
          }
          .sidebar.open {
            transform: translateX(0) !important;
          }
        }
      `}</style>
    </div>
  );
}
