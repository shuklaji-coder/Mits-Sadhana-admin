"use client";
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, ShieldCheck, Flower, Users, LogOut, ScrollText, 
  TrendingUp, Bell, MessageSquare, Package, IndianRupee, Settings, 
  CreditCard, AlertTriangle, Zap, MapPin, ShoppingBag, BadgeIndianRupee, X 
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
    { name: '💰 Dynamic Pricing', path: '/pricing', icon: BadgeIndianRupee },
    { name: 'Global Orders', path: '/orders', icon: ScrollText },
    { name: '⚡ Express Orders', path: '/express-orders', icon: Zap },
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
            backgroundColor: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(4px)',
            zIndex: 40,
          }}
        />
      )}

      <div className={`sidebar ${isOpen ? 'open' : ''}`} style={{
        width: '260px',
        height: '100vh',
        backgroundColor: '#FFFFFF',
        borderRight: '1px solid #E2E8F0',
        padding: '24px 18px',
        position: 'fixed',
        left: 0,
        top: 0,
        display: 'flex',
        flexDirection: 'column',
        zIndex: 50,
        boxShadow: '2px 0 16px rgba(0,0,0,0.03)',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        {/* Header & Mobile Close Button */}
        <div className="logo" style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.35rem', letterSpacing: '1.5px', fontWeight: '900', color: '#FF9800' }}>MITSADHANA</h2>
            <span style={{ fontSize: '0.65rem', color: '#71717A', fontWeight: '700', letterSpacing: '1px' }}>SACRED ADMIN PORTAL</span>
          </div>
          {onClose && (
            <button 
              onClick={onClose} 
              className="mobile-close-btn"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', color: '#71717A' }}
            >
              <X size={20} />
            </button>
          )}
        </div>

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
                  padding: '11px 14px',
                  borderRadius: '12px',
                  marginBottom: '6px',
                  backgroundColor: isActive ? '#FFF7ED' : 'transparent',
                  color: isActive ? '#E65100' : '#3F3F46',
                  transition: 'all 0.15s ease',
                  border: isActive ? '1px solid rgba(255, 152, 0, 0.35)' : '1px solid transparent',
                  fontWeight: isActive ? '800' : '500',
                  fontSize: '0.88rem'
                }}
              >
                <Icon size={18} style={{ marginRight: '12px', color: isActive ? '#FF9800' : '#71717A' }} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer Profile & Logout */}
        <div style={{ marginTop: 'auto', borderTop: '1px solid #E4E4E7', paddingTop: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #FF9800 0%, #E65100 100%)',
              marginRight: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              fontWeight: 'bold',
              fontSize: '0.9rem',
              boxShadow: '0 2px 8px rgba(255, 152, 0, 0.3)'
            }}>
              {user?.email?.slice(0, 2).toUpperCase() || 'SA'}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <p style={{ fontSize: '0.85rem', fontWeight: '700', color: '#18181B' }}>Super Admin</p>
              <p style={{ fontSize: '0.7rem', color: '#71717A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.email || 'admin@mitsadhana.com'}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FEE2E2',
              borderRadius: '10px',
              color: '#EF4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '0.82rem',
              fontWeight: '700',
              transition: 'background 0.2s'
            }}
          >
            <LogOut size={16} style={{ marginRight: '6px' }} />
            LOGOUT
          </button>
        </div>
      </div>
    </>
  );
}

