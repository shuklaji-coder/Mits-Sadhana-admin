"use client";
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { ShoppingBag, Star, Clock, CheckCircle2, XCircle, Search, Filter, Zap } from 'lucide-react';

interface GlobalOrder {
  id: string;
  type: 'puja' | 'flower' | 'express';
  customerName: string;
  professionalName?: string;
  amount: number;
  status: 'pending' | 'completed' | 'cancelled' | 'in-progress' | 'confirmed' | 'dispatched' | 'delivered';
  date: any;
  pincode: string;
}

export default function OrdersHub() {
  const [orders, setOrders] = useState<GlobalOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'puja' | 'flower' | 'express'>('all');

  useEffect(() => {
    let pujaOrders: GlobalOrder[] = [];
    let flowerOrders: GlobalOrder[] = [];
    let expressOrders: GlobalOrder[] = [];

    const updateAll = () => {
      setOrders([...pujaOrders, ...flowerOrders, ...expressOrders].sort((a, b) => {
        const dateA = a.date?.seconds || 0;
        const dateB = b.date?.seconds || 0;
        return dateB - dateA;
      }));
      setLoading(false);
    };

    // 1. Fetch Pandit Bookings
    const pujaQuery = query(collection(db, 'pandit-bookings'), orderBy('date', 'desc'), limit(50));
    const unsubPuja = onSnapshot(pujaQuery, (snapshot) => {
      pujaOrders = snapshot.docs.map(doc => ({
          id: doc.id,
          type: 'puja',
          customerName: doc.data().userName || 'Customer',
          professionalName: doc.data().panditName,
          amount: Number(String(doc.data().price || 0).replace('₹', '').replace(',', '')),
          status: doc.data().status || 'pending',
          date: doc.data().date,
          pincode: doc.data().pincode || 'N/A'
      } as GlobalOrder));
      updateAll();
    }, (err) => console.error("Puja Listen Err:", err));

    // 2. Fetch Flower Subscriptions
    const flowerQuery = query(collection(db, 'subscriptions'), orderBy('createdAt', 'desc'));
    const unsubFlower = onSnapshot(flowerQuery, (subSnap) => {
        flowerOrders = subSnap.docs.map(doc => ({
            id: doc.id,
            type: 'flower',
            customerName: doc.data().userName || 'Customer',
            professionalName: doc.data().maliName,
            amount: Number(doc.data().price || 0),
            status: doc.data().status === 'active' ? 'completed' : 'pending',
            date: doc.data().createdAt,
            pincode: doc.data().pincode
        } as GlobalOrder));
        updateAll();
    }, (err) => console.error("Flower Listen Err:", err));

    // 3. Fetch Express Orders
    const expressQuery = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubExpress = onSnapshot(expressQuery, (expSnap) => {
        expressOrders = expSnap.docs
            .filter(doc => doc.data().orderType === 'express')
            .map(doc => ({
                id: doc.id,
                type: 'express',
                customerName: doc.data().userName || 'Customer',
                professionalName: 'MitSadhana Store',
                amount: Number(doc.data().totalAmount || 0),
                status: doc.data().status || 'pending',
                date: doc.data().createdAt,
                pincode: 'N/A'
            } as GlobalOrder));
        updateAll();
    }, (err) => console.error("Express Listen Err:", err));

    return () => {
      unsubPuja();
      unsubFlower();
      unsubExpress();
    };
  }, []);

  const filteredOrders = filter === 'all' ? orders : orders.filter(o => o.type === filter);

  const formatDate = (val: any) => {
    if (!val) return 'N/A';
    if (typeof val === 'string') return val;
    if (val.toDate) return val.toDate().toLocaleDateString();
    if (val instanceof Date) return val.toLocaleDateString();
    return 'N/A';
  };

  return (
    <div>
      <div style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Global Orders Hub</h1>
          <p style={{ color: 'var(--text-muted)' }}>Real-time overview of all transactions and bookings on MitSadhana.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
            {['all', 'puja', 'flower', 'express'].map(f => (
                <button 
                  key={f}
                  onClick={() => setFilter(f as any)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    backgroundColor: filter === f ? 'rgba(212, 168, 67, 0.1)' : 'transparent',
                    color: filter === f ? 'var(--primary)' : 'var(--text-muted)',
                    fontWeight: 'bold',
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                    {f.toUpperCase()}
                </button>
            ))}
        </div>
      </div>

      {loading ? (
        <p>Syncing logistics...</p>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
            <div style={{ display: 'flex', padding: '0 25px', color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 'bold' }}>
                <div style={{ flex: 2 }}>CUSTOMER & ORDER TYPE</div>
                <div style={{ flex: 1 }}>PROFESSIONAL</div>
                <div style={{ flex: 1 }}>AREA & DATE</div>
                <div style={{ flex: 1, textAlign: 'right' }}>AMOUNT & STATUS</div>
            </div>

            {filteredOrders.map((order) => (
                <div key={order.id} className="card glass" style={{ padding: '18px 25px' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{ flex: 2, display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <div style={{ 
                              width: '40px', 
                              height: '40px', 
                              borderRadius: '10px', 
                              backgroundColor: order.type === 'puja' ? 'rgba(212, 168, 67, 0.1)' : order.type === 'express' ? 'rgba(96, 165, 250, 0.1)' : 'rgba(140, 161, 147, 0.1)', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center' 
                            }}>
                                {order.type === 'puja' ? <Star size={18} color="#D4A843" /> : order.type === 'express' ? <Zap size={18} color="#60A5FA" /> : <ShoppingBag size={18} color="#8CA193" />}
                            </div>
                            <div>
                                <h4 style={{ color: 'white', fontSize: '0.95rem' }}>{order.customerName}</h4>
                                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{order.type.toUpperCase()} • ID: {order.id.slice(-6)}</p>
                            </div>
                        </div>

                        <div style={{ flex: 1 }}>
                            <p style={{ fontSize: '0.85rem', color: order.professionalName ? 'white' : 'var(--text-muted)' }}>
                                {order.professionalName || 'Manual Allotment Pending'}
                            </p>
                        </div>

                        <div style={{ flex: 1 }}>
                            <p style={{ fontSize: '0.85rem', color: 'white' }}>📍 {order.pincode}</p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatDate(order.date)}</p>
                        </div>

                        <div style={{ flex: 1, textAlign: 'right' }}>
                            <h4 style={{ color: 'white', marginBottom: '4px' }}>₹{order.amount}</h4>
                            <span style={{ 
                                fontSize: '0.65rem', 
                                fontWeight: 'bold', 
                                color: order.status === 'completed' ? '#4ADE80' : order.status === 'cancelled' ? '#FF6B6B' : '#FACC15',
                                textTransform: 'uppercase'
                            }}>
                                {order.status}
                            </span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
      )}
    </div>
  );
}
