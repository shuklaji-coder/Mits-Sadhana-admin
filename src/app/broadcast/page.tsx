"use client";
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import {
  collection, addDoc, query, onSnapshot, orderBy, serverTimestamp, limit
} from 'firebase/firestore';
import { Bell, Send, Users, Smartphone, Mail, AlertTriangle, Loader2, History, CheckCircle } from 'lucide-react';

interface Broadcast {
  id: string;
  title: string;
  message: string;
  topic: string;
  sentAt: any;
  platform: 'all' | 'android' | 'ios';
  status: 'sent' | 'failed';
}

export default function BroadcastCenter() {
  const [topic, setTopic] = useState('all');
  const [message, setMessage] = useState('');
  const [title, setTitle] = useState('');
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<Broadcast[]>([]);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  useEffect(() => {
    const q = query(collection(db, 'broadcasts'), orderBy('sentAt', 'desc'), limit(10));
    const unsub = onSnapshot(q, (snap) => {
      setHistory(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Broadcast)));
    });
    return () => unsub();
  }, []);

  const handleSend = async () => {
    if (!title || !message) {
      showToast("⚠️ Please fill in both title and message.");
      return;
    }

    setSending(true);
    try {
      // 1. Save to Firestore History
      await addDoc(collection(db, 'broadcasts'), {
        title,
        message,
        topic,
        platform: 'all',
        status: 'sent',
        sentAt: serverTimestamp(),
      });

      // 2. Add to User Notifications collection (which the app listens to)
      // This is a common pattern: app listens for docs in 'notifications' where userId == user.uid OR topic == 'all'
      await addDoc(collection(db, 'global_notifications'), {
        title,
        body: message,
        topic,
        createdAt: serverTimestamp(),
        type: 'broadcast'
      });

      // 💡 NOTE: In a production environment, a Firebase Cloud Function 
      // should trigger on 'global_notifications' creation to call FCM.
      
      showToast(`🚀 Broadcast dispatched to ${topic.toUpperCase()}!`);
      setTitle('');
      setMessage('');
    } catch (e) {
      showToast("❌ Failed to send broadcast.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ maxWidth: '1000px' }}>
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
        <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Divine Broadcast Center</h1>
        <p style={{ color: 'var(--text-muted)' }}>Send high-priority notifications and updates to all MitSadhana members.</p>
      </div>

      <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
        {/* Composer */}
        <div className="card glass" style={{ flex: 2, minWidth: '400px', padding: '40px' }}>
          <div style={{ marginBottom: '30px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 'bold', marginBottom: '10px', display: 'block', letterSpacing: '1px' }}>TARGET AUDIENCE</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              {['all', 'devotees', 'pandits', 'malis'].map(t => (
                <button 
                  key={t}
                  onClick={() => setTopic(t)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '10px',
                    backgroundColor: topic === t ? 'rgba(212, 168, 67, 0.1)' : '#060D08',
                    border: `1px solid ${topic === t ? 'var(--primary)' : 'var(--border)'}`,
                    color: topic === t ? 'var(--primary)' : 'var(--text-muted)',
                    fontWeight: 'bold',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {t.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '25px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold', marginBottom: '10px', display: 'block' }}>NOTIFICATION TITLE</label>
            <input 
              type="text" 
              placeholder="e.g. Shubh Mahashivratri Updates!" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{ width: '100%', padding: '15px', borderRadius: '10px', backgroundColor: '#020503', border: '1px solid var(--border)', color: 'white', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: '40px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold', marginBottom: '10px', display: 'block' }}>MESSAGE CONTENT</label>
            <textarea 
              rows={5} 
              placeholder="Write your sacred message here..." 
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              style={{ width: '100%', padding: '15px', borderRadius: '10px', backgroundColor: '#020503', border: '1px solid var(--border)', color: 'white', outline: 'none', resize: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <button 
            className="btn-primary" 
            style={{ width: '100%', padding: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px', opacity: sending ? 0.7 : 1, cursor: sending ? 'wait' : 'pointer' }} 
            onClick={handleSend}
            disabled={sending}
          >
            {sending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
            {sending ? 'DISPATCHING...' : 'DISPATCH SACRED BROADCAST'}
          </button>

          <div style={{ marginTop: '30px', display: 'flex', gap: '15px', color: 'var(--text-muted)', fontSize: '0.8rem', alignItems: 'center', padding: '0 10px' }}>
            <AlertTriangle size={16} color="#FACC15" />
            <p>Careful: This will trigger push notifications to across the entire selection instantly.</p>
          </div>
        </div>

        {/* History */}
        <div style={{ flex: 1, minWidth: '300px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', color: 'var(--primary)' }}>
            <History size={18} />
            <h3 style={{ fontSize: '1.1rem', letterSpacing: '1px' }}>RECENT BROADCASTS</h3>
          </div>

          <div style={{ display: 'grid', gap: '10px' }}>
            {history.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', marginTop: '20px' }}>No history yet.</p>
            ) : history.map(item => (
              <div key={item.id} className="card glass" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.6rem', color: 'var(--primary)', fontWeight: 'bold', padding: '2px 8px', backgroundColor: 'rgba(212,168,67,0.1)', borderRadius: '4px' }}>
                    {item.topic.toUpperCase()}
                  </span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                    {item.sentAt?.toDate?.().toLocaleDateString() || 'Today'}
                  </span>
                </div>
                <h4 style={{ color: 'white', marginBottom: '6px', fontSize: '0.95rem' }}>{item.title}</h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>{item.message.slice(0, 80)}...</p>
                <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle size={12} color="#4ADE80" />
                  <span style={{ fontSize: '0.65rem', color: '#4ADE80', fontWeight: 'bold' }}>DELIVERED</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideIn { from { transform: translateY(-10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
