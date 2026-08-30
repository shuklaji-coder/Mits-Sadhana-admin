"use client";
import { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/firebase';
import {
  collection, onSnapshot, doc, setDoc, getDoc, getDocs,
  serverTimestamp, addDoc, updateDoc, query, orderBy
} from 'firebase/firestore';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import {
  MapPin, Plus, Edit2, TrendingUp, AlertTriangle, CheckCircle,
  Upload, Search, X, ChevronDown, ChevronUp, Save, Tag, Package,
  Repeat, BarChart2, Loader2
} from 'lucide-react';

// ████████████████████████████████████████
// TYPES
// ████████████████████████████████████████

interface PincodeZone {
  pincode: string;
  zoneName: string;
  city: string;
  procurementCost: { marigold: number; rose: number; lotus: number; garland: number; tulsi: number };
  sellingPrice: { marigold: number; rose: number; lotus: number; garland: number; tulsi: number };
  priceMultiplier: number;
  deliveryCharge: number;
  expressCharge: number;
  isServiceable: boolean;
  subscriptionPrices: { s1: number; s2: number; s3: number; s4: number };
  updatedAt?: any;
  updatedBy?: string;
}

interface Product {
  id: string;
  name: string;
  basePrice: number;
  procurementCost?: Record<string, number>;
  pincodeOverrides?: Record<string, number>;
}

const PLAN_LABELS: Record<string, string> = {
  s1: 'Daily Puja Basic (₹299)',
  s2: 'Daily + Nimbu Mirchi (₹329)',
  s3: 'Premium Devotion (₹599)',
  s4: 'Premium + Nimbu (₹629)',
};

const DEFAULT_SUB_PRICES = { s1: 299, s2: 329, s3: 599, s4: 629 };

const FLOWER_ITEMS = ['marigold', 'rose', 'lotus', 'garland', 'tulsi'] as const;

const TABS = [
  { id: 'zones', label: '📍 Pincode Zones', Icon: MapPin },
  { id: 'products', label: '📦 Products', Icon: Package },
  { id: 'subscriptions', label: '🔄 Subscriptions', Icon: Repeat },
  { id: 'margins', label: '📊 Margins', Icon: BarChart2 },
];

// ████████████████████████████████████████
// HELPERS
// ████████████████████████████████████████

const calcMargin = (buy: number, sell: number) => {
  if (!sell) return { amount: 0, pct: 0, color: '#FF6B6B', label: 'N/A' };
  const amount = sell - buy;
  const pct = (amount / sell) * 100;
  return {
    amount,
    pct: parseFloat(pct.toFixed(1)),
    color: pct > 25 ? '#4ADE80' : pct > 15 ? '#FBBF24' : '#FF6B6B',
    label: pct > 25 ? 'Excellent' : pct > 15 ? 'Good' : 'Low',
  };
};

// ████████████████████████████████████████
// ZONE MODAL
// ████████████████████████████████████████

function ZoneModal({ zone, onClose, onSaved }: { zone: Partial<PincodeZone> | null; onClose: () => void; onSaved: () => void }) {
  const isNew = !zone?.zoneName;
  const [form, setForm] = useState<Partial<PincodeZone>>(
    zone ?? {
      pincode: '',
      zoneName: '',
      city: 'Mumbai',
      procurementCost: { marigold: 8, rose: 15, lotus: 25, garland: 8, tulsi: 5 },
      sellingPrice: { marigold: 10, rose: 20, lotus: 35, garland: 12, tulsi: 8 },
      priceMultiplier: 1.0,
      deliveryCharge: 19,
      expressCharge: 59,
      isServiceable: true,
      subscriptionPrices: { s1: 299, s2: 329, s3: 599, s4: 629 },
    }
  );
  const [saving, setSaving] = useState(false);
  const [overrideSubs, setOverrideSubs] = useState(!!(zone?.subscriptionPrices));

  const setProc = (key: string, val: string) =>
    setForm(f => ({ ...f, procurementCost: { ...(f.procurementCost as any), [key]: parseFloat(val) || 0 } }));

  const setSell = (key: string, val: string) =>
    setForm(f => ({ ...f, sellingPrice: { ...(f.sellingPrice as any), [key]: parseFloat(val) || 0 } }));

  const setSub = (key: string, val: string) =>
    setForm(f => ({ ...f, subscriptionPrices: { ...(f.subscriptionPrices as any), [key]: parseInt(val) || 0 } }));

  const marigoldMargin = calcMargin(
    (form.procurementCost as any)?.marigold ?? 0,
    (form.sellingPrice as any)?.marigold ?? 0
  );

  const save = async () => {
    if (!form.pincode) return alert('Pincode is required');
    setSaving(true);
    try {
      const oldSnap = await getDoc(doc(db, 'pincodeZones', form.pincode!));
      await setDoc(doc(db, 'pincodeZones', form.pincode!), {
        ...form,
        updatedAt: serverTimestamp(),
        updatedBy: 'admin',
      }, { merge: true });

      // Audit log — shared 'priceAudit' collection (synced with the mobile app schema)
      if (oldSnap.exists()) {
        const old = oldSnap.data();
        const changedFields: Record<string, { old: any; new: any }> = {};
        for (const key of ['subscriptionPrices', 'priceMultiplier', 'deliveryCharge', 'expressCharge', 'procurementCost', 'sellingPrice', 'isServiceable']) {
          const oldVal = old[key];
          const newVal = (form as any)[key];
          if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) changedFields[key] = { old: oldVal, new: newVal };
        }
        if (Object.keys(changedFields).length > 0) {
          await addDoc(collection(db, 'priceAudit'), {
            pincode: form.pincode,
            action: 'updated',
            changedFields,
            timestamp: serverTimestamp(),
            changedBy: 'admin',
            changedByName: 'Admin',
          });
        }
      }
      onSaved();
      onClose();
    } catch (e) {
      console.error(e);
      alert('Error saving zone');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
      <div style={{ backgroundColor: '#0A130E', border: '1px solid var(--border)', borderRadius: '20px', width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', padding: '32px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
          <h2 style={{ fontSize: '1.5rem', margin: 0 }}>{isNew ? '➕ Add Pincode Zone' : `✏️ Edit Zone — ${form.pincode}`}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={24} /></button>
        </div>

        {/* Basic Info */}
        <SectionLabel label="BASIC INFORMATION" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          <Field label="Pincode *" value={form.pincode} onChange={v => setForm(f => ({ ...f, pincode: v }))} disabled={!isNew} type="text" />
          <Field label="Zone Name *" value={form.zoneName} onChange={v => setForm(f => ({ ...f, zoneName: v }))} />
          <Field label="City" value={form.city} onChange={v => setForm(f => ({ ...f, city: v }))} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 'bold' }}>SERVICEABLE?</span>
          <div
            onClick={() => setForm(f => ({ ...f, isServiceable: !f.isServiceable }))}
            style={{ width: '52px', height: '28px', borderRadius: '14px', backgroundColor: form.isServiceable ? 'var(--primary)' : '#333', cursor: 'pointer', position: 'relative', transition: 'background 0.3s' }}
          >
            <div style={{ position: 'absolute', top: '4px', left: form.isServiceable ? '26px' : '4px', width: '20px', height: '20px', borderRadius: '10px', backgroundColor: 'white', transition: 'left 0.3s' }} />
          </div>
          <span style={{ color: form.isServiceable ? '#4ADE80' : '#FF6B6B', fontWeight: 'bold', fontSize: '0.85rem' }}>{form.isServiceable ? 'YES ✓' : 'NO ✗'}</span>
        </div>

        {/* Procurement + Selling Prices */}
        <SectionLabel label="PROCUREMENT VS SELLING PRICES" />
        <div style={{ backgroundColor: 'rgba(212,168,67,0.03)', border: '1px solid rgba(212,168,67,0.1)', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '100px 120px 120px 100px', gap: '8px', marginBottom: '10px' }}>
            <span style={thStyle}>Flower</span><span style={thStyle}>Buy (₹)</span><span style={thStyle}>Sell (₹)</span><span style={thStyle}>Margin</span>
          </div>
          {FLOWER_ITEMS.map(item => {
            const buy = (form.procurementCost as any)?.[item] ?? 0;
            const sell = (form.sellingPrice as any)?.[item] ?? 0;
            const m = calcMargin(buy, sell);
            return (
              <div key={item} style={{ display: 'grid', gridTemplateColumns: '100px 120px 120px 100px', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                <span style={{ textTransform: 'capitalize', fontSize: '0.85rem', color: '#E6EFEA' }}>{item}</span>
                <input type="number" value={(form.procurementCost as any)?.[item] ?? ''} onChange={e => setProc(item, e.target.value)} style={inputSm} />
                <input type="number" value={(form.sellingPrice as any)?.[item] ?? ''} onChange={e => setSell(item, e.target.value)} style={inputSm} />
                <span style={{ fontSize: '0.8rem', color: m.color, fontWeight: 'bold' }}>₹{m.amount} ({m.pct}%)</span>
              </div>
            );
          })}
          <div style={{ marginTop: '14px', padding: '12px', backgroundColor: `${marigoldMargin.color}15`, borderRadius: '8px', display: 'flex', gap: '16px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Marigold Margin:</span>
            <strong style={{ color: marigoldMargin.color }}>₹{marigoldMargin.amount} ({marigoldMargin.pct}%) — {marigoldMargin.label}</strong>
          </div>
        </div>

        {/* Delivery & Multiplier */}
        <SectionLabel label="DELIVERY & PRICE MULTIPLIER" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          <Field label="Delivery Charge (₹)" value={String(form.deliveryCharge ?? 19)} onChange={v => setForm(f => ({ ...f, deliveryCharge: parseFloat(v) || 0 }))} type="number" />
          <Field label="Express Charge (₹)" value={String(form.expressCharge ?? 59)} onChange={v => setForm(f => ({ ...f, expressCharge: parseFloat(v) || 0 }))} type="number" />
          <Field label="Price Multiplier (x)" value={String(form.priceMultiplier ?? 1)} onChange={v => setForm(f => ({ ...f, priceMultiplier: parseFloat(v) || 1 }))} type="number" />
        </div>
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>0.8x (Cheaper)</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 'bold' }}>{form.priceMultiplier ?? 1}x</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>2.0x (Expensive)</span>
          </div>
          <input type="range" min="0.8" max="2.0" step="0.05" value={form.priceMultiplier ?? 1}
            onChange={e => setForm(f => ({ ...f, priceMultiplier: parseFloat(e.target.value) }))}
            style={{ width: '100%', accentColor: 'var(--primary)' }} />
        </div>

        {/* Subscription Overrides */}
        <SectionLabel label="SUBSCRIPTION PRICE OVERRIDES" />
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div onClick={() => setOverrideSubs(!overrideSubs)} style={{ width: '52px', height: '28px', borderRadius: '14px', backgroundColor: overrideSubs ? 'var(--primary)' : '#333', cursor: 'pointer', position: 'relative', transition: 'background 0.3s' }}>
            <div style={{ position: 'absolute', top: '4px', left: overrideSubs ? '26px' : '4px', width: '20px', height: '20px', borderRadius: '10px', backgroundColor: 'white', transition: 'left 0.3s' }} />
          </div>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Override subscription prices for this pincode</span>
        </div>
        {overrideSubs && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            {Object.entries(PLAN_LABELS).map(([key, label]) => (
              <div key={key}>
                <label style={labelStyle}>{label}</label>
                <input type="number" placeholder={`Default: ₹${DEFAULT_SUB_PRICES[key as keyof typeof DEFAULT_SUB_PRICES]}`}
                  value={(form.subscriptionPrices as any)?.[key] ?? ''}
                  onChange={e => setSub(key, e.target.value)}
                  style={inputStyle} />
              </div>
            ))}
          </div>
        )}

        {/* Save */}
        <button onClick={save} disabled={saving} style={{ ...primaryBtn, width: '100%', padding: '16px', fontSize: '1rem', opacity: saving ? 0.7 : 1 }}>
          {saving ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={18} />}
          {saving ? '  Saving...' : '  SAVE ZONE PRICING'}
        </button>
      </div>
    </div>
  );
}

// ████████████████████████████████████████
// MAIN PAGE
// ████████████████████████████████████████

export default function PricingPage() {
  const [activeTab, setActiveTab] = useState('zones');
  const [zones, setZones] = useState<PincodeZone[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchZone, setSearchZone] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editZone, setEditZone] = useState<Partial<PincodeZone> | null>(null);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [csvLoading, setCsvLoading] = useState(false);
  const csvRef = useRef<HTMLInputElement>(null);

  // Product override form state
  const [overrideForm, setOverrideForm] = useState<{ pincode: string; price: string; buy: string }>({ pincode: '', price: '', buy: '' });
  const [savingOverride, setSavingOverride] = useState(false);

  useEffect(() => {
    const unsubZones = onSnapshot(collection(db, 'pincodeZones'), snap => {
      setZones(snap.docs.map(d => ({ pincode: d.id, ...d.data() } as PincodeZone)));
      setLoading(false);
    });
    const unsubProducts = onSnapshot(collection(db, 'products'), snap => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
    });
    return () => { unsubZones(); unsubProducts(); };
  }, []);

  const filteredZones = zones.filter(z =>
    z.pincode?.includes(searchZone) || z.zoneName?.toLowerCase().includes(searchZone.toLowerCase()) || z.city?.toLowerCase().includes(searchZone.toLowerCase())
  );

  // Margin analytics data
  const marginData = zones.map(z => {
    const buy = z.procurementCost?.marigold ?? 8;
    const sell = z.sellingPrice?.marigold ?? 10;
    const m = calcMargin(buy, sell);
    return { name: z.pincode, zone: z.zoneName, margin: m.pct, color: m.color };
  }).sort((a, b) => b.margin - a.margin);

  const avgMargin = marginData.length ? (marginData.reduce((s, d) => s + d.margin, 0) / marginData.length).toFixed(1) : '0';

  // Bulk CSV Import
  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvLoading(true);
    const text = await file.text();
    const rows = text.trim().split('\n').slice(1); // skip header
    let count = 0;
    for (const row of rows) {
      const cols = row.split(',').map(c => c.trim());
      if (cols.length < 4) continue;
      const [pincode, zoneName, city, buy, sell, s1, s2, s3, s4] = cols;
      if (!pincode || !zoneName) continue;
      await setDoc(doc(db, 'pincodeZones', pincode), {
        zoneName, city: city || 'Mumbai',
        procurementCost: { marigold: parseFloat(buy) || 8, rose: 15, lotus: 25, garland: 8, tulsi: 5 },
        sellingPrice: { marigold: parseFloat(sell) || 10, rose: 20, lotus: 35, garland: 12, tulsi: 8 },
        priceMultiplier: 1.0,
        deliveryCharge: 19, expressCharge: 59, isServiceable: true,
        subscriptionPrices: { s1: parseInt(s1) || 299, s2: parseInt(s2) || 329, s3: parseInt(s3) || 599, s4: parseInt(s4) || 629 },
        updatedAt: serverTimestamp(), updatedBy: 'admin_csv_import',
      }, { merge: true });
      count++;
    }
    alert(`✅ Imported ${count} zones!`);
    setCsvLoading(false);
    if (csvRef.current) csvRef.current.value = '';
  };

  // Add product pincode override
  const saveProductOverride = async (productId: string) => {
    if (!overrideForm.pincode || !overrideForm.price) return alert('Pincode and price required');
    setSavingOverride(true);
    try {
      await updateDoc(doc(db, 'products', productId), {
        [`pincodeOverrides.${overrideForm.pincode}`]: parseInt(overrideForm.price),
        [`procurementCost.${overrideForm.pincode}`]: parseInt(overrideForm.buy) || 0,
      });
      setOverrideForm({ pincode: '', price: '', buy: '' });
    } catch (e) { alert('Error saving override'); }
    finally { setSavingOverride(false); }
  };

  // Save subscription override for a pincode
  const saveSubOverride = async (planId: string, pincode: string, price: string) => {
    if (!pincode || !price) return;
    await setDoc(doc(db, 'pincodeZones', pincode), {
      subscriptionPrices: { [planId]: parseInt(price) || 0 },
      updatedAt: serverTimestamp(),
    }, { merge: true });
  };

  return (
    <div style={{ maxWidth: '1300px', margin: '0 auto', paddingBottom: '100px' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '36px' }}>
        <div>
          <h1 style={{ fontSize: '2.4rem', fontWeight: 900, letterSpacing: '-1px', marginBottom: '6px' }}>💰 Dynamic Pricing</h1>
          <p style={{ color: 'var(--text-muted)' }}>Set prices per pincode/zone — keep margins consistent everywhere.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* CSV Import */}
          <input ref={csvRef} type="file" accept=".csv" onChange={handleCsvUpload} style={{ display: 'none' }} />
          <button onClick={() => csvRef.current?.click()} disabled={csvLoading} style={{ ...ghostBtn }}>
            {csvLoading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={16} />}
            {csvLoading ? ' Importing...' : ' Bulk CSV Import'}
          </button>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', maxWidth: '200px', lineHeight: 1.4 }}>
            Format: Pincode,Zone,City,Buy,Sell,s1,s2,s3,s4
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: '4px', backgroundColor: 'rgba(255,255,255,0.03)', padding: '6px', borderRadius: '16px', border: '1px solid var(--border)', marginBottom: '32px', width: 'fit-content' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{ padding: '12px 24px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 800, letterSpacing: '0.5px', transition: 'all 0.2s',
              backgroundColor: activeTab === t.id ? 'var(--primary)' : 'transparent',
              color: activeTab === t.id ? '#0A130E' : 'var(--text-muted)' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* TAB 1: PINCODE ZONES                  */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {activeTab === 'zones' && (
        <div>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '28px', alignItems: 'center' }}>
            <div style={{ flex: 1, position: 'relative', maxWidth: '380px' }}>
              <Search style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} size={16} color="var(--text-muted)" />
              <input type="text" placeholder="Search pincode, zone, city..." value={searchZone} onChange={e => setSearchZone(e.target.value)}
                style={{ ...inputStyle, paddingLeft: '42px' }} />
            </div>
            <button onClick={() => { setEditZone(null); setShowModal(true); }} style={primaryBtn}>
              <Plus size={16} /> Add Zone
            </button>
          </div>

          {loading ? <Spinner /> : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '20px' }}>
              {filteredZones.length === 0 && <p style={{ color: 'var(--text-muted)', gridColumn: '1/-1', textAlign: 'center', padding: '60px' }}>No zones yet. Add your first pincode zone!</p>}
              {filteredZones.map(zone => {
                const m = calcMargin(zone.procurementCost?.marigold ?? 8, zone.sellingPrice?.marigold ?? 10);
                return (
                  <div key={zone.pincode} className="card" style={{ borderLeft: `4px solid ${m.color}`, position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                      <div>
                        <h3 style={{ fontSize: '1.2rem', margin: '0 0 4px 0' }}>📍 {zone.pincode}</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{zone.zoneName} · {zone.city}</p>
                      </div>
                      <span style={{ fontSize: '0.7rem', padding: '4px 10px', borderRadius: '20px', fontWeight: 900,
                        backgroundColor: zone.isServiceable ? 'rgba(74,222,128,0.1)' : 'rgba(255,107,107,0.1)',
                        color: zone.isServiceable ? '#4ADE80' : '#FF6B6B', border: `1px solid ${zone.isServiceable ? '#4ADE80' : '#FF6B6B'}40` }}>
                        {zone.isServiceable ? '✅ Active' : '❌ Disabled'}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                      <KpiBox label="Buy (Marigold)" value={`₹${zone.procurementCost?.marigold ?? '?'}/unit`} />
                      <KpiBox label="Sell (Marigold)" value={`₹${zone.sellingPrice?.marigold ?? '?'}/unit`} />
                      <KpiBox label="Margin" value={`₹${m.amount} (${m.pct}%)`} valueColor={m.color} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                      <KpiBox label="Multiplier" value={`${zone.priceMultiplier ?? 1}x`} />
                      <KpiBox label="Delivery" value={`₹${zone.deliveryCharge ?? 19}`} />
                      <KpiBox label="Express" value={`₹${zone.expressCharge ?? 59}`} />
                    </div>

                    {/* Sub prices */}
                    <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '8px', padding: '10px', marginBottom: '16px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      <strong style={{ color: 'var(--primary)', display: 'block', marginBottom: '6px', fontSize: '0.7rem' }}>SUBSCRIPTION PRICES</strong>
                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        {Object.entries(PLAN_LABELS).map(([k, label]) => (
                          <span key={k}>
                            <span style={{ color: '#999', fontSize: '0.7rem' }}>{k.toUpperCase()}: </span>
                            <strong style={{ color: '#E6EFEA' }}>₹{(zone.subscriptionPrices as any)?.[k] ?? DEFAULT_SUB_PRICES[k as keyof typeof DEFAULT_SUB_PRICES]}</strong>
                          </span>
                        ))}
                      </div>
                    </div>

                    <button onClick={() => { setEditZone(zone); setShowModal(true); }} style={{ ...ghostBtn, width: '100%', justifyContent: 'center' }}>
                      <Edit2 size={14} /> Edit Pricing
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* TAB 2: PRODUCTS PRICING                */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {activeTab === 'products' && (
        <div>
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '6px' }}>📦 Product Pricing</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Set pincode-specific sell prices and procurement costs per product.</p>
          </div>
          {products.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
              No products found in Firestore. Add products first via the Inventory section.
            </div>
          ) : products.map(product => {
            const overrideCount = Object.keys(product.pincodeOverrides ?? {}).length;
            const isExpanded = expandedProduct === product.id;
            return (
              <div key={product.id} className="card" style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setExpandedProduct(isExpanded ? null : product.id)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(212,168,67,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>🌸</div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{product.name}</h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0 }}>Base Price: ₹{product.basePrice}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{ fontSize: '0.75rem', padding: '5px 12px', borderRadius: '20px', backgroundColor: overrideCount > 0 ? 'rgba(212,168,67,0.1)' : 'rgba(255,255,255,0.05)', color: overrideCount > 0 ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 900 }}>
                      {overrideCount} pincode override{overrideCount !== 1 ? 's' : ''}
                    </span>
                    {isExpanded ? <ChevronUp size={18} color="var(--text-muted)" /> : <ChevronDown size={18} color="var(--text-muted)" />}
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                    {/* Table */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                          {['Pincode', 'Buy Price', 'Sell Price', 'Margin'].map(h => <th key={h} style={tableThStyle}>{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={tableRowStyle}>
                          <td style={tableTdStyle}>Default</td>
                          <td style={tableTdStyle}>—</td>
                          <td style={tableTdStyle}><strong style={{ color: 'var(--primary)' }}>₹{product.basePrice}</strong></td>
                          <td style={tableTdStyle}>—</td>
                        </tr>
                        {Object.entries(product.pincodeOverrides ?? {}).map(([pin, sellPrice]) => {
                          const buy = (product.procurementCost as any)?.[pin] ?? 0;
                          const m = calcMargin(buy, sellPrice as number);
                          return (
                            <tr key={pin} style={tableRowStyle}>
                              <td style={tableTdStyle}>{pin}</td>
                              <td style={tableTdStyle}>{buy ? `₹${buy}` : '—'}</td>
                              <td style={tableTdStyle}><strong style={{ color: 'var(--primary)' }}>₹{sellPrice as number}</strong></td>
                              <td style={tableTdStyle}><span style={{ color: m.color, fontWeight: 'bold' }}>₹{m.amount} ({m.pct}%)</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {/* Add Override */}
                    <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '12px', padding: '16px' }}>
                      <p style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 900, marginBottom: '12px' }}>➕ ADD / UPDATE PINCODE OVERRIDE</p>
                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                        <div>
                          <label style={labelStyle}>Pincode</label>
                          <input type="text" value={overrideForm.pincode} onChange={e => setOverrideForm(f => ({ ...f, pincode: e.target.value }))} style={{ ...inputSm, width: '120px' }} placeholder="401209" />
                        </div>
                        <div>
                          <label style={labelStyle}>Buy Price (₹)</label>
                          <input type="number" value={overrideForm.buy} onChange={e => setOverrideForm(f => ({ ...f, buy: e.target.value }))} style={{ ...inputSm, width: '120px' }} placeholder="8" />
                        </div>
                        <div>
                          <label style={labelStyle}>Sell Price (₹)</label>
                          <input type="number" value={overrideForm.price} onChange={e => setOverrideForm(f => ({ ...f, price: e.target.value }))} style={{ ...inputSm, width: '120px' }} placeholder="29" />
                        </div>
                        {overrideForm.price && overrideForm.buy && (
                          <div style={{ fontSize: '0.8rem', color: calcMargin(parseFloat(overrideForm.buy), parseFloat(overrideForm.price)).color, fontWeight: 'bold', paddingBottom: '10px' }}>
                            Margin: ₹{calcMargin(parseFloat(overrideForm.buy), parseFloat(overrideForm.price)).amount} ({calcMargin(parseFloat(overrideForm.buy), parseFloat(overrideForm.price)).pct}%)
                          </div>
                        )}
                        <button onClick={() => saveProductOverride(product.id)} disabled={savingOverride} style={{ ...primaryBtn, paddingBottom: '10px' }}>
                          <Save size={14} /> Save Override
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* TAB 3: SUBSCRIPTION PRICING            */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {activeTab === 'subscriptions' && (
        <div>
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '6px' }}>🔄 Subscription Pricing per Pincode</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Manage per-plan, per-pincode prices. Overrides are stored in each zone's document.</p>
          </div>

          {Object.entries(PLAN_LABELS).map(([planId, planLabel]) => {
            const defaultPrice = DEFAULT_SUB_PRICES[planId as keyof typeof DEFAULT_SUB_PRICES];
            const isExpanded = expandedPlan === planId;
            const zonesWithOverride = zones.filter(z => (z.subscriptionPrices as any)?.[planId] && (z.subscriptionPrices as any)?.[planId] !== defaultPrice);

            return (
              <div key={planId} className="card" style={{ marginBottom: '16px', borderLeft: '4px solid var(--primary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setExpandedPlan(isExpanded ? null : planId)}>
                  <div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem' }}>🌸 {planLabel}</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0 }}>Default: <strong style={{ color: 'var(--primary)' }}>₹{defaultPrice}/month</strong> · {zonesWithOverride.length} zone override{zonesWithOverride.length !== 1 ? 's' : ''}</p>
                  </div>
                  {isExpanded ? <ChevronUp size={18} color="var(--text-muted)" /> : <ChevronDown size={18} color="var(--text-muted)" />}
                </div>

                {isExpanded && (
                  <div style={{ marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                          {['Pincode', 'Zone', 'Price', 'vs Default', 'Update'].map(h => <th key={h} style={tableThStyle}>{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {zones.length === 0 && (
                          <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>No zones configured yet</td></tr>
                        )}
                        {zones.map(zone => {
                          const currentPrice = (zone.subscriptionPrices as any)?.[planId] ?? defaultPrice;
                          const diff = currentPrice - defaultPrice;
                          return (
                            <tr key={zone.pincode} style={tableRowStyle}>
                              <td style={tableTdStyle}><strong>{zone.pincode}</strong></td>
                              <td style={tableTdStyle}>{zone.zoneName}</td>
                              <td style={tableTdStyle}><strong style={{ color: 'var(--primary)' }}>₹{currentPrice}</strong></td>
                              <td style={tableTdStyle}>
                                <span style={{ color: diff > 0 ? '#FF6B6B' : diff < 0 ? '#4ADE80' : 'var(--text-muted)', fontWeight: 'bold', fontSize: '0.8rem' }}>
                                  {diff > 0 ? `+₹${diff}` : diff < 0 ? `-₹${Math.abs(diff)}` : 'Default'}
                                </span>
                              </td>
                              <td style={tableTdStyle}>
                                <SubPriceInlineEdit planId={planId} pincode={zone.pincode} currentPrice={currentPrice} onSave={saveSubOverride} />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* TAB 4: MARGIN ANALYTICS                */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {activeTab === 'margins' && (
        <div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '24px' }}>💹 Margin Dashboard</h2>

          {/* Summary KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px', marginBottom: '32px' }}>
            <div className="card glass" style={{ textAlign: 'center' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 900, marginBottom: '8px' }}>AVERAGE MARGIN</p>
              <h2 style={{ fontSize: '2rem', margin: 0 }}>{avgMargin}%</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px' }}>Across {zones.length} zones (marigold)</p>
            </div>
            <div className="card glass" style={{ textAlign: 'center' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 900, marginBottom: '8px' }}>BEST PINCODE</p>
              <h2 style={{ fontSize: '1.6rem', margin: 0, color: '#4ADE80' }}>{marginData[0]?.name ?? '—'}</h2>
              <p style={{ color: '#4ADE80', fontSize: '0.8rem', marginTop: '4px' }}>{marginData[0]?.zone} · {marginData[0]?.margin}%</p>
            </div>
            <div className="card glass" style={{ textAlign: 'center' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 900, marginBottom: '8px' }}>WORST PINCODE</p>
              <h2 style={{ fontSize: '1.6rem', margin: 0, color: '#FF6B6B' }}>{marginData[marginData.length - 1]?.name ?? '—'}</h2>
              <p style={{ color: '#FF6B6B', fontSize: '0.8rem', marginTop: '4px' }}>{marginData[marginData.length - 1]?.zone} · {marginData[marginData.length - 1]?.margin}%</p>
            </div>
            <div className="card glass" style={{ textAlign: 'center' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 900, marginBottom: '8px' }}>ZONES BELOW 15%</p>
              <h2 style={{ fontSize: '2rem', margin: 0, color: marginData.filter(d => d.margin < 15).length > 0 ? '#FF6B6B' : '#4ADE80' }}>
                {marginData.filter(d => d.margin < 15).length}
              </h2>
            </div>
          </div>

          {/* Bar Chart */}
          {marginData.length > 0 && (
            <div className="card" style={{ marginBottom: '32px' }}>
              <h3 style={{ marginBottom: '20px', fontSize: '1rem' }}>📊 Margin % per Pincode Zone (Marigold)</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={marginData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" stroke="#496554" fontSize={12} tickLine={false} />
                  <YAxis stroke="#496554" fontSize={12} tickLine={false} unit="%" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0A130E', border: '1px solid var(--border)', borderRadius: '8px' }}
                    formatter={(v: any) => [`${v}%`, 'Margin']}
                    labelFormatter={(l) => {
                      const zone = marginData.find(d => d.name === l);
                      return `${l} — ${zone?.zone ?? ''}`;
                    }}
                  />
                  <Bar dataKey="margin" radius={[6, 6, 0, 0]}>
                    {marginData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', gap: '20px', marginTop: '12px', justifyContent: 'center' }}>
                {[{ color: '#4ADE80', label: '> 25% Excellent' }, { color: '#FBBF24', label: '15–25% Good' }, { color: '#FF6B6B', label: '< 15% Low' }].map(l => (
                  <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: l.color }} />
                    {l.label}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Alert Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
            {marginData.filter(d => d.margin < 15).map(d => (
              <div key={d.name} className="card" style={{ borderLeft: '4px solid #FF6B6B', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <AlertTriangle size={22} color="#FF6B6B" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <p style={{ fontWeight: 900, color: '#FF6B6B', marginBottom: '4px' }}>🔴 {d.name} — Margin Too Low!</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Only {d.margin}% margin on marigold in {d.zone}. Consider increasing sell price or price multiplier.</p>
                </div>
              </div>
            ))}
            {marginData.filter(d => d.margin > 25).map(d => (
              <div key={d.name} className="card" style={{ borderLeft: '4px solid #4ADE80', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <CheckCircle size={22} color="#4ADE80" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <p style={{ fontWeight: 900, color: '#4ADE80', marginBottom: '4px' }}>🟢 {d.name} — Excellent Margin!</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{d.margin}% margin in {d.zone}. You can offer a discount or lower subscription price here.</p>
                </div>
              </div>
            ))}
            {marginData.filter(d => d.margin >= 15 && d.margin <= 25).map(d => (
              <div key={d.name} className="card" style={{ borderLeft: '4px solid #FBBF24', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <TrendingUp size={22} color="#FBBF24" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <p style={{ fontWeight: 900, color: '#FBBF24', marginBottom: '4px' }}>🟡 {d.name} — Healthy Margin</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{d.margin}% margin in {d.zone}. On track!</p>
                </div>
              </div>
            ))}
            {marginData.length === 0 && (
              <div className="card" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                No zone data yet. Add pincode zones to see margin analytics.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Zone Modal */}
      {showModal && <ZoneModal zone={editZone} onClose={() => setShowModal(false)} onSaved={() => {}} />}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input[type=range] { cursor: pointer; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
      `}</style>
    </div>
  );
}

// ████████████████████████████████████████
// SUB-COMPONENTS
// ████████████████████████████████████████

function SubPriceInlineEdit({ planId, pincode, currentPrice, onSave }: { planId: string; pincode: string; currentPrice: number; onSave: (planId: string, pincode: string, price: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(currentPrice));
  const [saving, setSaving] = useState(false);
  if (!editing) return (
    <button onClick={() => setEditing(true)} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: '8px', padding: '5px 10px', cursor: 'pointer', fontSize: '0.75rem' }}>
      <Edit2 size={12} style={{ marginRight: '4px' }} />Edit
    </button>
  );
  return (
    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>₹</span>
      <input type="number" value={val} onChange={e => setVal(e.target.value)} style={{ ...inputSm, width: '80px' }} autoFocus />
      <button onClick={async () => { setSaving(true); await onSave(planId, pincode, val); setSaving(false); setEditing(false); }}
        disabled={saving} style={{ ...primaryBtn, padding: '6px 10px', fontSize: '0.75rem' }}>
        {saving ? '...' : '✓'}
      </button>
      <button onClick={() => setEditing(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem' }}>✗</button>
    </div>
  );
}

function KpiBox({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 900, marginBottom: '4px' }}>{label.toUpperCase()}</p>
      <p style={{ color: valueColor ?? '#E6EFEA', fontWeight: 800, fontSize: '0.9rem', margin: 0 }}>{value}</p>
    </div>
  );
}

function SectionLabel({ label }: { label: string }) {
  return <p style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--primary)', letterSpacing: '1.5px', marginBottom: '12px' }}>{label}</p>;
}

function Field({ label, value, onChange, type = 'text', disabled = false }: { label: string; value?: string; onChange: (v: string) => void; type?: string; disabled?: boolean }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input type={type} value={value ?? ''} onChange={e => onChange(e.target.value)} disabled={disabled} style={{ ...inputStyle, opacity: disabled ? 0.5 : 1 }} />
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '80px', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
      <Loader2 size={36} color="var(--primary)" style={{ animation: 'spin 1s linear infinite' }} />
      <p style={{ color: 'var(--text-muted)', letterSpacing: '2px', fontSize: '0.8rem' }}>LOADING PRICING DATA...</p>
    </div>
  );
}

// ████████████████████████████████████████
// STYLE TOKENS
// ████████████████████████████████████████

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 16px', backgroundColor: 'rgba(255,255,255,0.04)',
  border: '1px solid var(--border)', borderRadius: '10px', color: '#E6EFEA',
  fontSize: '0.9rem', outline: 'none',
};
const inputSm: React.CSSProperties = {
  padding: '9px 12px', backgroundColor: 'rgba(255,255,255,0.04)',
  border: '1px solid var(--border)', borderRadius: '8px', color: '#E6EFEA',
  fontSize: '0.85rem', outline: 'none',
};
const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.72rem', fontWeight: 900, color: 'var(--text-muted)', marginBottom: '6px', letterSpacing: '0.5px' };
const primaryBtn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', backgroundColor: 'var(--primary)', color: '#0A130E', border: 'none', borderRadius: '10px', fontWeight: 900, cursor: 'pointer', fontSize: '0.85rem', transition: 'all 0.2s' };
const ghostBtn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 20px', backgroundColor: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem', transition: 'all 0.2s' };
const tableThStyle: React.CSSProperties = { textAlign: 'left', padding: '10px 12px', fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '1px' };
const tableTdStyle: React.CSSProperties = { padding: '12px 12px', fontSize: '0.85rem', color: '#E6EFEA', borderBottom: '1px solid rgba(255,255,255,0.03)' };
const tableRowStyle: React.CSSProperties = {};
const thStyle: React.CSSProperties = { fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '1px' };
