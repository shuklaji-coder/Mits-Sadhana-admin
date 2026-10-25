"use client";
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import {
  collection, query, onSnapshot, orderBy, doc, updateDoc, addDoc, serverTimestamp, Timestamp, getDocs, where
} from 'firebase/firestore';
import { IndianRupee, Clock, CheckCircle2, AlertCircle, Loader2, RefreshCw, Plus, Download } from 'lucide-react';

interface PayoutRecord {
  id: string;
  professionalName: string;
  professionalId: string;
  role: 'pandit' | 'mali';
  amount: number;
  status: 'pending' | 'completed' | 'on-hold';
  requestedAt: any;
  completedAt?: any;
  upiId?: string;
  notes?: string;
}

export default function PayoutsPage() {
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'on-hold'>('all');
  const [toast, setToast] = useState('');
  const [showGenerate, setShowGenerate] = useState(false);
  const [generating, setGenerating] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  useEffect(() => {
    const q = query(collection(db, 'payouts'), orderBy('requestedAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setPayouts(snap.docs.map(d => ({ id: d.id, ...d.data() } as PayoutRecord)));
      setLoading(false);
    }, () => {
      // Collection may not exist yet
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleMarkCompleted = async (payout: PayoutRecord) => {
    setMarkingId(payout.id);
    try {
      await updateDoc(doc(db, 'payouts', payout.id), {
        status: 'completed',
        completedAt: serverTimestamp(),
      });
      showToast(`✅ Payout to ${payout.professionalName} marked as PAID!`);
    } catch (e) {
      showToast('❌ Failed to update payout. Try again.');
    } finally {
      setMarkingId(null);
    }
  };

  const handleHold = async (payout: PayoutRecord) => {
    const newStatus = payout.status === 'on-hold' ? 'pending' : 'on-hold';
    await updateDoc(doc(db, 'payouts', payout.id), { status: newStatus });
    showToast(newStatus === 'on-hold' ? '⏸️ Payout put on hold.' : '▶️ Payout resumed.');
  };

  // Generate payout records from completed bookings & active subscriptions
  const handleGeneratePayouts = async () => {
    setGenerating(true);
    try {
      let count = 0;

      // 1. Pandit payouts from completed bookings
      const bookingsSnap = await getDocs(
        query(collection(db, 'pandit-bookings'), where('status', '==', 'completed'))
      );
      for (const bookingDoc of bookingsSnap.docs) {
        const data = bookingDoc.data();
        // Check if payout already exists for this booking
        const existing = await getDocs(
          query(collection(db, 'payouts'), where('sourceId', '==', bookingDoc.id))
        );
        if (existing.empty && data.panditId) {
          const rawPrice = String(data.price || '0').replace('₹', '').replace(',', '');
          const amount = Math.round(Number(rawPrice) * 0.8); // 80% to pandit, 20% platform fee
          await addDoc(collection(db, 'payouts'), {
            professionalName: data.panditName || 'Pandit',
            professionalId: data.panditId,
            role: 'pandit',
            amount,
            status: 'pending',
            sourceId: bookingDoc.id,
            sourceType: 'pandit_booking',
            requestedAt: serverTimestamp(),
            notes: `Booking: ${data.pujaName || 'Puja'} on ${data.date || 'N/A'}`,
          });
          count++;
        }
      }

      // 2. Mali payouts from active subscriptions (Monthly Recurring)
      const currentMonthId = new Date().toISOString().slice(0, 7); // e.g., "2026-05"
      const subsSnap = await getDocs(
        query(collection(db, 'subscriptions'), where('status', '==', 'active'), where('assignedMaliId', '!=', null))
      );
      for (const subDoc of subsSnap.docs) {
        const data = subDoc.data();
        const existing = await getDocs(
          query(collection(db, 'payouts'), 
            where('sourceId', '==', subDoc.id),
            where('monthId', '==', currentMonthId)
          )
        );
        if (existing.empty && data.assignedMaliId) {
          const amount = Math.round(Number(data.price || 0) * 0.75); // 75% to mali
          await addDoc(collection(db, 'payouts'), {
            professionalName: data.maliName || 'Mali',
            professionalId: data.assignedMaliId,
            role: 'mali',
            amount,
            status: 'pending',
            sourceId: subDoc.id,
            sourceType: 'subscription',
            monthId: currentMonthId, // Track month for recurring logic
            requestedAt: serverTimestamp(),
            notes: `Subscription Monthly Payout: ${data.planName || 'Plan'} - ${data.userName || ''}`,
          });
          count++;
        }
      }

      if (count > 0) {
        showToast(`✅ Generated ${count} new payout record(s)!`);
      } else {
        showToast('ℹ️ No new payouts to generate. All bookings are accounted for.');
      }
    } catch (e) {
      console.error(e);
      showToast('❌ Error generating payouts.');
    } finally {
      setGenerating(false);
      setShowGenerate(false);
    }
  };

  const handleExportCSV = () => {
    if (filtered.length === 0) {
      showToast('⚠️ No payouts to export.');
      return;
    }
    const headers = ['Payout ID', 'Beneficiary Name', 'Role', 'Amount (INR)', 'Status', 'UPI ID / Account', 'Source Details', 'Date'];
    const rows = filtered.map(p => [
      `"${p.id}"`,
      `"${p.professionalName.replace(/"/g, '""')}"`,
      `"${p.role.toUpperCase()}"`,
      p.amount,
      `"${p.status.toUpperCase()}"`,
      `"${(p.upiId || 'N/A').replace(/"/g, '""')}"`,
      `"${(p.notes || '').replace(/"/g, '""')}"`,
      `"${p.requestedAt?.toDate ? p.requestedAt.toDate().toISOString() : new Date().toISOString()}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `mits_payouts_${filter}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`📥 Exported ${filtered.length} payout record(s) to CSV!`);
  };

  const filtered = filter === 'all' ? payouts : payouts.filter(p => p.status === filter);
  const pendingTotal = payouts.filter(p => p.status === 'pending').reduce((a, b) => a + b.amount, 0);
  const paidTotal = payouts.filter(p => p.status === 'completed').reduce((a, b) => a + b.amount, 0);
  const onHoldTotal = payouts.filter(p => p.status === 'on-hold').reduce((a, b) => a + b.amount, 0);

  const statusColor = (s: string) =>
    s === 'completed' ? '#4ADE80' : s === 'on-hold' ? '#FACC15' : '#FF6B6B';

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px', zIndex: 9999,
          padding: '14px 20px', borderRadius: '12px',
          backgroundColor: '#1A3324', border: '1px solid var(--primary)',
          color: 'white', fontSize: '0.9rem', fontWeight: 'bold',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
        }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Financial Payouts</h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage and audit payments due to Pandits and Vendors.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleExportCSV}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 18px',
              borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)',
              color: 'white', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer'
            }}
          >
            <Download size={16} /> EXPORT CSV BATCH
          </button>
          <button
            onClick={() => setShowGenerate(true)}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px' }}
          >
            <RefreshCw size={16} /> GENERATE PAYOUTS
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '30px', flexWrap: 'wrap' }}>
        {[
          { label: 'PENDING PAYOUTS', amount: pendingTotal, color: '#FF6B6B', count: payouts.filter(p => p.status === 'pending').length },
          { label: 'ON HOLD', amount: onHoldTotal, color: '#FACC15', count: payouts.filter(p => p.status === 'on-hold').length },
          { label: 'TOTAL DISBURSED', amount: paidTotal, color: '#4ADE80', count: payouts.filter(p => p.status === 'completed').length },
        ].map(card => (
          <div key={card.label} className="card glass" style={{ flex: 1, minWidth: '180px' }}>
            <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 'bold', letterSpacing: '1px', marginBottom: '8px' }}>{card.label}</p>
            <h3 style={{ color: card.color, fontSize: '1.4rem' }}>₹{card.amount.toLocaleString()}</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>{card.count} record(s)</p>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        {(['all', 'pending', 'completed', 'on-hold'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '8px 18px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.8rem',
              border: '1px solid var(--border)', cursor: 'pointer',
              backgroundColor: filter === f ? 'rgba(212, 168, 67, 0.1)' : 'transparent',
              color: filter === f ? 'var(--primary)' : 'var(--text-muted)',
            }}
          >
            {f.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Payout List */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-muted)', padding: '40px 0' }}>
          <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
          Loading payouts from Firestore...
        </div>
      ) : filtered.length === 0 ? (
        <div className="card glass" style={{ textAlign: 'center', padding: '60px' }}>
          <p style={{ fontSize: '2.5rem', marginBottom: '16px' }}>💰</p>
          <h3 style={{ marginBottom: '8px' }}>No payout records</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
            Click "Generate Payouts" to auto-create records from completed bookings and active subscriptions.
          </p>
          <button onClick={() => setShowGenerate(true)} className="btn-primary" style={{ padding: '12px 24px' }}>
            GENERATE NOW
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {filtered.map(pay => (
            <div key={pay.id} className="card glass" style={{ borderLeft: `4px solid ${statusColor(pay.status)}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {/* Left: Professional Info */}
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flex: 2 }}>
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '12px',
                    backgroundColor: pay.role === 'pandit' ? 'rgba(212,168,67,0.1)' : 'rgba(140,161,147,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem'
                  }}>
                    {pay.role === 'pandit' ? '🛕' : '🌸'}
                  </div>
                  <div>
                    <h4 style={{ color: '#0B251C', marginBottom: '4px', fontSize: '1rem', fontWeight: '800' }}>{pay.professionalName}</h4>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {pay.role.toUpperCase()} • {pay.notes || `ID: ${pay.professionalId?.slice(-6)}`}
                    </p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {pay.requestedAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Right: Amount + Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <h3 style={{ color: '#0B251C', fontSize: '1.3rem', marginBottom: '4px', fontWeight: '800' }}>₹{pay.amount.toLocaleString()}</h3>
                    <span style={{
                      fontSize: '0.65rem', fontWeight: 'bold',
                      color: statusColor(pay.status), textTransform: 'uppercase'
                    }}>
                      {pay.status}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    {pay.status !== 'completed' && (
                      <>
                        <button
                          onClick={() => handleMarkCompleted(pay)}
                          disabled={markingId === pay.id}
                          className="btn-primary"
                          style={{ padding: '8px 14px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                          {markingId === pay.id
                            ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                            : <CheckCircle2 size={14} />
                          }
                          {markingId === pay.id ? '...' : 'MARK PAID'}
                        </button>
                        <button
                          onClick={() => handleHold(pay)}
                          style={{
                            padding: '8px 12px', fontSize: '0.75rem', borderRadius: '8px',
                            border: `1px solid ${pay.status === 'on-hold' ? '#4ADE80' : '#FACC15'}`,
                            color: pay.status === 'on-hold' ? '#4ADE80' : '#FACC15',
                            backgroundColor: 'transparent', cursor: 'pointer', fontWeight: 'bold'
                          }}
                        >
                          {pay.status === 'on-hold' ? 'RESUME' : 'HOLD'}
                        </button>
                      </>
                    )}
                    {pay.status === 'completed' && pay.completedAt && (
                      <span style={{ fontSize: '0.7rem', color: '#4ADE80' }}>
                        Paid on {pay.completedAt?.toDate?.()?.toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Generate Payouts Modal */}
      {showGenerate && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)',
          zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div className="card glass" style={{ width: '100%', maxWidth: '460px', padding: '40px' }}>
            <h2 style={{ marginBottom: '16px', fontSize: '1.2rem' }}>Generate Payout Records</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.6', fontSize: '0.9rem' }}>
              This will scan all <strong style={{ color: 'white' }}>completed Pandit bookings</strong> and{' '}
              <strong style={{ color: 'white' }}>active subscriptions</strong> and auto-create pending payout
              records for professionals who haven't been paid yet.
            </p>
            <div className="glass" style={{ padding: '16px', borderRadius: '10px', marginBottom: '24px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              💡 Platform fee: <strong style={{ color: 'var(--primary)' }}>20% for Pandits</strong>, <strong style={{ color: 'var(--primary)' }}>25% for Malis</strong>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleGeneratePayouts}
                disabled={generating}
                className="btn-primary"
                style={{ flex: 1, padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                {generating
                  ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> SCANNING...</>
                  : <><RefreshCw size={16} /> GENERATE NOW</>
                }
              </button>
              <button
                onClick={() => setShowGenerate(false)}
                style={{ padding: '14px 20px', borderRadius: '8px', border: '1px solid var(--border)', color: 'var(--text-muted)', backgroundColor: 'transparent', cursor: 'pointer' }}
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
