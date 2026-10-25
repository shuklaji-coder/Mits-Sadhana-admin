"use client";
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot, doc, updateDoc, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';

interface Subscription {
  id: string;
  userName: string;
  userPhone: string;
  pincode: string;
  planName: string;
  allotmentStatus: string;
  assignedMaliId?: string;
  createdAt: any;
  userAddress?: string;
  startDate?: any;
}

interface Mali {
  uid: string;
  name: string;
  shopName: string;
  pincode: string;
}

export default function Allotments() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [availableMalis, setAvailableMalis] = useState<Mali[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Listen for pending subscriptions
    const subQuery = query(collection(db, 'subscriptions'), where('allotmentStatus', '==', 'pending'));
    const unsubSubs = onSnapshot(subQuery, (snapshot) => {
      setSubscriptions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subscription)));
      setLoading(false);
    });

    // 2. Listen for all verified Malis (Real-time)
    const maliQuery = query(collection(db, 'users'), where('role', '==', 'mali'), where('verified', '==', true));
    const unsubMalis = onSnapshot(maliQuery, (snapshot) => {
      setAvailableMalis(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as Mali)));
    });

    return () => {
      unsubSubs();
      unsubMalis();
    };
  }, []);

  const handleAllot = async (subscriptionId: string, maliId: string) => {
    const selectedMali = availableMalis.find(m => m.uid === maliId);
    if (!selectedMali) return;
    
    const confirmMsg = `Allot "${subscriptions.find(s => s.id === subscriptionId)?.planName}" to ${selectedMali.name} (${selectedMali.shopName})?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await updateDoc(doc(db, 'subscriptions', subscriptionId), {
        allotmentStatus: 'allotted',
        assignedMaliId: maliId,
        maliName: selectedMali.name || 'Unknown',
        maliShop: selectedMali.shopName || '',
        userDetails: {
            name: subscriptions.find(s => s.id === subscriptionId)?.userName || 'Devotee',
            phone: subscriptions.find(s => s.id === subscriptionId)?.userPhone || '',
            address: subscriptions.find(s => s.id === subscriptionId)?.userAddress || 'Address details pending'
        },
        allottedAt: serverTimestamp()
      });

      // Send Notification to Mali
      await addDoc(collection(db, 'notifications'), {
        userId: maliId,
        title: 'New Assignment 🌸',
        desc: `You have been allotted a new subscription: ${subscriptions.find(s => s.id === subscriptionId)?.planName}`,
        message: `You have been allotted a new subscription: ${subscriptions.find(s => s.id === subscriptionId)?.planName}`,
        type: 'delivery',
        unread: true,
        createdAt: serverTimestamp()
      });

      alert("✅ Order accurately allotted to Divine Partner!");
    } catch (error) {
      console.error("Allotment error:", error);
      alert("❌ Failed to allot order. Check connection.");
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Mali Allotments</h1>
        <p style={{ color: 'var(--text-muted)' }}>Manually assign flower subscriptions to verified vendors.</p>
      </div>

      {loading ? (
        <p>Loading subscriptions...</p>
      ) : subscriptions.length === 0 ? (
        <div className="card glass" style={{ textAlign: 'center', padding: '60px' }}>
          <h3>Perfect Allotment!</h3>
          <p style={{ color: 'var(--text-muted)' }}>All active subscriptions have been allotted.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '20px' }}>
          {subscriptions.map((sub) => (
            <div key={sub.id} className="card glass">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{flex: 2}}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <h3 style={{ margin: 0, color: '#0B251C' }}>{sub.planName}</h3>
                    <span style={{ fontSize: '0.6rem', backgroundColor: 'rgba(212,168,67,0.1)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '4px' }}>
                        ID: {sub.id.slice(-6).toUpperCase()}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.9rem', marginBottom: '4px' }}>👤 <strong>Devotee:</strong> {sub.userName} ({sub.userPhone})</p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px' }}>🏠 {sub.userAddress || 'Address not provided'}</p>
                  <p style={{ fontSize: '0.9rem', color: 'var(--primary)' }}>📍 <strong>Target Pincode:</strong> {sub.pincode}</p>
                  {sub.createdAt && (
                     <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                        Requested: {sub.createdAt.toDate ? sub.createdAt.toDate().toLocaleString() : 'Recently'}
                     </p>
                  )}
                </div>

                <div style={{ flex: 1 }}>
                  <p style={{fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '8px'}}>SELECT AVAILABLE MALI:</p>
                  <select 
                    style={{ 
                        width: '100%', 
                        padding: '10px', 
                        backgroundColor: '#F7FAF8', 
                        border: '1px solid #DFEAE3', 
                        color: '#0B251C',
                        borderRadius: '8px',
                        marginBottom: '10px'
                    }}
                    onChange={(e) => handleAllot(sub.id, e.target.value)}
                    defaultValue=""
                  >
                    <option value="" disabled>Choose a Mali...</option>
                    {availableMalis.filter(m => m.pincode === sub.pincode).length > 0 ? (
                      availableMalis.filter(m => m.pincode === sub.pincode).map(m => (
                        <option key={m.uid} value={m.uid}>{m.name} ({m.shopName})</option>
                      ))
                    ) : (
                        availableMalis.map(m => (
                            <option key={m.uid} value={m.uid}>{m.name} ({m.pincode})</option>
                        ))
                    )}
                  </select>
                  <p style={{fontSize: '0.6rem', color: '#FF6B6B'}}>
                    {availableMalis.filter(m => m.pincode === sub.pincode).length === 0 && "⚠️ No local Mali found for this pincode"}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* VENDOR VISIBILITY SECTION */}
      <div style={{ marginTop: '60px', borderTop: '1px solid var(--border)', paddingTop: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', color: 'white', marginBottom: '4px' }}>Verified Divine Partners (Malis)</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>All vendors currently active and ready for delivery.</p>
          </div>
          <div style={{ backgroundColor: 'rgba(212,168,67,0.1)', color: 'var(--primary)', padding: '8px 16px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold' }}>
            {availableMalis.length} ACTIVE PARTNERS
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
          {availableMalis.map(mali => (
            <div key={mali.uid} className="card glass" style={{ padding: '20px', border: '1px solid rgba(212,168,67,0.1)' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0A130E', fontWeight: 'bold' }}>
                  {mali.name.charAt(0)}
                </div>
                <div>
                   <p style={{ color: 'white', fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '2px' }}>{mali.name}</p>
                   <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{mali.shopName}</p>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>SERVICE PINCODE:</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 'bold' }}>{mali.pincode}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
