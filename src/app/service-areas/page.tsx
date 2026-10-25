"use client";
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, doc, setDoc, deleteDoc, serverTimestamp, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { Trash2, MapPin, Plus, BellRing, Check, ArrowRight } from 'lucide-react';

interface WaitlistDemand {
  pincode: string;
  count: number;
  latestRequest?: string;
}

export default function ServiceAreasPage() {
  const [pincodes, setPincodes] = useState<{id: string, pin: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPincode, setNewPincode] = useState('');
  const [adding, setAdding] = useState(false);
  const [waitlistDemand, setWaitlistDemand] = useState<WaitlistDemand[]>([]);
  const [activatingPin, setActivatingPin] = useState<string | null>(null);

  useEffect(() => {
    // 1. Listen to active service areas
    const q = query(collection(db, 'service_areas'));
    const unsubAreas = onSnapshot(q, (snap) => {
      const pins = snap.docs.map(doc => ({
        id: doc.id,
        pin: doc.data().pincode || doc.id
      }));
      setPincodes(pins);
      setLoading(false);
    });

    // 2. Listen to waitlist leads to surface expansion demand
    const waitlistQ = query(collection(db, 'pincode_waitlist'), limit(500));
    const unsubWaitlist = onSnapshot(waitlistQ, (snap) => {
      const counts: Record<string, number> = {};
      snap.docs.forEach(d => {
        const pin = d.data().pincode;
        if (pin && /^\d{6}$/.test(pin)) {
          counts[pin] = (counts[pin] || 0) + 1;
        }
      });
      const sorted = Object.entries(counts)
        .map(([pincode, count]) => ({ pincode, count }))
        .sort((a, b) => b.count - a.count);
      setWaitlistDemand(sorted);
    });

    return () => {
      unsubAreas();
      unsubWaitlist();
    };
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

  const handleQuickActivate = async (pin: string) => {
    setActivatingPin(pin);
    try {
      await setDoc(doc(db, 'service_areas', pin), {
        pincode: pin,
        active: true,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error("Error activating waitlisted pincode:", err);
      alert("Failed to activate area.");
    } finally {
      setActivatingPin(null);
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

  // Filter out waitlist items that are already active
  const unservicedDemands = waitlistDemand.filter(
    d => !pincodes.some(p => p.pin === d.pincode)
  );

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto' }}>
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '8px' }}>Serviceable Areas & Lead Demand</h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Manage active delivery pincodes and monitor non-serviceable devotee waitlist demand.
        </p>
      </div>

      {/* Add New Pincode Card */}
      <div className="card glass" style={{ marginBottom: '32px', padding: '24px' }}>
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Add New Pincode
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="Enter 6-digit Pincode (e.g. 401201)"
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

      {/* Active Service Areas */}
      <div className="card glass" style={{ marginBottom: '32px' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
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
              <p style={{ color: 'var(--text-muted)' }}>No service areas defined. Checkout is restricted to fallback pincodes.</p>
            ) : (
              pincodes.map(({ id, pin }) => (
                <div 
                  key={id} 
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: '12px', 
                    backgroundColor: 'rgba(255,255,255,0.03)', 
                    border: '1px solid var(--border)',
                    padding: '10px 18px', borderRadius: '12px' 
                  }}
                >
                  <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{pin}</span>
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

      {/* Devotee Demand Hotspots (Waitlist Leads) */}
      <div className="card glass">
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <BellRing size={20} color="#EAB308" />
              Devotee Waitlist Demand ({unservicedDemands.length} Pending Areas)
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Captured when devotees attempt checkout from non-serviceable pincodes. Click "Launch Area" to activate.
            </p>
          </div>
        </div>

        <div style={{ padding: '24px' }}>
          {unservicedDemands.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
              No pending waitlist requests from unserviced pincodes.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
              {unservicedDemands.map(({ pincode, count }) => (
                <div 
                  key={pincode}
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border)',
                    borderRadius: '14px',
                    padding: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#FFF' }}>{pincode}</div>
                    <div style={{ fontSize: '0.85rem', color: '#EAB308', marginTop: '2px', fontWeight: '500' }}>
                      🔥 {count} {count === 1 ? 'devotee waiting' : 'devotees waiting'}
                    </div>
                  </div>
                  <button
                    onClick={() => handleQuickActivate(pincode)}
                    disabled={activatingPin === pincode}
                    style={{
                      backgroundColor: 'rgba(234, 179, 8, 0.15)',
                      color: '#EAB308',
                      border: '1px solid rgba(234, 179, 8, 0.3)',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <span>Launch</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
