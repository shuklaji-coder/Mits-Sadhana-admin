"use client";
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot, where, getDocs, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { Search, UserCheck, UserX, Star, MapPin, Phone } from 'lucide-react';

interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: 'devotee' | 'pandit' | 'mali';
  verified: boolean;
  phone?: string;
  pincode?: string;
  expertise?: string[];
  shopName?: string;
  address?: string;
}

export default function UserDirectory() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'devotee' | 'pandit' | 'mali'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const uList = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
      setUsers(uList);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSendMessage = async (userId: string) => {
    const msg = prompt("Enter message to send to this user:");
    if (!msg) return;
    try {
      await addDoc(collection(db, 'notifications'), {
        userId,
        title: "Message from Admin",
        body: msg,
        unread: true,
        createdAt: serverTimestamp(),
        type: 'admin_direct'
      });
      alert("Message sent successfully!");
    } catch (e) {
      alert("Error sending message.");
    }
  };

  const handleToggleSuspend = async (user: UserProfile) => {
    const isSuspended = (user as any).status === 'suspended';
    const action = isSuspended ? 'UNSUSPEND' : 'SUSPEND';
    if (!confirm(`Are you sure you want to ${action} this account?`)) return;

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        status: isSuspended ? 'active' : 'suspended',
        active: isSuspended
      });
      alert(`User ${isSuspended ? 'reactivated' : 'suspended'} successfully.`);
    } catch (e) {
      alert("Error updating user status.");
    }
  };

  useEffect(() => {
    let result = users;
    if (activeTab !== 'all') {
      result = result.filter(u => u.role === activeTab);
    }
    if (searchTerm) {
      result = result.filter(u => 
        u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.phone?.includes(searchTerm)
      );
    }
    setFilteredUsers(result);
  }, [activeTab, searchTerm, users]);

  const stats = {
    total: users.length,
    devotees: users.filter(u => u.role === 'devotee').length,
    pandits: users.filter(u => u.role === 'pandit').length,
    malis: users.filter(u => u.role === 'mali').length,
  };

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Divine User Directory</h1>
        <p style={{ color: 'var(--text-muted)' }}>Analyze and audit every member of the MitSadhana ecosystem.</p>
      </div>

      {/* QUICK STATS */}
      <div style={{ display: 'flex', gap: '15px', marginBottom: '30px', flexWrap: 'wrap' }}>
        {[
            { label: 'ALL USERS', count: stats.total, tab: 'all' },
            { label: 'DEVOTEES', count: stats.devotees, tab: 'devotee' },
            { label: 'PANDITS', count: stats.pandits, tab: 'pandit' },
            { label: 'VENDORS', count: stats.malis, tab: 'mali' },
        ].map(stat => (
            <button 
                key={stat.tab}
                onClick={() => setActiveTab(stat.tab as any)}
                className="glass" 
                style={{ 
                    flex: 1, 
                    padding: '15px', 
                    borderRadius: '12px', 
                    textAlign: 'left',
                    border: activeTab === stat.tab ? '1px solid var(--primary)' : '1px solid var(--border)',
                    backgroundColor: activeTab === stat.tab ? 'rgba(212, 168, 67, 0.05)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                }}
            >
                <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>{stat.label}</p>
                <h3 style={{ fontSize: '1.4rem', color: activeTab === stat.tab ? 'var(--primary)' : 'white' }}>{stat.count}</h3>
            </button>
        ))}
      </div>

      {/* SEARCH BAR */}
      <div className="glass" style={{ display: 'flex', alignItems: 'center', padding: '0 20px', marginBottom: '30px', borderRadius: '14px' }}>
        <Search size={20} color="var(--text-muted)" />
        <input 
            type="text" 
            placeholder="Search by name, email or phone..." 
            style={{ 
                flex: 1, 
                padding: '18px 20px', 
                background: 'transparent', 
                border: 'none', 
                color: 'white', 
                fontSize: '0.95rem',
                outline: 'none'
            }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* USER LIST */}
      {loading ? (
        <p>Loading members...</p>
      ) : (
        <div style={{ display: 'grid', gap: '15px' }}>
            {filteredUsers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No users found matching your criteria.
                </div>
            ) : filteredUsers.map(user => (
                <div 
                    key={user.uid} 
                    onClick={() => setSelectedUser(user)}
                    className="card glass" 
                    style={{ 
                        borderLeft: `4px solid ${user.verified ? '#D4A843' : '#FF6B6B'}`,
                        cursor: 'pointer',
                        transition: 'transform 0.2s'
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                            <div style={{ width: '50px', height: '50px', borderRadius: '25px', backgroundColor: '#1A3324', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                                {user.role === 'devotee' ? '🙏' : user.role === 'pandit' ? '🛕' : '🌸'}
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.1rem', color: 'white', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {user.name || 'Unknown'} 
                                    {user.verified ? <UserCheck size={16} color="#D4A843" /> : <UserX size={16} color="#FF6B6B" />}
                                </h3>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{user.email}</p>
                            </div>
                        </div>

                        <div style={{ flex: 1, margin: '0 40px', display: 'flex', gap: '30px' }}>
                            {user.phone && <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                                <Phone size={14} />
                                <span style={{ fontSize: '0.8rem' }}>{user.phone}</span>
                            </div>}
                            {user.pincode && <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                                <MapPin size={14} />
                                <span style={{ fontSize: '0.8rem' }}>{user.pincode}</span>
                            </div>}
                        </div>

                        <div style={{ textAlign: 'right' }}>
                            <span style={{ 
                                fontSize: '0.65rem', 
                                padding: '4px 10px', 
                                borderRadius: '10px', 
                                backgroundColor: 'rgba(255,255,255,0.05)',
                                color: 'var(--text-muted)',
                                fontWeight: 'bold'
                            }}>
                                {user.role?.toUpperCase() || 'MEMBER'}
                            </span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
      )}

      {/* DIVINE AUDIT SIDE PANEL */}
      {selectedUser && (
          <div style={{
              position: 'fixed',
              top: 0,
              right: 0,
              width: '450px',
              height: '100vh',
              backgroundColor: 'var(--card-bg)',
              borderLeft: '1px solid var(--border)',
              zIndex: 1000,
              padding: '40px',
              boxShadow: '-20px 0 50px rgba(0,0,0,0.5)',
              overflowY: 'auto'
          }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                  <h2 style={{ fontSize: '1.2rem', letterSpacing: '1px' }}>DIVINE AUDIT</h2>
                  <button onClick={() => setSelectedUser(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.5rem' }}>×</button>
              </div>

              <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '40px', backgroundColor: 'var(--accent)', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', border: '1px solid var(--primary)' }}>
                    {selectedUser.role === 'devotee' ? '🙏' : selectedUser.role === 'pandit' ? '🛕' : '🌸'}
                </div>
                <h2 style={{ color: 'white', marginBottom: '5px' }}>{selectedUser.name}</h2>
                <p style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '0.8rem', letterSpacing: '2px' }}>{selectedUser.role?.toUpperCase()}</p>
              </div>

              <div className="glass" style={{ padding: '20px', borderRadius: '15px', marginBottom: '30px' }}>
                  <h4 style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginBottom: '15px', fontWeight: 'bold' }}>CORE METADATA</h4>
                  {[
                      { label: 'UID', value: selectedUser.uid },
                      { label: 'EMAIL', value: selectedUser.email },
                      { label: 'PHONE', value: selectedUser.phone || 'N/A' },
                      { label: 'ADDRESS', value: selectedUser.address || 'N/A' },
                      { label: 'PINCODE', value: selectedUser.pincode || 'N/A' },
                      { label: 'VERIFIED', value: selectedUser.verified ? 'YES ✅' : 'NO ❌' },
                  ].map(item => (
                      <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.label}</span>
                          <span style={{ fontSize: '0.8rem', color: 'white', fontWeight: '500' }}>{item.value}</span>
                      </div>
                  ))}
              </div>

              {selectedUser.role === 'mali' && (
                  <div className="glass" style={{ padding: '20px', borderRadius: '15px', marginBottom: '30px', borderLeft: '3px solid var(--primary)' }}>
                      <h4 style={{ color: 'var(--primary)', fontSize: '0.7rem', marginBottom: '15px', fontWeight: 'bold' }}>VENDOR DETAILS</h4>
                      {[
                          { label: 'SHOP NAME', value: (selectedUser as any).shopName },
                          { label: 'EXPERIENCE', value: (selectedUser as any).experience },
                          { label: 'STATUS', value: selectedUser.verified ? 'AUTHORIZED' : 'PENDING REVIEW' },
                      ].map(item => (
                        <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.label}</span>
                            <span style={{ fontSize: '0.8rem', color: 'white', fontWeight: '500' }}>{item.value || 'N/A'}</span>
                        </div>
                      ))}
                  </div>
              )}

              {selectedUser.role === 'pandit' && (
                  <div className="glass" style={{ padding: '20px', borderRadius: '15px', marginBottom: '30px', borderLeft: '3px solid var(--primary)' }}>
                      <h4 style={{ color: 'var(--primary)', fontSize: '0.7rem', marginBottom: '15px', fontWeight: 'bold' }}>PANDIT EXPERTISE</h4>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {(selectedUser as any).expertise?.map((exp: string) => (
                              <span key={exp} style={{ fontSize: '0.7rem', padding: '5px 10px', backgroundColor: 'rgba(212, 168, 67, 0.1)', color: 'var(--primary)', borderRadius: '6px' }}>
                                  {exp}
                              </span>
                          )) || 'No expertise data'}
                      </div>
                  </div>
              )}

              <div style={{ marginTop: '40px' }}>
                  <button 
                    onClick={() => handleSendMessage(selectedUser.uid)}
                    className="btn-primary" 
                    style={{ width: '100%', marginBottom: '12px' }}
                  >
                    SEND DIRECT MESSAGE
                  </button>
                  <button 
                    onClick={() => handleToggleSuspend(selectedUser)}
                    style={{ 
                      width: '100%', 
                      padding: '12px', 
                      backgroundColor: 'transparent', 
                      border: `1px solid ${(selectedUser as any).status === 'suspended' ? '#4ADE80' : '#FF6B6B'}`, 
                      color: (selectedUser as any).status === 'suspended' ? '#4ADE80' : '#FF6B6B', 
                      borderRadius: '8px',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    {(selectedUser as any).status === 'suspended' ? 'UNSUSPEND ACCOUNT' : 'SUSPEND ACCOUNT'}
                  </button>
              </div>
          </div>
      )}
    </div>
  );
}
