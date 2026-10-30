"use client";
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  addDoc, 
  serverTimestamp,
  where 
} from 'firebase/firestore';

interface VerificationRequest {
  id: string;
  type: 'new_pandit_registration' | 'new_mali_registration';
  panditId?: string;
  maliId?: string;
  maliName?: string;
  panditName?: string;
  shopName?: string;
  message: string;
  createdAt: any;
  pincode?: string;
}

export default function Verifications() {
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReq, setSelectedReq] = useState<VerificationRequest | null>(null);
  const [profDetails, setProfDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    let notifReqs: VerificationRequest[] = [];
    let panditReqs: VerificationRequest[] = [];
    let maliReqs: VerificationRequest[] = [];

    const mergeAndSet = () => {
      const mergedMap = new Map<string, VerificationRequest>();

      // 1. Direct unverified pandits
      panditReqs.forEach(p => {
        const key = p.panditId || p.id;
        mergedMap.set(key, p);
      });

      // 2. Direct unverified malis/vendors
      maliReqs.forEach(m => {
        const key = m.maliId || m.id;
        mergedMap.set(key, m);
      });

      // 3. Admin notifications (enrich or add)
      notifReqs.forEach(n => {
        const key = n.panditId || n.maliId || n.id;
        if (!mergedMap.has(key)) {
          mergedMap.set(key, n);
        } else {
          const existing = mergedMap.get(key)!;
          mergedMap.set(key, { ...existing, ...n, id: n.id });
        }
      });

      const list = Array.from(mergedMap.values());
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setRequests(list);
      setLoading(false);
    };

    const unsubNotifs = onSnapshot(query(collection(db, 'admin_notifications')), (snapshot) => {
      notifReqs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VerificationRequest));
      mergeAndSet();
    }, () => mergeAndSet());

    const unsubPandits = onSnapshot(query(collection(db, 'pandits'), where('verified', '==', false)), (snapshot) => {
      panditReqs = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          type: 'new_pandit_registration',
          panditId: doc.id,
          panditName: data.name || 'Vedic Scholar',
          message: `${data.name || 'Pandit'} applied for Pandit onboarding.`,
          createdAt: data.lastUpdated || data.createdAt || null,
          pincode: data.pincode || '',
        } as VerificationRequest;
      });
      mergeAndSet();
    }, () => mergeAndSet());

    const unsubVendors = onSnapshot(query(collection(db, 'vendors'), where('verified', '==', false)), (snapshot) => {
      maliReqs = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          type: 'new_mali_registration',
          maliId: doc.id,
          maliName: data.name || 'Floral Partner',
          shopName: data.shopName || '',
          message: `${data.name || 'Vendor'} registered flower shop "${data.shopName || ''}".`,
          createdAt: data.updatedAt || data.createdAt || null,
          pincode: data.pincode || '',
        } as VerificationRequest;
      });
      mergeAndSet();
    }, () => mergeAndSet());

    return () => {
      unsubNotifs();
      unsubPandits();
      unsubVendors();
    };
  }, []);

  const handleApprove = async (request: VerificationRequest) => {
    const userId = request.panditId || request.maliId;
    if (!userId) return;

    try {
      // 1. Update user to verified in users collection
      await updateDoc(doc(db, 'users', userId), {
        verified: true,
        status: 'active',
        isAvailable: true,
        ...(request.type === 'new_mali_registration' ? {
          shopName: request.shopName || '',
          pincode: request.pincode || ''
        } : {})
      }).catch(() => {});

      // 2. If Mali, update vendors collection
      if (request.type === 'new_mali_registration') {
        await updateDoc(doc(db, 'vendors', userId), {
          verified: true,
          status: 'approved',
          available: true
        }).catch(() => {});
      }

      // 3. If Pandit, update pandits collection
      if (request.type === 'new_pandit_registration') {
        await updateDoc(doc(db, 'pandits', userId), {
          verified: true,
          status: 'active',
          available: true
        }).catch(() => {});
      }

      // 4. Delete admin notification (if exists)
      await deleteDoc(doc(db, 'admin_notifications', request.id)).catch(() => {});

      // 5. Send Approval in-app Notification to partner
      const role = request.type === 'new_mali_registration' ? 'mali' : 'pandit';
      await addDoc(collection(db, 'notifications'), {
        userId,
        title: '✨ Verification Approved!',
        message: `Namaste! Your account as a ${role} has been verified by the MitSadhana team. You can now start serving devotees. 🙏`,
        type: 'success',
        unread: true,
        createdAt: serverTimestamp()
      });

      setSelectedReq(null);
      alert(`${request.panditName || request.maliName || 'Partner'} Verified & Approved!`);
    } catch (error) {
      console.error("Approval error:", error);
      alert("Failed to approve professional.");
    }
  };

  const handleReject = async (request: VerificationRequest) => {
    const userId = request.panditId || request.maliId;
    if (!userId) return;

    if (confirm("Are you sure you want to REJECT this application?")) {
      try {
        await updateDoc(doc(db, 'users', userId), {
          status: 'rejected',
          verified: false
        }).catch(() => {});

        const coll = request.type === 'new_pandit_registration' ? 'pandits' : 'vendors';
        await updateDoc(doc(db, coll, userId), {
          status: 'rejected',
          verified: false
        }).catch(() => {});

        const role = request.type === 'new_mali_registration' ? 'mali' : 'pandit';
        await addDoc(collection(db, 'notifications'), {
          userId,
          title: '⚠️ Verification Update',
          message: `Your registration as a ${role} requires updates. Please check your profile details and re-apply.`,
          type: 'error',
          unread: true,
          createdAt: serverTimestamp()
        });

        await deleteDoc(doc(db, 'admin_notifications', request.id)).catch(() => {});
        setSelectedReq(null);
        alert("Application Rejected.");
      } catch (error) {
        console.error("Rejection error:", error);
        alert("Failed to reject application.");
      }
    }
  };

  const openReview = async (req: VerificationRequest) => {
    setSelectedReq(req);
    setLoadingDetails(true);
    const userId = req.panditId || req.maliId;
    if (userId) {
      try {
        const uDoc = await getDoc(doc(db, 'users', userId));
        const userData = uDoc.exists() ? uDoc.data() : {};

        let professionalData = {};
        if (req.type === 'new_pandit_registration') {
          const pDoc = await getDoc(doc(db, 'pandits', userId));
          if (pDoc.exists()) professionalData = pDoc.data();
        } else if (req.type === 'new_mali_registration') {
          const vDoc = await getDoc(doc(db, 'vendors', userId));
          if (vDoc.exists()) professionalData = vDoc.data();
        }

        setProfDetails({
          ...userData,
          ...professionalData,
          uid: userId
        });
      } catch (e) {
        console.warn('Error loading professional details:', e);
      }
    }
    setLoadingDetails(false);
  };

  return (
    <div style={{ paddingBottom: '60px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: '800', color: '#0B251C', marginBottom: '8px', letterSpacing: '-0.5px' }}>
          Professional Verifications
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>
          Review credentials, certificates, service rates, and service areas for new Pandit & Mali registrations.
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#53695E' }}>
          <div style={{ fontSize: '2rem', marginBottom: '12px' }}>⏳</div>
          <p style={{ fontWeight: '600' }}>Loading verification requests...</p>
        </div>
      ) : requests.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #DFEAE3' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>✨</div>
          <h3 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0B251C', marginBottom: '6px' }}>All caught up!</h3>
          <p style={{ color: 'var(--text-muted)' }}>No pending verification requests at the moment.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {requests.map((req) => (
            <VerificationCard 
              key={req.id} 
              req={req} 
              handleApprove={handleApprove} 
              handleReject={handleReject} 
              openReview={openReview} 
            />
          ))}
        </div>
      )}

      {/* 360° REVIEW SLIDE-OVER PANEL */}
      {selectedReq && (
        <div style={{
          position: 'fixed', top: 0, right: 0, width: '520px', maxWidth: '100vw', height: '100vh',
          backgroundColor: '#FFFFFF', borderLeft: '2px solid #DFEAE3',
          zIndex: 1000, padding: '36px 32px', boxShadow: '-10px 0 40px rgba(0,0,0,0.15)', overflowY: 'auto'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #DFEAE3', paddingBottom: '16px' }}>
            <div>
              <span style={{ fontSize: '0.72rem', letterSpacing: '1.5px', fontWeight: '800', color: '#047857' }}>
                PROFESSIONAL KYC REVIEW
              </span>
              <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0B251C', margin: '2px 0 0' }}>
                {profDetails?.name || selectedReq.panditName || selectedReq.maliName || 'Partner'}
              </h2>
            </div>
            <button 
              onClick={() => setSelectedReq(null)} 
              style={{ background: '#F7FAF8', border: '1px solid #DFEAE3', borderRadius: '8px', width: '36px', height: '36px', color: '#0B251C', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 'bold' }}
            >
              ✕
            </button>
          </div>

          {loadingDetails ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#53695E' }}>
              <p>Loading full credentials...</p>
            </div>
          ) : profDetails && (
            <div>
              {/* HERO AVATAR */}
              <div style={{ textAlign: 'center', padding: '20px', background: 'linear-gradient(180deg, #F0FDF4 0%, #FFFFFF 100%)', borderRadius: '16px', border: '1px solid #DFEAE3', marginBottom: '20px' }}>
                <div style={{ width: '84px', height: '84px', borderRadius: '42px', backgroundColor: '#FFFFFF', margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', border: '3px solid #047857', overflow: 'hidden' }}>
                  {profDetails.photoURL || profDetails.image ? (
                    <img src={profDetails.photoURL || profDetails.image} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    selectedReq.type.includes('pandit') ? '🛕' : '🌸'
                  )}
                </div>
                <h3 style={{ color: '#0B251C', fontSize: '1.25rem', fontWeight: '800', marginBottom: '4px' }}>{profDetails.name}</h3>
                <p style={{ color: '#047857', fontSize: '0.8rem', fontWeight: '800', letterSpacing: '1px', margin: 0 }}>
                  {selectedReq.type.replace(/_/g, ' ').toUpperCase()}
                </p>
              </div>

              {/* CONTACT DETAILS */}
              <div style={{ backgroundColor: '#F7FAF8', padding: '18px', borderRadius: '14px', border: '1px solid #DFEAE3', marginBottom: '18px' }}>
                <h4 style={{ fontSize: '0.75rem', color: '#047857', marginBottom: '12px', fontWeight: '800' }}>CONTACT & LOCATION</h4>
                {[
                  { label: 'PHONE NUMBER', value: profDetails.phone || 'N/A' },
                  { label: 'EMAIL ADDRESS', value: profDetails.email || 'N/A' },
                  { label: 'AREA PINCODE', value: profDetails.pincode || 'N/A' },
                  { label: 'CITY / LOCATION', value: profDetails.city || profDetails.location || 'N/A' },
                  { label: 'FULL ADDRESS', value: profDetails.address || profDetails.shopAddress || 'N/A' },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.78rem', color: '#53695E', fontWeight: '600' }}>{item.label}</span>
                    <span style={{ fontSize: '0.82rem', color: '#0B251C', fontWeight: '700' }}>{item.value}</span>
                  </div>
                ))}
              </div>

              {/* PANDIT CREDENTIALS */}
              {selectedReq.type === 'new_pandit_registration' && (
                <div style={{ backgroundColor: '#FEF3C7', padding: '18px', borderRadius: '14px', border: '1px solid #FDE68A', marginBottom: '18px' }}>
                  <h4 style={{ fontSize: '0.75rem', color: '#92400E', marginBottom: '12px', fontWeight: '800' }}>VEDIC QUALIFICATIONS & RATES</h4>
                  {[
                    { label: 'EDUCATION / GURUKUL', value: profDetails.education || 'Vedic Tradition' },
                    { label: 'TOTAL EXPERIENCE', value: profDetails.experience ? `${profDetails.experience} Years` : 'N/A' },
                    { label: 'ASTROLOGER (ज्योतिषी)', value: profDetails.isAstrologer ? 'YES (Vedic Jyotish) 🔮' : 'No' },
                    { label: 'SERVING RADIUS', value: profDetails.servingDistance ? `${profDetails.servingDistance} km` : 'City wide' },
                    { label: 'LANGUAGES', value: profDetails.languages?.join(', ') || 'Hindi, Sanskrit' },
                  ].map(item => (
                    <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.78rem', color: '#78350F', fontWeight: '600' }}>{item.label}</span>
                      <span style={{ fontSize: '0.82rem', color: '#0B251C', fontWeight: '700' }}>{item.value}</span>
                    </div>
                  ))}

                  {/* RATES */}
                  {profDetails.serviceRates && (
                    <div style={{ marginTop: '12px' }}>
                      <span style={{ fontSize: '0.75rem', color: '#78350F', fontWeight: '800', display: 'block', marginBottom: '6px' }}>SERVICE RATES:</span>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                        {Object.entries(profDetails.serviceRates).map(([puja, rate]) => (
                          <div key={puja} style={{ background: '#FFFFFF', padding: '6px 8px', borderRadius: '6px', border: '1px solid #DFEAE3' }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: '600', color: '#0B251C', display: 'block' }}>{puja}</span>
                            <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#047857' }}>₹{String(rate)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {profDetails.bio && (
                    <div style={{ marginTop: '12px', background: '#FFFFFF', padding: '10px', borderRadius: '8px', border: '1px solid #DFEAE3' }}>
                      <span style={{ fontSize: '0.7rem', color: '#7B9185', fontWeight: '800', display: 'block', marginBottom: '2px' }}>BIO</span>
                      <p style={{ fontSize: '0.8rem', color: '#0B251C', margin: 0 }}>{profDetails.bio}</p>
                    </div>
                  )}
                </div>
              )}

              {/* MALI CREDENTIALS */}
              {selectedReq.type === 'new_mali_registration' && (
                <div style={{ backgroundColor: '#FEE2E2', padding: '18px', borderRadius: '14px', border: '1px solid #FECACA', marginBottom: '18px' }}>
                  <h4 style={{ fontSize: '0.75rem', color: '#991B1B', marginBottom: '12px', fontWeight: '800' }}>NURSERY & LOGISTICS DETAILS</h4>
                  {[
                    { label: 'SHOP / NURSERY NAME', value: profDetails.shopName || selectedReq.shopName || 'Flower Partner' },
                    { label: 'DELIVERY CAPACITY', value: profDetails.deliveryCapacity ? `${profDetails.deliveryCapacity} Homes/Day` : 'N/A' },
                    { label: 'EXPERIENCE', value: profDetails.businessExperience || 'Local Nursery' },
                  ].map(item => (
                    <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.78rem', color: '#7F1D1D', fontWeight: '600' }}>{item.label}</span>
                      <span style={{ fontSize: '0.82rem', color: '#0B251C', fontWeight: '700' }}>{item.value}</span>
                    </div>
                  ))}

                  {/* SERVICEABLE PINCODES */}
                  {Array.isArray(profDetails.serviceAreas) && profDetails.serviceAreas.length > 0 && (
                    <div style={{ marginTop: '12px' }}>
                      <span style={{ fontSize: '0.75rem', color: '#7F1D1D', fontWeight: '800', display: 'block', marginBottom: '6px' }}>SERVICEABLE PINCODES:</span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {profDetails.serviceAreas.map((area: any, idx: number) => {
                          const pin = typeof area === 'string' ? area : area.pincode;
                          return (
                            <span key={idx} style={{ background: '#FFFFFF', border: '1px solid #FECACA', padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700', color: '#991B1B' }}>
                              📍 {pin}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* FLOWERS */}
                  {Array.isArray(profDetails.flowerVarieties) && profDetails.flowerVarieties.length > 0 && (
                    <div style={{ marginTop: '12px' }}>
                      <span style={{ fontSize: '0.75rem', color: '#7F1D1D', fontWeight: '800', display: 'block', marginBottom: '6px' }}>OFFERINGS:</span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {profDetails.flowerVarieties.map((f: string, i: number) => (
                          <span key={i} style={{ background: '#FFFFFF', padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '700', color: '#047857', border: '1px solid #DFEAE3' }}>
                            🌸 {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ACTION BUTTONS */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '28px' }}>
                <button 
                  style={{ flex: 1, padding: '14px', borderRadius: '10px', backgroundColor: '#047857', color: '#FFFFFF', border: 'none', fontWeight: '800', cursor: 'pointer', fontSize: '0.9rem', boxShadow: '0 4px 12px rgba(4, 120, 87, 0.25)' }} 
                  onClick={() => handleApprove(selectedReq)}
                >
                  ✨ APPROVE ACCESS
                </button>
                <button 
                  style={{ flex: 1, padding: '14px', borderRadius: '10px', border: '1px solid #DC2626', color: '#DC2626', backgroundColor: '#FFFFFF', fontWeight: '800', cursor: 'pointer', fontSize: '0.9rem' }} 
                  onClick={() => handleReject(selectedReq)}
                >
                  ✕ REJECT
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const VerificationCard = ({ req, handleApprove, handleReject, openReview }: { req: VerificationRequest, handleApprove: any, handleReject: any, openReview: any }) => {
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const userId = req.panditId || req.maliId;
      if (!userId) return;
      try {
        const uDoc = await getDoc(doc(db, 'users', userId));
        const uData = uDoc.exists() ? uDoc.data() : {};

        let extraData = {};
        if (req.type === 'new_pandit_registration') {
          const pDoc = await getDoc(doc(db, 'pandits', userId));
          if (pDoc.exists()) extraData = pDoc.data();
        } else if (req.type === 'new_mali_registration') {
          const vDoc = await getDoc(doc(db, 'vendors', userId));
          if (vDoc.exists()) extraData = vDoc.data();
        }
        setProfile({ ...uData, ...extraData });
      } catch (err) {
        console.warn('Card fetch error:', err);
      }
    };
    fetchUser();
  }, [req]);

  const isPandit = req.type === 'new_pandit_registration';

  return (
    <div style={{ 
      backgroundColor: '#FFFFFF', 
      borderRadius: '16px', 
      border: '1px solid #DFEAE3', 
      borderLeft: `6px solid ${isPandit ? '#D4AF37' : '#047857'}`,
      padding: '24px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
        <div style={{ flex: 1, minWidth: '280px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ 
              fontSize: '0.72rem', 
              padding: '3px 10px', 
              borderRadius: '6px', 
              backgroundColor: isPandit ? '#FEF3C7' : '#ECFDF5',
              color: isPandit ? '#92400E' : '#047857',
              fontWeight: '800',
              textTransform: 'uppercase',
            }}>
              {isPandit ? '🛕 PANDIT REGISTRATION' : '🌸 MALI PARTNER REGISTRATION'}
            </span>
          </div>

          <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0B251C', marginBottom: '6px' }}>
            {req.panditName || req.maliName || profile?.name || 'New Professional'}
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '14px', backgroundColor: '#F7FAF8', border: '1px solid #DFEAE3', padding: '12px 16px', borderRadius: '10px' }}>
            <div>
              <p style={{ fontSize: '0.7rem', color: '#53695E', fontWeight: '700', margin: '0 0 2px' }}>PHONE</p>
              <span style={{ color: '#047857', fontWeight: '800', fontSize: '0.85rem' }}>📞 {profile?.phone || 'N/A'}</span>
            </div>
            <div>
              <p style={{ fontSize: '0.7rem', color: '#53695E', fontWeight: '700', margin: '0 0 2px' }}>LOCATION / AREA</p>
              <span style={{ color: '#0B251C', fontWeight: '700', fontSize: '0.85rem' }}>📍 {profile?.city || profile?.pincode || req.pincode || 'India'}</span>
            </div>
            {isPandit && profile?.education && (
              <div>
                <p style={{ fontSize: '0.7rem', color: '#53695E', fontWeight: '700', margin: '0 0 2px' }}>EDUCATION</p>
                <span style={{ color: '#0B251C', fontWeight: '700', fontSize: '0.85rem' }}>🎓 {profile.education}</span>
              </div>
            )}
            {!isPandit && (profile?.shopName || req.shopName) && (
              <div>
                <p style={{ fontSize: '0.7rem', color: '#53695E', fontWeight: '700', margin: '0 0 2px' }}>SHOP NAME</p>
                <span style={{ color: '#0B251C', fontWeight: '700', fontSize: '0.85rem' }}>🏪 {profile?.shopName || req.shopName}</span>
              </div>
            )}
          </div>
          
          <p style={{ fontSize: '0.85rem', color: '#53695E', margin: 0, fontStyle: 'italic' }}>
            "{req.message || 'Submitted registration application for review.'}"
          </p>
        </div>

        {/* ACTIONS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '140px' }}>
          <button 
            style={{ padding: '10px 16px', borderRadius: '8px', backgroundColor: '#ECFDF5', color: '#047857', border: '1px solid #047857', fontWeight: '700', cursor: 'pointer', fontSize: '0.85rem' }} 
            onClick={() => openReview(req)}
          >
            📋 REVIEW DOSSIER
          </button>
          <button 
            style={{ padding: '10px 16px', borderRadius: '8px', backgroundColor: '#047857', color: '#FFFFFF', border: 'none', fontWeight: '700', cursor: 'pointer', fontSize: '0.85rem' }} 
            onClick={() => handleApprove(req)}
          >
            ✓ APPROVE
          </button>
          <button 
            style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #DC2626', color: '#DC2626', backgroundColor: '#FFFFFF', fontWeight: '700', cursor: 'pointer', fontSize: '0.82rem' }} 
            onClick={() => handleReject(req)}
          >
            ✕ REJECT
          </button>
        </div>
      </div>
    </div>
  );
};
