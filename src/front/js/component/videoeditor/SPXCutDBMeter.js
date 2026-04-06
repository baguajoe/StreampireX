/**
 * SPXCutDBMeter.js
 * 2-channel VU meter with peak hold.
 * RAF animated when playing, idle when paused.
 * Zero inline CSS.
 */
import React, { useEffect, useRef, useState } from 'react';

const CHANNELS = ['L', 'R'];

function SPXCutDBMeter({ isPlaying, tracks }) {
  const [levels, setLevels]  = useState([0, 0]);
  const [peaks,  setPeaks]   = useState([0, 0]);
  const rafRef   = useRef(null);
  const peakTimer= useRef([null, null]);

  useEffect(() => {
    if (!isPlaying) {
      // Decay to zero
      const decay = () => {
        setLevels(prev => {
          const next = prev.map(v => Math.max(0, v - 0.04));
          if (next.some(v => v > 0)) {
            rafRef.current = requestAnimationFrame(decay);
          }
          return next;
        });
      };
      rafRef.current = requestAnimationFrame(decay);
      return;
    }

    // Simulate metering during playback
    // In production: pipe Web Audio API AnalyserNode data here
    const animate = () => {
      setLevels(prev => {
        const next = prev.map((v, i) => {
          // Pseudo-random meter movement (replace with real audio analysis)
          const target = Math.random() * 0.85 + 0.05;
          const attack  = 0.15;
          const release = 0.05;
          return target > v ? v + (target - v) * attack : v + (target - v) * release;
        });

        // Peak hold
        setPeaks(pp => next.map((v, i) => {
          if (v >= pp[i]) {
            clearTimeout(peakTimer.current[i]);
            peakTimer.current[i] = setTimeout(() => {
              setPeaks(p => { const n = [...p]; n[i] = 0; return n; });
            }, 2000);
            return v;
          }
          return pp[i];
        }));

        return next;
      });
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      peakTimer.current.forEach(t => clearTimeout(t));
    };
  }, []);

  return (
    <div className="spxcut-dbmeter">
      <span className="spxcut-dbmeter-label" style={{fontSize:7,writingMode:"horizontal-tb",marginBottom:2}}>VU</span>

      <div className="spxcut-dbmeter-bars">
        {CHANNELS.map((ch, i) => {
          const level = levels[i] || 0;
          const peak  = peaks[i]  || 0;
          const heightPct = level * 100;
          const peakPct   = (1 - peak) * 100; // bottom offset from top

          return (
            <div key={ch} className="spxcut-dbmeter-bar-wrap">
              <div className="spxcut-dbmeter-bar-track">
                <div
                  className="spxcut-dbmeter-fill"
                  style={{ height: `${heightPct}%` }}
                />
                {peak > 0.01 && (
                  <div
                    className="spxcut-dbmeter-peak"
                    style={{ top: `${peakPct}%` }}
                  />
                )}
              </div>
              <span className="spxcut-dbmeter-ch-label">{ch}</span>
            </div>
          );
        })}
      </div>


    </div>
  );
}

export default SPXCutDBMeter;
