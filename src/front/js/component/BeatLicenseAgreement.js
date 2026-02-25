// =============================================================================
// BeatLicenseAgreement.js — BeatStars-Style License Agreement Generator
// =============================================================================
// Location: src/front/js/component/BeatLicenseAgreement.js
//
// Generates a full license agreement PDF-style view per purchase.
// Each license tier has specific usage rights, distribution limits,
// credit requirements, and file delivery format.
//
// Used by: BeatDetailPage.js (after purchase), SellBeatsPage.js (preview)
// =============================================================================

import React, { useState, useRef } from "react";
import "../../styles/BeatLicenseAgreement.css";

// ─── Default License Tiers (BeatStars-inspired) ─────────────────────────────
const DEFAULT_LICENSE_TIERS = [
  {
    key: "mp3",
    name: "MP3 Lease",
    icon: "🎵",
    color: "#00ffc8",
    defaultPrice: 29.99,
    fileFormat: "MP3",
    deliverables: ["Tagged MP3 file (320kbps)"],
    distributionLimit: 2500,
    streamLimit: 100000,
    musicVideo: false,
    radioBroadcasting: false,
    livePerformances: true,
    creditRequired: true,
    exclusive: false,
    terms: [
      "Licensee may distribute up to 2,500 copies",
      "Licensee may receive up to 100,000 audio streams",
      "Licensee must credit the producer in the title: \"(Prod. by [Producer])\"",
      "Licensee may perform the song live and at public events",
      "Licensee may NOT use the beat for radio broadcasting",
      "Licensee may NOT create a music video with this license",
      "License is NON-EXCLUSIVE — producer retains ownership",
      "License is valid for the lifetime of the track",
    ],
  },
  {
    key: "wav",
    name: "WAV Lease",
    icon: "🎶",
    color: "#3b82f6",
    defaultPrice: 49.99,
    fileFormat: "WAV",
    deliverables: ["Untagged WAV file (24-bit)", "Tagged MP3 file (320kbps)"],
    distributionLimit: 5000,
    streamLimit: 250000,
    musicVideo: true,
    radioBroadcasting: false,
    livePerformances: true,
    creditRequired: true,
    exclusive: false,
    terms: [
      "Licensee may distribute up to 5,000 copies",
      "Licensee may receive up to 250,000 audio streams",
      "Licensee must credit the producer in the title: \"(Prod. by [Producer])\"",
      "Licensee may perform the song live and at public events",
      "Licensee may create ONE (1) music video for the song",
      "Licensee may NOT use the beat for radio broadcasting",
      "License is NON-EXCLUSIVE — producer retains ownership",
      "License is valid for the lifetime of the track",
    ],
  },
  {
    key: "stems",
    name: "Track Stems",
    icon: "🎛️",
    color: "#f59e0b",
    defaultPrice: 149.99,
    fileFormat: "WAV + Stems (ZIP)",
    deliverables: [
      "Untagged WAV file (24-bit)",
      "Tagged MP3 file (320kbps)",
      "Individual track stems (ZIP archive)",
    ],
    distributionLimit: 10000,
    streamLimit: 500000,
    musicVideo: true,
    radioBroadcasting: true,
    livePerformances: true,
    creditRequired: true,
    exclusive: false,
    terms: [
      "Licensee may distribute up to 10,000 copies",
      "Licensee may receive up to 500,000 audio streams",
      "Licensee must credit the producer: \"(Prod. by [Producer])\"",
      "Licensee receives individual track stems for mixing/editing",
      "Licensee may create up to TWO (2) music videos",
      "Licensee may use the song for radio broadcasting",
      "Licensee may perform the song live and at public events",
      "License is NON-EXCLUSIVE — producer retains ownership",
      "License is valid for the lifetime of the track",
    ],
  },
  {
    key: "unlimited",
    name: "Unlimited Lease",
    icon: "🔓",
    color: "#a855f7",
    defaultPrice: 199.99,
    fileFormat: "WAV + Stems (ZIP)",
    deliverables: [
      "Untagged WAV file (24-bit)",
      "Tagged MP3 file (320kbps)",
      "Individual track stems (ZIP archive)",
    ],
    distributionLimit: null, // unlimited
    streamLimit: null, // unlimited
    musicVideo: true,
    radioBroadcasting: true,
    livePerformances: true,
    creditRequired: false,
    exclusive: false,
    terms: [
      "Licensee may distribute UNLIMITED copies",
      "Licensee may receive UNLIMITED audio streams",
      "No credit to the producer is required (but appreciated)",
      "Licensee receives individual track stems for mixing/editing",
      "Licensee may create UNLIMITED music videos",
      "Licensee may use the song for radio broadcasting",
      "Licensee may perform the song live and at public events",
      "License is NON-EXCLUSIVE — producer retains ownership",
      "License is valid for the lifetime of the track",
    ],
  },
  {
    key: "exclusive",
    name: "Exclusive Rights",
    icon: "👑",
    color: "#ef4444",
    defaultPrice: 499.99,
    fileFormat: "WAV + Stems + Project Files",
    deliverables: [
      "Untagged WAV file (24-bit)",
      "MP3 file (320kbps)",
      "Individual track stems (ZIP archive)",
      "Original project files (if available)",
    ],
    distributionLimit: null,
    streamLimit: null,
    musicVideo: true,
    radioBroadcasting: true,
    livePerformances: true,
    creditRequired: false,
    exclusive: true,
    terms: [
      "Licensee receives FULL EXCLUSIVE RIGHTS to the beat",
      "Producer will remove the beat from all stores after purchase",
      "No other artist may license this beat after this purchase",
      "Licensee may distribute UNLIMITED copies",
      "Licensee may receive UNLIMITED audio streams",
      "No credit to the producer is required",
      "Licensee receives all stems and project files",
      "Licensee may create UNLIMITED music videos",
      "Licensee may use the song for any commercial purpose",
      "All previous non-exclusive licenses remain valid for those buyers",
      "License is valid in perpetuity",
    ],
  },
];

