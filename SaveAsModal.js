// =============================================================================
// SaveAsModal.js — Styled Save As Dialog for Recording Studio
// =============================================================================
// Location: src/front/js/component/SaveAsModal.js
// Replaces window.prompt() with a dark-themed modal that works on all devices
// including phones, tablets, and desktops.
//
// Usage in RecordingStudio.js:
//   import SaveAsModal from '../component/SaveAsModal';
//   const [showSaveAs, setShowSaveAs] = useState(false);
//   const [saveAsCallback, setSaveAsCallback] = useState(null);
//
//   // In handleMenuAction case 'file:saveAs':
//   setSaveAsCallback(() => (fileName) => { /* download logic */ });
//   setShowSaveAs(true);
//
//   // In JSX:
//   <SaveAsModal
//     show={showSaveAs}
//     defaultName={projectName}
//     onSave={(fileName) => { saveAsCallback?.(fileName); setShowSaveAs(false); }}
//     onCancel={() => setShowSaveAs(false)}
//   />
// =============================================================================

import React, { useState, useEffect, useRef } from 'react';

const SaveAsModal = ({ show, defaultName = 'Untitled Project', onSave, onCancel }) => {
  const [fileName, setFileName] = useState('');
  const inputRef = useRef(null);

  // Reset filename when modal opens
  useEffect(() => {
    if (show) {
      const clean = defaultName.replace(/\s+/g, '_');
      setFileName(clean.endsWith('.spx') ? clean : `${clean}.spx`);
      // Focus input after render
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          // Select just the name part (before .spx)
          const dotIdx = inputRef.current.value.lastIndexOf('.spx');
          if (dotIdx > 0) {
            inputRef.current.setSelectionRange(0, dotIdx);
          } else {
            inputRef.current.select();
          }
        }
      }, 50);
    }
  }, [show, defaultName]);

  // Handle Enter key
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && fileName.trim()) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel?.();
    }
  };

  const handleSave = () => {
    if (!fileName.trim()) return;
    const final = fileName.trim().endsWith('.spx') ? fileName.trim() : `${fileName.trim()}.spx`;
    onSave?.(final);
  };

  // Click outside to close
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onCancel?.();
    }
  };

  if (!show) return null;

  return (
    <div style={styles.backdrop} onClick={handleBackdropClick}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00ffc8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
              <polyline points="17 21 17 13 7 13 7 21"/>
              <polyline points="7 3 7 8 15 8"/>
            </svg>
          </div>
          <h3 style={styles.title}>Save Project As</h3>
          <button style={styles.closeBtn} onClick={onCancel} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={styles.body}>
          <label style={styles.label} htmlFor="save-as-filename">File name</label>
          <div style={styles.inputWrapper}>
            <input
              ref={inputRef}
              id="save-as-filename"
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="my_project.spx"
              style={styles.input}
              autoComplete="off"
              spellCheck="false"
            />
            <span style={styles.inputBadge}>.spx</span>
          </div>
          <p style={styles.hint}>
            Project will be saved to your device's Downloads folder
          </p>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button style={styles.cancelBtn} onClick={onCancel}>
            Cancel
          </button>
          <button
            style={{
              ...styles.saveBtn,
              opacity: fileName.trim() ? 1 : 0.4,
              cursor: fileName.trim() ? 'pointer' : 'not-allowed',
            }}
            onClick={handleSave}
            disabled={!fileName.trim()}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// STYLES — StreamPireX dark theme
// =============================================================================
const styles = {
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    padding: '16px',
    animation: 'fadeIn 0.15s ease-out',
  },
  modal: {
    background: '#161b22',
    border: '1px solid #30363d',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 24px 48px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(0, 255, 200, 0.05)',
    animation: 'slideUp 0.2s ease-out',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '16px 20px 12px',
    borderBottom: '1px solid #21262d',
  },
  headerIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    background: 'rgba(0, 255, 200, 0.08)',
    flexShrink: 0,
  },
  title: {
    margin: 0,
    fontSize: '15px',
    fontWeight: 600,
    color: '#e6edf3',
    flex: 1,
    fontFamily: "'Segoe UI', -apple-system, sans-serif",
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#8b949e',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 0.15s, background 0.15s',
    flexShrink: 0,
  },
  body: {
    padding: '16px 20px 12px',
  },
  label: {
    display: 'block',
    fontSize: '12px',
    fontWeight: 500,
    color: '#8b949e',
    marginBottom: '6px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    fontFamily: "'Segoe UI', -apple-system, sans-serif",
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  input: {
    width: '100%',
    padding: '10px 60px 10px 12px',
    background: '#0d1117',
    border: '1px solid #30363d',
    borderRadius: '8px',
    color: '#e6edf3',
    fontSize: '14px',
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
    outline: 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s',
    boxSizing: 'border-box',
  },
  inputBadge: {
    position: 'absolute',
    right: '10px',
    fontSize: '11px',
    fontWeight: 600,
    color: '#00ffc8',
    background: 'rgba(0, 255, 200, 0.1)',
    padding: '2px 8px',
    borderRadius: '4px',
    fontFamily: "'JetBrains Mono', monospace",
    pointerEvents: 'none',
  },
  hint: {
    margin: '8px 0 0',
    fontSize: '11px',
    color: '#6e7681',
    fontFamily: "'Segoe UI', -apple-system, sans-serif",
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    padding: '12px 20px 16px',
  },
  cancelBtn: {
    padding: '8px 16px',
    background: 'transparent',
    border: '1px solid #30363d',
    borderRadius: '8px',
    color: '#8b949e',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: "'Segoe UI', -apple-system, sans-serif",
    transition: 'background 0.15s, color 0.15s',
  },
  saveBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 20px',
    background: 'linear-gradient(135deg, #00ffc8, #00b894)',
    border: 'none',
    borderRadius: '8px',
    color: '#0d1117',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: "'Segoe UI', -apple-system, sans-serif",
    transition: 'opacity 0.15s, transform 0.1s',
  },
};

export default SaveAsModal;
