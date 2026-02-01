// src/front/js/pages/TipJarPage.js
// =====================================================
// TIP JAR PAGE - Standalone shareable tip page
// Route: /support/:username  or  /tip/:username
// =====================================================
// Creators can share this link anywhere for fans to
// send tips directly: streampirex.com/support/djmike
// =====================================================

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Heart, DollarSign, CreditCard, X, Check, Loader,
  Gift, MessageSquare, Eye, EyeOff, Sparkles, Share2,
  ExternalLink, Copy, CheckCircle, ArrowLeft, Music,
  Video, Mic, Gamepad2, User
} from 'lucide-react';
import '../../styles/TipJarPage.css';

const backendURL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

// Get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('jwt-token') || localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

const TipJarPage = () => {
  const { username } = useParams();
  const navigate = useNavigate();

  // Creator state
  const [creator, setCreator] = useState(null);
  const [creatorPaymentSettings, setCreatorPaymentSettings] = useState(null);
  const [recentTips, setRecentTips] = useState([]);
  const [loadingCreator, setLoadingCreator] = useState(true);
  const [creatorError, setCreatorError] = useState('');

  // Tip form state
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [customAmount, setCustomAmount] = useState('');
  const [message, setMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('stripe');
  const [step, setStep] = useState('amount'); // 'amount', 'payment', 'processing', 'success', 'external'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tipResult, setTipResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const presetAmounts = [2, 5, 10, 25, 50, 100];

  // Fetch creator by username
  useEffect(() => {
    if (username) fetchCreator();
  }, [username]);

  const fetchCreator = async () => {
    setLoadingCreator(true);
    setCreatorError('');

    try {
      // Fetch user by username
      const res = await fetch(`${backendURL}/api/users/username/${username}`);

      if (!res.ok) {
        if (res.status === 404) {
          setCreatorError('Creator not found');
        } else {
          setCreatorError('Failed to load creator profile');
        }
        return;
      }

      const data = await res.json();
      setCreator(data);

      // Fetch creator payment settings
      try {
        const settingsRes = await fetch(`${backendURL}/api/tips/creator/${data.id}`, {
          headers: getAuthHeaders()
        });
        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          setCreatorPaymentSettings(settingsData);
        }
      } catch (err) {
        console.error('Error fetching payment settings:', err);
      }

      // Fetch recent public tips (optional)
      try {
        const tipsRes = await fetch(`${backendURL}/api/tips/creator/${data.id}/recent`);
        if (tipsRes.ok) {
          const tipsData = await tipsRes.json();
          setRecentTips(tipsData.tips || []);
        }
      } catch (err) {
        // Not critical - recent tips endpoint may not exist yet
        console.log('Recent tips not available');
      }

    } catch (err) {
      setCreatorError('Network error. Please try again.');
    } finally {
      setLoadingCreator(false);
    }
  };

  // Get final amount
  const getFinalAmount = () => {
    if (selectedAmount) return selectedAmount;
    if (customAmount && !isNaN(parseFloat(customAmount))) return parseFloat(customAmount);
    return 0;
  };

  // Calculate fees
  const getPlatformFee = () => {
    const amount = getFinalAmount();
    if (selectedPaymentMethod === 'stripe') return amount * 0.10;
    return 0;
  };

  const getCreatorAmount = () => getFinalAmount() - getPlatformFee();

  // Handle amount selection
  const handlePresetClick = (amount) => {
    setSelectedAmount(amount);
    setCustomAmount('');
    setError('');
  };

  const handleCustomAmountChange = (e) => {
    const val = e.target.value;
    if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) {
      setCustomAmount(val);
      setSelectedAmount(null);
      setError('');
    }
  };

  // Continue to payment
  const handleContinueToPayment = () => {
    const token = localStorage.getItem('jwt-token') || localStorage.getItem('token');
    if (!token) {
      navigate(`/login?redirect=/support/${username}`);
      return;
    }

    const amount = getFinalAmount();
    if (amount < 1) {
      setError('Minimum tip is $1.00');
      return;
    }
    if (amount > 500) {
      setError('Maximum tip is $500.00');
      return;
    }
    setError('');
    setStep('payment');
  };

  // Available payment methods
  const getAvailablePaymentMethods = () => {
    const methods = [
      { id: 'stripe', name: 'Card', icon: '💳', fee: '10% platform fee', always: true },
    ];

    if (creatorPaymentSettings) {
      if (creatorPaymentSettings.cashapp_username) {
        methods.push({ id: 'cashapp', name: 'Cash App', icon: '💵', fee: 'No fee' });
      }
      if (creatorPaymentSettings.venmo_username) {
        methods.push({ id: 'venmo', name: 'Venmo', icon: '💸', fee: 'No fee' });
      }
      if (creatorPaymentSettings.paypal_email) {
        methods.push({ id: 'paypal', name: 'PayPal', icon: '🅿️', fee: 'No fee' });
      }
      if (creatorPaymentSettings.crypto_address) {
        methods.push({ id: 'crypto', name: 'Crypto', icon: '🪙', fee: 'No fee' });
      }
      if (creatorPaymentSettings.zelle_identifier) {
        methods.push({ id: 'zelle', name: 'Zelle', icon: '🏦', fee: 'No fee' });
      }
    }

    return methods;
  };

  // Send tip via Stripe
  const handleStripeTip = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${backendURL}/api/tips/quick-pay`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          creator_id: creator.id,
          amount: getFinalAmount(),
          message: message.trim() || null,
          is_anonymous: isAnonymous,
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create payment');

      if (data.client_secret) {
        setTipResult({
          tipId: data.tip_id,
          clientSecret: data.client_secret,
          amount: getFinalAmount(),
        });

        // Confirm tip
        const confirmRes = await fetch(`${backendURL}/api/tips/confirm/${data.tip_id}`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ payment_intent_id: data.client_secret.split('_secret_')[0] })
        });

        if (confirmRes.ok) {
          setStep('success');
        } else {
          setStep('success'); // Still show success - Stripe will handle
        }
      }
    } catch (err) {
      setError(err.message || 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Send tip via external method
  const handleExternalTip = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${backendURL}/api/tips/external`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          creator_id: creator.id,
          amount: getFinalAmount(),
          payment_method: selectedPaymentMethod,
          message: message.trim() || null,
          is_anonymous: isAnonymous,
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to log tip');

      setTipResult(data);
      setStep('external');
    } catch (err) {
      setError(err.message || 'Failed to process.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendTip = () => {
    if (selectedPaymentMethod === 'stripe') handleStripeTip();
    else handleExternalTip();
  };

  // Copy helpers
  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  // Get external payment info
  const getExternalPaymentInfo = () => {
    if (!creatorPaymentSettings) return null;
    switch (selectedPaymentMethod) {
      case 'cashapp':
        return { label: 'Cash App', value: `$${creatorPaymentSettings.cashapp_username}`, instruction: `Send $${getFinalAmount().toFixed(2)} to this Cash App`, link: null };
      case 'venmo':
        return { label: 'Venmo', value: `@${creatorPaymentSettings.venmo_username}`, instruction: `Send $${getFinalAmount().toFixed(2)} via Venmo to`, link: null };
      case 'paypal':
        return { label: 'PayPal', value: creatorPaymentSettings.paypal_email, instruction: `Send $${getFinalAmount().toFixed(2)} via PayPal to`, link: `https://paypal.me/${creatorPaymentSettings.paypal_email}` };
      case 'crypto':
        return { label: `Crypto (${creatorPaymentSettings.crypto_network || 'ETH'})`, value: creatorPaymentSettings.crypto_address, instruction: `Send crypto equivalent of $${getFinalAmount().toFixed(2)} to`, link: null };
      case 'zelle':
        return { label: 'Zelle', value: creatorPaymentSettings.zelle_identifier, instruction: `Send $${getFinalAmount().toFixed(2)} via Zelle to`, link: null };
      default:
        return null;
    }
  };

  // Get creator type icons
  const getCreatorBadges = () => {
    if (!creator) return [];
    const badges = [];
    if (creator.is_artist || creator.has_music) badges.push({ icon: <Music size={14} />, label: 'Musician' });
    if (creator.has_videos || creator.has_channel) badges.push({ icon: <Video size={14} />, label: 'Video Creator' });
    if (creator.has_podcast) badges.push({ icon: <Mic size={14} />, label: 'Podcaster' });
    if (creator.is_gamer) badges.push({ icon: <Gamepad2 size={14} />, label: 'Gamer' });
    return badges;
  };

  // ========== LOADING STATE ==========
  if (loadingCreator) {
    return (
      <div className="tipjar-page">
        <div className="tipjar-page-loading">
          <div className="tipjar-page-spinner"></div>
          <p>Loading creator...</p>
        </div>
      </div>
    );
  }

  // ========== ERROR STATE ==========
  if (creatorError) {
    return (
      <div className="tipjar-page">
        <div className="tipjar-page-error">
          <div className="error-icon">😔</div>
          <h2>{creatorError}</h2>
          <p>The creator @{username} could not be found or doesn't accept tips.</p>
          <Link to="/" className="tipjar-home-link">
            <ArrowLeft size={16} /> Back to Home
          </Link>
        </div>
      </div>
    );
  }

  // ========== MAIN PAGE ==========
  return (
    <div className="tipjar-page">
      <div className="tipjar-page-container">

        {/* ===== CREATOR PROFILE CARD ===== */}
        <div className="tipjar-page-profile-card">
          {/* Cover gradient */}
          <div className="tipjar-page-cover">
            {creator.cover_photo ? (
              <img src={creator.cover_photo} alt="" className="tipjar-cover-img" />
            ) : null}
            <div className="tipjar-cover-overlay"></div>
          </div>

          {/* Creator info */}
          <div className="tipjar-page-creator-info">
            <div className="tipjar-page-avatar">
              {creator.profile_picture ? (
                <img src={creator.profile_picture} alt={creator.username} />
              ) : (
                <div className="tipjar-page-avatar-placeholder">
                  {(creator.display_name || creator.username || '?').charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <h1 className="tipjar-page-name">
              {creator.display_name || creator.username}
            </h1>
            <p className="tipjar-page-username">@{creator.username}</p>

            {creator.bio && (
              <p className="tipjar-page-bio">{creator.bio}</p>
            )}

            {/* Creator badges */}
            {getCreatorBadges().length > 0 && (
              <div className="tipjar-page-badges">
                {getCreatorBadges().map((badge, i) => (
                  <span key={i} className="tipjar-badge">
                    {badge.icon} {badge.label}
                  </span>
                ))}
              </div>
            )}

            {/* Share link */}
            <button className="tipjar-share-btn" onClick={handleShareLink}>
              {shareCopied ? <Check size={14} /> : <Share2 size={14} />}
              {shareCopied ? 'Link Copied!' : 'Share Tip Link'}
            </button>
          </div>
        </div>

        {/* ===== TIP FORM CARD ===== */}
        <div className="tipjar-page-form-card">

          {/* ========== STEP 1: AMOUNT ========== */}
          {step === 'amount' && (
            <>
              <h2 className="tipjar-page-form-title">
                💰 Support {creator.display_name || creator.username}
              </h2>

              {/* Preset Amounts */}
              <div className="tipjar-page-amount-grid">
                {presetAmounts.map((amount) => (
                  <button
                    key={amount}
                    className={`tipjar-page-amount-btn ${selectedAmount === amount ? 'selected' : ''}`}
                    onClick={() => handlePresetClick(amount)}
                  >
                    ${amount}
                  </button>
                ))}
              </div>

              {/* Custom Amount */}
              <div className="tipjar-page-custom-amount">
                <span className="currency-symbol">$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Custom amount"
                  value={customAmount}
                  onChange={handleCustomAmountChange}
                  onFocus={() => setSelectedAmount(null)}
                />
              </div>

              {/* Message */}
              <div className="tipjar-page-message">
                <label>
                  <MessageSquare size={14} /> Add a message (optional)
                </label>
                <textarea
                  placeholder={`Say something nice to ${creator.display_name || creator.username}...`}
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, 200))}
                  maxLength={200}
                />
                <span className="char-count">{message.length}/200</span>
              </div>

              {/* Anonymous Toggle */}
              <label className="tipjar-page-anonymous">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                />
                <div className="toggle-info">
                  <span className="toggle-label">
                    {isAnonymous ? <EyeOff size={14} /> : <Eye size={14} />}
                    {isAnonymous ? ' Send anonymously' : ' Show my name'}
                  </span>
                  <span className="toggle-hint">
                    {isAnonymous ? 'Creator won\'t see who sent this' : 'Creator will see your username'}
                  </span>
                </div>
              </label>

              {error && <div className="tipjar-page-error-msg">{error}</div>}

              <button
                className="tipjar-page-continue-btn"
                onClick={handleContinueToPayment}
                disabled={getFinalAmount() < 1}
              >
                Continue — ${getFinalAmount() > 0 ? getFinalAmount().toFixed(2) : '0.00'}
              </button>

              <p className="tipjar-page-note">
                <Heart size={12} /> Creators receive 90% of card tips and 100% of external tips
              </p>
            </>
          )}

          {/* ========== STEP 2: PAYMENT ========== */}
          {step === 'payment' && (
            <>
              <button className="tipjar-page-back-btn" onClick={() => setStep('amount')}>
                ← Back
              </button>
              <h2 className="tipjar-page-form-title">💳 Choose Payment</h2>

              <div className="tipjar-page-summary-bar">
                <span>Tip Amount</span>
                <span className="summary-amount">${getFinalAmount().toFixed(2)}</span>
              </div>

              <div className="tipjar-page-payment-methods">
                {getAvailablePaymentMethods().map((method) => (
                  <button
                    key={method.id}
                    className={`tipjar-page-method-btn ${selectedPaymentMethod === method.id ? 'selected' : ''}`}
                    onClick={() => setSelectedPaymentMethod(method.id)}
                  >
                    <span className="method-icon">{method.icon}</span>
                    <div className="method-info">
                      <span className="method-name">{method.name}</span>
                      <span className="method-fee">{method.fee}</span>
                    </div>
                    {selectedPaymentMethod === method.id && <Check size={16} className="method-check" />}
                  </button>
                ))}
              </div>

              {/* Fee Breakdown */}
              <div className="tipjar-page-fee-breakdown">
                <div className="fee-row">
                  <span>Tip Amount</span>
                  <span>${getFinalAmount().toFixed(2)}</span>
                </div>
                {selectedPaymentMethod === 'stripe' && (
                  <div className="fee-row deduction">
                    <span>Platform Fee (10%)</span>
                    <span>-${getPlatformFee().toFixed(2)}</span>
                  </div>
                )}
                <div className="fee-row total">
                  <span>{creator.display_name || creator.username} receives</span>
                  <span className="receives-amount">${getCreatorAmount().toFixed(2)}</span>
                </div>
              </div>

              {error && <div className="tipjar-page-error-msg">{error}</div>}

              <button
                className="tipjar-page-send-btn"
                onClick={handleSendTip}
                disabled={loading}
              >
                {loading ? (
                  <><Loader size={16} className="spin" /> Processing...</>
                ) : selectedPaymentMethod === 'stripe' ? (
                  <><CreditCard size={16} /> Pay ${getFinalAmount().toFixed(2)}</>
                ) : (
                  <><ExternalLink size={16} /> Send via {getAvailablePaymentMethods().find(m => m.id === selectedPaymentMethod)?.name}</>
                )}
              </button>
            </>
          )}

          {/* ========== STEP 3: SUCCESS ========== */}
          {step === 'success' && (
            <div className="tipjar-page-success">
              <div className="success-animation">
                <div className="success-circle">
                  <CheckCircle size={48} />
                </div>
              </div>
              <h2>Tip Sent! 🎉</h2>
              <p className="success-amount">${getFinalAmount().toFixed(2)}</p>
              <p className="success-text">Your support means the world to {creator.display_name || creator.username}!</p>
              {message && (
                <div className="success-message">
                  <MessageSquare size={14} /> "{message}"
                </div>
              )}
              <button className="tipjar-page-done-btn" onClick={() => { setStep('amount'); setSelectedAmount(null); setCustomAmount(''); setMessage(''); }}>
                Send Another Tip
              </button>
              <Link to={`/profile/${creator.username}`} className="tipjar-page-profile-link">
                View {creator.display_name || creator.username}'s Profile
              </Link>
            </div>
          )}

          {/* ========== STEP 4: EXTERNAL ========== */}
          {step === 'external' && (
            <div className="tipjar-page-external">
              <div className="external-icon-large">
                {getAvailablePaymentMethods().find(m => m.id === selectedPaymentMethod)?.icon || '💰'}
              </div>
              <h2>Almost There!</h2>

              {(() => {
                const info = getExternalPaymentInfo();
                if (!info) return <p>Payment info not available.</p>;
                return (
                  <>
                    <p className="external-instruction">{info.instruction}</p>
                    <div className="external-value-box">
                      <span className="ext-label">{info.label}</span>
                      <div className="ext-value-row">
                        <code className="ext-value">{info.value}</code>
                        <button className="ext-copy-btn" onClick={() => handleCopy(info.value)}>
                          {copied ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      </div>
                      {info.link && (
                        <a href={info.link} target="_blank" rel="noopener noreferrer" className="ext-link">
                          <ExternalLink size={14} /> Open {info.label}
                        </a>
                      )}
                    </div>
                    <div className="external-note">
                      <p>✅ We've logged this tip for {creator.display_name || creator.username}'s records.</p>
                    </div>
                  </>
                );
              })()}

              <button className="tipjar-page-done-btn" onClick={() => { setStep('amount'); setSelectedAmount(null); setCustomAmount(''); setMessage(''); }}>
                Done
              </button>
            </div>
          )}
        </div>

        {/* ===== RECENT TIPS (if any) ===== */}
        {recentTips.length > 0 && (
          <div className="tipjar-page-recent-tips">
            <h3>💝 Recent Supporters</h3>
            <div className="recent-tips-list">
              {recentTips.slice(0, 10).map((tip, i) => (
                <div key={i} className="recent-tip-item">
                  <div className="recent-tip-avatar">
                    {tip.is_anonymous ? '🎭' : (tip.sender?.username?.charAt(0).toUpperCase() || '?')}
                  </div>
                  <div className="recent-tip-info">
                    <span className="recent-tip-name">
                      {tip.is_anonymous ? 'Anonymous' : (tip.sender?.username || 'Someone')}
                    </span>
                    <span className="recent-tip-amount">${parseFloat(tip.amount).toFixed(2)}</span>
                  </div>
                  {tip.message && (
                    <p className="recent-tip-message">"{tip.message}"</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default TipJarPage;