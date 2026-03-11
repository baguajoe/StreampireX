import React, { useState, useEffect } from 'react';

export default function ThemeToggle() {
  const [dark, setDark] = useState(() => localStorage.getItem('spx_theme') !== 'light');

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.setAttribute('data-theme', 'dark');
      localStorage.setItem('spx_theme', 'dark');
    } else {
      root.setAttribute('data-theme', 'light');
      localStorage.setItem('spx_theme', 'light');
    }
  }, [dark]);

  return (
    <button onClick={() => setDark(!dark)}
      title={dark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      style={{ background: 'none', border: '1px solid #30363d', borderRadius: 20, cursor: 'pointer', padding: '4px 10px', fontSize: '1rem', color: '#e6edf3', display: 'flex', alignItems: 'center', gap: 6 }}>
      {dark ? '☀️' : '🌙'}
    </button>
  );
}
