/**
 * SPXCutDBMeter.js - L/R at bottom, dB scale on side, bars don't fill full column
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

  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    peakTimer.current.forEach(t => clearTimeout(t));
  }, []);

  return (
    <div className="spxcut-dbmeter">
      <div style={{ fontSize: 7, color: '#5a5a80', textTransform: 'uppercase', textAlign: 'center', marginBottom: 4 }}>VU</div>
      <div style={{ flex: 1, display: 'flex', gap: 3, minHeight: 0, padding: '0 2px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingBottom: 16 }}>
          {['0', '-6', '-12', '-18', '-∞'].map(db => (
            <span key={db} style={{ fontSize: 6, color: '#4a4a6a', lineHeight: 1, textAlign: 'right' }}>{db}</span>
          ))}
        </div>
        {[0, 1].map(i => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, flex: 1 }}>
            <div style={{ flex: 1, width: 8, background: '#080812', borderRadius: 3, border: '1px solid #1a1a2e', overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column-reverse', minHeight: 0 }}>
              <div style={{ width: '100%', height: `${Math.max(1, levels[i] * 100)}%`, background: levels[i] > 0.85 ? 'linear-gradient(to top, #00ff88, #ffcc00, #ff4455)' : levels[i] > 0.6 ? 'linear-gradient(to top, #00ff88, #ffcc00)' : '#00ff88', transition: 'height 0.05s ease' }} />
              {peaks[i] > 0.02 && <div style={{ position: 'absolute', width: '100%', height: 2, background: '#ff4455', bottom: `${peaks[i] * 100}%` }} />}
            </div>
            <span style={{ fontSize: 8, color: '#00ffc8', fontWeight: 700 }}>{i === 0 ? 'L' : 'R'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SPXCutDBMeter;
