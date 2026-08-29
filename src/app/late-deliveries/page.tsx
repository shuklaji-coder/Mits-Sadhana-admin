"use client";
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy, updateDoc, doc } from 'firebase/firestore';
import { Clock, AlertTriangle, User, MapPin, CheckCircle, Calendar, Users } from 'lucide-react';

interface LateAlert {
  id: string;
  type: string;
  subscriptionId: string;
  maliId: string;
  maliName: string;
  customerName: string;
  pincode: string;
  preferredTime: string;
  deliveredAt: any;
  delayMinutes: number;
  message: string;
  status: 'pending' | 'resolved';
  createdAt?: any;
}

export default function LateDeliveriesMonitor() {
  const [alerts, setAlerts] = useState<LateAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simplified query to avoid immediate index requirement
    // Admin should still create the composite index for performance: type(ASC) + deliveredAt(DESC)
    const q = query(
      collection(db, 'admin_alerts'),
      orderBy('deliveredAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter((alert: any) => alert.type === 'LATE_DELIVERY') as LateAlert[];
      
      setAlerts(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleResolve = async (id: string) => {
    try {
      await updateDoc(doc(db, 'admin_alerts', id), {
        status: 'resolved'
      });
    } catch (error) {
      console.error("Error resolving alert:", error);
    }
  };

  const formatDate = (val: any) => {
    if (!val) return 'N/A';
    if (val.toDate) return val.toDate().toLocaleString();
    if (val instanceof Date) return val.toLocaleString();
    return String(val);
  };

  return (
    <div style={{ padding: '0 10px' }}>
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <AlertTriangle color="#FF6B6B" size={32} />
          Late Delivery Monitor
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Real-time tracking of subscription deliveries that exceeded the customer's preferred time slot.
        </p>
      </div>

      {loading ? (
        <p>Syncing alerts...</p>
      ) : alerts.length === 0 ? (
        <div className="card glass" style={{ padding: '60px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>No late deliveries reported. All Malis are on schedule! 🌸</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {alerts.map((alert) => (
            <div key={alert.id} className="card glass" style={{ 
              padding: '24px', 
              borderLeft: alert.status === 'pending' ? '4px solid #FF6B6B' : '4px solid #4ADE80',
              opacity: alert.status === 'resolved' ? 0.7 : 1
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                    <div style={{ 
                        padding: '6px 12px', 
                        backgroundColor: 'rgba(255, 107, 107, 0.1)', 
                        borderRadius: '8px',
                        color: '#FF6B6B',
                        fontSize: '0.75rem',
                        fontWeight: '800'
                    }}>
                      {alert.delayMinutes} MIN DELAY
                    </div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      ID: {alert.subscriptionId.slice(-6)}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <User size={18} color="var(--primary)" />
                      <div>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Mali Partner</p>
                        <p style={{ fontSize: '1rem', fontWeight: 'bold', color: 'white' }}>{alert.maliName}</p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Users size={18} color="var(--primary)" />
                      <div>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Customer</p>
                        <p style={{ fontSize: '1rem', fontWeight: 'bold', color: 'white' }}>{alert.customerName}</p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Clock size={18} color="var(--primary)" />
                      <div>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Schedule vs Actual</p>
                        <p style={{ fontSize: '0.9rem', color: 'white' }}>
                          <span style={{ textDecoration: 'line-through', opacity: 0.5 }}>{alert.preferredTime}</span> 
                          {' '}{formatDate(alert.deliveredAt).split(',')[1]}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <MapPin size={18} color="var(--primary)" />
                      <div>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Location</p>
                        <p style={{ fontSize: '1rem', fontWeight: 'bold', color: 'white' }}>{alert.pincode}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right', marginLeft: '20px' }}>
                  {alert.status === 'pending' ? (
                    <button 
                      onClick={() => handleResolve(alert.id)}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: 'var(--primary)',
                        color: '#0A130E',
                        borderRadius: '10px',
                        fontWeight: 'bold',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <CheckCircle size={16} />
                      MARK RESOLVED
                    </button>
                  ) : (
                    <div style={{ color: '#4ADE80', fontWeight: 'bold', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckCircle size={16} />
                      RESOLVED
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
