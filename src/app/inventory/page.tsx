"use client";
import { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/firebase';
import {
  collection, doc, updateDoc, addDoc, deleteDoc, onSnapshot, serverTimestamp
} from 'firebase/firestore';
import { Save, Edit3, Plus, Trash2, Loader2, Search, Upload, X, ImageIcon, AlertTriangle, CheckCircle, Package } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  price: number | string;
  oldPrice?: number | string;
  image: string;
  badge?: string;
  description?: string;
  category: string;
  active: boolean;
  stock?: number;
  stockQuantity?: number;
  reservedQuantity?: number;
  lowStockThreshold?: number;
  ingredients?: string;
  isExpress?: boolean;
}

const CATEGORY_OPTIONS = [
  { value: 'FESTIVAL_KIT', label: 'Festival Kit (Popular Kits)' },
  { value: 'OCCASION_KIT', label: 'Occasion Kit (Popular Kits)' },
  { value: 'PUJA KITS', label: 'Puja Kits (Popular Kits)' },
  { value: 'DAILY_USE', label: 'Daily Use Essentials' },
  { value: 'EXPRESS_DELIVERY', label: 'Express Delivery' },
  { value: 'general', label: 'General' },
];

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');
  const [toast, setToast] = useState('');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'products'), (snap) => {
      setProducts(snap.docs.map(d => {
        const data = d.data();
        const rawStock = data.stockQuantity !== undefined ? data.stockQuantity : data.stock;
        return {
          id: d.id,
          ...data,
          name: data.name || data.title || '',
          active: data.active === undefined ? true : data.active,
          stockQuantity: typeof rawStock === 'number' ? rawStock : (parseInt(rawStock, 10) || 0),
          reservedQuantity: typeof data.reservedQuantity === 'number' ? data.reservedQuantity : 0,
          lowStockThreshold: typeof data.lowStockThreshold === 'number' ? data.lowStockThreshold : 5,
        } as Product;
      }));
      setLoading(false);
    });
    return unsub;
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleImageUpload = (file: File) => {
    if (!editingProduct) return;
    setUploadProgress(0);

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX_SIZE = 600;
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > MAX_SIZE) {
          height = Math.round((height * MAX_SIZE) / width);
          width = MAX_SIZE;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);
        const base64 = canvas.toDataURL('image/jpeg', 0.7);
        setEditingProduct(prev => prev ? { ...prev, image: base64 } : null);
        setUploadProgress(null);
        showToast('✅ Image ready! Save karo.');
      };
      img.src = e.target?.result as string;
      setUploadProgress(50);
    };
    reader.onerror = () => {
      showToast('❌ Image load failed.');
      setUploadProgress(null);
    };
    reader.readAsDataURL(file);
  };

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file);
  };

  const handleSave = async (item: Product) => {
    setSaving(item.id);
    try {
      const { id, ...data } = item;
      const stockVal = Number(data.stockQuantity !== undefined ? data.stockQuantity : (data.stock ?? 0));
      const cleanStock = isNaN(stockVal) ? 0 : Math.max(0, stockVal);
      const thresholdVal = Number(data.lowStockThreshold ?? 5);

      const payload = {
        ...data,
        name: data.name.trim(),
        price: Number(data.price) || 0,
        oldPrice: data.oldPrice ? Number(data.oldPrice) : null,
        stockQuantity: cleanStock,
        stock: cleanStock, // Synchronize legacy field
        reservedQuantity: data.reservedQuantity || 0,
        lowStockThreshold: isNaN(thresholdVal) ? 5 : thresholdVal,
        active: data.active === true,
        isAvailable: data.active === true && cleanStock > 0,
        updatedAt: serverTimestamp(),
      };

      if (id.startsWith('new_')) {
        await addDoc(collection(db, 'products'), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        showToast('✅ Product added successfully!');
      } else {
        await updateDoc(doc(db, 'products', id), payload);
        showToast('✅ Product updated successfully!');
      }
      setEditingProduct(null);
    } catch (e) {
      console.error(e);
      showToast('❌ Error saving product.');
    } finally {
      setSaving(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (id.startsWith('new_')) { setEditingProduct(null); return; }
    if (!confirm('Are you sure you want to delete this product?')) return;
    await deleteDoc(doc(db, 'products', id));
    showToast('🗑️ Product deleted.');
  };

  const filtered = products.filter(p => {
    const matchesSearch =
      (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.category || '').toLowerCase().includes(search.toLowerCase());
    
    const stock = p.stockQuantity ?? 0;
    const threshold = p.lowStockThreshold ?? 5;

    if (!matchesSearch) return false;
    if (stockFilter === 'out') return stock <= 0;
    if (stockFilter === 'low') return stock > 0 && stock <= threshold;
    return true;
  });

  const lowStockCount = products.filter(p => (p.stockQuantity ?? 0) > 0 && (p.stockQuantity ?? 0) <= (p.lowStockThreshold ?? 5)).length;
  const outOfStockCount = products.filter(p => (p.stockQuantity ?? 0) <= 0).length;

  return (
    <div style={{ paddingBottom: '100px' }}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFilePick}
      />

      {toast && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px', zIndex: 9999,
          padding: '14px 20px', borderRadius: '12px',
          backgroundColor: '#1A3324', border: '1px solid var(--primary)',
          color: 'white', fontWeight: 'bold', boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
        }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', marginBottom: '6px' }}>Inventory & Stock Manager</h1>
          <p style={{ color: 'var(--text-muted)' }}>Real-time stock controls, atomic reservation monitoring, and low-inventory alerts.</p>
        </div>
        <button
          onClick={() => setEditingProduct({
            id: `new_${Date.now()}`,
            name: '',
            price: 0,
            stockQuantity: 50,
            lowStockThreshold: 5,
            category: 'FESTIVAL_KIT',
            image: '',
            description: '',
            active: true
          })}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 22px' }}
        >
          <Plus size={16} /> ADD PRODUCT
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '280px', position: 'relative' }}>
          <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
          <input
            type="text"
            placeholder="Search products, kits, or categories..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '12px 14px 12px 40px', borderRadius: '12px', backgroundColor: '#0A130E', border: '1px solid var(--border)', color: 'white', outline: 'none' }}
          />
        </div>

        {/* Quick Stock Filters */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setStockFilter('all')}
            style={{
              padding: '10px 16px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer',
              backgroundColor: stockFilter === 'all' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
              color: stockFilter === 'all' ? '#000' : '#FFF', border: '1px solid var(--border)'
            }}
          >
            All ({products.length})
          </button>
          <button
            onClick={() => setStockFilter('low')}
            style={{
              padding: '10px 16px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer',
              backgroundColor: stockFilter === 'low' ? 'rgba(234,179,8,0.2)' : 'rgba(255,255,255,0.05)',
              color: '#EAB308', border: stockFilter === 'low' ? '1px solid #EAB308' : '1px solid var(--border)'
            }}
          >
            Low Stock ({lowStockCount})
          </button>
          <button
            onClick={() => setStockFilter('out')}
            style={{
              padding: '10px 16px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer',
              backgroundColor: stockFilter === 'out' ? 'rgba(255,80,80,0.2)' : 'rgba(255,255,255,0.05)',
              color: '#FF5050', border: stockFilter === 'out' ? '1px solid #FF5050' : '1px solid var(--border)'
            }}
          >
            Out of Stock ({outOfStockCount})
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '100px' }}><Loader2 className="animate-spin" /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {filtered.map(item => {
            const stock = item.stockQuantity ?? 0;
            const threshold = item.lowStockThreshold ?? 5;
            const reserved = item.reservedQuantity ?? 0;
            const isOutOfStock = stock <= 0;
            const isLowStock = !isOutOfStock && stock <= threshold;

            return (
              <div key={item.id} className="card glass" style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {item.image ? (
                  <img src={item.image} style={{ width: '100%', height: '160px', objectFit: 'cover' }} alt={item.name} />
                ) : (
                  <div style={{ width: '100%', height: '160px', backgroundColor: '#0A130E', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    <ImageIcon size={28} opacity={0.3} />
                    No Image
                  </div>
                )}
                
                <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  {/* Title & Status */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                    <h3 style={{ fontSize: '1.05rem', color: 'white', fontWeight: 'bold' }}>{item.name}</h3>
                    <span style={{ fontSize: '0.65rem', backgroundColor: item.active ? 'rgba(72,199,116,0.15)' : 'rgba(255,80,80,0.15)', color: item.active ? '#48C774' : '#FF5050', padding: '3px 8px', borderRadius: '6px', fontWeight: 'bold' }}>
                      {item.active ? 'ACTIVE' : 'HIDDEN'}
                    </span>
                  </div>

                  {/* Category */}
                  <span style={{ fontSize: '0.65rem', backgroundColor: 'rgba(212,168,67,0.1)', color: 'var(--primary)', padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold', display: 'inline-block', marginBottom: '12px', alignSelf: 'flex-start' }}>
                    {item.category}
                  </span>

                  {/* Price */}
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '16px' }}>
                    <span style={{ fontSize: '1.25rem', color: 'white', fontWeight: 'bold' }}>₹{item.price}</span>
                    {item.oldPrice && <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textDecoration: 'line-through' }}>₹{item.oldPrice}</span>}
                  </div>

                  {/* Inventory Stock Indicator Badge */}
                  <div style={{
                    backgroundColor: isOutOfStock ? 'rgba(255,80,80,0.1)' : (isLowStock ? 'rgba(234,179,8,0.1)' : 'rgba(72,199,116,0.1)'),
                    border: `1px solid ${isOutOfStock ? '#FF5050' : (isLowStock ? '#EAB308' : '#48C774')}`,
                    borderRadius: '10px',
                    padding: '8px 12px',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Package size={14} color={isOutOfStock ? '#FF5050' : (isLowStock ? '#EAB308' : '#48C774')} />
                      <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: isOutOfStock ? '#FF5050' : (isLowStock ? '#EAB308' : '#48C774') }}>
                        {isOutOfStock ? 'OUT OF STOCK' : (isLowStock ? `LOW STOCK: ${stock} units` : `IN STOCK: ${stock} units`)}
                      </span>
                    </div>
                    {reserved > 0 && (
                      <span style={{ fontSize: '0.7rem', color: '#EAB308', fontWeight: '600' }}>
                        ({reserved} reserved)
                      </span>
                    )}
                  </div>

                  <div style={{ marginTop: 'auto' }}>
                    <button onClick={() => setEditingProduct(item)} className="btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <Edit3 size={14} /> EDIT & RESTOCK
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit / Add Product Modal */}
      {editingProduct && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card glass" style={{ width: '100%', maxWidth: '540px', maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '1.25rem' }}>{editingProduct.id.startsWith('new_') ? 'Add New Product' : 'Edit Product & Stock'}</h2>
              <button onClick={() => setEditingProduct(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
            </div>

            {/* Product Name */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>PRODUCT NAME</label>
              <input type="text" value={editingProduct.name || ''} onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })}
                placeholder="e.g. Shubh Vivah Special Pooja Kit"
                style={{ width: '100%', padding: '12px', borderRadius: '8px', backgroundColor: '#020503', border: '1px solid var(--border)', color: 'white', outline: 'none' }} />
            </div>

            {/* Stock Quantity (Atomic Inventory Unit Control) */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 'bold' }}>
                  AVAILABLE STOCK QUANTITY (UNITS)
                </label>
                {(editingProduct.reservedQuantity ?? 0) > 0 && (
                  <span style={{ fontSize: '0.75rem', color: '#EAB308', fontWeight: 'bold' }}>
                    🔒 {editingProduct.reservedQuantity} held in active checkout reservations
                  </span>
                )}
              </div>
              <input
                type="number"
                min="0"
                value={editingProduct.stockQuantity !== undefined ? editingProduct.stockQuantity : (editingProduct.stock ?? 0)}
                onChange={e => {
                  const val = parseInt(e.target.value, 10);
                  const clean = isNaN(val) ? 0 : Math.max(0, val);
                  setEditingProduct({
                    ...editingProduct,
                    stockQuantity: clean,
                    stock: clean
                  });
                }}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', backgroundColor: '#020503', border: '1px solid var(--primary)', color: 'white', outline: 'none', fontWeight: 'bold', fontSize: '1rem' }}
              />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                Protected by Firestore atomic transactions. If stock reaches 0, devotees cannot checkout.
              </span>
            </div>

            {/* Price & Old Price */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>PRICE (₹)</label>
                <input type="number" value={editingProduct.price || ''} onChange={e => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', backgroundColor: '#020503', border: '1px solid var(--border)', color: 'white', outline: 'none' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>ORIGINAL PRICE (optional)</label>
                <input type="number" value={editingProduct.oldPrice || ''} onChange={e => setEditingProduct({ ...editingProduct, oldPrice: Number(e.target.value) })}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', backgroundColor: '#020503', border: '1px solid var(--border)', color: 'white', outline: 'none' }} />
              </div>
            </div>

            {/* Category & Low Stock Threshold */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>CATEGORY</label>
                <select value={editingProduct.category || 'FESTIVAL_KIT'} onChange={e => setEditingProduct({ ...editingProduct, category: e.target.value })}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', backgroundColor: '#020503', border: '1px solid var(--border)', color: 'white', outline: 'none' }}>
                  {CATEGORY_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>LOW STOCK ALERT (≤ UNITS)</label>
                <input
                  type="number"
                  min="1"
                  value={editingProduct.lowStockThreshold ?? 5}
                  onChange={e => setEditingProduct({ ...editingProduct, lowStockThreshold: Math.max(1, parseInt(e.target.value, 10) || 5) })}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', backgroundColor: '#020503', border: '1px solid var(--border)', color: 'white', outline: 'none' }}
                />
              </div>
            </div>

            {/* IMAGE SECTION */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>PRODUCT IMAGE</label>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadProgress !== null}
                style={{
                  width: '100%', padding: '12px', borderRadius: '10px',
                  border: '2px dashed var(--primary)', background: 'rgba(212,168,67,0.05)',
                  color: 'var(--primary)', cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', gap: '10px',
                  fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '12px',
                }}
              >
                <Upload size={18} />
                {uploadProgress !== null ? `Uploading... ${uploadProgress}%` : 'Upload Image from Device'}
              </button>

              {uploadProgress !== null && (
                <div style={{ width: '100%', height: '6px', backgroundColor: '#1A1A1A', borderRadius: '3px', marginBottom: '12px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${uploadProgress}%`, backgroundColor: 'var(--primary)', borderRadius: '3px', transition: 'width 0.3s' }} />
                </div>
              )}

              <input type="text" value={editingProduct.image || ''} onChange={e => setEditingProduct({ ...editingProduct, image: e.target.value })}
                placeholder="Or paste image URL (https://...)"
                style={{ width: '100%', padding: '12px', borderRadius: '8px', backgroundColor: '#020503', border: '1px solid var(--border)', color: 'white', outline: 'none', marginBottom: '12px' }} />

              {editingProduct.image ? (
                <div style={{ position: 'relative' }}>
                  <img src={editingProduct.image} alt="preview" style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '10px', border: '1px solid var(--border)' }} />
                  <button
                    onClick={() => setEditingProduct({ ...editingProduct, image: '' })}
                    style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : null}
            </div>

            {/* Description */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>DESCRIPTION</label>
              <textarea value={editingProduct.description || ''} onChange={e => setEditingProduct({ ...editingProduct, description: e.target.value })}
                rows={3}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', backgroundColor: '#020503', border: '1px solid var(--border)', color: 'white', outline: 'none', resize: 'vertical' }} />
            </div>

            {/* Active Toggle */}
            <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>VISIBILITY IN MOBILE APP</label>
              <div
                onClick={() => setEditingProduct({ ...editingProduct, active: !editingProduct.active })}
                style={{ width: '48px', height: '26px', borderRadius: '13px', cursor: 'pointer', backgroundColor: editingProduct.active ? 'var(--primary)' : '#333', position: 'relative', transition: 'background-color 0.2s' }}
              >
                <div style={{ position: 'absolute', top: '3px', left: editingProduct.active ? '25px' : '3px', width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'white', transition: 'left 0.2s' }} />
              </div>
              <span style={{ color: editingProduct.active ? '#48C774' : 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 'bold' }}>
                {editingProduct.active ? 'Visible to Devotees' : 'Hidden from Devotees'}
              </span>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => handleSave(editingProduct)}
                disabled={saving === editingProduct.id || uploadProgress !== null}
                className="btn-primary"
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                {saving === editingProduct.id ? 'SAVING...' : <><Save size={16} /> SAVE INVENTORY</>}
              </button>
              <button onClick={() => handleDelete(editingProduct.id)} style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid #FF6B6B', color: '#FF6B6B', background: 'transparent', cursor: 'pointer' }}>
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
