"use client";
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, ShieldCheck, Flower, Users, LogOut, ScrollText, 
  TrendingUp, Bell, MessageSquare, Package, IndianRupee, Settings, 
  CreditCard, AlertTriangle, Zap, MapPin, ShoppingBag, BadgeIndianRupee, X,
  Sparkles
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logOut } = useAuth();

  const handleLogout = async () => {
    await logOut();
    router.push('/login');
  };

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Revenue', path: '/revenue', icon: TrendingUp },
    { name: 'Dynamic Pricing', path: '/pricing', icon: BadgeIndianRupee },
    { name: 'Global Orders', path: '/orders', icon: ScrollText },
    { name: 'Express Orders', path: '/express-orders', icon: Zap },
    { name: 'Verifications', path: '/verifications', icon: ShieldCheck },
    { name: 'Allotments', path: '/allotments', icon: Flower },
    { name: 'Eco Pickups', path: '/eco-pickups', icon: Package },
    { name: 'Payouts', path: '/payouts', icon: IndianRupee },
    { name: 'Broadcast', path: '/broadcast', icon: Bell },
    { name: 'Support', path: '/support', icon: MessageSquare },
    { name: 'Subscriptions', path: '/subscriptions', icon: CreditCard },
    { name: 'Services', path: '/services', icon: Settings },
    { name: 'Service Areas', path: '/service-areas', icon: MapPin },
    { name: 'Inventory', path: '/inventory', icon: ShoppingBag },
    { name: 'Late Deliveries', path: '/late-deliveries', icon: AlertTriangle },
    { name: 'User Audit', path: '/users', icon: Users },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div 
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(2, 36, 28, 0.65)',
            backdropFilter: 'blur(6px)',
            zIndex: 40,
          }}
        />
      )}

      <aside className={`sidebar ${isOpen ? 'open' : ''}`} style={{
        width: '265px',
        height: '100vh',
        background: 'linear-gradient(180deg, #02241C 0%, #033227 40%, #04382C 100%)',
        borderRight: '1px solid rgba(212, 175, 55, 0.22)',
        padding: '24px 16px',
        position: 'fixed',
        left: 0,
        top: 0,
        display: 'flex',
        flexDirection: 'column',
        zIndex: 50,
        boxShadow: '4px 0 28px rgba(2, 36, 28, 0.35)',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        {/* Header & Brand Logo */}
        <div className="logo" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 6px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #F5E8BE 0%, #D4AF37 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 10px rgba(212, 175, 55, 0.4)'
              }}>
                <span style={{ fontSize: '15px' }}>🪔</span>
              </div>
              <h2 style={{
                fontSize: '1.28rem',
                letterSpacing: '2.5px',
                fontWeight: '900',
                color: '#F7EFCF',
                fontFamily: 'Cinzel, Georgia, serif',
                textShadow: '0 2px 8px rgba(0,0,0,0.4)'
              }}>
                MITSADHANA
              </h2>
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', marginLeft: '36px' }}>
              <Sparkles size={10} color="#D4AF37" />
              <span style={{ fontSize: '0.62rem', color: '#A7D0B8', fontWeight: '800', letterSpacing: '1.5px' }}>
                ROYAL ADMIN PORTAL
              </span>
            </div>
          </div>
          {onClose && (
            <button 
              onClick={onClose} 
              className="mobile-close-btn"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(212, 175, 55, 0.3)',
                borderRadius: '8px',
                cursor: 'pointer',
                padding: '6px',
                color: '#F7EFCF'
              }}
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Delicate Gold Divider */}
        <div style={{
          height: '1px',
          background: 'linear-gradient(90deg, transparent 0%, rgba(212, 175, 55, 0.35) 50%, transparent 100%)',
          marginBottom: '16px'
        }} />

        {/* Navigation Items */}
        <nav style={{ 
          flex: 1, 
          overflowY: 'auto', 
          paddingRight: '4px',
        }}>
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => onClose && onClose()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  marginBottom: '5px',
                  backgroundColor: isActive ? 'rgba(212, 175, 55, 0.16)' : 'transparent',
                  color: isActive ? '#FDE68A' : '#C2D9CD',
                  transition: 'all 0.18s ease',
                  border: isActive ? '1px solid rgba(212, 175, 55, 0.45)' : '1px solid transparent',
                  fontWeight: isActive ? '800' : '500',
                  fontSize: '0.86rem',
                  letterSpacing: '0.2px',
                  boxShadow: isActive ? '0 2px 12px rgba(212, 175, 55, 0.12)' : 'none',
                }}
              >
                <Icon
                  size={18}
                  style={{
                    marginRight: '12px',
                    color: isActive ? '#F3E5AB' : '#6EE7B7',
                    transition: 'color 0.2s ease',
                    filter: isActive ? 'drop-shadow(0 0 6px rgba(212, 175, 55, 0.5))' : 'none'
                  }}
                />
                <span style={{ flex: 1 }}>{item.name}</span>
                {isActive && (
                  <div style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: '#D4AF37',
                    boxShadow: '0 0 8px #D4AF37'
                  }} />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer Profile & Logout */}
        <div style={{
          marginTop: 'auto',
          borderTop: '1px solid rgba(212, 175, 55, 0.22)',
          paddingTop: '16px',
          background: 'rgba(2, 36, 28, 0.4)',
          borderRadius: '14px',
          padding: '14px 10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '11px',
              background: 'linear-gradient(135deg, #F5E8BE 0%, #D4AF37 50%, #996515 100%)',
              marginRight: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#02241C',
              fontWeight: '900',
              fontSize: '0.88rem',
              boxShadow: '0 2px 10px rgba(212, 175, 55, 0.35)',
              border: '1.5px solid #F7EFCF'
            }}>
              {user?.email?.slice(0, 2).toUpperCase() || 'SA'}
            </div>
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <p style={{ fontSize: '0.84rem', fontWeight: '800', color: '#F7EFCF' }}>Super Admin</p>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981' }} />
              </div>
              <p style={{ fontSize: '0.68rem', color: '#A7D0B8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.email || 'admin@mitsadhana.com'}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '9px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.28)',
              borderRadius: '10px',
              color: '#FCA5A5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: '800',
              letterSpacing: '0.5px',
              transition: 'all 0.2s ease'
            }}
          >
            <LogOut size={15} style={{ marginRight: '6px' }} />
            LOGOUT
          </button>
        </div>
      </aside>
    </>
  );
}
