"use client";
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, where, doc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/lib/auth-context';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { Users, ShieldCheck, Flower, Bell, ScrollText, TrendingUp, PieChart as PieIcon, Zap, Sparkles, AlertTriangle } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    activePandits: 0,
    activeMalis: 0,
    pendingVerifications: 0,
    totalBookings: 0,
    expressOrdersToday: 0
  });
  const [growthData, setGrowthData] = useState<any[]>([]);
  const [distributionData, setDistributionData] = useState<any[]>([]);
  const [subscriptionPieData, setSubscriptionPieData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [permError, setPermError] = useState(false);

  // Emerald Green + Champagne Gold luxury palette for charts
  const COLORS = ['#047857', '#D4AF37', '#10B981', '#B8860B', '#064032'];

  useEffect(() => {
    if (!user) return;

    async function fetchData() {
      // Verify admin role in Firestore first
      try {
        const userDoc = await getDoc(doc(db, 'users', user!.uid));
        if (!userDoc.exists() || userDoc.data()?.role !== 'admin') {
          setPermError(true);
          setLoading(false);
          return;
        }
      } catch {
        setPermError(true);
        setLoading(false);
        return;
      }

      // Fetch each collection independently — if one fails, others still load
      const safeGet = async (q: any) => { try { return await getDocs(q); } catch { return { docs: [], size: 0 }; } };

      const [
        usersSnap, 
        panditsSnap, 
        malisSnap, 
        pendingPanditsSnap, 
        pendingMalisSnap, 
        pendingSnap, 
        bookingsSnap, 
        expressSnap, 
        subsSnap
      ] = await Promise.all([
        safeGet(collection(db, 'users')),
        safeGet(query(collection(db, 'pandits'), where('verified', '==', true))),
        safeGet(query(collection(db, 'vendors'), where('verified', '==', true))),
        safeGet(query(collection(db, 'pandits'), where('verified', '==', false))),
        safeGet(query(collection(db, 'vendors'), where('verified', '==', false))),
        safeGet(collection(db, 'admin_notifications')),
        safeGet(collection(db, 'pandit-bookings')),
        safeGet(query(collection(db, 'orders'), where('orderType', '==', 'express'))),
        safeGet(collection(db, 'subscriptions')),
      ]);

      const todayDateString = new Date().toDateString();
      const expressOrdersToday = (expressSnap as any).docs.filter((doc: any) => {
        const data = doc.data();
        if (!data.createdAt) return false;
        const d = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
        return new Date(d).toDateString() === todayDateString;
      }).length;

      // Unique pending verifications calculation
      const pendingIds = new Set<string>();
      (pendingPanditsSnap as any).docs?.forEach((d: any) => pendingIds.add(d.id));
      (pendingMalisSnap as any).docs?.forEach((d: any) => pendingIds.add(d.id));
      (pendingSnap as any).docs?.forEach((d: any) => {
        const id = d.data()?.panditId || d.data()?.maliId || d.id;
        if (id) pendingIds.add(id);
      });

      // Active counts (cross-check collections and users)
      const userPanditsCount = (usersSnap as any).docs?.filter((d: any) => d.data().role === 'pandit' && d.data().verified).length || 0;
      const userMalisCount = (usersSnap as any).docs?.filter((d: any) => d.data().role === 'mali' && d.data().verified).length || 0;
      const activePanditsCount = Math.max(panditsSnap.size, userPanditsCount);
      const activeMalisCount = Math.max(malisSnap.size, userMalisCount);

      setStats({
        totalUsers: usersSnap.size,
        activePandits: activePanditsCount,
        activeMalis: activeMalisCount,
        pendingVerifications: pendingIds.size,
        totalBookings: bookingsSnap.size,
        expressOrdersToday
      });

      setDistributionData([
        { name: 'Devotees', value: Math.max(0, usersSnap.size - activePanditsCount - activeMalisCount) },
        { name: 'Pandits', value: activePanditsCount },
        { name: 'Vendors', value: activeMalisCount },
      ]);

      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dayCounts: Record<string, { users: number; bookings: number }> = {};
      dayNames.forEach(d => { dayCounts[d] = { users: 0, bookings: 0 }; });

      (usersSnap as any).docs.forEach((d: any) => {
        const createdAt = d.data().createdAt;
        let dateObj: Date | null = null;
        if (createdAt?.toDate) dateObj = createdAt.toDate();
        else if (typeof createdAt === 'string') {
          const [dd, m, y] = createdAt.split('/').map(Number);
          dateObj = new Date(y, m - 1, dd);
        }
        if (dateObj && !isNaN(dateObj.getTime())) {
          const day = dayNames[dateObj.getDay()];
          if (dayCounts[day]) dayCounts[day].users += 1;
        }
      });

      (bookingsSnap as any).docs.forEach((d: any) => {
        const createdAt = d.data().createdAt;
        let dateObj: Date | null = null;
        if (createdAt?.toDate) dateObj = createdAt.toDate();
        if (dateObj && !isNaN(dateObj.getTime())) {
          const day = dayNames[dateObj.getDay()];
          if (dayCounts[day]) dayCounts[day].bookings += 1;
        }
      });

      setGrowthData(dayNames.map(name => ({
        name,
        users: dayCounts[name].users,
        bookings: dayCounts[name].bookings
      })));

      const planCounts: Record<string, number> = {};
      (subsSnap as any).docs.forEach((d: any) => {
        const plan = d.data().planName || 'Standard';
        planCounts[plan] = (planCounts[plan] || 0) + 1;
      });
      setSubscriptionPieData(Object.entries(planCounts).map(([name, value]) => ({ name, value })));

      setLoading(false);
    }

    fetchData();
  }, [user]);

  const StatCard = ({ title, value, icon: Icon, color, bg, borderColor }: any) => (
    <div
      className="card"
      style={{
        flex: '1 1 200px',
        minWidth: '200px',
        border: `1px solid ${borderColor || 'rgba(212, 175, 55, 0.22)'}`,
        background: '#FFFFFF',
        boxShadow: '0 4px 18px rgba(6, 78, 59, 0.05)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ color: '#53695E', fontSize: '0.72rem', fontWeight: '800', marginBottom: '6px', letterSpacing: '1px' }}>
            {title}
          </p>
          <h2 style={{ fontSize: '1.9rem', color: '#0B251C', fontWeight: '900', letterSpacing: '-0.5px' }}>
            {value}
          </h2>
        </div>
        <div style={{
          backgroundColor: bg || '#ECFDF5',
          padding: '12px',
          borderRadius: '14px',
          color: color || '#047857',
          border: '1px solid rgba(212, 175, 55, 0.2)'
        }}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  );

  // Permission Error State
  if (permError) {
    return (
      <div style={{ maxWidth: '600px', margin: '80px auto', textAlign: 'center', padding: '20px' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '20px', backgroundColor: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', border: '1px solid #FEE2E2' }}>
          <AlertTriangle size={36} color="#EF4444" />
        </div>
        <h2 style={{ fontSize: '1.5rem', color: '#0B251C', fontWeight: '800', marginBottom: '12px' }}>Access Denied</h2>
        <p style={{ color: '#53695E', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '24px' }}>
          Your account does not have admin privileges. Please ask a super admin to set your role to <strong>admin</strong> in the Firebase console.
        </p>
        <div style={{ backgroundColor: '#FCF9F1', border: '1px solid rgba(212, 175, 55, 0.35)', borderRadius: '12px', padding: '16px', textAlign: 'left' }}>
          <p style={{ fontSize: '0.8rem', color: '#9A7424', fontWeight: '800', marginBottom: '8px' }}>HOW TO FIX:</p>
          <p style={{ fontSize: '0.85rem', color: '#0B251C' }}>Firebase Console → Firestore → <code>users</code> collection → Find your user document → Set <code>role: "admin"</code></p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ color: '#D4AF37', fontSize: '1.2rem' }}>✧</span>
            <h1 style={{
              fontSize: '2.1rem',
              color: '#0B251C',
              fontWeight: '900',
              letterSpacing: '-0.5px',
              fontFamily: 'Cinzel, Georgia, serif'
            }}>
              Royal Admin Overview
            </h1>
          </div>
          <p style={{ color: '#53695E', fontSize: '0.94rem', paddingLeft: '24px' }}>
            MitSadhana sacred ecosystem metrics, live rituals & logistics sync.
          </p>
        </div>
        <div className="badge-emerald" style={{ padding: '8px 16px', fontSize: '0.78rem' }}>
          <div style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#10B981', boxShadow: '0 0 8px #10B981' }} />
          <Sparkles size={14} color="#047857" />
          LIVE SYNC ACTIVE
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '32px' }}>
        <StatCard title="TOTAL USERS" value={stats.totalUsers} icon={Users} color="#047857" bg="#ECFDF5" borderColor="rgba(4, 120, 87, 0.22)" />
        <StatCard title="VERIFIED PANDITS" value={stats.activePandits} icon={ShieldCheck} color="#B8860B" bg="#FCF8ED" borderColor="rgba(212, 175, 55, 0.3)" />
        <StatCard title="VERIFIED MALIS" value={stats.activeMalis} icon={Flower} color="#059669" bg="#ECFDF5" borderColor="rgba(5, 150, 105, 0.22)" />
        <StatCard title="EXPRESS TODAY" value={stats.expressOrdersToday} icon={Zap} color="#D4AF37" bg="#FFFDF5" borderColor="rgba(212, 175, 55, 0.3)" />
        <StatCard title="PENDING ACTIONS" value={stats.pendingVerifications} icon={Bell} color="#E11D48" bg="#FFF1F2" borderColor="rgba(225, 29, 72, 0.2)" />
        <StatCard title="TOTAL BOOKINGS" value={stats.totalBookings} icon={ScrollText} color="#064032" bg="#F0FDF4" borderColor="rgba(6, 64, 50, 0.22)" />
      </div>

      {/* Charts Row */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '32px', flexWrap: 'wrap' }}>
        {/* Growth Line Chart */}
        <div className="card glass" style={{ flex: '2 1 350px', minWidth: '0' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', gap: '10px' }}>
            <div style={{ padding: '8px', borderRadius: '10px', backgroundColor: '#ECFDF5', border: '1px solid rgba(4, 120, 87, 0.2)' }}>
              <TrendingUp size={18} color="#047857" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', color: '#0B251C', fontWeight: '800' }}>User & Order Trajectory</h3>
              <p style={{ fontSize: '0.75rem', color: '#53695E' }}>Weekly momentum across devotees and bookings</p>
            </div>
          </div>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E0EBE4" vertical={false} />
                <XAxis dataKey="name" stroke="#53695E" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#53695E" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid rgba(212, 175, 55, 0.35)',
                    borderRadius: '12px',
                    boxShadow: '0 4px 18px rgba(6, 78, 59, 0.12)'
                  }}
                  itemStyle={{ fontSize: '12px', color: '#0B251C', fontWeight: '600' }}
                />
                <Line type="monotone" dataKey="users" name="Devotees" stroke="#047857" strokeWidth={3} dot={{ r: 4, fill: '#047857' }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="bookings" name="Puja Bookings" stroke="#D4AF37" strokeWidth={2.5} dot={{ r: 3, fill: '#D4AF37' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribution Pie Chart */}
        <div className="card glass" style={{ flex: '1 1 260px', minWidth: '0' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', gap: '10px' }}>
            <div style={{ padding: '8px', borderRadius: '10px', backgroundColor: '#FCF9F1', border: '1px solid rgba(212, 175, 55, 0.25)' }}>
              <PieIcon size={18} color="#D4AF37" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', color: '#0B251C', fontWeight: '800' }}>Ecosystem Roles</h3>
              <p style={{ fontSize: '0.75rem', color: '#53695E' }}>Verified active community distribution</p>
            </div>
          </div>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={distributionData} cx="50%" cy="45%" innerRadius={55} outerRadius={78} paddingAngle={5} dataKey="value">
                  {distributionData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid rgba(212, 175, 55, 0.35)', borderRadius: '10px' }} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Action Center Banner */}
      <div
        className="card"
        style={{
          padding: '28px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #02241C 0%, #04382C 45%, #047857 100%)',
          border: '1px solid rgba(212, 175, 55, 0.4)',
          boxShadow: '0 12px 36px rgba(2, 36, 28, 0.28)',
          flexWrap: 'wrap',
          gap: '16px',
          borderRadius: '20px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ color: '#D4AF37', fontSize: '1.1rem' }}>✦</span>
            <h3 style={{ color: '#F7EFCF', fontSize: '1.25rem', fontWeight: '800', fontFamily: 'Cinzel, Georgia, serif', letterSpacing: '0.5px' }}>
              Verification Action Center
            </h3>
          </div>
          <p style={{ color: '#E2EBE6', fontSize: '0.92rem', paddingLeft: '22px' }}>
            You have <strong style={{ color: '#FDE68A', textDecoration: 'underline' }}>{stats.pendingVerifications}</strong> professional Vedic Pandit & Mali partner requests pending review.
          </p>
        </div>
        <button
          className="btn-champagne"
          onClick={() => window.location.href = '/verifications'}
          style={{
            padding: '12px 26px',
            fontSize: '0.92rem',
            letterSpacing: '0.5px',
          }}
        >
          GO TO VERIFICATIONS →
        </button>
      </div>
    </div>
  );
}
