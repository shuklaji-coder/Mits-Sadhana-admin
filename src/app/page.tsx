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

  const COLORS = ['#FF9800', '#10B981', '#3B82F6', '#F59E0B', '#8B5CF6'];

  useEffect(() => {
    if (!user) return;

    async function fetchData() {
      // Verify admin role in Firestore first
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
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

      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        const panditsSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'pandit'), where('verified', '==', true)));
        const malisSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'mali'), where('verified', '==', true)));
        const pendingSnap = await getDocs(collection(db, 'admin_notifications'));
        const bookingsSnap = await getDocs(collection(db, 'pandit-bookings'));

        const expressSnap = await getDocs(query(collection(db, 'orders'), where('orderType', '==', 'express')));
        const todayDateString = new Date().toDateString();
        const expressOrdersToday = expressSnap.docs.filter(doc => {
          const data = doc.data();
          if (!data.createdAt) return false;
          const d = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
          return new Date(d).toDateString() === todayDateString;
        }).length;

        setStats({
          totalUsers: usersSnap.size,
          activePandits: panditsSnap.size,
          activeMalis: malisSnap.size,
          pendingVerifications: pendingSnap.size,
          totalBookings: bookingsSnap.size,
          expressOrdersToday
        });

        setDistributionData([
          { name: 'Devotees', value: Math.max(0, usersSnap.size - panditsSnap.size - malisSnap.size) },
          { name: 'Pandits', value: panditsSnap.size },
          { name: 'Vendors', value: malisSnap.size },
        ]);

        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dayCounts: Record<string, { users: number; bookings: number }> = {};
        dayNames.forEach(d => { dayCounts[d] = { users: 0, bookings: 0 }; });

        usersSnap.docs.forEach(d => {
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

        bookingsSnap.docs.forEach(d => {
          const date = d.data().date || d.data().createdAt;
          let dateObj: Date | null = null;
          if (date?.toDate) dateObj = date.toDate();
          else if (typeof date === 'string') {
            const parts = date.split('/');
            if (parts.length === 3) {
              const [dd, m, y] = parts.map(Number);
              dateObj = new Date(y, m - 1, dd);
            }
          }
          if (dateObj && !isNaN(dateObj.getTime())) {
            const day = dayNames[dateObj.getDay()];
            if (dayCounts[day]) dayCounts[day].bookings += 1;
          }
        });
        setGrowthData(dayNames.map(d => ({ name: d, users: dayCounts[d].users, bookings: dayCounts[d].bookings })));

        const subsSnap = await getDocs(collection(db, 'subscriptions'));
        const planCounts: Record<string, number> = {};
        subsSnap.docs.forEach(d => {
          const plan = d.data().planName || 'Other';
          planCounts[plan] = (planCounts[plan] || 0) + 1;
        });
        setSubscriptionPieData(Object.entries(planCounts).map(([name, value]) => ({ name, value })));

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user]);

  const StatCard = ({ title, value, icon: Icon, color, bg }: any) => (
    <div className="card" style={{ flex: '1 1 200px', minWidth: '200px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ color: '#71717A', fontSize: '0.72rem', fontWeight: '800', marginBottom: '6px', letterSpacing: '0.8px' }}>{title}</p>
          <h2 style={{ fontSize: '1.8rem', color: '#18181B', fontWeight: '800' }}>{value}</h2>
        </div>
        <div style={{ backgroundColor: bg || '#FFF7ED', padding: '12px', borderRadius: '14px', color: color || '#FF9800' }}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  );

  // Permission Error State
  if (permError) {
    return (
      <div style={{ maxWidth: '600px', margin: '80px auto', textAlign: 'center', padding: '20px' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '20px', backgroundColor: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <AlertTriangle size={36} color="#EF4444" />
        </div>
        <h2 style={{ fontSize: '1.5rem', color: '#18181B', fontWeight: '800', marginBottom: '12px' }}>Access Denied</h2>
        <p style={{ color: '#71717A', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '24px' }}>
          Your account does not have admin privileges. Please ask a super admin to set your role to <strong>admin</strong> in the Firebase console.
        </p>
        <div style={{ backgroundColor: '#FFF7ED', border: '1px solid rgba(255,152,0,0.3)', borderRadius: '12px', padding: '16px', textAlign: 'left' }}>
          <p style={{ fontSize: '0.8rem', color: '#71717A', fontWeight: '700', marginBottom: '8px' }}>HOW TO FIX:</p>
          <p style={{ fontSize: '0.85rem', color: '#3F3F46' }}>Firebase Console → Firestore → <code>users</code> collection → Find your user document → Set <code>role: "admin"</code></p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', color: '#18181B', fontWeight: '900', letterSpacing: '-0.5px' }}>Admin Overview</h1>
          <p style={{ color: '#71717A', fontSize: '0.95rem', marginTop: '4px' }}>MitSadhana sacred ecosystem metrics at your fingertips.</p>
        </div>
        <div style={{ backgroundColor: '#FFF7ED', border: '1px solid rgba(255,152,0,0.35)', padding: '8px 16px', borderRadius: '12px', fontSize: '0.78rem', color: '#E65100', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Sparkles size={14} color="#FF9800" />
          LIVE SYNC ACTIVE
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '32px' }}>
        <StatCard title="TOTAL USERS" value={stats.totalUsers} icon={Users} color="#FF9800" bg="#FFF7ED" />
        <StatCard title="VERIFIED PANDITS" value={stats.activePandits} icon={ShieldCheck} color="#E65100" bg="#FFF7ED" />
        <StatCard title="VERIFIED MALIS" value={stats.activeMalis} icon={Flower} color="#10B981" bg="#ECFDF5" />
        <StatCard title="EXPRESS TODAY" value={stats.expressOrdersToday} icon={Zap} color="#3B82F6" bg="#EFF6FF" />
        <StatCard title="PENDING ACTIONS" value={stats.pendingVerifications} icon={Bell} color="#EF4444" bg="#FEF2F2" />
        <StatCard title="TOTAL BOOKINGS" value={stats.totalBookings} icon={ScrollText} color="#8B5CF6" bg="#F5F3FF" />
      </div>

      {/* Charts Row */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '32px', flexWrap: 'wrap' }}>
        {/* Growth Line Chart */}
        <div className="card" style={{ flex: '2 1 350px', minWidth: '0' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', gap: '10px' }}>
            <div style={{ padding: '8px', borderRadius: '10px', backgroundColor: '#FFF7ED' }}>
              <TrendingUp size={18} color="#FF9800" />
            </div>
            <h3 style={{ fontSize: '1.1rem', color: '#18181B', fontWeight: '800' }}>User & Order Growth</h3>
          </div>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F4F4F5" vertical={false} />
                <XAxis dataKey="name" stroke="#71717A" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#71717A" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E4E4E7', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} itemStyle={{ fontSize: '12px', color: '#18181B' }} />
                <Line type="monotone" dataKey="users" stroke="#FF9800" strokeWidth={3} dot={{ r: 4, fill: '#FF9800' }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="bookings" stroke="#10B981" strokeWidth={2.5} dot={{ r: 3, fill: '#10B981' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribution Pie Chart */}
        <div className="card" style={{ flex: '1 1 260px', minWidth: '0' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', gap: '10px' }}>
            <div style={{ padding: '8px', borderRadius: '10px', backgroundColor: '#FFF7ED' }}>
              <PieIcon size={18} color="#FF9800" />
            </div>
            <h3 style={{ fontSize: '1.1rem', color: '#18181B', fontWeight: '800' }}>Distribution</h3>
          </div>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={distributionData} cx="50%" cy="45%" innerRadius={55} outerRadius={75} paddingAngle={5} dataKey="value">
                  {distributionData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E4E4E7', borderRadius: '10px' }} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Action Center */}
      <div className="card" style={{ padding: '28px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF7ED', borderColor: 'rgba(255,152,0,0.35)', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h3 style={{ marginBottom: '6px', color: '#18181B', fontSize: '1.2rem', fontWeight: '800' }}>Verification Action Center</h3>
          <p style={{ color: '#71717A', fontSize: '0.9rem' }}>You have <strong style={{ color: '#EF4444' }}>{stats.pendingVerifications}</strong> professional verifications pending approval.</p>
        </div>
        <button className="btn-primary" onClick={() => window.location.href = '/verifications'}>
          GO TO VERIFICATIONS →
        </button>
      </div>
    </div>
  );
}
