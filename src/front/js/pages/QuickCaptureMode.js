import React from 'react';

const QuickCaptureMode = () => {
  return (
    <div style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0d1117', color: '#c8d0dc', fontFamily: 'JetBrains Mono, monospace' }}>
      <h1 style={{ color: '#00ffc8', marginBottom: '12px' }}>🎵 Quick Capture</h1>
      <p style={{ color: '#5a7088', maxWidth: '480px', textAlign: 'center' }}>Instantly record ideas before they slip away.</p>
      <p style={{ color: '#30363d', marginTop: '32px', fontSize: '0.75rem' }}>Coming soon — this feature is under active development.</p>
    </div>
  );
};

export default QuickCaptureMode;
