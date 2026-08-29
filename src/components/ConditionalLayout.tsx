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
      <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' }}>
        <Loader2 className="spin" size={38} color="#D4A843" />
        <style>{`.spin { animation: rotate 1.5s linear infinite; } @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
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
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC' }}>
      {/* Mobile Top Navigation Header */}
      <header className="mobile-header" style={{
        height: '64px',
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
        padding: '0 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 30,
        boxShadow: '0 1px 4px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => setSidebarOpen(true)}
            style={{
              background: '#F4F4F5',
              border: '1px solid #E4E4E7',
              borderRadius: '10px',
              padding: '8px',
              cursor: 'pointer',
              color: '#18181B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Menu size={20} />
          </button>
          <span style={{ fontFamily: 'Noto Serif, serif', fontWeight: '900', fontSize: '1.15rem', color: '#FF9800', letterSpacing: '1px' }}>
            MITSADHANA
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ 
            backgroundColor: '#FFF7ED', 
            border: '1px solid rgba(255,152,0,0.3)',
            padding: '5px 12px', 
            borderRadius: '99px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}>
            <Sparkles size={13} color="#FF9800" />
            <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#E65100', letterSpacing: '0.5px' }}>ADMIN</span>
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
            margin-left: 260px !important;
            width: calc(100% - 260px) !important;
            padding: 36px 40px !important;
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
            padding: 80px 16px 36px 16px !important;
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