// ─── License Agreement Document ──────────────────────────────────────────────

const BeatLicenseAgreement = ({
  beat,            // { title, id }
  producer,        // { name, username, id }
  buyer,           // { name, username, email }
  license,         // one of DEFAULT_LICENSE_TIERS or custom
  purchaseDate,    // ISO date string
  orderId,         // from Stripe or internal
  onClose,
  showPrint = true,
}) => {
  const printRef = useRef(null);
  const date = purchaseDate ? new Date(purchaseDate) : new Date();
  const formatted = date.toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const w = window.open("", "_blank");
    w.document.write(`
      <html><head><title>License Agreement — ${beat?.title}</title>
      <style>
        body { font-family: 'Inter', Arial, sans-serif; color: #222; padding: 40px; line-height: 1.7; }
        h1 { font-size: 20px; text-align: center; border-bottom: 2px solid #222; padding-bottom: 10px; }
        h2 { font-size: 15px; margin-top: 24px; border-bottom: 1px solid #ccc; padding-bottom: 6px; }
        .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; margin: 16px 0; font-size: 13px; }
        .meta-grid dt { font-weight: 600; color: #555; }
        .meta-grid dd { margin: 0; }
        ul { padding-left: 20px; }
        li { margin-bottom: 4px; font-size: 13px; }
        .footer { margin-top: 40px; font-size: 12px; color: #888; text-align: center; border-top: 1px solid #ddd; padding-top: 12px; }
        .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 40px; }
        .sig-box { border-top: 1px solid #222; padding-top: 6px; font-size: 13px; }
        .sig-label { font-weight: 600; }
      </style></head><body>
      ${content.innerHTML}
      </body></html>
    `);
    w.document.close();
    w.print();
  };

  return (
    <div className="bla-overlay" onClick={onClose}>
      <div className="bla-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bla-modal-header">
          <h2>📜 License Agreement</h2>
          <div className="bla-header-actions">
            {showPrint && (
              <button className="bla-print-btn" onClick={handlePrint}>🖨 Print / Save PDF</button>
            )}
            <button className="bla-close-btn" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Agreement body */}
        <div className="bla-body" ref={printRef}>
          <h1>BEAT LICENSE AGREEMENT</h1>
          <p className="bla-subtitle">
            <span style={{ color: license?.color || "#00ffc8", fontWeight: 700 }}>
              {license?.icon} {license?.name || "Standard License"}
            </span>
          </p>

          {/* Parties */}
          <h2>1. PARTIES</h2>
          <p>
            This Beat License Agreement ("Agreement") is entered into as of{" "}
            <strong>{formatted}</strong> by and between:
          </p>
          <dl className="bla-meta-grid">
            <dt>Licensor (Producer):</dt>
            <dd>{producer?.name || producer?.username || "Producer"}</dd>
            <dt>Licensee (Buyer):</dt>
            <dd>{buyer?.name || buyer?.username || buyer?.email || "Buyer"}</dd>
            <dt>Beat Title:</dt>
            <dd>"{beat?.title || "Untitled Beat"}"</dd>
            <dt>Order ID:</dt>
            <dd>{orderId || "—"}</dd>
            <dt>License Type:</dt>
            <dd>{license?.name || "Standard"} {license?.exclusive ? "(EXCLUSIVE)" : "(NON-EXCLUSIVE)"}</dd>
            <dt>Purchase Price:</dt>
            <dd>${license?.price || license?.defaultPrice || "0.00"}</dd>
          </dl>

          {/* Deliverables */}
          <h2>2. DELIVERABLES</h2>
          <p>Upon purchase, the Licensee shall receive:</p>
          <ul>
            {(license?.deliverables || ["MP3 file"]).map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>

          {/* Usage Rights */}
          <h2>3. USAGE RIGHTS</h2>
          <table className="bla-rights-table">
            <tbody>
              <tr>
                <td>Distribution Copies</td>
                <td>{license?.distributionLimit ? license.distributionLimit.toLocaleString() : "Unlimited"}</td>
              </tr>
              <tr>
                <td>Audio Streams</td>
                <td>{license?.streamLimit ? license.streamLimit.toLocaleString() : "Unlimited"}</td>
              </tr>
              <tr>
                <td>Music Videos</td>
                <td>{license?.musicVideo ? "✅ Yes" : "❌ Not included"}</td>
              </tr>
              <tr>
                <td>Radio Broadcasting</td>
                <td>{license?.radioBroadcasting ? "✅ Yes" : "❌ Not included"}</td>
              </tr>
              <tr>
                <td>Live Performances</td>
                <td>{license?.livePerformances !== false ? "✅ Yes" : "❌ Not included"}</td>
              </tr>
              <tr>
                <td>Credit Required</td>
                <td>{license?.creditRequired ? `Yes — "Prod. by ${producer?.name || producer?.username}"` : "No (appreciated)"}</td>
              </tr>
              <tr>
                <td>Exclusivity</td>
                <td>{license?.exclusive ? "👑 EXCLUSIVE — Beat removed from store" : "Non-exclusive — Others may license"}</td>
              </tr>
            </tbody>
          </table>

          {/* License Terms */}
          <h2>4. LICENSE TERMS & CONDITIONS</h2>
          <ul className="bla-terms-list">
            {(license?.terms || []).map((term, i) => (
              <li key={i}>{term}</li>
            ))}
          </ul>

          {/* Standard clauses */}
          <h2>5. OWNERSHIP</h2>
          <p>
            {license?.exclusive
              ? `The Licensor transfers exclusive rights to the beat "${beat?.title}" to the Licensee. The Licensor agrees to remove the beat from all storefronts and will not license it to any additional parties after this sale. The Licensor retains credit as the original producer/composer.`
              : `The Licensor retains full ownership and copyright of the beat "${beat?.title}". This license grants the Licensee the right to use the beat in accordance with the terms outlined above. The Licensor may continue to license this beat to other parties on a non-exclusive basis.`
            }
          </p>

          <h2>6. RESTRICTIONS</h2>
          <ul>
            <li>The Licensee may NOT claim ownership of the underlying beat/instrumental.</li>
            <li>The Licensee may NOT resell, transfer, or sub-license the beat to any third party.</li>
            <li>The Licensee may NOT register the beat itself (without vocals/modifications) with any content ID or royalty collection service.</li>
            <li>The Licensee may NOT use the beat in connection with any unlawful activity, hate speech, or content that defames any individual or group.</li>
            {license?.creditRequired && (
              <li>The Licensee MUST include producer credit in all distributed copies: "Prod. by {producer?.name || producer?.username}"</li>
            )}
          </ul>

          <h2>7. ROYALTIES</h2>
          <p>
            {license?.exclusive
              ? "As this is an exclusive license, the Licensee retains 100% of royalties earned from the resulting recording. The Licensor waives any claim to mechanical or performance royalties from the Licensee's recording."
              : "The Licensee shall retain all royalties earned from the resulting recording. The Licensor retains the right to collect royalties as the composer/producer of the underlying beat through applicable performing rights organizations (PRO)."
            }
          </p>

          <h2>8. TERM & TERMINATION</h2>
          <p>
            This license is effective as of the date of purchase and remains valid for the lifetime of the resulting recording, unless terminated by breach of any terms outlined in this agreement. In the event of a breach, the Licensor may terminate this license with written notice, and the Licensee must cease all distribution within 30 days.
          </p>

          <h2>9. PLATFORM TERMS</h2>
          <p>
            This license was issued through StreamPireX. Both parties agree that StreamPireX serves as the facilitating platform and is not a party to this license agreement. StreamPireX retains a platform service fee of 10% of the transaction amount. Disputes between the Licensor and Licensee shall be resolved between those parties directly.
          </p>

          {/* Signatures */}
          <div className="bla-sig-grid">
            <div className="bla-sig-box">
              <div className="bla-sig-label">Licensor (Producer)</div>
              <div className="bla-sig-name">{producer?.name || producer?.username || "________________"}</div>
              <div className="bla-sig-date">Date: {formatted}</div>
            </div>
            <div className="bla-sig-box">
              <div className="bla-sig-label">Licensee (Buyer)</div>
              <div className="bla-sig-name">{buyer?.name || buyer?.username || "________________"}</div>
              <div className="bla-sig-date">Date: {formatted}</div>
            </div>
          </div>

          {/* Footer */}
          <div className="bla-doc-footer">
            <p>Generated by StreamPireX • Order #{orderId || "—"} • {formatted}</p>
            <p>This document serves as a legally binding agreement between the above parties.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── License Tier Selector (for SellBeatsPage / BeatDetailPage) ──────────────
// Shows the 5 tiers with prices, lets producer set per-format pricing

export const LicenseTierSelector = ({
  prices = {},         // { mp3: 29.99, wav: 49.99, stems: 149.99, unlimited: 199.99, exclusive: 499.99 }
  onPriceChange,       // (key, newPrice) => void
  selectedTier,        // key string
  onSelectTier,        // (tier) => void
  readOnly = false,
}) => {
  return (
    <div className="bla-tier-selector">
      {DEFAULT_LICENSE_TIERS.map((tier) => {
        const price = prices[tier.key] ?? tier.defaultPrice;
        const isSelected = selectedTier === tier.key;

        return (
          <div
            key={tier.key}
            className={`bla-tier-card ${isSelected ? "selected" : ""}`}
            style={{ "--tier-color": tier.color }}
            onClick={() => onSelectTier?.(tier)}
          >
            <div className="bla-tier-header">
              <span className="bla-tier-icon">{tier.icon}</span>
              <div className="bla-tier-name">
                <h4>{tier.name}</h4>
                <span className="bla-tier-format">{tier.fileFormat}</span>
              </div>
              {readOnly ? (
                <span className="bla-tier-price">${price}</span>
              ) : (
                <div className="bla-tier-price-edit">
                  <span className="bla-dollar">$</span>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => onPriceChange?.(tier.key, parseFloat(e.target.value) || 0)}
                    className="bla-tier-price-input"
                    min="0"
                    step="0.01"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              )}
            </div>
            <div className="bla-tier-features">
              <span>{tier.distributionLimit ? `${tier.distributionLimit.toLocaleString()} copies` : "Unlimited copies"}</span>
              <span>{tier.streamLimit ? `${tier.streamLimit.toLocaleString()} streams` : "Unlimited streams"}</span>
              <span>{tier.musicVideo ? "✅ Music video" : "—"}</span>
              <span>{tier.radioBroadcasting ? "✅ Radio" : "—"}</span>
              <span>{tier.creditRequired ? "📝 Credit req." : "✅ No credit"}</span>
              {tier.exclusive && <span className="bla-exclusive-badge">👑 EXCLUSIVE</span>}
            </div>
            {isSelected && <div className="bla-tier-check">✓</div>}
          </div>
        );
      })}
    </div>
  );
};

// ─── License Preview (compact view for cart/checkout) ────────────────────────

export const LicensePreview = ({ license, beatTitle, producerName }) => {
  if (!license) return null;
  return (
    <div className="bla-preview" style={{ "--tier-color": license.color || "#00ffc8" }}>
      <span className="bla-preview-icon">{license.icon}</span>
      <div className="bla-preview-info">
        <strong>{license.name}</strong>
        <span className="bla-preview-beat">"{beatTitle}"</span>
        <span className="bla-preview-prod">by {producerName}</span>
      </div>
      <div className="bla-preview-rights">
        <span>{license.distributionLimit ? `${license.distributionLimit.toLocaleString()} copies` : "∞ copies"}</span>
        <span>{license.fileFormat}</span>
      </div>
    </div>
  );
};

export { DEFAULT_LICENSE_TIERS };
export default BeatLicenseAgreement;