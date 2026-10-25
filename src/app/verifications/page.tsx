"use client";
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';

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
    const q = query(collection(db, 'admin_notifications'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reqs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VerificationRequest));
      setRequests(reqs.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleApprove = async (request: VerificationRequest) => {
    const userId = request.panditId || request.maliId;
    if (!userId) return;

    try {
      // 1. Update user to verified and sync necessary info for allotments
      await updateDoc(doc(db, 'users', userId), {
        verified: true,
        status: 'active',
        isAvailable: true,
        ...(request.type === 'new_mali_registration' ? {
          shopName: request.shopName || '',
          pincode: request.pincode || ''
        } : {})
      });

      // 2. If Mali, also update vendor collection
      if (request.type === 'new_mali_registration') {
        await updateDoc(doc(db, 'vendors', userId), {
            verified: true,
            status: 'active'
        });
      }

      // 3. If Pandit, also update pandits collection
      if (request.type === 'new_pandit_registration') {
        await updateDoc(doc(db, 'pandits', userId), {
            verified: true,
            status: 'active'
        });
      }

      // 3. Delete notification
      await deleteDoc(doc(db, 'admin_notifications', request.id));

      // 4. Send Approval Notification
      const role = request.type === 'new_mali_registration' ? 'mali' : 'pandit';
      await addDoc(collection(db, 'notifications'), {
        userId,
        title: '✨ Verification Approved!',
        message: `Namaste! Your account as a ${role} has been verified. You can now start serving devotees. 🙏`,
        type: 'success',
        unread: true,
        createdAt: serverTimestamp()
      });

      alert(`${request.panditName || request.maliName} Approved!`);
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
        // 1. Update user to rejected
        await updateDoc(doc(db, 'users', userId), {
          status: 'rejected',
          verified: false
        });

        // 2. Update professional doc if exists
        const coll = request.type === 'new_pandit_registration' ? 'pandits' : 'vendors';
        await updateDoc(doc(db, 'verified' in (request as any) ? coll : coll, userId), {
          status: 'rejected',
          verified: false
        }).catch(() => {}); // Ignore if document doesn't exist yet

        // 3. Send Rejection Notification
        const role = request.type === 'new_mali_registration' ? 'mali' : 'pandit';
        await addDoc(collection(db, 'notifications'), {
          userId,
          title: '⚠️ Verification Update',
          message: `Your registration as a ${role} requires updates. Please check your profile details and re-apply.`,
          type: 'error',
          unread: true,
          createdAt: serverTimestamp()
        });

        // 4. Delete admin notification
        await deleteDoc(doc(db, 'admin_notifications', request.id));
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
      const uDoc = await getDoc(doc(db, 'users', userId));
      if (uDoc.exists()) setProfDetails(uDoc.data());
    }
    setLoadingDetails(false);
  };

  return (
    <div>
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Professional Verifications</h1>
        <p style={{ color: 'var(--text-muted)' }}>Review and approve new Pandit and Mali registrations.</p>
      </div>

      {loading ? (
        <p>Loading requests...</p>
      ) : requests.length === 0 ? (
        <div className="card glass" style={{ textAlign: 'center', padding: '60px' }}>
          <Text style={{fontSize: '3rem', marginBottom: '20px'}}>✨</Text>
          <h3>All caught up!</h3>
          <p style={{ color: 'var(--text-muted)' }}>No pending verification requests at the moment.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '20px' }}>
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

      {/* REVIEW PANEL */}
      {selectedReq && (
        <div style={{
          position: 'fixed', top: 0, right: 0, width: '450px', height: '100vh',
          backgroundColor: 'var(--card-bg)', borderLeft: '1px solid var(--border)',
          zIndex: 1000, padding: '40px', boxShadow: '-20px 0 50px rgba(0,0,0,0.5)', overflowY: 'auto'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
            <h2 style={{ fontSize: '1.1rem', letterSpacing: '1px' }}>PROFESSIONAL REVIEW</h2>
            <button onClick={() => setSelectedReq(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.5rem' }}>×</button>
          </div>

          {loadingDetails ? <p>Loading credentials...</p> : profDetails && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <div style={{ width: '100px', height: '100px', borderRadius: '50px', backgroundColor: 'var(--accent)', margin: '0 auto 15px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', border: '2px solid var(--primary)', overflow: 'hidden' }}>
                  {profDetails.photoURL || profDetails.image ? (
                    <img src={profDetails.photoURL || profDetails.image} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    selectedReq.type.includes('pandit') ? '🛕' : '🌸'
                  )}
                </div>
                <h3 style={{ color: 'white' }}>{profDetails.name}</h3>
                <p style={{ color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 'bold' }}>{profDetails.role?.toUpperCase()}</p>
              </div>

              <div className="glass" style={{ padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
                <h4 style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '15px' }}>KYC DOCUMENTS & DETAILS</h4>
                {[
                  { label: 'EMAIL', value: profDetails.email },
                  { label: 'PHONE', value: profDetails.phone },
                  { label: 'EXPERIENCE', value: profDetails.experience || 'N/A' },
                  { label: 'SHOP', value: profDetails.shopName || 'N/A' },
                  { label: 'AREA PINCODE', value: profDetails.pincode },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.label}</span>
                    <span style={{ fontSize: '0.8rem', color: 'white' }}>{item.value}</span>
                  </div>
                ))}
              </div>

              {profDetails.qualificationDocs && profDetails.qualificationDocs.length > 0 && (
                <div style={{ marginBottom: '30px' }}>
                  <h4 style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '15px' }}>QUALIFICATION DOCUMENTS</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                    {profDetails.qualificationDocs.map((docUrl: string, idx: number) => (
                      <a 
                        key={idx} 
                        href={docUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ 
                          display: 'block', padding: '10px', borderRadius: '8px', 
                          backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
                          textAlign: 'center', textDecoration: 'none', color: 'var(--primary)',
                          fontSize: '0.7rem', fontWeight: 'bold'
                        }}
                      >
                        VIEW DOC {idx + 1} 📄
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {profDetails.expertise && (
                <div style={{ marginBottom: '30px' }}>
                  <h4 style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '10px' }}>EXPERTISE</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {profDetails.expertise.map((e: string) => (
                      <span key={e} style={{ fontSize: '0.65rem', padding: '4px 10px', backgroundColor: 'rgba(212,168,67,0.1)', color: 'var(--primary)', borderRadius: '4px' }}>{e}</span>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '40px' }}>
                <button className="btn-primary" style={{ flex: 1 }} onClick={() => handleApprove(selectedReq)}>APPROVE ACCESS</button>
                <button style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #FF6B6B', color: '#FF6B6B', backgroundColor: 'transparent', fontWeight: 'bold', cursor: 'pointer' }} onClick={() => handleReject(selectedReq)}>REJECT</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const VerificationCard = ({ req, handleApprove, handleReject, openReview }: { req: VerificationRequest, handleApprove: any, handleReject: any, openReview: any }) => {
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const userId = req.panditId || req.maliId;
      if (!userId) return;
      const uDoc = await getDoc(doc(db, 'users', userId));
      if (uDoc.exists()) {
        setUserProfile(uDoc.data());
      }
    };
    fetchUser();
  }, [req]);

  return (
    <div className="card glass" style={{ borderLeft: `4px solid ${req.type.includes('pandit') ? '#D4A843' : '#8CA193'}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <span style={{ 
            fontSize: '0.7rem', 
            padding: '4px 8px', 
            borderRadius: '4px', 
            backgroundColor: 'rgba(212, 168, 67, 0.1)',
            color: 'var(--primary)',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            marginBottom: '12px',
            display: 'inline-block'
          }}>
            {req.type.replace(/_/g, ' ')}
          </span>
          <h3 style={{ marginBottom: '8px', color: '#0B251C' }}>{req.panditName || req.maliName} {userProfile?.name ? `(${userProfile.name})` : ''}</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px', backgroundColor: '#F7FAF8', border: '1px solid #DFEAE3', padding: '15px', borderRadius: '10px' }}>
             {userProfile?.phone && (
               <div>
                   <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '2px' }}>PHONE</p>
                   <a href={`tel:${userProfile.phone}`} style={{ color: 'var(--primary)', fontWeight: 'bold', textDecoration: 'none' }}>📞 {userProfile.phone}</a>
               </div>
             )}
             {userProfile?.email && (
               <div>
                   <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '2px' }}>EMAIL</p>
                   <p style={{ color: '#0B251C', fontSize: '0.9rem', fontWeight: '600' }}>{userProfile.email}</p>
               </div>
             )}
             {req.shopName && (
               <div>
                   <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '2px' }}>SHOP / EXPERTISE</p>
                   <p style={{ color: '#0B251C', fontSize: '0.9rem', fontWeight: '600' }}>{req.shopName}</p>
               </div>
             )}
             <div>
                 <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '2px' }}>ADDRESS / AREA</p>
                 <p style={{ color: '#0B251C', fontSize: '0.9rem', fontWeight: '600' }}>{userProfile?.address || req.pincode || 'Not Specified'}</p>
             </div>
          </div>
          
          <p style={{ fontSize: '0.9rem', lineHeight: '1.5', color: '#53695E' }}>💬 "{req.message}"</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginLeft: '30px', minWidth: '130px' }}>
          <button className="btn-primary" style={{ backgroundColor: 'rgba(212,168,67,0.1)', color: 'var(--primary)', border: '1px solid var(--primary)', width: '100%' }} onClick={() => openReview(req)}>REVIEW</button>
          <button className="btn-primary" style={{ width: '100%' }} onClick={() => handleApprove(req)}>APPROVE</button>
          <button style={{ 
            padding: '8px 16px', 
            borderRadius: '8px', 
            border: '1px solid #FF6B6B', 
            color: '#FF6B6B', 
            backgroundColor: 'transparent',
            fontWeight: 'bold',
            cursor: 'pointer',
            width: '100%'
          }} onClick={() => handleReject(req)}>REJECT</button>
        </div>
      </div>
    </div>
  );
};

const Text = ({ children, style }: any) => <div style={{...style}}>{children}</div>;
