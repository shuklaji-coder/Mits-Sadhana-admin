"use client";
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import {
  collection, query, onSnapshot, orderBy, doc, updateDoc, deleteDoc, serverTimestamp
} from 'firebase/firestore';
import { MessageSquare, User, Clock, CheckCircle, Search, Mail, Loader2, AlertCircle, Trash2 } from 'lucide-react';

interface SupportTicket {
  id: string;
  userId: string;
  userName: string;
  userEmail?: string;
  issue: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'open' | 'resolved' | 'closed';
  createdAt: any;
  resolvedAt?: any;
}

export default function SupportDesk() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('open');
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  useEffect(() => {
    const q = query(collection(db, 'support_tickets'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setTickets(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupportTicket)));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, []);

  const handleResolve = async (ticketId: string) => {
    setResolvingId(ticketId);
    try {
      await updateDoc(doc(db, 'support_tickets', ticketId), {
        status: 'resolved',
        resolvedAt: serverTimestamp()
      });
      showToast('✅ Ticket marked as resolved.');
    } catch (e) {
      showToast('❌ Error updating ticket.');
    } finally {
      setResolvingId(null);
    }
  };

  const handleDelete = async (ticketId: string) => {
    if (confirm('Delete this ticket permanently?')) {
      await deleteDoc(doc(db, 'support_tickets', ticketId));
      showToast('🗑️ Ticket deleted.');
    }
  };

  const filteredTickets = filter === 'all' 
    ? tickets 
    : tickets.filter(t => t.status === filter);

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'high': return '#FF6B6B';
      case 'medium': return '#FACC15';
      default: return '#4ADE80';
    }
  };

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
        <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Support Desk</h1>
        <p style={{ color: 'var(--text-muted)' }}>Real-time dashboard for devotee and partner support tickets.</p>
      </div>

      {/* Stats Summary */}
      <div style={{ display: 'flex', gap: '15px', marginBottom: '30px' }}>
        <div className="card glass" style={{ flex: 1, padding: '20px' }}>
          <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 'bold', letterSpacing: '1px' }}>OPEN TICKETS</p>
          <h3 style={{ color: '#FF6B6B', fontSize: '1.5rem' }}>{tickets.filter(t => t.status === 'open').length}</h3>
        </div>
        <div className="card glass" style={{ flex: 1, padding: '20px' }}>
          <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 'bold', letterSpacing: '1px' }}>RESOLVED TODAY</p>
          <h3 style={{ color: '#4ADE80', fontSize: '1.5rem' }}>{tickets.filter(t => t.status === 'resolved').length}</h3>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '25px' }}>
        {['open', 'resolved', 'all'].map(f => (
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

      {/* Ticket List */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)' }}>
          <Loader2 size={20} className="animate-spin" />
          <span>Syncing with Support Cloud...</span>
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="card glass" style={{ textAlign: 'center', padding: '60px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '20px' }}>✨</div>
          <h3>All caught up!</h3>
          <p style={{ color: 'var(--text-muted)' }}>No tickets found matching your filter.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {filteredTickets.map(tk => (
            <div key={tk.id} className="card glass" style={{ borderLeft: `4px solid ${tk.status === 'resolved' ? '#4ADE80' : getPriorityColor(tk.priority)}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flex: 1 }}>
                  <div style={{ 
                    width: '45px', height: '45px', borderRadius: '12px', 
                    backgroundColor: 'rgba(212, 168, 67, 0.1)', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center' 
                  }}>
                    <MessageSquare size={20} color="var(--primary)" />
                  </div>
                  <div>
                    <h4 style={{ color: '#0B251C', marginBottom: '4px', fontSize: '1rem', fontWeight: '800' }}>{tk.issue}</h4>
                    <p style={{ fontSize: '0.9rem', color: '#0B251C', marginBottom: '8px', lineHeight: '1.4' }}>{tk.description || 'No additional details provided.'}</p>
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
                        <User size={14} />
                        <span style={{ fontSize: '0.75rem' }}>{tk.userName}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
                        <Clock size={14} />
                        <span style={{ fontSize: '0.75rem' }}>{tk.createdAt?.toDate?.().toLocaleString() || 'Just now'}</span>
                      </div>
                      <span style={{ 
                        fontSize: '0.65rem', fontWeight: 'bold', 
                        color: getPriorityColor(tk.priority), 
                        textTransform: 'uppercase',
                        padding: '2px 8px',
                        backgroundColor: `${getPriorityColor(tk.priority)}15`,
                        borderRadius: '4px'
                      }}>
                        {tk.priority} Priority
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  {tk.status === 'open' ? (
                    <button 
                      onClick={() => handleResolve(tk.id)}
                      disabled={resolvingId === tk.id}
                      className="btn-primary" 
                      style={{ padding: '8px 16px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      {resolvingId === tk.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                      RESOLVE
                    </button>
                  ) : (
                    <span style={{ color: '#4ADE80', fontSize: '0.8rem', fontWeight: 'bold', padding: '8px' }}>✓ RESOLVED</span>
                  )}
                  <button 
                    onClick={() => handleDelete(tk.id)}
                    style={{ 
                      padding: '8px', borderRadius: '8px', 
                      backgroundColor: 'rgba(255,107,107,0.1)', 
                      border: 'none', cursor: 'pointer' 
                    }}
                  >
                    <Trash2 size={16} color="#FF6B6B" />
                  </button>
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
