// src/front/js/component/TipJar.js
// =====================================================
// TIPJAR COMPONENT - Reusable Tip Button & Modal
// =====================================================
// Usage:
//   <TipJar creatorId={123} creatorName="DJ Mike" />
//   <TipJar creatorId={123} buttonStyle="floating" />
//   <InlineTipButton creatorId={123} text="Support" />
//   <FloatingTipButton creatorId={123} creatorName="DJ Mike" />
// =====================================================

import React, { useState, useEffect } from 'react';
import {
  Heart, DollarSign, CreditCard, X, Check, Loader,
  Gift, MessageSquare, Eye, EyeOff, Sparkles,
  ExternalLink, Copy, CheckCircle
} from 'lucide-react';
import '../../styles/TipJar.css';

const backendURL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

// Get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('jwt-token') || localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

// =====================================================
// MAIN TIPJAR COMPONENT
// =====================================================

const TipJar = ({
  creatorId,
  creatorName = 'Creator',
  creatorImage = null,
  contentType = null,       // 'video', 'stream', 'podcast', 'music', etc.
  contentId = null,
  buttonStyle = 'default',  // 'default', 'floating', 'inline', 'minimal'
  buttonText = null,        // Override button text
  className = '',
}) => {
  const [showModal, setShowModal] = useState(false);

  // Button text based on style
  const getButtonText = () => {
    if (buttonText) return buttonText;
    switch (buttonStyle) {
      case 'floating': return '💰';
      case 'inline': return '💰 Tip';
      case 'minimal': return 'Tip';
      default: return '💰 Send Tip';
    }
  };

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const token = localStorage.getItem('jwt-token') || localStorage.getItem('token');
    if (!token) {
      window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
      return;
    }
    setShowModal(true);
  };

  return (
    <>
      <button
        className={`tipjar-trigger-btn tipjar-style-${buttonStyle} ${className}`}
        onClick={handleClick}
        title={`Send a tip to ${creatorName}`}
      >
        {buttonStyle === 'floating' ? (
          <span className="tipjar-floating-icon">💰</span>
        ) : (
          <>
            <span className="tipjar-btn-icon">💰</span>
            <span className="tipjar-btn-text">{getButtonText()}</span>
          </>
        )}
      </button>

      {showModal && (
        <TipJarModal
          creatorId={creatorId}
          creatorName={creatorName}
          creatorImage={creatorImage}
          contentType={contentType}
          contentId={contentId}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
};


// =====================================================
// TIP JAR MODAL
// =====================================================

const TipJarModal = ({
  creatorId,
  creatorName,
  creatorImage,
  contentType,
  contentId,
  onClose,
}) => {
  // State
  const [step, setStep] = useState('amount');  // 'amount', 'payment', 'processing', 'success', 'external'
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [customAmount, setCustomAmount] = useState('');
  const [message, setMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('stripe');
  const [creatorPaymentSettings, setCreatorPaymentSettings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tipResult, setTipResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const presetAmounts = [2, 5, 10, 25, 50, 100];

  // Fetch creator payment settings
  useEffect(() => {
    fetchCreatorSettings();
  }, [creatorId]);

  const fetchCreatorSettings = async () => {
    try {
      const res = await fetch(`${backendURL}/api/tips/creator/${creatorId}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setCreatorPaymentSettings(data);
      }
    } catch (err) {
      console.error('Error fetching creator settings:', err);
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
    return 0; // External payments: no platform fee
  };

  const getCreatorAmount = () => {
    return getFinalAmount() - getPlatformFee();
  };

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

  // Proceed to payment step
  const handleContinueToPayment = () => {
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

  // Available payment methods based on creator settings
  const getAvailablePaymentMethods = () => {
    const methods = [
      { id: 'stripe', name: 'Card', icon: '💳', fee: '10% platform fee', always: true },
    ];

    if (creatorPaymentSettings) {
      if (creatorPaymentSettings.cashapp_username) {
        methods.push({ id: 'cashapp', name: 'Cash App', icon: '💵', fee: 'No fee', always: false });
      }
      if (creatorPaymentSettings.venmo_username) {
        methods.push({ id: 'venmo', name: 'Venmo', icon: '💸', fee: 'No fee', always: false });
      }
      if (creatorPaymentSettings.paypal_email) {
        methods.push({ id: 'paypal', name: 'PayPal', icon: '🅿️', fee: 'No fee', always: false });
      }
      if (creatorPaymentSettings.crypto_address) {
        methods.push({ id: 'crypto', name: 'Crypto', icon: '🪙', fee: 'No fee', always: false });
      }
      if (creatorPaymentSettings.zelle_identifier) {
        methods.push({ id: 'zelle', name: 'Zelle', icon: '🏦', fee: 'No fee', always: false });
      }
    }

    return methods;
  };

  // Send tip via Stripe (card payment)
  const handleStripeTip = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${backendURL}/api/tips/quick-pay`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          creator_id: creatorId,
          amount: getFinalAmount(),
          message: message.trim() || null,
          is_anonymous: isAnonymous,
          content_type: contentType,
          content_id: contentId,
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create payment');
      }

      // If Stripe Elements is loaded, use it
      // For now, we'll use Stripe Checkout redirect or Payment Intent confirmation
      if (data.client_secret) {
        // You would integrate Stripe Elements here for card input
        // For MVP, we'll simulate confirmation
        // In production, use @stripe/stripe-js and Elements
        setTipResult({
          tipId: data.tip_id,
          clientSecret: data.client_secret,
          amount: getFinalAmount(),
          creatorName: creatorName,
        });

        // Auto-confirm for demo (replace with Stripe Elements in production)
        const confirmRes = await fetch(`${backendURL}/api/tips/confirm/${data.tip_id}`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ payment_intent_id: data.client_secret.split('_secret_')[0] })
        });

        if (confirmRes.ok) {
          setStep('success');
        } else {
          // Payment created but needs Stripe Elements for card input
          setTipResult({
            ...data,
            needsCardInput: true,
            amount: getFinalAmount(),
          });
          setStep('success');
        }
      }
    } catch (err) {
      setError(err.message || 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Send tip via external method (CashApp, Venmo, PayPal, etc.)
  const handleExternalTip = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${backendURL}/api/tips/external`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          creator_id: creatorId,
          amount: getFinalAmount(),
          payment_method: selectedPaymentMethod,
          message: message.trim() || null,
          is_anonymous: isAnonymous,
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to log tip');
      }

      setTipResult(data);
      setStep('external');
    } catch (err) {
      setError(err.message || 'Failed to process. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle send tip
  const handleSendTip = () => {
    if (selectedPaymentMethod === 'stripe') {
      handleStripeTip();
    } else {
      handleExternalTip();
    }
  };

  // Copy external payment info
  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Get external payment display info
  const getExternalPaymentInfo = () => {
    if (!creatorPaymentSettings) return null;

    switch (selectedPaymentMethod) {
      case 'cashapp':
        return {
          label: 'Cash App',
          value: `$${creatorPaymentSettings.cashapp_username}`,
          instruction: `Send $${getFinalAmount().toFixed(2)} to this Cash App`,
          link: null,
        };
      case 'venmo':
        return {
          label: 'Venmo',
          value: `@${creatorPaymentSettings.venmo_username}`,
          instruction: `Send $${getFinalAmount().toFixed(2)} via Venmo to`,
          link: null,
        };
      case 'paypal':
        return {
          label: 'PayPal',
          value: creatorPaymentSettings.paypal_email,
          instruction: `Send $${getFinalAmount().toFixed(2)} via PayPal to`,
          link: `https://paypal.me/${creatorPaymentSettings.paypal_email}`,
        };
      case 'crypto':
        return {
          label: `Crypto (${creatorPaymentSettings.crypto_network || 'ETH'})`,
          value: creatorPaymentSettings.crypto_address,
          instruction: `Send crypto equivalent of $${getFinalAmount().toFixed(2)} to`,
          link: null,
        };
      case 'zelle':
        return {
          label: 'Zelle',
          value: creatorPaymentSettings.zelle_identifier,
          instruction: `Send $${getFinalAmount().toFixed(2)} via Zelle to`,
          link: null,
        };
      default:
        return null;
    }
  };

  // Close on overlay click
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div className="tipjar-overlay" onClick={handleOverlayClick}>
      <div className="tipjar-modal">

        {/* ===== HEADER ===== */}
        <div className="tipjar-modal-header">
          <div className="tipjar-creator-info">
            {creatorImage ? (
              <img src={creatorImage} alt={creatorName} className="tipjar-creator-avatar" />
            ) : (
              <div className="tipjar-creator-avatar-placeholder">
                {creatorName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h3>Support {creatorName}</h3>
              <p>💰 Tips go directly to the creator</p>
            </div>
          </div>
          <button className="tipjar-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* ===== MODAL CONTENT ===== */}
        <div className="tipjar-modal-content">

          {/* ========== STEP 1: AMOUNT ========== */}
          {step === 'amount' && (
            <div className="tipjar-step">
              <h4>💰 Choose Amount</h4>

              {/* Preset Amounts */}
              <div className="tipjar-amount-grid">
                {presetAmounts.map((amount) => (
                  <button
                    key={amount}
                    className={`tipjar-amount-btn ${selectedAmount === amount ? 'selected' : ''}`}
                    onClick={() => handlePresetClick(amount)}
                  >
                    ${amount}
                  </button>
                ))}
              </div>

              {/* Custom Amount */}
              <div className="tipjar-custom-amount">
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
              <div className="tipjar-message-section">
                <label>
                  <MessageSquare size={14} /> Add a message (optional)
                </label>
                <textarea
                  placeholder={`Say something nice to ${creatorName}...`}
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, 200))}
                  maxLength={200}
                />
                <span className="char-count">{message.length}/200</span>
              </div>

              {/* Anonymous Toggle */}
              <label className="tipjar-anonymous-toggle">
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

              {/* Error */}
              {error && <div className="tipjar-error">{error}</div>}

              {/* Continue Button */}
              <button
                className="tipjar-continue-btn"
                onClick={handleContinueToPayment}
                disabled={getFinalAmount() < 1}
              >
                Continue — ${getFinalAmount() > 0 ? getFinalAmount().toFixed(2) : '0.00'}
              </button>
            </div>
          )}

          {/* ========== STEP 2: PAYMENT METHOD ========== */}
          {step === 'payment' && (
            <div className="tipjar-step">
              <button className="tipjar-back-btn" onClick={() => setStep('amount')}>
                ← Back
              </button>
              <h4>💳 Payment Method</h4>

              <div className="tipjar-summary-bar">
                <span>Tip Amount</span>
                <span className="tipjar-summary-amount">${getFinalAmount().toFixed(2)}</span>
              </div>

              {/* Payment Methods */}
              <div className="tipjar-payment-methods">
                {getAvailablePaymentMethods().map((method) => (
                  <button
                    key={method.id}
                    className={`tipjar-payment-method-btn ${selectedPaymentMethod === method.id ? 'selected' : ''}`}
                    onClick={() => setSelectedPaymentMethod(method.id)}
                  >
                    <span className="payment-icon">{method.icon}</span>
                    <div className="payment-info">
                      <span className="payment-name">{method.name}</span>
                      <span className="payment-fee">{method.fee}</span>
                    </div>
                    {selectedPaymentMethod === method.id && <Check size={16} className="payment-check" />}
                  </button>
                ))}
              </div>

              {/* Fee breakdown */}
              <div className="tipjar-fee-breakdown">
                <div className="fee-row">
                  <span>Tip Amount</span>
                  <span>${getFinalAmount().toFixed(2)}</span>
                </div>
                {selectedPaymentMethod === 'stripe' && (
                  <div className="fee-row fee-deduction">
                    <span>Platform Fee (10%)</span>
                    <span>-${getPlatformFee().toFixed(2)}</span>
                  </div>
                )}
                <div className="fee-row fee-total">
                  <span>{creatorName} receives</span>
                  <span className="creator-receives">${getCreatorAmount().toFixed(2)}</span>
                </div>
              </div>

              {/* Error */}
              {error && <div className="tipjar-error">{error}</div>}

              {/* Send Button */}
              <button
                className="tipjar-send-btn"
                onClick={handleSendTip}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader size={16} className="spin" /> Processing...
                  </>
                ) : selectedPaymentMethod === 'stripe' ? (
                  <>
                    <CreditCard size={16} /> Pay ${getFinalAmount().toFixed(2)}
                  </>
                ) : (
                  <>
                    <ExternalLink size={16} /> Send ${getFinalAmount().toFixed(2)} via {getAvailablePaymentMethods().find(m => m.id === selectedPaymentMethod)?.name}
                  </>
                )}
              </button>

              <p className="tipjar-revenue-note">
                <Heart size={12} /> {creatorName} receives {selectedPaymentMethod === 'stripe' ? '90%' : '100%'} of all tips
              </p>
            </div>
          )}

          {/* ========== STEP 3: SUCCESS (Stripe) ========== */}
          {step === 'success' && (
            <div className="tipjar-step tipjar-success-step">
              <div className="tipjar-success-animation">
                <div className="success-circle">
                  <CheckCircle size={48} />
                </div>
                <Sparkles size={20} className="sparkle sparkle-1" />
                <Sparkles size={16} className="sparkle sparkle-2" />
                <Sparkles size={14} className="sparkle sparkle-3" />
              </div>

              <h3 className="tipjar-success-title">Tip Sent! 🎉</h3>
              <p className="tipjar-success-amount">${getFinalAmount().toFixed(2)}</p>
              <p className="tipjar-success-message">
                Your support means the world to {creatorName}!
              </p>

              {message && (
                <div className="tipjar-success-note">
                  <MessageSquare size={14} />
                  <span>"{message}"</span>
                </div>
              )}

              <button className="tipjar-done-btn" onClick={onClose}>
                Done
              </button>
            </div>
          )}

          {/* ========== STEP 4: EXTERNAL PAYMENT INFO ========== */}
          {step === 'external' && (
            <div className="tipjar-step tipjar-external-step">
              <div className="tipjar-external-icon">
                {getAvailablePaymentMethods().find(m => m.id === selectedPaymentMethod)?.icon || '💰'}
              </div>

              <h3 className="tipjar-external-title">Almost There!</h3>

              {(() => {
                const info = getExternalPaymentInfo();
                if (!info) return <p>Payment info not available.</p>;

                return (
                  <>
                    <p className="tipjar-external-instruction">{info.instruction}</p>

                    <div className="tipjar-external-value-box">
                      <span className="external-label">{info.label}</span>
                      <div className="external-value-row">
                        <code className="external-value">{info.value}</code>
                        <button
                          className="tipjar-copy-btn"
                          onClick={() => handleCopy(info.value)}
                          title="Copy"
                        >
                          {copied ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      </div>
                      {info.link && (
                        <a
                          href={info.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="tipjar-external-link"
                        >
                          <ExternalLink size={14} /> Open {info.label}
                        </a>
                      )}
                    </div>

                    <div className="tipjar-external-note">
                      <p>✅ We've logged this tip for {creatorName}'s records.</p>
                      <p>They may verify receipt to confirm.</p>
                    </div>
                  </>
                );
              })()}

              <button className="tipjar-done-btn" onClick={onClose}>
                Done
              </button>
            </div>
          )}
        </div>

        {/* ===== FOOTER ===== */}
        <div className="tipjar-modal-footer">
          <p>
            <Heart size={12} /> Powered by StreamPireX •
            {selectedPaymentMethod === 'stripe' ? ' 90% goes to creator' : ' 100% goes to creator'}
          </p>
        </div>
      </div>
    </div>
  );
};


// =====================================================
// FLOATING TIP BUTTON (For video/stream overlays)
// =====================================================

export const FloatingTipButton = ({ creatorId, creatorName, creatorImage }) => {
  return (
    <TipJar
      creatorId={creatorId}
      creatorName={creatorName}
      creatorImage={creatorImage}
      buttonStyle="floating"
      className="tipjar-floating-container"
    />
  );
};


// =====================================================
// INLINE TIP BUTTON (For profiles/cards)
// =====================================================

export const InlineTipButton = ({ creatorId, creatorName, creatorImage, text = 'Tip' }) => {
  return (
    <TipJar
      creatorId={creatorId}
      creatorName={creatorName}
      creatorImage={creatorImage}
      buttonStyle="inline"
      buttonText={text}
    />
  );
};

export default TipJar;