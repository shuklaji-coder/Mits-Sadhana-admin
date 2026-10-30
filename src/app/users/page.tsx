"use client";
import { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  updateDoc, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { 
  Search, 
  UserCheck, 
  UserX, 
  Star, 
  MapPin, 
  Phone, 
  Mail, 
  BookOpen, 
  Award, 
  Flame, 
  Share2, 
  Store, 
  Truck, 
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export interface UserProfile {
  uid: string;
  name: string;
  username?: string;
  email: string;
  role: 'devotee' | 'pandit' | 'mali' | 'admin';
  verified: boolean;
  status?: string;
  phone?: string;
  pincode?: string;
  city?: string;
  address?: string;
  landmark?: string;
  avatar?: string;
  photoURL?: string;
  createdAt?: any;
  updatedAt?: any;
  lastLoginDate?: string;

  // Devotee specific
  karmaPoints?: number;
  xpPoints?: number;
  level?: number;
  streak?: number;
  ishtadev?: string;
  gotra?: string;
  gitaProgress?: { chapter: number; chapterTitle: string };
  referralCode?: string;
  totalReferrals?: number;

  // Pandit specific (merged from pandits collection)
  education?: string;
  experience?: string | number;
  services?: string[];
  serviceRates?: Record<string, number | string>;
  languages?: string[];
  bio?: string;
  isAstrologer?: boolean;
  rating?: number;
  totalBookings?: number;
  location?: string;
  servingDistance?: string | number;
  available?: boolean;
  isAvailable?: boolean;
  priceRange?: string;
  expertise?: string[];

  // Mali specific (merged from vendors & users collection)
  shopName?: string;
  shopAddress?: string;
  serviceAreas?: Array<{ pincode: string; name?: string; activeOrders?: number; status?: string }> | string[];
  flowerVarieties?: string[];
  deliveryCapacity?: number | string;
  businessExperience?: string;
}

export default function UserDirectory() {
  const [usersMap, setUsersMap] = useState<Record<string, any>>({});
  const [panditsMap, setPanditsMap] = useState<Record<string, any>>({});
  const [vendorsMap, setVendorsMap] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState<'all' | 'devotee' | 'pandit' | 'mali'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'pending' | 'suspended'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  // 1. Real-time Users Collection
  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const map: Record<string, any> = {};
      snapshot.docs.forEach(d => {
        map[d.id] = { uid: d.id, ...d.data() };
      });
      setUsersMap(map);
      setLoading(false);
    });

    // 2. Real-time Pandits Collection
    const unsubPandits = onSnapshot(collection(db, 'pandits'), (snapshot) => {
      const map: Record<string, any> = {};
      snapshot.docs.forEach(d => {
        map[d.id] = { uid: d.id, ...d.data() };
      });
      setPanditsMap(map);
    });

    // 3. Real-time Vendors Collection (Mali Partners)
    const unsubVendors = onSnapshot(collection(db, 'vendors'), (snapshot) => {
      const map: Record<string, any> = {};
      snapshot.docs.forEach(d => {
        map[d.id] = { uid: d.id, ...d.data() };
      });
      setVendorsMap(map);
    });

    return () => {
      unsubUsers();
      unsubPandits();
      unsubVendors();
    };
  }, []);

  // Merge datasets into a unified authoritative list
  const allMergedUsers = useMemo(() => {
    const ids = new Set([
      ...Object.keys(usersMap),
      ...Object.keys(panditsMap),
      ...Object.keys(vendorsMap)
    ]);

    const result: UserProfile[] = [];

    ids.forEach((uid) => {
      const userDoc = usersMap[uid] || {};
      const panditDoc = panditsMap[uid] || {};
      const vendorDoc = vendorsMap[uid] || {};

      let effectiveRole = userDoc.role;
      if (!effectiveRole) {
        if (Object.keys(panditDoc).length > 0) effectiveRole = 'pandit';
        else if (Object.keys(vendorDoc).length > 0) effectiveRole = 'mali';
        else effectiveRole = 'devotee';
      }

      const merged: UserProfile = {
        uid,
        name: panditDoc.name || vendorDoc.name || userDoc.name || 'Unnamed User',
        username: userDoc.username || panditDoc.username,
        email: userDoc.email || panditDoc.email || vendorDoc.email || 'No Email',
        role: effectiveRole,
        verified: panditDoc.verified ?? vendorDoc.verified ?? userDoc.verified ?? false,
        status: panditDoc.status || vendorDoc.status || userDoc.status || 'active',
        phone: userDoc.phone || panditDoc.phone || vendorDoc.phone,
        pincode: userDoc.pincode || panditDoc.pincode || vendorDoc.pincode,
        city: userDoc.city || panditDoc.city || vendorDoc.city,
        address: userDoc.address || panditDoc.address || vendorDoc.address,
        landmark: userDoc.landmark,
        avatar: userDoc.avatar,
        photoURL: panditDoc.photoURL || panditDoc.image || userDoc.photoURL,
        createdAt: userDoc.createdAt || panditDoc.createdAt,
        updatedAt: userDoc.updatedAt || panditDoc.lastUpdated,
        lastLoginDate: userDoc.lastLoginDate,

        // Devotee fields
        karmaPoints: userDoc.karmaPoints ?? 0,
        xpPoints: userDoc.xpPoints ?? 0,
        level: userDoc.level ?? 1,
        streak: userDoc.streak ?? 0,
        ishtadev: userDoc.ishtadev,
        gotra: userDoc.gotra,
        gitaProgress: userDoc.gitaProgress,
        referralCode: userDoc.referralCode,
        totalReferrals: userDoc.totalReferrals ?? 0,

        // Pandit fields
        education: panditDoc.education || userDoc.education,
        experience: panditDoc.experience || userDoc.experience,
        services: panditDoc.services,
        serviceRates: panditDoc.serviceRates,
        languages: panditDoc.languages,
        bio: panditDoc.bio || userDoc.bio,
        isAstrologer: panditDoc.isAstrologer ?? false,
        rating: panditDoc.rating ?? 0,
        totalBookings: panditDoc.totalBookings ?? 0,
        location: panditDoc.location || userDoc.location,
        servingDistance: panditDoc.servingDistance,
        available: panditDoc.available ?? panditDoc.isAvailable ?? true,
        priceRange: panditDoc.priceRange,
        expertise: panditDoc.expertise || userDoc.expertise,

        // Mali fields
        shopName: vendorDoc.shopName || userDoc.shopName,
        shopAddress: vendorDoc.shopAddress || userDoc.shopAddress,
        serviceAreas: vendorDoc.serviceAreas || userDoc.serviceAreas,
        flowerVarieties: vendorDoc.flowerVarieties || userDoc.flowerVarieties,
        deliveryCapacity: vendorDoc.deliveryCapacity || userDoc.deliveryCapacity,
        businessExperience: vendorDoc.businessExperience || userDoc.businessExperience,
      };

      result.push(merged);
    });

    return result;
  }, [usersMap, panditsMap, vendorsMap]);

  // Apply filters & search
  const filteredUsers = useMemo(() => {
    return allMergedUsers.filter(u => {
      // Role filter
      if (activeTab !== 'all' && u.role !== activeTab) return false;

      // Status filter
      if (statusFilter === 'verified' && !u.verified) return false;
      if (statusFilter === 'pending' && (u.verified || u.status === 'approved')) return false;
      if (statusFilter === 'suspended' && u.status !== 'suspended') return false;

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchName = u.name?.toLowerCase().includes(term);
        const matchEmail = u.email?.toLowerCase().includes(term);
        const matchPhone = u.phone?.includes(term);
        const matchCity = u.city?.toLowerCase().includes(term);
        const matchPin = u.pincode?.includes(term);
        const matchShop = u.shopName?.toLowerCase().includes(term);
        return matchName || matchEmail || matchPhone || matchCity || matchPin || matchShop;
      }
      return true;
    });
  }, [allMergedUsers, activeTab, statusFilter, searchTerm]);

  // Count stats
  const stats = useMemo(() => ({
    total: allMergedUsers.length,
    devotees: allMergedUsers.filter(u => u.role === 'devotee').length,
    pandits: allMergedUsers.filter(u => u.role === 'pandit').length,
    malis: allMergedUsers.filter(u => u.role === 'mali').length,
    verified: allMergedUsers.filter(u => u.verified).length,
    pending: allMergedUsers.filter(u => !u.verified && u.status !== 'suspended').length,
  }), [allMergedUsers]);

  // Actions
  const handleSendMessage = async (userId: string, userName: string) => {
    const msg = prompt(`Send in-app notification to ${userName}:`);
    if (!msg || !msg.trim()) return;
    try {
      await addDoc(collection(db, 'notifications'), {
        userId,
        title: "🕉️ Message from MitSadhana Admin",
        message: msg.trim(),
        unread: true,
        createdAt: serverTimestamp(),
        type: 'admin_direct'
      });
      alert(`Message successfully delivered to ${userName}!`);
    } catch (e: any) {
      alert(`Error sending message: ${e?.message || 'Unknown'}`);
    }
  };

  const handleToggleVerification = async (user: UserProfile) => {
    const newStatus = !user.verified;
    const actionLabel = newStatus ? 'VERIFY' : 'REVOKE verification for';
    if (!confirm(`Are you sure you want to ${actionLabel} ${user.name}?`)) return;

    try {
      // 1. Update users collection
      await updateDoc(doc(db, 'users', user.uid), {
        verified: newStatus,
        status: newStatus ? 'approved' : 'pending_approval'
      }).catch(() => {});

      // 2. If Pandit, update pandits collection
      if (user.role === 'pandit') {
        await updateDoc(doc(db, 'pandits', user.uid), {
          verified: newStatus,
          status: newStatus ? 'active' : 'pending_approval'
        }).catch(() => {});
      }

      // 3. If Mali, update vendors collection
      if (user.role === 'mali') {
        await updateDoc(doc(db, 'vendors', user.uid), {
          verified: newStatus,
          status: newStatus ? 'approved' : 'pending_approval'
        }).catch(() => {});
      }

      // 4. Send notification to user
      if (newStatus) {
        await addDoc(collection(db, 'notifications'), {
          userId: user.uid,
          title: '✨ Account Verified!',
          message: `Congratulations ${user.name}! Your MitSadhana ${user.role} profile is now fully verified and live. 🙏`,
          unread: true,
          type: 'success',
          createdAt: serverTimestamp()
        });
      }

      alert(`${user.name} verification status updated to: ${newStatus ? 'VERIFIED' : 'UNVERIFIED'}`);
      if (selectedUser?.uid === user.uid) {
        setSelectedUser(prev => prev ? { ...prev, verified: newStatus } : null);
      }
    } catch (e: any) {
      alert(`Error updating verification: ${e?.message}`);
    }
  };

  const handleToggleSuspend = async (user: UserProfile) => {
    const isSuspended = user.status === 'suspended';
    const action = isSuspended ? 'UNSUSPEND' : 'SUSPEND';
    if (!confirm(`Are you sure you want to ${action} ${user.name}?`)) return;

    try {
      const newStatus = isSuspended ? 'active' : 'suspended';

      await updateDoc(doc(db, 'users', user.uid), {
        status: newStatus,
        active: !isSuspended
      }).catch(() => {});

      if (user.role === 'pandit') {
        await updateDoc(doc(db, 'pandits', user.uid), {
          status: newStatus,
          available: !isSuspended
        }).catch(() => {});
      }

      if (user.role === 'mali') {
        await updateDoc(doc(db, 'vendors', user.uid), {
          status: newStatus,
          isAvailable: !isSuspended
        }).catch(() => {});
      }

      alert(`${user.name} has been ${isSuspended ? 'reactivated' : 'suspended'}.`);
      if (selectedUser?.uid === user.uid) {
        setSelectedUser(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (e: any) {
      alert(`Error updating account status: ${e?.message}`);
    }
  };

  return (
    <div style={{ position: 'relative', minHeight: '100vh', paddingBottom: '60px' }}>
      {/* HEADER */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: '800', color: '#0B251C', marginBottom: '8px', letterSpacing: '-0.5px' }}>
          Divine User & Partner Directory
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>
          Complete 360° management of Devotees, Vedic Pandits, and Sacred Malis in the MitSadhana ecosystem.
        </p>
      </div>

      {/* QUICK ROLE STATS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'ALL MEMBERS', count: stats.total, tab: 'all', icon: '👥' },
          { label: 'DEVOTEES (साधक)', count: stats.devotees, tab: 'devotee', icon: '🙏' },
          { label: 'PANDITS (आचार्य)', count: stats.pandits, tab: 'pandit', icon: '🛕' },
          { label: 'MALIS (पुष्प सेवक)', count: stats.malis, tab: 'mali', icon: '🌸' },
        ].map(stat => {
          const isActive = activeTab === stat.tab;
          return (
            <button 
              key={stat.tab}
              onClick={() => setActiveTab(stat.tab as any)}
              style={{ 
                padding: '18px 20px', 
                borderRadius: '14px', 
                textAlign: 'left',
                border: isActive ? '2px solid #047857' : '1px solid #DFEAE3',
                backgroundColor: isActive ? '#ECFDF5' : '#FFFFFF',
                cursor: 'pointer',
                boxShadow: isActive ? '0 4px 14px rgba(4, 120, 87, 0.12)' : '0 2px 6px rgba(0,0,0,0.03)',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <p style={{ fontSize: '0.72rem', color: isActive ? '#047857' : 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.5px' }}>
                  {stat.label}
                </p>
                <span style={{ fontSize: '1.2rem' }}>{stat.icon}</span>
              </div>
              <h3 style={{ fontSize: '1.8rem', fontWeight: '800', color: isActive ? '#047857' : '#0B251C', margin: 0 }}>
                {stat.count}
              </h3>
            </button>
          );
        })}
      </div>

      {/* SEARCH AND SECONDARY STATUS FILTER */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ 
          flex: 1, 
          minWidth: '280px',
          display: 'flex', 
          alignItems: 'center', 
          padding: '0 18px', 
          borderRadius: '12px',
          backgroundColor: '#FFFFFF',
          border: '1px solid #DFEAE3',
          boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
        }}>
          <Search size={20} color="#53695E" />
          <input 
            type="text" 
            placeholder="Search by name, phone, email, city, pincode, or shop..." 
            style={{ 
              flex: 1, 
              padding: '16px 14px', 
              background: 'transparent', 
              border: 'none', 
              color: '#0B251C', 
              fontSize: '0.95rem',
              outline: 'none',
              fontWeight: '500'
            }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')} 
              style={{ background: 'transparent', border: 'none', color: '#53695E', cursor: 'pointer', fontSize: '1.2rem' }}
            >
              ×
            </button>
          )}
        </div>

        {/* STATUS PILLS */}
        <div style={{ display: 'flex', gap: '8px', background: '#FFFFFF', padding: '6px', borderRadius: '12px', border: '1px solid #DFEAE3' }}>
          {[
            { id: 'all', label: 'All Status' },
            { id: 'verified', label: `Verified (${stats.verified})` },
            { id: 'pending', label: `Pending (${stats.pending})` },
            { id: 'suspended', label: 'Suspended' },
          ].map(s => (
            <button
              key={s.id}
              onClick={() => setStatusFilter(s.id as any)}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '0.8rem',
                fontWeight: '600',
                cursor: 'pointer',
                backgroundColor: statusFilter === s.id ? '#047857' : 'transparent',
                color: statusFilter === s.id ? '#FFFFFF' : '#53695E',
                transition: 'all 0.2s'
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* USER LIST CARDS */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#53695E' }}>
          <div style={{ fontSize: '2rem', marginBottom: '12px' }}>🕉️</div>
          <p style={{ fontWeight: '600' }}>Loading MitSadhana directory...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px dashed #DFEAE3' }}>
          <p style={{ fontSize: '1.1rem', color: '#53695E', fontWeight: '600' }}>No members found matching your search criteria.</p>
          <button 
            onClick={() => { setSearchTerm(''); setActiveTab('all'); setStatusFilter('all'); }}
            style={{ marginTop: '12px', padding: '8px 18px', borderRadius: '8px', background: '#047857', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '14px' }}>
          {filteredUsers.map(user => {
            const isPandit = user.role === 'pandit';
            const isMali = user.role === 'mali';
            const isDevotee = user.role === 'devotee';
            const isSuspended = user.status === 'suspended';

            return (
              <div 
                key={user.uid} 
                onClick={() => setSelectedUser(user)}
                style={{ 
                  backgroundColor: '#FFFFFF',
                  borderRadius: '16px',
                  padding: '20px 24px',
                  border: selectedUser?.uid === user.uid ? '2px solid #047857' : '1px solid #DFEAE3',
                  borderLeft: `6px solid ${isSuspended ? '#DC2626' : user.verified ? '#047857' : '#D4AF37'}`,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                  {/* LEFT: AVATAR & BASIC DETAILS */}
                  <div style={{ display: 'flex', gap: '18px', alignItems: 'center', minWidth: '260px' }}>
                    <div style={{ 
                      width: '54px', 
                      height: '54px', 
                      borderRadius: '27px', 
                      backgroundColor: isPandit ? '#FEF3C7' : isMali ? '#FEE2E2' : '#ECFDF5', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      fontSize: '1.4rem',
                      border: '1px solid rgba(0,0,0,0.05)',
                      overflow: 'hidden'
                    }}>
                      {user.photoURL ? (
                        <img src={user.photoURL} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        isDevotee ? (user.avatar || '🙏') : isPandit ? '🛕' : '🌸'
                      )}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                        <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#0B251C', margin: 0 }}>
                          {user.name}
                        </h3>
                        {user.verified ? (
                          <span title="Verified Professional" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: '#ECFDF5', color: '#047857', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 'bold' }}>
                            <UserCheck size={13} color="#047857" /> Verified
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: '#FEF3C7', color: '#B45309', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 'bold' }}>
                            <AlertCircle size={13} color="#B45309" /> Pending
                          </span>
                        )}
                        {isSuspended && (
                          <span style={{ background: '#FEE2E2', color: '#DC2626', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 'bold' }}>
                            Suspended
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: '0.85rem', color: '#53695E', margin: 0 }}>
                        {user.phone ? `📞 ${user.phone}` : user.email}
                      </p>
                    </div>
                  </div>

                  {/* MIDDLE: ROLE SPECIFIC HIGHLIGHTS */}
                  <div style={{ flex: 1, minWidth: '220px', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                    {isDevotee && (
                      <>
                        <div>
                          <span style={{ fontSize: '0.7rem', color: '#7B9185', fontWeight: '700', display: 'block' }}>KARMA POINTS</span>
                          <span style={{ fontSize: '0.95rem', fontWeight: '700', color: '#D4AF37' }}>🪙 {user.karmaPoints ?? 0}</span>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.7rem', color: '#7B9185', fontWeight: '700', display: 'block' }}>WORSHIP STREAK</span>
                          <span style={{ fontSize: '0.95rem', fontWeight: '700', color: '#EF4444' }}>🔥 {user.streak ?? 0} days</span>
                        </div>
                        {user.ishtadev && (
                          <div>
                            <span style={{ fontSize: '0.7rem', color: '#7B9185', fontWeight: '700', display: 'block' }}>ISHTADEV</span>
                            <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#047857' }}>🕉️ {user.ishtadev}</span>
                          </div>
                        )}
                      </>
                    )}

                    {isPandit && (
                      <>
                        <div>
                          <span style={{ fontSize: '0.7rem', color: '#7B9185', fontWeight: '700', display: 'block' }}>EXPERIENCE</span>
                          <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#0B251C' }}>{user.experience ? `${user.experience} yrs` : 'N/A'}</span>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.7rem', color: '#7B9185', fontWeight: '700', display: 'block' }}>EDUCATION</span>
                          <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#047857' }}>{user.education || 'Vedic Scholar'}</span>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.7rem', color: '#7B9185', fontWeight: '700', display: 'block' }}>SERVICES</span>
                          <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#B45309' }}>
                            {user.serviceRates ? `${Object.keys(user.serviceRates).length} Pujas listed` : 'No rates'}
                          </span>
                        </div>
                      </>
                    )}

                    {isMali && (
                      <>
                        <div>
                          <span style={{ fontSize: '0.7rem', color: '#7B9185', fontWeight: '700', display: 'block' }}>SHOP / NURSERY</span>
                          <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#0B251C' }}>{user.shopName || 'Flower Partner'}</span>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.7rem', color: '#7B9185', fontWeight: '700', display: 'block' }}>CAPACITY</span>
                          <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#047857' }}>
                            {user.deliveryCapacity ? `${user.deliveryCapacity} homes/day` : 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.7rem', color: '#7B9185', fontWeight: '700', display: 'block' }}>SERVICE AREAS</span>
                          <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#B45309' }}>
                            {Array.isArray(user.serviceAreas) ? `${user.serviceAreas.length} Pincodes` : user.pincode || 'Local'}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* RIGHT: LOCATION & ACTION TRIGGER */}
                  <div style={{ textAlign: 'right', minWidth: '140px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', color: '#53695E', fontSize: '0.85rem', marginBottom: '6px' }}>
                      <MapPin size={14} color="#047857" />
                      <span>{user.city || user.location || user.pincode || 'India'}</span>
                    </div>
                    <span style={{
                      display: 'inline-block',
                      fontSize: '0.7rem', 
                      padding: '4px 12px', 
                      borderRadius: '8px', 
                      backgroundColor: isPandit ? '#FEF3C7' : isMali ? '#FEE2E2' : '#ECFDF5',
                      color: isPandit ? '#92400E' : isMali ? '#991B1B' : '#065F46',
                      fontWeight: '800',
                      letterSpacing: '0.5px'
                    }}>
                      {user.role.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADVANCED 360° USER AUDIT SLIDE-OVER MODAL */}
      {selectedUser && (
        <div style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: '520px',
          maxWidth: '100vw',
          height: '100vh',
          backgroundColor: '#FFFFFF',
          borderLeft: '2px solid #DFEAE3',
          zIndex: 1000,
          padding: '36px 32px',
          boxShadow: '-10px 0 40px rgba(0,0,0,0.15)',
          overflowY: 'auto'
        }}>
          {/* MODAL HEADER */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #DFEAE3', paddingBottom: '16px' }}>
            <div>
              <span style={{ fontSize: '0.72rem', letterSpacing: '1.5px', fontWeight: '800', color: '#047857' }}>
                DIVINE 360° AUDIT PROFILE
              </span>
              <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0B251C', margin: '2px 0 0' }}>
                {selectedUser.name}
              </h2>
            </div>
            <button 
              onClick={() => setSelectedUser(null)} 
              style={{ 
                background: '#F7FAF8', 
                border: '1px solid #DFEAE3', 
                borderRadius: '8px',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0B251C', 
                cursor: 'pointer', 
                fontSize: '1.2rem',
                fontWeight: 'bold'
              }}
            >
              ✕
            </button>
          </div>

          {/* AVATAR & ROLE HERO */}
          <div style={{ textAlign: 'center', padding: '24px 20px', background: 'linear-gradient(180deg, #F0FDF4 0%, #FFFFFF 100%)', borderRadius: '16px', border: '1px solid #DFEAE3', marginBottom: '24px' }}>
            <div style={{ 
              width: '84px', 
              height: '84px', 
              borderRadius: '42px', 
              backgroundColor: '#FFFFFF', 
              margin: '0 auto 14px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontSize: '2.4rem', 
              border: '3px solid #047857',
              boxShadow: '0 4px 12px rgba(4, 120, 87, 0.15)',
              overflow: 'hidden'
            }}>
              {selectedUser.photoURL ? (
                <img src={selectedUser.photoURL} alt={selectedUser.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                selectedUser.role === 'devotee' ? (selectedUser.avatar || '🙏') : selectedUser.role === 'pandit' ? '🛕' : '🌸'
              )}
            </div>
            <h3 style={{ color: '#0B251C', fontSize: '1.3rem', fontWeight: '800', marginBottom: '4px' }}>
              {selectedUser.name}
            </h3>
            <p style={{ color: '#047857', fontWeight: '800', fontSize: '0.85rem', letterSpacing: '1px', margin: 0 }}>
              {selectedUser.role.toUpperCase()} {selectedUser.verified ? '• VERIFIED ✅' : '• PENDING ⏳'}
            </p>
          </div>

          {/* 1. CORE CONTACT & LOCATION METADATA */}
          <div style={{ backgroundColor: '#F7FAF8', padding: '20px', borderRadius: '14px', border: '1px solid #DFEAE3', marginBottom: '20px' }}>
            <h4 style={{ color: '#047857', fontSize: '0.75rem', marginBottom: '14px', fontWeight: '800', letterSpacing: '0.5px' }}>
              CONTACT & ADDRESS DETAILS
            </h4>
            {[
              { label: 'UID', value: selectedUser.uid },
              { label: 'PHONE NUMBER', value: selectedUser.phone || 'N/A' },
              { label: 'EMAIL ADDRESS', value: selectedUser.email || 'N/A' },
              { label: 'CITY', value: selectedUser.city || selectedUser.location || 'N/A' },
              { label: 'PINCODE', value: selectedUser.pincode || 'N/A' },
              { label: 'FULL ADDRESS', value: selectedUser.address || selectedUser.shopAddress || 'N/A' },
              { label: 'LANDMARK', value: selectedUser.landmark || 'N/A' },
              { label: 'ACCOUNT STATUS', value: selectedUser.status?.toUpperCase() || 'ACTIVE' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', gap: '16px' }}>
                <span style={{ fontSize: '0.78rem', color: '#53695E', fontWeight: '600' }}>{item.label}</span>
                <span style={{ fontSize: '0.82rem', color: '#0B251C', fontWeight: '700', textAlign: 'right', wordBreak: 'break-word', maxWidth: '60%' }}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>

          {/* 2. DEVOTEE SPECIFIC INSIGHTS */}
          {selectedUser.role === 'devotee' && (
            <div style={{ backgroundColor: '#FCF9F1', padding: '20px', borderRadius: '14px', border: '1px solid #F7EFCF', marginBottom: '20px' }}>
              <h4 style={{ color: '#92400E', fontSize: '0.75rem', marginBottom: '14px', fontWeight: '800', letterSpacing: '0.5px' }}>
                SPIRITUAL JOURNEY & STATS
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '14px' }}>
                <div style={{ background: '#FFFFFF', padding: '12px', borderRadius: '10px', border: '1px solid #DFEAE3' }}>
                  <span style={{ fontSize: '0.7rem', color: '#7B9185', fontWeight: '700', display: 'block' }}>KARMA COINS</span>
                  <span style={{ fontSize: '1.2rem', fontWeight: '800', color: '#D4AF37' }}>🪙 {selectedUser.karmaPoints ?? 0}</span>
                </div>
                <div style={{ background: '#FFFFFF', padding: '12px', borderRadius: '10px', border: '1px solid #DFEAE3' }}>
                  <span style={{ fontSize: '0.7rem', color: '#7B9185', fontWeight: '700', display: 'block' }}>DAILY STREAK</span>
                  <span style={{ fontSize: '1.2rem', fontWeight: '800', color: '#EF4444' }}>🔥 {selectedUser.streak ?? 0} Days</span>
                </div>
              </div>
              {[
                { label: 'ISHTADEV (इष्टदेव)', value: selectedUser.ishtadev || 'Not chosen' },
                { label: 'GOTRA (गोत्र)', value: selectedUser.gotra || 'Not provided' },
                { label: 'SADHAK LEVEL', value: `Level ${selectedUser.level ?? 1}` },
                { label: 'GITA PROGRESS', value: selectedUser.gitaProgress ? `Ch ${selectedUser.gitaProgress.chapter} - ${selectedUser.gitaProgress.chapterTitle}` : 'Not started' },
                { label: 'REFERRAL CODE', value: selectedUser.referralCode || 'N/A' },
                { label: 'FRIENDS INVITED', value: `${selectedUser.totalReferrals ?? 0} Devotees` },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.78rem', color: '#78350F', fontWeight: '600' }}>{item.label}</span>
                  <span style={{ fontSize: '0.82rem', color: '#0B251C', fontWeight: '700' }}>{item.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* 3. PANDIT SPECIFIC COMPLETE DOSSIER */}
          {selectedUser.role === 'pandit' && (
            <div style={{ backgroundColor: '#FEF3C7', padding: '20px', borderRadius: '14px', border: '1px solid #FDE68A', marginBottom: '20px' }}>
              <h4 style={{ color: '#92400E', fontSize: '0.75rem', marginBottom: '14px', fontWeight: '800', letterSpacing: '0.5px' }}>
                VEDIC SCHOLAR DOSSIER & SERVICES
              </h4>
              {[
                { label: 'EDUCATION / GURUKUL', value: selectedUser.education || 'Vedic Tradition' },
                { label: 'TOTAL EXPERIENCE', value: selectedUser.experience ? `${selectedUser.experience} Years` : 'N/A' },
                { label: 'ASTROLOGER (ज्योतिषी)', value: selectedUser.isAstrologer ? 'YES (Vedic Jyotish) 🔮' : 'No' },
                { label: 'RATING & REPUTATION', value: `⭐ ${selectedUser.rating || 5.0} (${selectedUser.totalBookings || 0} Pujas Conducted)` },
                { label: 'SERVING DISTANCE', value: selectedUser.servingDistance ? `${selectedUser.servingDistance} km radius` : 'City wide' },
                { label: 'LANGUAGES KNOWN', value: selectedUser.languages?.join(', ') || 'Hindi, Sanskrit' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.78rem', color: '#78350F', fontWeight: '600' }}>{item.label}</span>
                  <span style={{ fontSize: '0.82rem', color: '#0B251C', fontWeight: '700' }}>{item.value}</span>
                </div>
              ))}

              {/* SERVICE RATES GRID */}
              <div style={{ marginTop: '16px' }}>
                <span style={{ fontSize: '0.78rem', color: '#78350F', fontWeight: '800', display: 'block', marginBottom: '8px' }}>
                  SERVICES & DAKSHINA RATES
                </span>
                {selectedUser.serviceRates && Object.keys(selectedUser.serviceRates).length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px' }}>
                    {Object.entries(selectedUser.serviceRates).map(([puja, rate]) => (
                      <div key={puja} style={{ backgroundColor: '#FFFFFF', padding: '8px 10px', borderRadius: '8px', border: '1px solid #DFEAE3' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#0B251C', display: 'block' }}>{puja}</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#047857' }}>₹{rate}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: '0.8rem', color: '#78350F', margin: 0 }}>No custom puja rates recorded.</p>
                )}
              </div>

              {selectedUser.bio && (
                <div style={{ marginTop: '16px', background: '#FFFFFF', padding: '12px', borderRadius: '10px', border: '1px solid #DFEAE3' }}>
                  <span style={{ fontSize: '0.72rem', color: '#7B9185', fontWeight: '800', display: 'block', marginBottom: '4px' }}>BIO / TRADITION</span>
                  <p style={{ fontSize: '0.82rem', color: '#0B251C', margin: 0, lineHeight: 1.4 }}>{selectedUser.bio}</p>
                </div>
              )}
            </div>
          )}

          {/* 4. MALI SPECIFIC COMPLETE DOSSIER */}
          {selectedUser.role === 'mali' && (
            <div style={{ backgroundColor: '#FEE2E2', padding: '20px', borderRadius: '14px', border: '1px solid #FECACA', marginBottom: '20px' }}>
              <h4 style={{ color: '#991B1B', fontSize: '0.75rem', marginBottom: '14px', fontWeight: '800', letterSpacing: '0.5px' }}>
                FLOWER SEVAK & LOGISTICS PROFILE
              </h4>
              {[
                { label: 'NURSERY / SHOP NAME', value: selectedUser.shopName || 'Flower Partner' },
                { label: 'SHOP FULL ADDRESS', value: selectedUser.shopAddress || selectedUser.address || 'N/A' },
                { label: 'DAILY DELIVERY CAPACITY', value: selectedUser.deliveryCapacity ? `${selectedUser.deliveryCapacity} Homes / Day` : 'N/A' },
                { label: 'EXPERIENCE IN FLORISTRY', value: selectedUser.businessExperience || 'Local Nursery Owner' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.78rem', color: '#7F1D1D', fontWeight: '600' }}>{item.label}</span>
                  <span style={{ fontSize: '0.82rem', color: '#0B251C', fontWeight: '700' }}>{item.value}</span>
                </div>
              ))}

              {/* SERVICEABLE PINCODES */}
              <div style={{ marginTop: '16px' }}>
                <span style={{ fontSize: '0.78rem', color: '#7F1D1D', fontWeight: '800', display: 'block', marginBottom: '8px' }}>
                  SERVICEABLE PINCODES COVERED
                </span>
                {Array.isArray(selectedUser.serviceAreas) && selectedUser.serviceAreas.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {selectedUser.serviceAreas.map((area: any, idx: number) => {
                      const pin = typeof area === 'string' ? area : area.pincode;
                      return (
                        <span key={idx} style={{ backgroundColor: '#FFFFFF', border: '1px solid #FECACA', padding: '4px 10px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: '700', color: '#991B1B' }}>
                          📍 {pin}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <span style={{ fontSize: '0.82rem', color: '#0B251C', fontWeight: '700' }}>
                    📍 {selectedUser.pincode || 'Assigned to all primary zones'}
                  </span>
                )}
              </div>

              {/* FLOWER VARIETIES */}
              {Array.isArray(selectedUser.flowerVarieties) && selectedUser.flowerVarieties.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <span style={{ fontSize: '0.78rem', color: '#7F1D1D', fontWeight: '800', display: 'block', marginBottom: '8px' }}>
                    FRESH FLOWERS & OFFERINGS
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {selectedUser.flowerVarieties.map((f: string, i: number) => (
                      <span key={i} style={{ backgroundColor: '#FFFFFF', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700', color: '#047857', border: '1px solid #DFEAE3' }}>
                        🌸 {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ADMIN ACTION CONTROLS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '24px' }}>
            <button 
              onClick={() => handleSendMessage(selectedUser.uid, selectedUser.name)}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: '#047857',
                color: '#FFFFFF',
                borderRadius: '10px',
                border: 'none',
                fontWeight: '700',
                cursor: 'pointer',
                fontSize: '0.9rem',
                boxShadow: '0 4px 12px rgba(4, 120, 87, 0.25)'
              }}
            >
              💬 SEND IN-APP DIRECT MESSAGE
            </button>

            <button 
              onClick={() => handleToggleVerification(selectedUser)}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: selectedUser.verified ? '#F3F4F6' : '#FEF3C7',
                color: selectedUser.verified ? '#374151' : '#92400E',
                borderRadius: '10px',
                border: selectedUser.verified ? '1px solid #D1D5DB' : '1px solid #FDE68A',
                fontWeight: '700',
                cursor: 'pointer',
                fontSize: '0.85rem'
              }}
            >
              {selectedUser.verified ? 'REVOKE VERIFICATION' : '✨ VERIFY & APPROVE ACCOUNT'}
            </button>

            <button 
              onClick={() => handleToggleSuspend(selectedUser)}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: selectedUser.status === 'suspended' ? '#ECFDF5' : '#FEE2E2',
                color: selectedUser.status === 'suspended' ? '#047857' : '#DC2626',
                borderRadius: '10px',
                border: selectedUser.status === 'suspended' ? '1px solid #047857' : '1px solid #FECACA',
                fontWeight: '700',
                cursor: 'pointer',
                fontSize: '0.85rem'
              }}
            >
              {selectedUser.status === 'suspended' ? 'REACTIVATE ACCOUNT' : 'SUSPEND ACCOUNT ACCESS'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
