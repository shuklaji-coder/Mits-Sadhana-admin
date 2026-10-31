"use client";
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { 
  collection, query, onSnapshot, orderBy, where, doc, updateDoc, addDoc, serverTimestamp 
} from 'firebase/firestore';
import { 
  CreditCard, Calendar, CheckCircle2, Clock, MapPin, User, Search, Filter, AlertTriangle, Check, ChevronDown, Map, Loader2
} from 'lucide-react';

interface Subscription {
  id: string;
  userName: string;
  userPhone: string;
  userAddress?: string;
  address?: string;
  userDetails?: {
    address?: string;
    name?: string;
    phone?: string;
  };
  planName: string;
  price: number | string;
  status: 'active' | 'expired' | 'pending';
  allotmentStatus: 'pending' | 'allotted';
  pincode: string;
  createdAt: any;
  maliName?: string;
  assignedMaliId?: string;
  maliShop?: string;
  isPaused?: boolean;
  subscriptionPausedUntil?: string | null;
  pauseStartDate?: string;
  pauseEndDate?: string;
  pausedDaysCount?: number;
  endDate?: string;
}

interface Mali {
  uid: string;
  name: string;
  shopName: string;
  pincode: string;
  photoURL?: string;
}

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [availableMalis, setAvailableMalis] = useState<Mali[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending_allotment' | 'active' | 'vacation'>('all');
  const [appointing, setAppointing] = useState<string | null>(null);
  
  // Custom Selection State
  const [pickerOpen, setPickerOpen] = useState<string | null>(null); // Subscription ID for which picker is open
  const [maliSearch, setMaliSearch] = useState("");

  useEffect(() => {
    const subQuery = query(collection(db, 'subscriptions'), orderBy('createdAt', 'desc'));
    const unsubSubs = onSnapshot(subQuery, (snap) => {
      setSubscriptions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subscription)));
      setLoading(false);
    });

    const maliQuery = query(collection(db, 'users'), where('role', '==', 'mali'), where('verified', '==', true));
    const unsubMalis = onSnapshot(maliQuery, (snap) => {
      setAvailableMalis(snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as Mali)));
    });

    return () => {
      unsubSubs();
      unsubMalis();
    };
  }, []);

  const handleAppointMali = async (sub: Subscription, mali: Mali) => {
    setAppointing(sub.id);
    setPickerOpen(null);
    try {
      await updateDoc(doc(db, 'subscriptions', sub.id), {
        allotmentStatus: 'allotted',
        assignedMaliId: mali.uid,
        maliName: mali.name || 'Unknown',
        maliShop: mali.shopName || '',
        // Hybrid Sync: Mobile App expects 'userDetails' object
        userDetails: {
            ...(sub.userDetails || {}),
            name: sub.userName || sub.userDetails?.name || 'Devotee',
            phone: sub.userPhone || sub.userDetails?.phone || '',
            address: sub.userAddress || (sub as any).deliveryAddress || sub.address || sub.userDetails?.address || 'Address details pending'
        }
      });

      await addDoc(collection(db, 'notifications'), {
        userId: mali.uid,
        title: 'New Subscription Assigned 🌸',
        desc: `You are appointed for: ${sub.planName} (${sub.userName})`,
        message: `You are appointed for: ${sub.planName} (${sub.userName})`,
        type: 'delivery',
        unread: true,
        createdAt: serverTimestamp()
      });

      alert(`✅ ${mali.name} appointed successfully!`);
    } catch (e) {
        console.error(e);
        alert("❌ Error appointing Mali.");
    } finally {
        setAppointing(null);
    }
  };

  const getTimeline = (sub: Subscription) => {
    const createdAt = sub.createdAt;
    const start = createdAt ? (createdAt.toDate ? createdAt.toDate() : new Date(createdAt)) : new Date();
    const end = (sub as any).endDate ? new Date((sub as any).endDate) : new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    const daysLeft = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    
    return {
      start: start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      end: end.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      daysLeft
    };
  };

  const isSubPaused = (sub: Subscription) => {
    if (sub.isPaused) return true;
    if (sub.subscriptionPausedUntil) {
      const p = new Date(sub.subscriptionPausedUntil).getTime();
      if (!isNaN(p) && p > Date.now()) return true;
    }
    return false;
  };

  const filtered = subscriptions.filter(sub => {
    const s = searchTerm.toLowerCase();
    const matchesSearch = 
      sub.userName?.toLowerCase().includes(s) || 
      sub.userPhone?.includes(s) ||
      sub.planName?.toLowerCase().includes(s) ||
      sub.pincode?.includes(s);
    
    const paused = isSubPaused(sub);
    if (filter === 'pending_allotment') return matchesSearch && sub.allotmentStatus === 'pending';
    if (filter === 'active') return matchesSearch && sub.status === 'active' && !paused;
    if (filter === 'vacation') return matchesSearch && paused;
    return matchesSearch;
  });

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '100px' }}>
      <div style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2.4rem', fontWeight: '900', letterSpacing: '-1px' }}>Sacred Subscription Ops</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>Manage devotee fulfillment and Partner logistics.</p>
        </div>
        <div style={{ textAlign: 'right' }}>
            <h2 style={{ fontSize: '1.8rem', color: 'var(--primary)', fontWeight: '900' }}>
              ₹{subscriptions.reduce((acc, curr) => {
                const p = String(curr.price || 0).replace(/[₹,]/g, '');
                return acc + (Number(p) || 0);
              }, 0).toLocaleString()}
            </h2>
            <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: '800', letterSpacing: '1px' }}>ECOSYSTEM VALUE</p>
        </div>
      </div>

      {/* FILTER BAR */}
      <div style={{ display: 'flex', gap: '15px', marginBottom: '35px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, position: 'relative', minWidth: '300px' }}>
          <Search style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
          <input 
            type="text" 
            placeholder="Search by Devotee, Phone, or Area..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="glass"
            style={{ width: '100%', padding: '16px 16px 16px 45px', borderRadius: '15px', color: '#0B251C', outline: 'none' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '8px', backgroundColor: 'rgba(255,255,255,0.03)', padding: '6px', borderRadius: '15px', border: '1px solid var(--border)' }}>
          {[
            { id: 'all', label: 'All Cycles' },
            { id: 'pending_allotment', label: 'Needs Partner' },
            { id: 'active', label: 'Flowing' },
            { id: 'vacation', label: '🏖️ On Vacation' },
          ].map(t => (
            <button 
              key={t.id}
              onClick={() => setFilter(t.id as any)}
              style={{
                 padding: '10px 20px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '900',
                 backgroundColor: filter === t.id ? 'var(--primary)' : 'transparent',
                 color: filter === t.id ? '#0A130E' : 'var(--text-muted)',
                 transition: 'all 0.3s'
              }}
            >
              {t.label.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '100px', textAlign: 'center' }}>
            <Loader2 className="spin" size={40} color="var(--primary)" />
            <p style={{ marginTop: '20px', color: 'var(--text-muted)', letterSpacing: '2px' }}>LOADING DIVINE DATA...</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '25px' }}>
          {filtered.map((sub) => {
            const timeline = getTimeline(sub);
            const isAllotted = sub.allotmentStatus === 'allotted';

            return (
              <div key={sub.id} className="card glass" style={{ borderLeft: `6px solid ${isAllotted ? '#D4A843' : '#FF6B6B'}`, padding: '0', overflow: 'visible', position: 'relative', zIndex: pickerOpen === sub.id ? 50 : 1 }}>
                <div style={{ padding: '30px', display: 'flex', gap: '30px' }}>
                    {/* LEFT: Devotee & Plan */}
                    <div style={{ flex: 1.5 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.7rem', padding: '5px 12px', borderRadius: '20px', backgroundColor: 'rgba(212,168,67,0.1)', color: 'var(--primary)', fontWeight: '900', border: '1px solid rgba(212,168,67,0.2)' }}>
                                {sub.planName?.toUpperCase()}
                            </span>
                            <span style={{ fontSize: '0.7rem', color: sub.status === 'active' ? '#4ADE80' : '#F87171', fontWeight: '900' }}>
                                ● {sub.status?.toUpperCase()}
                            </span>
                            {isSubPaused(sub) && (
                              <span style={{ fontSize: '0.7rem', padding: '5px 12px', borderRadius: '20px', backgroundColor: '#FEF3C7', color: '#92400E', fontWeight: '900', border: '1px solid #FDE68A' }}>
                                🏖️ ON VACATION (RESUMES {sub.subscriptionPausedUntil ? new Date(sub.subscriptionPausedUntil).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : 'PAUSED'})
                              </span>
                            )}
                        </div>

                        <h3 style={{ fontSize: '1.6rem', color: '#0B251C', marginBottom: '15px', fontWeight: '800' }}>{sub.userName}</h3>
                        
                        <div style={{ backgroundColor: '#F7FAF8', padding: '15px', borderRadius: '15px', marginBottom: '20px', border: '1px solid #DFEAE3' }}>
                            <p style={{ display: 'flex', gap: '10px', color: '#0B251C', fontSize: '0.92rem', lineHeight: '1.5', fontWeight: '600' }}>
                                <MapPin size={18} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                                <span>{sub.userAddress || (sub as any).deliveryAddress || sub.address || sub.userDetails?.address || 'Address details pending...'}</span>
                            </p>
                        </div>

                        <div style={{ display: 'flex', gap: '25px', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                <User size={16} /> <strong style={{ color: '#0B251C' }}>{sub.userPhone}</strong>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                <Map size={16} /> Area: <strong style={{ color: '#0B251C' }}>{sub.pincode}</strong>
                            </div>
                        </div>
                    </div>

                    {/* MIDDLE: Timeline */}
                    <div style={{ flex: 1, borderLeft: '1px solid #DFEAE3', paddingLeft: '30px' }}>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '900', letterSpacing: '1px', marginBottom: '20px' }}>SUBSCRIPTION LIFECYCLE</p>
                        
                        <div style={{ position: 'relative', paddingLeft: '20px', borderLeft: '2px dashed rgba(212,168,67,0.45)' }}>
                            <div style={{ marginBottom: '15px' }}>
                                <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '4px' }}>START DATE</p>
                                <p style={{ fontWeight: 'bold', color: '#0B251C' }}>{timeline.start}</p>
                            </div>
                            <div>
                                <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '4px' }}>RENEWAL DATE</p>
                                <p style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{timeline.end}</p>
                            </div>
                            {/* Marker */}
                            <div style={{ position: 'absolute', top: 0, left: '-6px', width: '10px', height: '10px', borderRadius: '5px', backgroundColor: 'var(--primary)' }} />
                        </div>

                        <div style={{ marginTop: '20px', padding: '10px 15px', borderRadius: '10px', backgroundColor: '#FCF9F1', border: '1px solid rgba(212,168,67,0.3)', display: 'inline-block' }}>
                            <Text style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 'bold' }}>⏳ {timeline.daysLeft} Days Remaining</Text>
                        </div>
                    </div>

                    {/* RIGHT: Partner Allotment */}
                    <div style={{ flex: 1.2, borderLeft: '1px solid #DFEAE3', paddingLeft: '30px', position: 'relative' }}>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '900', letterSpacing: '1px', marginBottom: '15px' }}>FULFILLMENT PARTNER</p>
                        
                        {isAllotted ? (
                            <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <div style={{ width: '45px', height: '45px', borderRadius: '12px', backgroundColor: '#FCF9F1', border: '1px solid rgba(212,168,67,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                                    🌸
                                </div>
                                <div>
                                    <h4 style={{ color: '#0B251C', fontSize: '1rem', fontWeight: '800' }}>{sub.maliName}</h4>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--primary)' }}>{sub.maliShop || 'Direct Partner'}</p>
                                </div>
                            </div>
                        ) : (
                            <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '45px', height: '45px', borderRadius: '12px', backgroundColor: 'rgba(255,107,107,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <AlertTriangle size={20} color="#FF6B6B" />
                                </div>
                                <p style={{ color: '#FF6B6B', fontWeight: 'bold', fontSize: '0.9rem' }}>PARTNER MISSING</p>
                            </div>
                        )}

                        <div style={{ position: 'relative' }}>
                            <button 
                                onClick={() => setPickerOpen(pickerOpen === sub.id ? null : sub.id)}
                                disabled={appointing === sub.id}
                                style={{ 
                                    width: '100%', padding: '14px', borderRadius: '15px', 
                                    backgroundColor: '#02241C', border: '1.5px solid rgba(212,168,67,0.35)', 
                                    color: '#F7EFCF', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                }}
                            >
                                <span style={{ fontSize: '0.85rem' }}>{appointing === sub.id ? 'Appointing...' : (isAllotted ? 'Change Partner' : 'Appoint Partner')}</span>
                                <ChevronDown size={16} color="var(--primary)" />
                            </button>

                            {/* CUSTOM SEARCH PICKER DROPDOWN */}
                            {pickerOpen === sub.id && (
                                <div style={{ 
                                    position: 'absolute', top: '110%', left: 0, width: '100%', 
                                    backgroundColor: '#112219', borderRadius: '20px', border: '1px solid var(--primary)', 
                                    zIndex: 100, padding: '15px', boxShadow: '0 10px 40px rgba(0,0,0,0.8)'
                                }}>
                                    <div style={{ position: 'relative', marginBottom: '15px' }}>
                                        <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)' }} />
                                        <input 
                                            autoFocus
                                            type="text" 
                                            placeholder="Search by name, area code..."
                                            value={maliSearch}
                                            onChange={e => setMaliSearch(e.target.value)}
                                            style={{ width: '100%', padding: '12px 12px 12px 35px', backgroundColor: '#020503', border: '1px solid var(--primary)', borderRadius: '12px', color: 'white', fontSize: '0.85rem', outline: 'none' }}
                                        />
                                    </div>
                                    <div style={{ maxHeight: '220px', overflowY: 'auto', paddingRight: '5px' }}>
                                        {availableMalis.filter(m => m.name?.toLowerCase().includes(maliSearch.toLowerCase()) || m.pincode?.includes(maliSearch)).length === 0 ? (
                                            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', padding: '20px 0' }}>No partners found matching "{maliSearch}"</p>
                                        ) : (
                                          availableMalis
                                            .filter(m => m.name?.toLowerCase().includes(maliSearch.toLowerCase()) || m.pincode?.includes(maliSearch))
                                            .map(mali => (
                                              <Pressable 
                                                  key={mali.uid} 
                                                  onClick={() => handleAppointMali(sub, mali)}
                                                  style={{ padding: '12px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px', backgroundColor: 'rgba(255,255,255,0.03)' }}
                                              >
                                                  <div>
                                                      <p style={{ fontSize: '0.85rem', color: 'white', fontWeight: 'bold' }}>{mali.name}</p>
                                                      <p style={{ fontSize: '0.7rem', color: 'var(--primary)' }}>{mali.shopName}</p>
                                                  </div>
                                                  <span style={{ fontSize: '0.7rem', padding: '4px 8px', borderRadius: '6px', backgroundColor: mali.pincode === sub.pincode ? 'rgba(212,168,67,0.2)' : 'rgba(255,255,255,0.05)', color: mali.pincode === sub.pincode ? 'var(--primary)' : 'var(--text-muted)', fontWeight: mali.pincode === sub.pincode ? 'bold' : 'normal' }}>
                                                      {mali.pincode}
                                                  </span>
                                              </Pressable>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        .spin { animation: rotate 2s linear infinite; }
        @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .glass { background: rgba(255, 255, 255, 0.02); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.05); }
      `}</style>
    </div>
  );
}

const Pressable = ({ children, style, onClick }: any) => (
    <div 
        style={{ ...style, cursor: 'pointer' }} 
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(212, 168, 67, 0.1)')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)')}
        onClick={onClick}
    >
        {children}
    </div>
);

const Text = ({ children, style }: any) => <div style={{...style}}>{children}</div>;
