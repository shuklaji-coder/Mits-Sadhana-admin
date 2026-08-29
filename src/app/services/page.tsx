"use client";
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { 
  collection, doc, getDocs, setDoc, updateDoc, addDoc, deleteDoc, onSnapshot 
} from 'firebase/firestore';
import { Package, Save, Edit3, Plus, Trash2, Loader2, CheckCircle, Settings2, Smartphone, ToggleLeft, ToggleRight } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  price: number;
  monthlyOriginalPrice?: number;
  description?: string;
  features?: string[];
  status: 'active' | 'inactive';
  popular?: boolean;
  image?: string;
  gradient?: string[];
  deliveryTime?: string;
  badge?: string;
}

interface Banner {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  active: boolean;
  expiresAt?: string;
}

export default function ServicesPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [toast, setToast] = useState('');

  // Load plans from Firestore
  useEffect(() => {
    const unsubPlans = onSnapshot(collection(db, 'service_plans'), (snap) => {
      if (snap.empty) {
        // Seed default plans if none exist
        seedDefaultPlans();
      } else {
        setPlans(snap.docs.map(d => ({ id: d.id, ...d.data() } as Plan)));
      }
      setLoading(false);
    });

    const unsubBanners = onSnapshot(collection(db, 'app_banners'), (snap) => {
      setBanners(snap.docs.map(d => ({ id: d.id, ...d.data() } as Banner)));
    });

    return () => { unsubPlans(); unsubBanners(); };
  }, []);

  const seedDefaultPlans = async () => {
    const defaults: Omit<Plan, 'id'>[] = [
      { 
        name: 'Daily Puja', 
        price: 499, 
        monthlyOriginalPrice: 699, 
        description: 'Daily fresh flowers for your puja', 
        features: ['Fresh flowers daily', '6 AM delivery', 'Seasonal varieties'], 
        status: 'active', 
        popular: false,
        image: 'https://images.pexels.com/photos/4406373/pexels-photo-4406373.jpeg',
        gradient: ['#D4A843', '#E5C27C'],
        deliveryTime: '6:00 AM',
        badge: 'BASIC'
      },
      { 
        name: 'Premium Divine', 
        price: 999, 
        monthlyOriginalPrice: 1499, 
        description: 'Premium puja samagri every month', 
        features: ['All Daily benefits', 'Puja samagri kit', 'Priority support', 'Festival specials'], 
        status: 'active', 
        popular: true,
        image: 'https://images.pexels.com/photos/4629633/pexels-photo-4629633.jpeg',
        gradient: ['#8B7355', '#A0896D'],
        deliveryTime: '5:30 AM',
        badge: 'MOST POPULAR'
      },
      { 
        name: 'Royal Spiritual', 
        price: 1999, 
        monthlyOriginalPrice: 2999, 
        description: 'The complete spiritual experience', 
        features: ['All Premium benefits', 'Pandit consultation 1x/month', 'Exclusive pujas', 'Premium packaging'], 
        status: 'active', 
        popular: false,
        image: 'https://images.pexels.com/photos/7666/pexels-photo.jpg',
        gradient: ['#FFD700', '#FFA500'],
        deliveryTime: '5:00 AM',
        badge: 'LUXURY'
      },
    ];
    for (const plan of defaults) {
      await addDoc(collection(db, 'service_plans'), plan);
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleSavePlan = async (plan: Plan) => {
    setSaving(plan.id);
    try {
      if (plan.id.startsWith('new_')) {
        const { id, ...data } = plan;
        await addDoc(collection(db, 'service_plans'), data);
        showToast('✅ New plan added successfully!');
      } else {
        const { id, ...data } = plan;
        await updateDoc(doc(db, 'service_plans', plan.id), data);
        showToast('✅ Plan updated in Firestore!');
      }
      setEditingPlan(null);
    } catch (e) {
      showToast('❌ Error saving plan. Please try again.');
    } finally {
      setSaving(null);
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (planId.startsWith('new_')) { setEditingPlan(null); return; }
    if (!confirm('Delete this plan? This cannot be undone.')) return;
    await deleteDoc(doc(db, 'service_plans', planId));
    showToast('🗑️ Plan deleted.');
  };

  const handleToggleBanner = async (banner: Banner) => {
    await updateDoc(doc(db, 'app_banners', banner.id), { active: !banner.active });
    showToast(banner.active ? 'Banner disabled.' : '✅ Banner enabled!');
  };

  const handleAddPlan = () => {
    const newPlan: Plan = {
      id: `new_${Date.now()}`,
      name: 'New Plan',
      price: 199,
      monthlyOriginalPrice: 299,
      description: 'Plan description here',
      features: ['Feature 1', 'Feature 2'],
      status: 'active',
      popular: false,
      image: 'https://images.pexels.com/photos/4406373/pexels-photo-4406373.jpeg',
      gradient: ['#102E1B', '#06160B'],
      deliveryTime: '6:00 AM',
      badge: 'NEW'
    };
    setEditingPlan(newPlan);
  };

  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);

  const handleSaveBanner = async (banner: Banner) => {
    setSaving(banner.id);
    try {
        if (banner.id.startsWith('new_')) {
            const { id, ...data } = banner;
            await addDoc(collection(db, 'app_banners'), data);
        } else {
            const { id, ...data } = banner;
            await updateDoc(doc(db, 'app_banners', banner.id), data);
        }
        setEditingBanner(null);
        showToast('✅ Banner saved successfully!');
    } catch (e) {
        showToast('❌ Error saving banner.');
    } finally {
        setSaving(null);
    }
  };

  const handleAddBanner = () => {
      setEditingBanner({
          id: `new_${Date.now()}`,
          title: 'New Banner',
          subtitle: 'Subtitle here',
          image: 'https://images.pexels.com/photos/4629633/pexels-photo-4629633.jpeg',
          active: true
      });
  };

  const getStatusColor = (status: string) => status === 'active' ? '#4ADE80' : '#FF6B6B';

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

      <div style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Service Configurator</h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage subscription plans and app content — changes sync live to the app.</p>
        </div>
        <button onClick={handleAddPlan} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px' }}>
          <Plus size={16} /> ADD NEW PLAN
        </button>
      </div>

      {/* PLANS GRID */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-muted)', padding: '40px 0' }}>
          <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
          Loading plans from Firestore...
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px', marginBottom: '40px' }}>
          {plans.map(plan => (
            <div key={plan.id} className="card glass" style={{ borderLeft: `4px solid ${getStatusColor(plan.status)}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div style={{ width: '50px', height: '50px', borderRadius: '12px', backgroundColor: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Package size={24} color="var(--primary)" />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {plan.popular && (
                    <span style={{ fontSize: '0.6rem', color: '#D4A843', fontWeight: 'bold', padding: '3px 8px', backgroundColor: 'rgba(212,168,67,0.1)', borderRadius: '6px' }}>⭐ POPULAR</span>
                  )}
                  <span style={{ fontSize: '0.65rem', color: getStatusColor(plan.status), fontWeight: 'bold' }}>
                    {plan.status.toUpperCase()}
                  </span>
                </div>
              </div>

              <h3 style={{ color: 'white', marginBottom: '8px', fontSize: '1.1rem' }}>{plan.name}</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>{plan.description}</p>

              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span style={{ fontSize: '1.6rem', color: 'white', fontWeight: 'bold' }}>₹{plan.price}</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textDecoration: 'line-through' }}>₹{plan.monthlyOriginalPrice || ''}</span>
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>/month</span>
              </div>

              <div style={{ marginBottom: '20px' }}>
                {plan.features?.slice(0,3).map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--primary)', fontSize: '0.8rem' }}>✓</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{f}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setEditingPlan({ ...plan })}
                className="btn-primary"
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <Edit3 size={14} /> EDIT PLAN
              </button>
            </div>
          ))}
        </div>
      )}

      {/* EDIT MODAL */}
      {editingPlan && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)',
          zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div className="card glass" style={{ width: '100%', maxWidth: '520px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
              <h2 style={{ fontSize: '1.2rem' }}>{editingPlan.id.startsWith('new_') ? 'Add New Plan' : 'Edit Plan'}</h2>
              <button onClick={() => setEditingPlan(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.5rem' }}>×</button>
            </div>

            {[
              { label: 'PLAN NAME', key: 'name', type: 'text' },
              { label: 'PRICE (₹/month)', key: 'price', type: 'number' },
              { label: 'ORIGINAL PRICE (₹)', key: 'monthlyOriginalPrice', type: 'number' },
              { label: 'BADGE TEXT', key: 'badge', type: 'text' },
              { label: 'IMAGE URL', key: 'image', type: 'text' },
              { label: 'DELIVERY TIME', key: 'deliveryTime', type: 'text' },
              { label: 'DESCRIPTION', key: 'description', type: 'text' },
            ].map(({ label, key, type }) => (
              <div key={key} style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'bold', letterSpacing: '1px', display: 'block', marginBottom: '8px' }}>{label}</label>
                <input
                  type={type}
                  value={(editingPlan as any)[key] || ''}
                  onChange={e => setEditingPlan({ ...editingPlan, [key]: type === 'number' ? Number(e.target.value) : e.target.value })}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', backgroundColor: '#020503', border: '1px solid var(--border)', color: 'white', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            ))}

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'bold', letterSpacing: '1px', display: 'block', marginBottom: '8px' }}>FEATURES (one per line)</label>
              <textarea
                rows={4}
                value={editingPlan.features?.join('\n') || ''}
                onChange={e => setEditingPlan({ ...editingPlan, features: e.target.value.split('\n').filter(Boolean) })}
                style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', backgroundColor: '#020503', border: '1px solid var(--border)', color: 'white', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'bold', letterSpacing: '1px', display: 'block', marginBottom: '8px' }}>GRADIENTS (comma separated hex codes)</label>
              <input
                type="text"
                value={editingPlan.gradient?.join(', ') || ''}
                onChange={e => setEditingPlan({ ...editingPlan, gradient: e.target.value.split(',').map(s => s.trim()) })}
                placeholder="#D4A843, #E5C27C"
                style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', backgroundColor: '#020503', border: '1px solid var(--border)', color: 'white', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'bold', letterSpacing: '1px', display: 'block', marginBottom: '8px' }}>STATUS</label>
                <select
                  value={editingPlan.status}
                  onChange={e => setEditingPlan({ ...editingPlan, status: e.target.value as any })}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', backgroundColor: '#020503', border: '1px solid var(--border)', color: 'white', outline: 'none' }}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'bold', letterSpacing: '1px', display: 'block', marginBottom: '8px' }}>POPULAR BADGE</label>
                <button
                  onClick={() => setEditingPlan({ ...editingPlan, popular: !editingPlan.popular })}
                  style={{
                    padding: '12px 16px', borderRadius: '10px',
                    backgroundColor: editingPlan.popular ? 'rgba(212,168,67,0.1)' : '#020503',
                    border: `1px solid ${editingPlan.popular ? 'var(--primary)' : 'var(--border)'}`,
                    color: editingPlan.popular ? 'var(--primary)' : 'var(--text-muted)',
                    cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem'
                  }}
                >
                  {editingPlan.popular ? '⭐ POPULAR ON' : 'OFF'}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
              <button
                onClick={() => handleSavePlan(editingPlan)}
                disabled={saving === editingPlan.id}
                className="btn-primary"
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                {saving === editingPlan.id 
                  ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> SAVING...</>
                  : <><Save size={16} /> SAVE TO FIRESTORE</>
                }
              </button>
              <button
                onClick={() => handleDeletePlan(editingPlan.id)}
                style={{ padding: '12px 20px', borderRadius: '8px', border: '1px solid #FF6B6B', color: '#FF6B6B', backgroundColor: 'transparent', cursor: 'pointer', fontWeight: 'bold' }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BANNER MANAGEMENT */}
      <div className="card glass" style={{ padding: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '25px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <Smartphone size={20} color="var(--primary)" />
              <h3 style={{ margin: 0 }}>App Banner Management</h3>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>Control promotional banners visible on the devotee home screen.</p>
          </div>
          <button onClick={handleAddBanner} className="btn-primary" style={{ fontSize: '0.75rem', padding: '10px 16px' }}>
             <Plus size={14} /> ADD BANNER
          </button>
        </div>

        {banners.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            No banners configured. Change syncing for dynamic updates.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {banners.map(banner => (
              <div key={banner.id} style={{ padding: '20px', border: '1px solid var(--border)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                  <img src={banner.image} style={{ width: '80px', height: '50px', borderRadius: '8px', objectFit: 'cover' }} alt="Banner" />
                  <div>
                    <p style={{ color: 'white', fontWeight: 'bold', marginBottom: '4px' }}>{banner.title}</p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{banner.subtitle}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => handleToggleBanner(banner)}
                      style={{
                        padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold',
                        border: 'none', cursor: 'pointer', fontSize: '0.8rem',
                        backgroundColor: banner.active ? 'rgba(74,222,128,0.1)' : 'rgba(255,107,107,0.1)',
                        color: banner.active ? '#4ADE80' : '#FF6B6B'
                      }}
                    >
                      {banner.active ? 'ACTIVE' : 'INACTIVE'}
                    </button>
                    <button
                        onClick={() => setEditingBanner({ ...banner })}
                        style={{ padding: '8px', borderRadius: '8px', border: '1px solid var(--border)', color: 'var(--text-muted)', background: 'transparent', cursor: 'pointer' }}
                    >
                        <Edit3 size={16} />
                    </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* BANNER EDIT MODAL */}
      {editingBanner && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)',
          zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div className="card glass" style={{ width: '100%', maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
              <h2 style={{ fontSize: '1.2rem' }}>{editingBanner.id.startsWith('new_') ? 'Add New Banner' : 'Edit Banner'}</h2>
              <button onClick={() => setEditingBanner(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.5rem' }}>×</button>
            </div>

            {[
              { label: 'TITLE', key: 'title', type: 'text' },
              { label: 'SUBTITLE', key: 'subtitle', type: 'text' },
              { label: 'IMAGE URL', key: 'image', type: 'text' },
            ].map(({ label, key, type }) => (
              <div key={key} style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'bold', letterSpacing: '1px', display: 'block', marginBottom: '8px' }}>{label}</label>
                <input
                  type={type}
                  value={(editingBanner as any)[key] || ''}
                  onChange={e => setEditingBanner({ ...editingBanner, [key]: e.target.value })}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', backgroundColor: '#020503', border: '1px solid var(--border)', color: 'white', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            ))}

            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button
                onClick={() => handleSaveBanner(editingBanner)}
                disabled={saving === editingBanner.id}
                className="btn-primary"
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                {saving === editingBanner.id ? 'SAVING...' : 'SAVE BANNER'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes slideIn { from { transform: translateY(-10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  );
}
