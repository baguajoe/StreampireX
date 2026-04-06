/**
 * SPXCutDBMeter.js — Zero inline CSS. All styles in SPXCut.css.
 * Dynamic height/bottom on bar fill and peak are the only exceptions (state-driven).
 */
import React, { useEffect, useRef, useState } from 'react';

function SPXCutDBMeter({ isPlaying }) {
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
            peakTimer.current[i] = setTimeout(() => setPeaks(p => { const n=[...p]; n[i]=0; return n; }), 2000);
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

  const barClass = (i) =>
    levels[i] > 0.85 ? 'spxcut-dbmeter-fill fill-red'
    : levels[i] > 0.6 ? 'spxcut-dbmeter-fill fill-yellow'
    : 'spxcut-dbmeter-fill';

  return (
    <div className="spxcut-dbmeter">
      <div className="spxcut-dbmeter-title">VU</div>
      <div className="spxcut-dbmeter-body">
        <div className="spxcut-dbmeter-scale">
          {['0', '-6', '-12', '-18'].map(db => (
            <span key={db} className="spxcut-dbmeter-scale-label">{db}</span>
          ))}
        </div>
        <div className="spxcut-dbmeter-channels">
          {[0, 1].map(i => (
            <div key={i} className="spxcut-dbmeter-channel">
              <div className="spxcut-dbmeter-bar-track">
                <div className={barClass(i)} style={{ height: `${Math.max(1, levels[i] * 100)}%` }} />
                {peaks[i] > 0.01 && (
                  <div className="spxcut-dbmeter-peak" style={{ bottom: `${peaks[i] * 100}%` }} />
                )}
              </div>
              <span className="spxcut-dbmeter-ch-label">{i === 0 ? 'L' : 'R'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SPXCutDBMeter;
