/**
 * SPXCutDBMeter.js
 * 2-channel VU meter. L/R labels on top. dB scale on left side.
 * Animated via RAF when playing.
 */
import React, { useEffect, useRef, useState } from 'react';

function SPXCutDBMeter({ isPlaying, tracks }) {
  const [levels, setLevels] = useState([0, 0]);
  const [peaks,  setPeaks]  = useState([0, 0]);
  const rafRef    = useRef(null);
  const peakTimer = useRef([null, null]);

  useEffect(() => {
    if (!isPlaying) {
      const decay = () => {
        setLevels(prev => {
          const next = prev.map(v => Math.max(0, v - 0.03));
          if (next.some(v => v > 0)) rafRef.current = requestAnimationFrame(decay);
          return next;
        });
      };
      rafRef.current = requestAnimationFrame(decay);
      return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    }

    const animate = () => {
      setLevels(prev => {
        const next = prev.map(v => {
          const target = Math.random() * 0.85 + 0.05;
          return target > v ? v + (target - v) * 0.15 : v + (target - v) * 0.05;
        });
        setPeaks(pp => next.map((v, i) => {
          if (v >= pp[i]) {
            clearTimeout(peakTimer.current[i]);
            peakTimer.current[i] = setTimeout(() => setPeaks(p => { const n = [...p]; n[i] = 0; return n; }), 2000);
            return v;
          }
          return pp[i];
        }));
        return next;
      });
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [isPlaying]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      peakTimer.current.forEach(t => clearTimeout(t));
    };
  }, []);

  const DB_MARKS = [{ label: '0', pct: 100 }, { label: '-6', pct: 75 }, { label: '-12', pct: 50 }, { label: '-18', pct: 25 }];

  return (
    <div className="spxcut-dbmeter">
      {/* Title */}
      <div style={{ fontSize: 7, color: '#5a5a80', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2, textAlign: 'center' }}>
        VU
      </div>

      {/* Channel labels */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 2 }}>
        {['L', 'R'].map(ch => (
          <span key={ch} style={{ fontSize: 8, color: '#00ffc8', fontWeight: 700, width: 10, textAlign: 'center' }}>{ch}</span>
        ))}
      </div>

      {/* Bars + scale */}
      <div style={{ flex: 1, display: 'flex', gap: 2, minHeight: 0, alignItems: 'stretch' }}>
        {/* dB scale */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingBottom: 2, width: 14 }}>
          {DB_MARKS.map(m => (
            <span key={m.label} style={{ fontSize: 7, color: '#5a5a80', textAlign: 'right', lineHeight: 1 }}>{m.label}</span>
          ))}
        </div>

        {/* L bar */}
        <div style={{ width: 8, flex: 0, background: '#0a0a1a', borderRadius: 3, overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column-reverse', minHeight: 0, flexShrink: 0 }}>
          <div style={{
            width: '100%',
            height: `${Math.max(2, levels[0] * 100)}%`,
            background: levels[0] > 0.85 ? '#ff4455' : levels[0] > 0.6 ? '#ffcc00' : '#00ff88',
            borderRadius: 2,
            transition: 'height 0.05s ease',
          }} />
          {peaks[0] > 0.01 && (
            <div style={{ position: 'absolute', width: '100%', height: 2, background: '#ff4455', bottom: `${peaks[0] * 100}%` }} />
          )}
        </div>

        {/* R bar */}
        <div style={{ width: 8, flex: 0, background: '#0a0a1a', borderRadius: 3, overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column-reverse', minHeight: 0, flexShrink: 0 }}>
          <div style={{
            width: '100%',
            height: `${Math.max(2, levels[1] * 100)}%`,
            background: levels[1] > 0.85 ? '#ff4455' : levels[1] > 0.6 ? '#ffcc00' : '#00ff88',
            borderRadius: 2,
            transition: 'height 0.05s ease',
          }} />
          {peaks[1] > 0.01 && (
            <div style={{ position: 'absolute', width: '100%', height: 2, background: '#ff4455', bottom: `${peaks[1] * 100}%` }} />
          )}
        </div>
      </div>
    </div>
  );
}

export default SPXCutDBMeter;
