'use client';

import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

interface Booking {
  id: string;
  status: string;
  serviceId: string;
  recipientDisplayName: string;
  landmark?: string;
  totalAmountMinor: number;
  visitPin?: string;
  assignedNurse?: {
    displayName: string;
    cadre: string;
  };
  createdAt: string;
}

interface PendingNurse {
  id: string;
  displayName: string;
  cadre: string;
  credentialNumber: string;
  credentialStatus: string;
  skills: string[];
  phone: string;
  documentUrls?: string[];
}

interface PaymentTx {
  id: string;
  bookingId: string;
  provider: string;
  providerReference: string;
  amountMinor: number;
  status: string;
  nursePayoutMinor: number;
  platformFeeMinor: number;
  customerMomoNumber?: string;
  createdAt: string;
}

export default function OperationsDashboard() {
  const [tab, setTab] = useState<'dispatch' | 'verification' | 'finances' | 'safety'>('dispatch');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [pendingNurses, setPendingNurses] = useState<PendingNurse[]>([]);
  const [payments, setPayments] = useState<PaymentTx[]>([]);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [lastLiveEvent, setLastLiveEvent] = useState<string>('');

  const API_BASE = 'http://localhost:3000';

  useEffect(() => {
    async function loadData() {
      try {
        const healthRes = await fetch(`${API_BASE}/health`);
        if (healthRes.ok) {
          setApiOnline(true);
          const [bRes, nRes, pRes] = await Promise.all([
            fetch(`${API_BASE}/v1/bookings`).then((r) => (r.ok ? r.json() : [])),
            fetch(`${API_BASE}/v1/admin/nurses/pending`).then((r) => (r.ok ? r.json() : [])),
            fetch(`${API_BASE}/v1/admin/payments`).then((r) => (r.ok ? r.json() : [])),
          ]);
          setBookings(bRes);
          setPendingNurses(nRes);
          setPayments(pRes);
          return;
        }
      } catch (err) {
        setApiOnline(false);
      }

      // Fallback preview state
      setBookings([
        {
          id: 'bk-cantonments-01',
          status: 'IN_PROGRESS',
          serviceId: 'home_wound_care',
          recipientDisplayName: 'Ama Serwaa',
          landmark: 'Near Cantonments Post Office',
          totalAmountMinor: 20500,
          visitPin: '4829',
          assignedNurse: { displayName: 'Florence Mensah', cadre: 'Registered General Nurse' },
          createdAt: new Date().toISOString(),
        },
        {
          id: 'bk-osu-02',
          status: 'SEARCHING',
          serviceId: 'post_discharge_support',
          recipientDisplayName: 'Kofi Mensah',
          landmark: 'Osu Ringway Estates',
          totalAmountMinor: 17500,
          createdAt: new Date().toISOString(),
        },
      ]);

      setPendingNurses([
        {
          id: 'nurse-ama-03',
          displayName: 'Ama Boateng',
          cadre: 'Community Health Nurse',
          credentialNumber: 'NMC-GH-99182',
          credentialStatus: 'PENDING_REVIEW',
          skills: ['geriatric_care', 'wound_care'],
          phone: '+233277889900',
          documentUrls: ['https://storage.local/nurses/ama-license.pdf'],
        },
      ]);

      setPayments([
        {
          id: 'tx-001',
          bookingId: 'bk-cantonments-01',
          provider: 'PAYSTACK (MoMo)',
          providerReference: 'pstk_ref_98129',
          amountMinor: 20500,
          status: 'AUTHORIZED',
          nursePayoutMinor: 17425,
          platformFeeMinor: 3075,
          customerMomoNumber: '+233244000111',
          createdAt: new Date().toISOString(),
        },
      ]);
    }

    loadData();

    // Connect to WebSocket gateway for live updates
    const socket = io(API_BASE, { transports: ['websocket', 'polling'] });
    socket.on('connect', () => {
      socket.emit('join:ops');
      setApiOnline(true);
    });

    socket.on('booking.status.changed', (data: any) => {
      setLastLiveEvent(`Booking ${data.bookingId?.slice(0, 8)} -> ${data.status}`);
      setBookings((prev) => {
        const idx = prev.findIndex((b) => b.id === data.bookingId);
        if (idx !== -1) {
          const updated = [...prev];
          updated[idx] = {
            ...updated[idx],
            status: data.status,
            visitPin: data.visitPin || updated[idx].visitPin,
            assignedNurse: data.assignedNurse || updated[idx].assignedNurse,
          };
          return updated;
        }
        return prev;
      });

      // Refresh payments ledger if completed
      if (data.status === 'COMPLETED') {
        fetch(`${API_BASE}/v1/admin/payments`)
          .then((r) => (r.ok ? r.json() : []))
          .then(setPayments)
          .catch(() => {});
      }
    });

    socket.on('dispatch.offer.created', (offer: any) => {
      setLastLiveEvent(`Offer created for ${offer.serviceLabel}`);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  async function handleApproveNurse(nurseId: string) {
    try {
      if (apiOnline) {
        await fetch(`${API_BASE}/v1/admin/nurses/${nurseId}/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reviewer: 'Ops Clinical Lead' }),
        });
      }
    } catch (e) {}
    setPendingNurses((prev) => prev.filter((n) => n.id !== nurseId));
  }

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo-section">
          <h1>Uber for Nurses</h1>
          <p>Ghana Operations</p>
        </div>

        <nav className="nav-menu">
          <button
            className={`nav-item ${tab === 'dispatch' ? 'active' : ''}`}
            onClick={() => setTab('dispatch')}
          >
            <span>Live Dispatch</span>
            <span className="badge badge-green">{bookings.length}</span>
          </button>
          <button
            className={`nav-item ${tab === 'verification' ? 'active' : ''}`}
            onClick={() => setTab('verification')}
          >
            <span>Nurse Credentials</span>
            {pendingNurses.length > 0 && (
              <span className="badge badge-amber">{pendingNurses.length}</span>
            )}
          </button>
          <button
            className={`nav-item ${tab === 'finances' ? 'active' : ''}`}
            onClick={() => setTab('finances')}
          >
            <span>Finances & MoMo</span>
          </button>
          <button
            className={`nav-item ${tab === 'safety' ? 'active' : ''}`}
            onClick={() => setTab('safety')}
          >
            <span>Clinical Safety</span>
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Header Banner */}
        <header className="header-banner">
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Service Operations Center</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Greater Accra Service Area (Cantonments, Osu, East Legon, Airport)
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {lastLiveEvent && (
              <span className="badge badge-blue" style={{ padding: '6px 12px' }}>
                ⚡ {lastLiveEvent}
              </span>
            )}
            <span
              className={`badge ${apiOnline ? 'badge-green' : 'badge-amber'}`}
              style={{ padding: '6px 12px' }}
            >
              {apiOnline ? '● WebSocket Live' : '○ Standalone Preview Mode'}
            </span>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-label">Active Care Requests</div>
            <div className="stat-value">{bookings.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Pending Nurse Approvals</div>
            <div
              style={{
                fontSize: '26px',
                fontWeight: 700,
                marginTop: '4px',
                color: pendingNurses.length > 0 ? '#b45309' : '#147a5b',
              }}
            >
              {pendingNurses.length}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Gross Value (GHS)</div>
            <div className="stat-value">
              GH₵{' '}
              {(
                payments.reduce((acc, p) => acc + p.amountMinor, 0) / 100
              ).toFixed(2)}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Emergency Boundary</div>
            <div className="stat-value" style={{ fontSize: '18px', color: '#147a5b' }}>
              Active (112/193)
            </div>
          </div>
        </div>

        {/* Tab Views */}
        {tab === 'dispatch' && (
          <div className="content-card">
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>
              Live Care Requests & Dispatch Rounds
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Real-time simultaneous matching, arrival timers, and 4-digit Visit PIN verification.
            </p>

            <table className="table">
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>Patient / Landmark</th>
                  <th>Service</th>
                  <th>Status</th>
                  <th>Visit PIN</th>
                  <th>Assigned Nurse</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                      {b.id.slice(0, 12)}...
                    </td>
                    <td>
                      <strong>{b.recipientDisplayName}</strong>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {b.landmark || 'Accra'}
                      </div>
                    </td>
                    <td>{b.serviceId.replace(/_/g, ' ')}</td>
                    <td>
                      <span
                        className={`badge ${
                          b.status === 'IN_PROGRESS'
                            ? 'badge-green'
                            : b.status === 'SEARCHING'
                            ? 'badge-amber'
                            : b.status === 'COMPLETED'
                            ? 'badge-blue'
                            : 'badge-amber'
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td>
                      {b.visitPin ? (
                        <span
                          style={{
                            fontWeight: 700,
                            letterSpacing: '2px',
                            color: 'var(--primary)',
                          }}
                        >
                          {b.visitPin}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td>{b.assignedNurse?.displayName || 'Awaiting acceptance...'}</td>
                    <td>GH₵ {(b.totalAmountMinor / 100).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'verification' && (
          <div className="content-card">
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>
              Nurse Professional Credential Review Queue
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Ghana Nursing and Midwifery Council (N&MC) verification workbench.
            </p>

            {pendingNurses.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                All clinician credentials have been verified. No pending items.
              </div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Clinician Name</th>
                    <th>Cadre & Skills</th>
                    <th>N&MC License #</th>
                    <th>Documents</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingNurses.map((nurse) => (
                    <tr key={nurse.id}>
                      <td>
                        <strong>{nurse.displayName}</strong>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {nurse.phone}
                        </div>
                      </td>
                      <td>
                        <div>{nurse.cadre}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {nurse.skills.join(', ')}
                        </div>
                      </td>
                      <td style={{ fontFamily: 'monospace' }}>{nurse.credentialNumber}</td>
                      <td>
                        <span className="badge badge-blue">NMC Certificate PDF</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            className="btn btn-primary"
                            onClick={() => handleApproveNurse(nurse.id)}
                          >
                            Approve Credential
                          </button>
                          <button className="btn btn-danger">Reject</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === 'finances' && (
          <div className="content-card">
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>
              Financial Ledger & Split Settlement
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Ghana Mobile Money (MTN, Telecel, AT) collections and 85/15 clinician split payouts.
            </p>

            <table className="table">
              <thead>
                <tr>
                  <th>Provider Ref</th>
                  <th>Customer MoMo</th>
                  <th>Status</th>
                  <th>Gross Charged</th>
                  <th>Nurse Payout (85%)</th>
                  <th>Platform Fee (15%)</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                      {p.providerReference}
                    </td>
                    <td>{p.customerMomoNumber || 'Mobile Money'}</td>
                    <td>
                      <span className="badge badge-green">{p.status}</span>
                    </td>
                    <td>
                      <strong>GH₵ {(p.amountMinor / 100).toFixed(2)}</strong>
                    </td>
                    <td style={{ color: 'var(--primary)', fontWeight: 600 }}>
                      GH₵ {(p.nursePayoutMinor / 100).toFixed(2)}
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      GH₵ {(p.platformFeeMinor / 100).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'safety' && (
          <div className="content-card">
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>
              Clinical Safety & Incident Escalations
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Mandatory HeFRA compliance, patient deterioration flags, and clinical audit records.
            </p>

            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '16px',
                marginTop: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge badge-red">CRITICAL SAFETY GUARD</span>
                <strong style={{ color: '#991b1b', fontSize: '14px' }}>
                  Emergency Diversion Protocol Active
                </strong>
              </div>
              <p style={{ fontSize: '13px', color: '#7f1d1d', marginTop: '6px' }}>
                Platform nurses are strictly prohibited from administering acute resuscitation,
                chemotherapy, or unauthorized scheduled drugs in home settings. In any acute
                deterioration, the app directs clinicians to dial Ghana National Ambulance (193/112).
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
