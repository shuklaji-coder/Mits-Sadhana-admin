"use client";
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, doc, setDoc, deleteDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { Trash2, MapPin, Plus } from 'lucide-react';

export default function ServiceAreasPage() {
  const [pincodes, setPincodes] = useState<{id: string, pin: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPincode, setNewPincode] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'service_areas'));
    const unsub = onSnapshot(q, (snap) => {
      const pins = snap.docs.map(doc => ({
        id: doc.id,
        pin: doc.data().pincode || doc.id
      }));
      setPincodes(pins);
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(newPincode)) {
      alert("Please enter a valid 6-digit valid pincode.");
      return;
    }
    if (pincodes.some(p => p.pin === newPincode)) {
      alert("This pincode is already active.");
      return;
    }
    
    setAdding(true);
    try {
      await setDoc(doc(db, 'service_areas', newPincode), {
        pincode: newPincode,
        active: true,
        createdAt: serverTimestamp()
      });
      setNewPincode('');
    } catch (error) {
      alert("Error adding pincode.");
      console.error(error);
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (pin: string) => {
    if (confirm(`Are you sure you want to stop service in pincode ${pin}? Devotees in this area will no longer be able to checkout.`)) {
      try {
        await deleteDoc(doc(db, 'service_areas', pin));
      } catch (error) {
        alert("Error removing pincode.");
        console.error(error);
      }
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '8px' }}>Serviceable Areas</h1>
        <p style={{ color: 'var(--text-muted)' }}>Manage active delivery pincodes for MitSadhana operations.</p>
      </div>

      <div className="card glass" style={{ marginBottom: '40px', padding: '30px' }}>
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Add New Pincode
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="Enter 6-digit Pincode"
              value={newPincode}
              onChange={(e) => setNewPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              disabled={adding}
              required
            />
          </div>
          <button type="submit" className="btn-primary" disabled={adding || newPincode.length !== 6}>
            <Plus size={18} style={{ marginRight: '8px' }} />
            {adding ? 'Adding...' : 'Add Area'}
          </button>
        </form>
      </div>

      <div className="card glass">
        <div style={{ padding: '24px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <MapPin size={20} color="var(--primary)" />
            Active Service Areas ({pincodes.length})
          </h2>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
        ) : (
          <div style={{ padding: '24px', display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
            {pincodes.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No service areas defined. Checkout is essentially disabled for users.</p>
            ) : (
              pincodes.map(({ id, pin }) => (
                <div 
                  key={id} 
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: '12px', 
                    backgroundColor: 'rgba(255,255,255,0.03)', 
                    border: '1px solid var(--border)',
                    padding: '12px 20px', borderRadius: '12px' 
                  }}
                >
                  <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{pin}</span>
                  <button 
                    onClick={() => handleRemove(id)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: '#FF6B6B', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: '4px', borderRadius: '6px'
                    }}
                    title="Remove Area"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
