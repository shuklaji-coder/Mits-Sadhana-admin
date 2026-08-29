"use client";
import { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/firebase';
import {
  collection, doc, updateDoc, addDoc, deleteDoc, onSnapshot
} from 'firebase/firestore';
import { Save, Edit3, Plus, Trash2, Loader2, Search, Upload, X, ImageIcon } from 'lucide-react';

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
  const [toast, setToast] = useState('');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'products'), (snap) => {
      setProducts(snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          name: data.name || data.title || '',
          active: data.active === undefined ? true : data.active,
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

  // Convert image to compressed base64 and store directly in Firestore
  const handleImageUpload = (file: File) => {
    if (!editingProduct) return;
    setUploadProgress(0);

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Compress: max 600px wide, 70% quality
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
      const payload = { ...data, active: data.active === true };
      if (id.startsWith('new_')) {
        await addDoc(collection(db, 'products'), payload);
        showToast('✅ Product added!');
      } else {
        await updateDoc(doc(db, 'products', id), payload);
        showToast('✅ Product updated!');
      }
      setEditingProduct(null);
    } catch (e) {
      showToast('❌ Error saving product.');
    } finally {
      setSaving(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (id.startsWith('new_')) { setEditingProduct(null); return; }
    if (!confirm('Delete this product?')) return;
    await deleteDoc(doc(db, 'products', id));
    showToast('🗑️ Product deleted.');
  };

  const filtered = products.filter(p =>
    (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.category || '').toLowerCase().includes(search.toLowerCase())
  );

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
          color: 'white', fontWeight: 'bold'
        }}>
          {toast}
        </div>
      )}

      <div style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Inventory Manager</h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage your devotee store products and pricing.</p>
        </div>
        <button
          onClick={() => setEditingProduct({ id: `new_${Date.now()}`, name: '', price: 0, category: 'FESTIVAL_KIT', image: '', description: '', active: true })}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px' }}
        >
          <Plus size={16} /> ADD PRODUCT
        </button>
      </div>

      <div style={{ flex: 1, position: 'relative', marginBottom: '30px' }}>
        <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
        <input
          type="text"
          placeholder="Search products or categories..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', padding: '14px 14px 14px 40px', borderRadius: '12px', backgroundColor: '#0A130E', border: '1px solid var(--border)', color: 'white', outline: 'none' }}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '100px' }}><Loader2 className="animate-spin" /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {filtered.map(item => (
            <div key={item.id} className="card glass" style={{ padding: '0', overflow: 'hidden' }}>
              {item.image ? (
                <img src={item.image} style={{ width: '100%', height: '160px', objectFit: 'cover' }} alt={item.name} />
              ) : (
                <div style={{ width: '100%', height: '160px', backgroundColor: '#0A130E', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  <ImageIcon size={28} opacity={0.3} />
                  No Image
                </div>
              )}
              <div style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                  <h3 style={{ fontSize: '1rem', color: 'white' }}>{item.name}</h3>
                  <span style={{ fontSize: '0.65rem', backgroundColor: item.active ? 'rgba(72,199,116,0.15)' : 'rgba(255,80,80,0.15)', color: item.active ? '#48C774' : '#FF5050', padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold' }}>
                    {item.active ? 'ACTIVE' : 'HIDDEN'}
                  </span>
                </div>
                <span style={{ fontSize: '0.65rem', backgroundColor: 'rgba(212,168,67,0.1)', color: 'var(--primary)', padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold', display: 'inline-block', marginBottom: '10px' }}>{item.category}</span>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '20px' }}>
                  <span style={{ fontSize: '1.2rem', color: 'white', fontWeight: 'bold' }}>₹{item.price}</span>
                  {item.oldPrice && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textDecoration: 'line-through' }}>₹{item.oldPrice}</span>}
                </div>
                <button onClick={() => setEditingProduct(item)} className="btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <Edit3 size={14} /> EDIT
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editingProduct && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card glass" style={{ width: '100%', maxWidth: '520px', maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
              <h2 style={{ fontSize: '1.2rem' }}>{editingProduct.id.startsWith('new_') ? 'Add Product' : 'Edit Product'}</h2>
              <button onClick={() => setEditingProduct(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
            </div>

            {/* Product Name */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>PRODUCT NAME</label>
              <input type="text" value={editingProduct.name || ''} onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', backgroundColor: '#020503', border: '1px solid var(--border)', color: 'white', outline: 'none' }} />
            </div>

            {/* Price */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>PRICE (₹)</label>
              <input type="number" value={editingProduct.price || ''} onChange={e => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', backgroundColor: '#020503', border: '1px solid var(--border)', color: 'white', outline: 'none' }} />
            </div>

            {/* Old Price */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>ORIGINAL PRICE (optional)</label>
              <input type="number" value={editingProduct.oldPrice || ''} onChange={e => setEditingProduct({ ...editingProduct, oldPrice: Number(e.target.value) })}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', backgroundColor: '#020503', border: '1px solid var(--border)', color: 'white', outline: 'none' }} />
            </div>

            {/* Category */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>CATEGORY</label>
              <select value={editingProduct.category || 'FESTIVAL_KIT'} onChange={e => setEditingProduct({ ...editingProduct, category: e.target.value })}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', backgroundColor: '#020503', border: '1px solid var(--border)', color: 'white', outline: 'none' }}>
                {CATEGORY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* IMAGE SECTION */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>PRODUCT IMAGE</label>

              {/* Upload Button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadProgress !== null}
                style={{
                  width: '100%', padding: '14px', borderRadius: '10px',
                  border: '2px dashed var(--primary)', background: 'rgba(212,168,67,0.05)',
                  color: 'var(--primary)', cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', gap: '10px',
                  fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '12px',
                  transition: 'all 0.2s'
                }}
              >
                <Upload size={18} />
                {uploadProgress !== null ? `Uploading... ${uploadProgress}%` : 'Upload Image from Device'}
              </button>

              {/* Upload Progress Bar */}
              {uploadProgress !== null && (
                <div style={{ width: '100%', height: '6px', backgroundColor: '#1A1A1A', borderRadius: '3px', marginBottom: '12px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${uploadProgress}%`, backgroundColor: 'var(--primary)', borderRadius: '3px', transition: 'width 0.3s' }} />
                </div>
              )}

              {/* OR separator */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }} />
                <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>OR paste URL</span>
                <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }} />
              </div>

              {/* URL Input */}
              <input type="text" value={editingProduct.image || ''} onChange={e => setEditingProduct({ ...editingProduct, image: e.target.value })}
                placeholder="https://..."
                style={{ width: '100%', padding: '12px', borderRadius: '8px', backgroundColor: '#020503', border: '1px solid var(--border)', color: 'white', outline: 'none', marginBottom: '12px' }} />

              {/* Image Preview */}
              {editingProduct.image ? (
                <div style={{ position: 'relative' }}>
                  <img src={editingProduct.image} alt="preview" style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '10px', border: '1px solid var(--border)' }} />
                  <button
                    onClick={() => setEditingProduct({ ...editingProduct, image: '' })}
                    style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div style={{ width: '100%', height: '120px', borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: '#0A130E', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px', color: 'var(--text-muted)' }}>
                  <ImageIcon size={28} opacity={0.3} />
                  <span style={{ fontSize: '0.75rem' }}>Image preview will appear here</span>
                </div>
              )}
            </div>

            {/* Badge */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>BADGE (optional)</label>
              <input type="text" value={editingProduct.badge || ''} onChange={e => setEditingProduct({ ...editingProduct, badge: e.target.value })}
                placeholder="e.g. BESTSELLER"
                style={{ width: '100%', padding: '12px', borderRadius: '8px', backgroundColor: '#020503', border: '1px solid var(--border)', color: 'white', outline: 'none' }} />
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
              <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>SHOW IN APP</label>
              <div
                onClick={() => setEditingProduct({ ...editingProduct, active: !editingProduct.active })}
                style={{ width: '48px', height: '26px', borderRadius: '13px', cursor: 'pointer', backgroundColor: editingProduct.active ? 'var(--primary)' : '#333', position: 'relative', transition: 'background-color 0.2s' }}
              >
                <div style={{ position: 'absolute', top: '3px', left: editingProduct.active ? '25px' : '3px', width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'white', transition: 'left 0.2s' }} />
              </div>
              <span style={{ color: editingProduct.active ? '#48C774' : 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 'bold' }}>
                {editingProduct.active ? 'Visible' : 'Hidden'}
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
                {saving === editingProduct.id ? 'SAVING...' : <><Save size={16} /> SAVE</>}
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
