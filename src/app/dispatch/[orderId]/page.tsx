"use client";
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Package, MapPin, Phone, Navigation, CheckCircle2, ChevronRight, Zap } from 'lucide-react';

export default function DispatchPortal() {
  const params = useParams();
  const orderId = params.orderId as string;
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [successStatus, setSuccessStatus] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOrder() {
      if (!orderId) return;
      try {
        const docRef = doc(db, 'orders', orderId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setOrder(docSnap.data());
        }
      } catch (err) {
        console.error("Error fetching order:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchOrder();
  }, [orderId]);

  const updateStatus = async (newStatus: string) => {
    if (updating) return;
    setUpdating(true);
    try {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      const statusToStep: Record<string, string> = {
        'confirmed': 'confirmed',
        'packed': 'packed',
        'dispatched': 'out_for_delivery',
        'delivered': 'delivered'
      };

      const stepKey = statusToStep[newStatus];
      const updateData: any = { status: newStatus };
      if (stepKey) {
        updateData[`statusTimestamps.${stepKey}`] = timeStr;
      }

      await updateDoc(doc(db, 'orders', orderId), updateData);
      setOrder({ ...order, status: newStatus, statusTimestamps: { ...order.statusTimestamps, [stepKey]: timeStr } });
      
      setSuccessStatus(newStatus);
      setTimeout(() => setSuccessStatus(null), 3000);
    } catch (err) {
      alert("Failed to update status. Please try again.");
    } finally {
      setUpdating(false);
    }
  };

  const openInMaps = () => {
    const addr = order?.deliveryAddress || order?.userAddress || order?.userDetails?.address;
    if (!addr) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;
    window.open(url, '_blank');
  };

  if (loading) return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A0A0A', color: '#D4A843' }}>
      <p>Loading Sacred Order...</p>
    </div>
  );

  if (!order) return (
    <div style={{ display: 'flex', height: '100vh', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A0A0A', color: '#F87171', padding: '20px', textAlign: 'center' }}>
      <h2>Invalid Order Link</h2>
      <p style={{ color: '#9CA3AF', marginTop: '10px' }}>This dispatch link is no longer valid or order does not exist.</p>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0A0A0A', color: '#EBEBEB', fontFamily: 'sans-serif', padding: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px', borderBottom: '1px solid #1F2937', paddingBottom: '16px' }}>
        <div style={{ padding: '8px', backgroundColor: 'rgba(212, 168, 67, 0.1)', borderRadius: '12px' }}>
          <Zap color="#D4A843" size={24} />
        </div>
        <div>
          <h2 style={{ fontSize: '1.2rem', margin: 0 }}>MitSadhana Dispatch</h2>
          <p style={{ fontSize: '0.8rem', color: '#9CA3AF', margin: 0 }}>Reference: #{orderId.slice(-6).toUpperCase()}</p>
        </div>
      </div>

      {/* Delivery Info Card */}
      <div style={{ backgroundColor: '#111827', borderRadius: '20px', padding: '20px', marginBottom: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <MapPin size={18} color="#D4A843" />
          <h3 style={{ fontSize: '1rem', color: '#D4A843' }}>Delivery Address</h3>
        </div>
        <p style={{ fontSize: '1rem', lineHeight: '1.5',  marginBottom: '20px' }}>{order.deliveryAddress || order.userAddress || order.userDetails?.address}</p>
        
        <button 
          onClick={openInMaps}
          style={{ width: '100%', padding: '14px', borderRadius: '12px', backgroundColor: '#1F2937', color: '#FFF', border: '1px solid #374151', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 'bold' }}
        >
          <Navigation size={18} /> Open in Google Maps
        </button>
      </div>

      {/* Customer Contact */}
      <div style={{ backgroundColor: '#111827', borderRadius: '20px', padding: '20px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>Devotee</p>
          <h4 style={{ fontSize: '1.1rem', margin: '4px 0' }}>{order.userName}</h4>
        </div>
        <a 
          href={`tel:${order.userPhone}`}
          style={{ width: '48px', height: '48px', borderRadius: '24px', backgroundColor: '#4ADE80', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}
        >
          <Phone size={20} color="#FFF" />
        </a>
      </div>

      {/* Order Summary (Brief) */}
      <div style={{ marginBottom: '32px', padding: '0 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Package size={18} color="#9CA3AF" />
          <h3 style={{ fontSize: '0.9rem', color: '#9CA3AF' }}>Order Items ({order.items?.length || 0})</h3>
        </div>
        {order.items?.map((item: any, i: number) => (
          <div key={i} style={{ fontSize: '0.9rem', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
            <span>{item.quantity}x {item.title || item.name}</span>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {order.status === 'confirmed' && (
          <button 
            disabled={updating}
            onClick={() => updateStatus('packed')}
            style={{ width: '100%', padding: '20px', borderRadius: '16px', backgroundColor: '#D4A843', color: '#000', fontWeight: '900', fontSize: '1.1rem', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
          >
            CONFIRM PACKED <ChevronRight size={24} />
          </button>
        )}

        {(order.status === 'confirmed' || order.status === 'packed') && (
          <button 
            disabled={updating}
            onClick={() => updateStatus('dispatched')}
            style={{ width: '100%', padding: '20px', borderRadius: '16px', backgroundColor: '#60A5FA', color: '#FFF', fontWeight: '900', fontSize: '1.1rem', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
          >
            I AM ON MY WAY 🚚
          </button>
        )}

        {order.status === 'dispatched' && (
          <button 
            disabled={updating}
            onClick={() => updateStatus('delivered')}
            style={{ width: '100%', padding: '24px', borderRadius: '16px', backgroundColor: '#4ADE80', color: '#FFF', fontWeight: '900', fontSize: '1.2rem', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 0 20px rgba(74, 222, 128, 0.3)' }}
          >
            MARK AS DELIVERED <CheckCircle2 size={24} />
          </button>
        )}

        {order.status === 'delivered' && (
          <div style={{ padding: '30px', borderRadius: '16px', backgroundColor: 'rgba(74, 222, 128, 0.1)', border: '1px solid #4ADE80', textAlign: 'center' }}>
            <CheckCircle2 size={48} color="#4ADE80" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ color: '#4ADE80' }}>Delivered Successfully!</h3>
            <p style={{ color: '#9CA3AF', marginTop: '8px' }}>Thank you for your sewa.</p>
          </div>
        )}
      </div>

      {/* Success Notification */}
      {successStatus && (
        <div style={{ position: 'fixed', bottom: '20px', left: '20px', right: '20px', backgroundColor: '#4ADE80', color: '#FFF', padding: '16px', borderRadius: '12px', textAlign: 'center', fontWeight: 'bold', zIndex: 100 }}>
          Status Updated: {successStatus.toUpperCase()}
        </div>
      )}
    </div>
  );
}
