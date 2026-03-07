// =============================================================================
// PayoutDashboard.js — Creator Payout System (Stripe Connect)
// =============================================================================
// Location: src/front/js/pages/PayoutDashboard.js
// Route: /creator/payouts
//
// Features:
//  - Connect Stripe Express account (onboarding flow)
//  - View available balance vs pending balance
//  - Instant payout or standard (2-day) payout
//  - Full payout history table
//  - Minimum payout threshold ($25)
//  - Stripe Connect status (verified / restricted / pending)
//  - Tax form status (W-9 collected flag)
//  - Revenue breakdown: beats / memberships / tips / donations
//
// Backend uses Stripe Connect Express accounts + Transfers API
// Backend snippet at bottom of this file
// =============================================================================

import React, { useState, useEffect, useCallback } from 'react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');
const getHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });

const fmt = (n) => `$${(n || 0).toFixed(2)}`;

export const PayoutDashboard = () => {
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [payoutAmt, setPayoutAmt] = useState('');
  const [payoutType, setPayoutType] = useState('standard'); // standard | instant
  const [processing, setProcessing] = useState(false);
  const [status, setStatus]       = useState('');
  const [history, setHistory]     = useState([]);
  const [showTaxForm, setShowTaxForm] = useState(false);
  const [taxForm, setTaxForm]     = useState({ name: '', ssn_last4: '', address: '', ein: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [balRes, histRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/payouts/balance`, { headers: getHeaders() }),
        fetch(`${BACKEND_URL}/api/payouts/history`, { headers: getHeaders() }),
      ]);
      if (balRes.ok) setData(await balRes.json());
      if (histRes.ok) setHistory(await histRes.json());
    } catch (e) {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const connectStripe = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/payouts/connect`, { method: 'POST', headers: getHeaders() });
      const d = await res.json();
      if (d.onboarding_url) window.location.href = d.onboarding_url;
      else setStatus(`⚠ ${d.error}`);
    } catch (e) { setStatus(`⚠ ${e.message}`); }
  };

  const requestPayout = async () => {
    const amount = parseFloat(payoutAmt);
    if (!amount || amount < 25) { setStatus('⚠ Minimum payout is $25'); return; }
    if (amount > (data?.available_balance || 0)) { setStatus('⚠ Amount exceeds available balance'); return; }
    setProcessing(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/payouts/request`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ amount, payout_type: payoutType }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setStatus(`✅ ${payoutType === 'instant' ? 'Instant' : 'Standard'} payout of ${fmt(amount)} initiated!`);
      setPayoutAmt('');
      load();
    } catch (e) { setStatus(`⚠ ${e.message}`); }
    finally { setProcessing(false); }
  };

  const submitTaxForm = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/payouts/tax-info`, {
        method: 'POST', headers: getHeaders(), body: JSON.stringify(taxForm),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setStatus('✅ Tax info saved');
      setShowTaxForm(false);
      load();
    } catch (e) { setStatus(`⚠ ${e.message}`); }
  };

  const S = {
    page:   { minHeight: '100vh', background: '#0d1117', color: '#c9d1d9', fontFamily: 'JetBrains Mono, Inter, sans-serif', padding: '24px 32px', maxWidth: 900, margin: '0 auto' },
    card:   { background: '#161b22', border: '1px solid #30363d', borderRadius: 8, padding: 20, marginBottom: 16 },
    metricCard: (color) => ({ background: '#161b22', border: `1px solid ${color}30`, borderRadius: 8, padding: 18, flex: 1, minWidth: 160 }),
    label:  { display: 'block', fontSize: '0.72rem', color: '#8b949e', marginBottom: 4, fontWeight: 600 },
    input:  { width: '100%', background: '#21262d', border: '1px solid #30363d', borderRadius: 6, color: '#c9d1d9', padding: '8px 12px', fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' },
    btnTeal:{ background: '#00ffc8', color: '#000', border: 'none', borderRadius: 6, padding: '9px 20px', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' },
    btnGray:{ background: '#21262d', color: '#c9d1d9', border: '1px solid #30363d', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontSize: '0.82rem' },
    btnOrange: { background: '#FF6600', color: '#fff', border: 'none', borderRadius: 6, padding: '9px 20px', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' },
    th:     { padding: '8px 12px', fontSize: '0.7rem', color: '#8b949e', fontWeight: 600, textAlign: 'left', borderBottom: '1px solid #30363d' },
    td:     { padding: '10px 12px', fontSize: '0.8rem', borderBottom: '1px solid #21262d' },
  };

  if (loading) return <div style={{ ...S.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ color: '#5a7088' }}>Loading payouts...</div></div>;

  const connected = data?.stripe_connected;
  const verified = data?.stripe_status === 'verified';

  return (
    <div style={S.page}>
      <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#e6edf3', marginBottom: 4 }}>💸 Payouts</div>
      <div style={{ fontSize: '0.75rem', color: '#5a7088', marginBottom: 20 }}>Withdraw your StreamPireX earnings</div>

      {status && (
        <div style={{ color: status.startsWith('⚠') ? '#ff9500' : '#00ffc8', marginBottom: 14, fontSize: '0.83rem', padding: '10px 14px', background: '#21262d', borderRadius: 6 }}>
          {status}
        </div>
      )}

      {/* NOT CONNECTED */}
      {!connected && (
        <div style={{ ...S.card, textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: '2rem', marginBottom: 12 }}>🏦</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#e6edf3', marginBottom: 8 }}>
            Connect Your Bank Account
          </div>
          <div style={{ fontSize: '0.83rem', color: '#8b949e', marginBottom: 20, maxWidth: 400, margin: '0 auto 20px' }}>
            StreamPireX uses Stripe Express to send payouts directly to your bank account or debit card. Setup takes about 2 minutes.
          </div>
          <button style={S.btnTeal} onClick={connectStripe}>
            🔗 Connect with Stripe
          </button>
          <div style={{ fontSize: '0.7rem', color: '#5a7088', marginTop: 12 }}>
            Secured by Stripe. Your banking info is never stored on StreamPireX servers.
          </div>
        </div>
      )}

      {/* PENDING VERIFICATION */}
      {connected && !verified && (
        <div style={{ ...S.card, border: '1px solid #ff9500', padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '1.2rem' }}>⏳</span>
            <div>
              <div style={{ fontWeight: 700, color: '#ff9500' }}>Stripe Verification Pending</div>
              <div style={{ fontSize: '0.78rem', color: '#8b949e', marginTop: 2 }}>
                Stripe is reviewing your account ({data?.stripe_status}). Payouts will be available once verified.{' '}
                <button style={{ background: 'none', border: 'none', color: '#ff9500', cursor: 'pointer', fontSize: '0.78rem', textDecoration: 'underline' }}
                  onClick={connectStripe}>
                  Continue Stripe setup →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BALANCE METRICS */}
      {connected && (
        <>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={S.metricCard('#00ffc8')}>
              <div style={{ fontSize: '0.72rem', color: '#8b949e', marginBottom: 6 }}>AVAILABLE BALANCE</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#00ffc8' }}>{fmt(data?.available_balance)}</div>
              <div style={{ fontSize: '0.68rem', color: '#5a7088', marginTop: 4 }}>Ready to withdraw</div>
            </div>
            <div style={S.metricCard('#ff9500')}>
              <div style={{ fontSize: '0.72rem', color: '#8b949e', marginBottom: 6 }}>PENDING</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#ff9500' }}>{fmt(data?.pending_balance)}</div>
              <div style={{ fontSize: '0.68rem', color: '#5a7088', marginTop: 4 }}>Processing (2–7 days)</div>
            </div>
            <div style={S.metricCard('#7b61ff')}>
              <div style={{ fontSize: '0.72rem', color: '#8b949e', marginBottom: 6 }}>TOTAL PAID OUT</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#7b61ff' }}>{fmt(data?.total_paid_out)}</div>
              <div style={{ fontSize: '0.68rem', color: '#5a7088', marginTop: 4 }}>All time</div>
            </div>
            <div style={S.metricCard('#34d399')}>
              <div style={{ fontSize: '0.72rem', color: '#8b949e', marginBottom: 6 }}>TOTAL EARNED</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#34d399' }}>{fmt(data?.total_earned)}</div>
              <div style={{ fontSize: '0.68rem', color: '#5a7088', marginTop: 4 }}>On StreamPireX</div>
            </div>
          </div>

          {/* REVENUE BREAKDOWN */}
          {data?.breakdown && (
            <div style={S.card}>
              <div style={{ fontWeight: 700, color: '#e6edf3', marginBottom: 12 }}>Revenue Breakdown</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
                {Object.entries(data.breakdown).map(([key, val]) => (
                  <div key={key} style={{ background: '#21262d', borderRadius: 6, padding: 12 }}>
                    <div style={{ fontSize: '0.68rem', color: '#8b949e', marginBottom: 4, textTransform: 'capitalize' }}>
                      {key.replace(/_/g, ' ')}
                    </div>
                    <div style={{ fontWeight: 700, color: '#c9d1d9' }}>{fmt(val)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAX FORM BANNER */}
          {!data?.tax_info_submitted && (
            <div style={{ ...S.card, border: '1px solid #ff3b30', background: 'rgba(255,59,48,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#ff3b30' }}>⚠️ Tax Form Required</div>
                  <div style={{ fontSize: '0.78rem', color: '#8b949e', marginTop: 2 }}>
                    US creators earning over $600/year must submit a W-9 form. Required for 1099 reporting.
                  </div>
                </div>
                <button style={{ ...S.btnGray, borderColor: '#ff3b30', color: '#ff3b30' }} onClick={() => setShowTaxForm(true)}>
                  Submit W-9
                </button>
              </div>
            </div>
          )}

          {/* W-9 FORM */}
          {showTaxForm && (
            <div style={{ ...S.card, border: '1px solid #00ffc8' }}>
              <div style={{ fontWeight: 700, color: '#00ffc8', marginBottom: 14 }}>📋 W-9 Tax Information</div>
              <div style={{ fontSize: '0.75rem', color: '#8b949e', marginBottom: 14 }}>
                This information is used for 1099-NEC reporting only. Transmitted securely and never displayed publicly.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={S.label}>Legal Full Name</label>
                  <input style={S.input} placeholder="As it appears on your tax return"
                    value={taxForm.name} onChange={e => setTaxForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label style={S.label}>SSN Last 4 digits</label>
                  <input style={S.input} placeholder="####" maxLength={4}
                    value={taxForm.ssn_last4} onChange={e => setTaxForm(f => ({ ...f, ssn_last4: e.target.value }))} />
                </div>
                <div>
                  <label style={S.label}>EIN (if business)</label>
                  <input style={S.input} placeholder="Optional"
                    value={taxForm.ein} onChange={e => setTaxForm(f => ({ ...f, ein: e.target.value }))} />
                </div>
                <div>
                  <label style={S.label}>Address</label>
                  <input style={S.input} placeholder="Street address, City, State, ZIP"
                    value={taxForm.address} onChange={e => setTaxForm(f => ({ ...f, address: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={S.btnTeal} onClick={submitTaxForm}>✓ Submit Tax Info</button>
                <button style={S.btnGray} onClick={() => setShowTaxForm(false)}>Cancel</button>
              </div>
            </div>
          )}

          {/* PAYOUT REQUEST */}
          {verified && (
            <div style={S.card}>
              <div style={{ fontWeight: 700, color: '#e6edf3', marginBottom: 14 }}>Request Payout</div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <label style={S.label}>Amount ($25 minimum)</label>
                  <input type="number" style={S.input} placeholder="0.00" min={25}
                    max={data?.available_balance || 0}
                    value={payoutAmt} onChange={e => setPayoutAmt(e.target.value)} />
                </div>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <label style={S.label}>Payout Speed</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {['standard', 'instant'].map(type => (
                      <button key={type}
                        style={{ ...S.btnGray, flex: 1, background: payoutType === type ? '#21262d' : 'transparent', borderColor: payoutType === type ? '#00ffc8' : '#30363d', color: payoutType === type ? '#00ffc8' : '#8b949e' }}
                        onClick={() => setPayoutType(type)}>
                        {type === 'standard' ? '🏦 Standard (2 days)' : '⚡ Instant (1%)'}
                      </button>
                    ))}
                  </div>
                </div>
                <button style={S.btnTeal} onClick={requestPayout} disabled={processing}>
                  {processing ? '...' : '💸 Withdraw'}
                </button>
              </div>
              {payoutType === 'instant' && (
                <div style={{ fontSize: '0.72rem', color: '#8b949e', marginTop: 8 }}>
                  Instant payouts have a 1% fee (min $0.50). Arrives in your bank within 30 minutes.
                </div>
              )}
            </div>
          )}

          {/* HISTORY */}
          <div style={S.card}>
            <div style={{ fontWeight: 700, color: '#e6edf3', marginBottom: 14 }}>Payout History</div>
            {history.length === 0 ? (
              <div style={{ color: '#5a7088', textAlign: 'center', padding: 24 }}>No payouts yet</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Date', 'Amount', 'Speed', 'Status', 'Bank'].map(h => (
                      <th key={h} style={S.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.map(p => (
                    <tr key={p.id}>
                      <td style={S.td}>{p.created_at}</td>
                      <td style={{ ...S.td, color: '#00ffc8', fontWeight: 700 }}>{fmt(p.amount)}</td>
                      <td style={S.td}>{p.payout_type === 'instant' ? '⚡ Instant' : '🏦 Standard'}</td>
                      <td style={S.td}>
                        <span style={{ color: p.status === 'paid' ? '#34d399' : p.status === 'pending' ? '#ff9500' : '#ff3b30', fontWeight: 600 }}>
                          {p.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ ...S.td, color: '#8b949e' }}>{p.bank_last4 ? `••••${p.bank_last4}` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default PayoutDashboard;

// =============================================================================
// BACKEND — copy to src/api/payout_routes.py
// =============================================================================
/*
# pip install stripe --break-system-packages  (already installed)
import os, stripe
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from src.api.models import db, User, Revenue, BeatPurchase

payout_bp = Blueprint('payouts', __name__)
stripe.api_key = os.environ.get('STRIPE_SECRET_KEY')

# ── Model (add to models.py) ──────────────────────────────────────────────────
# class Payout(db.Model):
#     __tablename__ = 'payouts'
#     id = db.Column(db.Integer, primary_key=True)
#     user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
#     amount = db.Column(db.Float, nullable=False)
#     payout_type = db.Column(db.String(20), default='standard')  # standard | instant
#     status = db.Column(db.String(20), default='pending')         # pending | paid | failed
#     stripe_payout_id = db.Column(db.String(255), nullable=True)
#     bank_last4 = db.Column(db.String(4), nullable=True)
#     fee = db.Column(db.Float, default=0)
#     created_at = db.Column(db.DateTime, default=datetime.utcnow)
#
# class TaxInfo(db.Model):
#     __tablename__ = 'tax_info'
#     id = db.Column(db.Integer, primary_key=True)
#     user_id = db.Column(db.Integer, db.ForeignKey('user.id'), unique=True, nullable=False)
#     name = db.Column(db.String(200))
#     ssn_last4 = db.Column(db.String(4))
#     ein = db.Column(db.String(20), nullable=True)
#     address = db.Column(db.Text)
#     submitted_at = db.Column(db.DateTime, default=datetime.utcnow)
#
# Also add to User model:
#   stripe_connect_id = db.Column(db.String(255), nullable=True)
#   stripe_connect_status = db.Column(db.String(50), default='not_connected')

@payout_bp.route('/api/payouts/connect', methods=['POST'])
@jwt_required()
def connect_stripe():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')

    # Create Express account if not exists
    if not getattr(user, 'stripe_connect_id', None):
        acct = stripe.Account.create(
            type='express',
            email=user.email,
            capabilities={'transfers': {'requested': True}, 'card_payments': {'requested': True}},
            business_type='individual',
            metadata={'user_id': str(user_id)},
        )
        user.stripe_connect_id = acct['id']
        user.stripe_connect_status = 'pending'
        db.session.commit()

    # Create onboarding link
    link = stripe.AccountLink.create(
        account=user.stripe_connect_id,
        refresh_url=f'{frontend_url}/creator/payouts?reconnect=1',
        return_url=f'{frontend_url}/creator/payouts?connected=1',
        type='account_onboarding',
    )
    return jsonify({'onboarding_url': link['url']}), 200

@payout_bp.route('/api/payouts/balance', methods=['GET'])
@jwt_required()
def get_balance():
    from src.api.models import TaxInfo, Payout
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    # Calculate available balance = total earned - total paid out
    total_earned = db.session.query(db.func.sum(Revenue.amount)).filter_by(user_id=user_id).scalar() or 0
    total_paid_out = db.session.query(db.func.sum(Payout.amount)).filter_by(user_id=user_id, status='paid').scalar() or 0
    pending_payouts = db.session.query(db.func.sum(Payout.amount)).filter_by(user_id=user_id, status='pending').scalar() or 0
    available = max(0, total_earned - total_paid_out - pending_payouts)

    # Revenue breakdown
    beat_rev = db.session.query(db.func.sum(BeatPurchase.producer_earnings)).filter_by(producer_id=user_id).scalar() or 0

    # Check Stripe status
    stripe_status = 'not_connected'
    if getattr(user, 'stripe_connect_id', None):
        try:
            acct = stripe.Account.retrieve(user.stripe_connect_id)
            stripe_status = 'verified' if acct['charges_enabled'] else 'pending'
            user.stripe_connect_status = stripe_status
            db.session.commit()
        except: pass

    tax_submitted = TaxInfo.query.filter_by(user_id=user_id).first() is not None

    return jsonify({
        'available_balance': round(available, 2),
        'pending_balance': round(pending_payouts, 2),
        'total_paid_out': round(total_paid_out, 2),
        'total_earned': round(total_earned, 2),
        'stripe_connected': bool(getattr(user, 'stripe_connect_id', None)),
        'stripe_status': stripe_status,
        'tax_info_submitted': tax_submitted,
        'breakdown': {
            'beat_sales': round(beat_rev, 2),
            'subscriptions': 0,  # add from Revenue where type='membership'
            'tips': 0,
            'donations': 0,
        }
    }), 200

@payout_bp.route('/api/payouts/request', methods=['POST'])
@jwt_required()
def request_payout():
    from src.api.models import Payout
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    data = request.get_json()
    amount = float(data.get('amount', 0))
    payout_type = data.get('payout_type', 'standard')

    if amount < 25: return jsonify({'error': 'Minimum payout is $25'}), 400
    if not getattr(user, 'stripe_connect_id', None):
        return jsonify({'error': 'Please connect your Stripe account first'}), 400

    fee = round(amount * 0.01, 2) if payout_type == 'instant' else 0
    net = round(amount - fee, 2)

    try:
        transfer = stripe.Transfer.create(
            amount=int(net * 100),
            currency='usd',
            destination=user.stripe_connect_id,
            metadata={'user_id': str(user_id), 'payout_type': payout_type},
        )

        payout = Payout(user_id=user_id, amount=amount, payout_type=payout_type,
                        status='pending', stripe_payout_id=transfer['id'], fee=fee)
        db.session.add(payout); db.session.commit()
        return jsonify({'message': 'Payout initiated', 'id': payout.id}), 201
    except stripe.error.StripeError as e:
        return jsonify({'error': str(e.user_message)}), 400

@payout_bp.route('/api/payouts/history', methods=['GET'])
@jwt_required()
def payout_history():
    from src.api.models import Payout
    user_id = get_jwt_identity()
    payouts = Payout.query.filter_by(user_id=user_id).order_by(Payout.created_at.desc()).limit(50).all()
    return jsonify([{
        'id': p.id, 'amount': p.amount, 'payout_type': p.payout_type,
        'status': p.status, 'fee': p.fee, 'bank_last4': p.bank_last4,
        'created_at': p.created_at.strftime('%b %d, %Y') if p.created_at else None,
    } for p in payouts]), 200

@payout_bp.route('/api/payouts/tax-info', methods=['POST'])
@jwt_required()
def submit_tax_info():
    from src.api.models import TaxInfo
    user_id = get_jwt_identity()
    data = request.get_json()
    existing = TaxInfo.query.filter_by(user_id=user_id).first()
    if existing:
        existing.name = data.get('name', existing.name)
        existing.ssn_last4 = data.get('ssn_last4', existing.ssn_last4)
        existing.address = data.get('address', existing.address)
    else:
        ti = TaxInfo(user_id=user_id, name=data.get('name'), ssn_last4=data.get('ssn_last4'),
                     ein=data.get('ein'), address=data.get('address'))
        db.session.add(ti)
    db.session.commit()
    return jsonify({'message': 'Tax info saved'}), 200

# Register in app.py:
# from .payout_routes import payout_bp
# app.register_blueprint(payout_bp)
#
# Add to User model:
#   stripe_connect_id = db.Column(db.String(255), nullable=True)
#   stripe_connect_status = db.Column(db.String(50), default='not_connected')
#
# Migration:
#   flask db migrate -m "add payout and tax_info tables, stripe_connect to user"
#   flask db upgrade
#
# Add route in layout.js:
#   <Route path="/creator/payouts" element={<PayoutDashboard />} />
#
# Add link in ArtistDashboard sidebar:
#   <Link to="/creator/payouts">💸 Payouts</Link>
#
# Webhook: Add handler for transfer.paid event to mark Payout.status = 'paid'
# in your existing Stripe webhook handler.
*/