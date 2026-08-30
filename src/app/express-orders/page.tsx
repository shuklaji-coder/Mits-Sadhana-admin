"use client";
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy, updateDoc, doc } from 'firebase/firestore';
import { Package, MapPin, Clock, Zap, CheckCircle2, XCircle, ShoppingCart, Share2, Link as LinkIcon } from 'lucide-react';

interface ExpressOrder {
  id: string;
  userName: string;
  userPhone: string;
  items: any[];
  totalAmount: number;
  deliveryAddress?: string;
  userAddress?: string;
  userDetails?: { address?: string };
  deliveryInstructions?: string;
  status: 'pending' | 'confirmed' | 'dispatched' | 'delivered' | 'cancelled';
  createdAt: any;
  deliveryTime?: any;
}

export default function ExpressOrders() {
  const [orders, setOrders] = useState<ExpressOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'orders'),
      where('orderType', '==', 'express'),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const orderData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ExpressOrder[];
      setOrders(orderData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const updateStatus = async (orderId: string, newStatus: string) => {
    try {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      // Step mapping
      const statusToStep: Record<string, string> = {
        'pending': 'placed',
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
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status");
    }
  };

  const copyDispatchLink = (orderId: string) => {
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/dispatch/${orderId}`;
    navigator.clipboard.writeText(link);
    alert("Dispatch Link Copied! Send this to the delivery partner.");
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'pending': return '#FACC15'; 
      case 'confirmed': return '#60A5FA'; 
      case 'packed': return '#F97316'; // orange
      case 'dispatched': return '#A78BFA'; 
      case 'delivered': return '#4ADE80'; 
      case 'cancelled': return '#F87171'; 
      default: return '#9CA3AF';
    }
  };

  const todayOrders = orders.filter(o => {
    const d = o.createdAt?.toDate?.() || new Date(o.createdAt);
    return new Date().toDateString() === d.toDateString();
  });

  return (
    <div>
      <div style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Zap color="#D4A843" size={32} />
            Express Orders (2hr Delivery)
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>Real-time coordination for direct-from-store fast deliveries.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        <div className="card glass">
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 'bold' }}>LATEST ORDERS</p>
          <h2 style={{ fontSize: '2rem', marginTop: '10px' }}>{todayOrders.length}</h2>
          <p style={{ fontSize: '0.75rem', color: '#8CA193', marginTop: '5px' }}>Today</p>
        </div>
        <div className="card glass">
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 'bold' }}>PENDING</p>
          <h2 style={{ fontSize: '2rem', marginTop: '10px', color: '#FACC15' }}>
            {orders.filter(o => o.status === 'pending').length}
          </h2>
          <p style={{ fontSize: '0.75rem', color: '#8CA193', marginTop: '5px' }}>Action required</p>
        </div>
        <div className="card glass">
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 'bold' }}>DISPATCHED</p>
          <h2 style={{ fontSize: '2rem', marginTop: '10px', color: '#A78BFA' }}>
            {orders.filter(o => o.status === 'dispatched').length}
          </h2>
          <p style={{ fontSize: '0.75rem', color: '#8CA193', marginTop: '5px' }}>On the way</p>
        </div>
      </div>

      {loading ? (
        <p>Listening for incoming express deliveries...</p>
      ) : orders.length === 0 ? (
        <div className="card glass" style={{ textAlign: 'center', padding: '60px' }}>
          <Package size={48} color="var(--text-muted)" style={{ margin: '0 auto 20px' }} />
          <h3>No Express Orders Yet</h3>
          <p style={{ color: 'var(--text-muted)' }}>Orders placed for "Within 2 hours" delivery will appear here.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '20px' }}>
          {orders.map((order) => (
            <div key={order.id} className="card glass" style={{ borderLeft: `4px solid ${getStatusColor(order.status)}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem', marginBottom: '5px' }}>{order.userName} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>({order.userPhone})</span></h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Order ID: {order.id}</p>
                </div>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                  <div style={{ textAlign: 'right' }}>
                    <h3 style={{ color: '#D4A843' }}>₹{order.totalAmount}</h3>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {order.createdAt?.toDate?.()?.toLocaleTimeString() || "Time N/A"}
                    </p>
                  </div>
                  <select 
                    value={order.status}
                    onChange={(e) => updateStatus(order.id, e.target.value)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(0,0,0,0.5)',
                      border: `1px solid ${getStatusColor(order.status)}`,
                      color: getStatusColor(order.status),
                      fontWeight: 'bold',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="pending">Placed</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="packed">Packed</option>
                    <option value="dispatched">Out for Delivery</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <button 
                    onClick={() => copyDispatchLink(order.id)}
                    style={{
                      padding: '8px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(212,168,67,0.1)',
                      border: '1px solid #D4A843',
                      color: '#D4A843',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: 'bold'
                    }}
                    title="Copy Link for Driver"
                  >
                    <LinkIcon size={14} /> Link
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '30px', backgroundColor: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '12px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <MapPin size={16} color="var(--primary)" />
                    <h4 style={{ fontSize: '0.9rem' }}>Full Delivery Address</h4>
                  </div>
                  <p style={{ color: '#E6EFEA', fontSize: '0.85rem', lineHeight: '1.5' }}>
                    {order.deliveryAddress || order.userAddress || order.userDetails?.address || 'No address provided'}
                  </p>
                  {order.deliveryInstructions && (
                    <p style={{ color: '#FACC15', fontSize: '0.8rem', marginTop: '10px', fontStyle: 'italic' }}>
                      " {order.deliveryInstructions} "
                    </p>
                  )}
                </div>

                <div style={{ flex: 1, borderLeft: '1px solid rgba(255,255,255,0.05)', paddingLeft: '30px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <ShoppingCart size={16} color="var(--primary)" />
                    <h4 style={{ fontSize: '0.9rem' }}>Items Ordered ({order.items?.length || 0})</h4>
                  </div>
                  <ul style={{ listStyleType: 'none', padding: 0, margin: 0, display: 'grid', gap: '8px' }}>
                    {order.items?.map((item: any, i: number) => (
                      <li key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span style={{ color: '#AABBB0', flex: 1 }}>{(item.quantity ?? item.qty ?? 1)}x {item.title || item.name}</span>
                        <span style={{ color: '#E6EFEA', fontWeight: 'bold' }}>₹{(item.price * (item.quantity ?? item.qty ?? 1))}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
