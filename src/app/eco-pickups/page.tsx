"use client";
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import {
  collection, query, onSnapshot, orderBy, doc, updateDoc, serverTimestamp
} from 'firebase/firestore';
import { Recycle, User, MapPin, Calendar, Clock, CheckCircle2, XCircle, Loader2, Phone } from 'lucide-react';

interface EcoPickup {
  id: string;
  userDetails: {
    name: string;
    phone: string;
    address: string;
    landmark?: string;
    city: string;
    pincode: string;
  };
  pickupDetails: {
    date: string;
    time: string;
    items: string;
    instructions?: string;
    status: 'pending' | 'completed' | 'cancelled';
  };
  createdAt: any;
}

export default function EcoPickupsPage() {
  const [pickups, setPickups] = useState<EcoPickup[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'cancelled'>('pending');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  useEffect(() => {
    const q = query(collection(db, 'eco-pickups'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setPickups(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as EcoPickup)));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, []);

  const handleStatusUpdate = async (pickupId: string, status: 'completed' | 'cancelled') => {
    setUpdatingId(pickupId);
    try {
      await updateDoc(doc(db, 'eco-pickups', pickupId), {
        'pickupDetails.status': status,
        updatedAt: serverTimestamp()
      });
      showToast(`✅ Pickup ${status}!`);
    } catch (e) {
      showToast('❌ Error updating pickup.');
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = filter === 'all' ? pickups : pickups.filter(p => p.pickupDetails.status === filter);

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px', zIndex: 9999,
          padding: '14px 20px', borderRadius: '12px',
          backgroundColor: '#1A3324', border: '1px solid var(--primary)',
          color: 'white', fontSize: '0.9rem', fontWeight: 'bold',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          animation: 'slideIn 0.3s ease'
        }}>
          {toast}
        </div>
      )}

      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Eco Pickups</h1>
        <p style={{ color: 'var(--text-muted)' }}>Manage waste collection requests and reward devotees with Karma points.</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '25px' }}>
        {['pending', 'completed', 'cancelled', 'all'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            style={{
              padding: '8px 20px', borderRadius: '8px', border: '1px solid var(--border)',
              backgroundColor: filter === f ? 'rgba(212, 168, 67, 0.1)' : 'transparent',
              color: filter === f ? 'var(--primary)' : 'var(--text-muted)',
              fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem'
            }}
          >
            {f.toUpperCase()}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)' }}>
          <Loader2 size={20} className="animate-spin" />
          <span>Syncing with Logistics Cloud...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card glass" style={{ textAlign: 'center', padding: '60px' }}>
          <p style={{ fontSize: '3rem', marginBottom: '20px' }}>🌿</p>
          <h3>Clean Sweep!</h3>
          <p style={{ color: 'var(--text-muted)' }}>No pickup requests found.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '20px' }}>
          {filtered.map(p => (
            <div key={p.id} className="card glass" style={{ borderLeft: `4px solid ${p.pickupDetails.status === 'completed' ? '#4ADE80' : p.pickupDetails.status === 'cancelled' ? '#FF6B6B' : '#D4A843'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '24px', flex: 1 }}>
                  {/* Left Column: User & Location */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <User size={16} color="var(--primary)" />
                      <h4 style={{ color: '#0B251C', fontSize: '1.1rem', fontWeight: '800' }}>{p.userDetails.name}</h4>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '8px' }}>
                      <MapPin size={16} style={{ marginTop: '2px' }} />
                      <div>
                        {p.userDetails.address}<br />
                        {p.userDetails.landmark ? <span style={{ fontSize: '0.75rem' }}>Near: {p.userDetails.landmark}</span> : null}<br />
                        {p.userDetails.city} - {p.userDetails.pincode}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      <Phone size={14} />
                      {p.userDetails.phone}
                    </div>
                  </div>

                  {/* Middle Column: Pickup Details */}
                  <div style={{ flex: 1, borderLeft: '1px solid var(--border)', paddingLeft: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <Recycle size={16} color="var(--primary)" />
                      <h4 style={{ color: '#0B251C', fontSize: '1rem', fontWeight: '800' }}>Contents</h4>
                    </div>
                    <p style={{ fontSize: '0.9rem', color: '#0B251C', marginBottom: '12px', fontWeight: '500' }}>{p.pickupDetails.items}</p>
                    <div style={{ display: 'flex', gap: '15px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        <Calendar size={14} />
                        {p.pickupDetails.date}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        <Clock size={14} />
                        {p.pickupDetails.time}
                      </div>
                    </div>
                    {p.pickupDetails.instructions && (
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '8px', fontStyle: 'italic' }}>
                        Note: {p.pickupDetails.instructions}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                  <span style={{ 
                    fontSize: '0.65rem', fontWeight: 'bold', 
                    color: p.pickupDetails.status === 'completed' ? '#4ADE80' : p.pickupDetails.status === 'cancelled' ? '#FF6B6B' : '#D4A843',
                    padding: '4px 10px', backgroundColor: 'rgba(212,168,67,0.05)', borderRadius: '6px', marginBottom: '10px'
                  }}>
                    {p.pickupDetails.status.toUpperCase()}
                  </span>
                  
                  {p.pickupDetails.status === 'pending' && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        onClick={() => handleStatusUpdate(p.id, 'completed')}
                        disabled={updatingId === p.id}
                        className="btn-primary" 
                        style={{ padding: '8px 16px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px' }}
                      >
                        <CheckCircle2 size={16} /> DONE
                      </button>
                      <button 
                         onClick={() => handleStatusUpdate(p.id, 'cancelled')}
                         disabled={updatingId === p.id}
                         style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #FF6B6B', color: '#FF6B6B', backgroundColor: 'transparent', cursor: 'pointer' }}
                      >
                        <XCircle size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes slideIn { from { transform: translateY(-10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
