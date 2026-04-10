// =============================================================================
// SBMDropdownNav.js — Grouped Dropdown Navigation for SPX Beat Lab
// =============================================================================
// Location: src/front/js/component/SBMDropdownNav.js
//
// Replaces the 22-tab horizontal scroll bar with 7 grouped dropdown menus:
//   BEATS (always visible)
//   HARDWARE ▾  — SP-1200, SPX3000, SPX-60, SPX-EPS, SPX-950, SPX-1000, Trident
//   CREATE ▾   — Sampler, Chop, Drum Kit, Synth, Drum Design, Instrument
//   AI ▾        — AI Beats, Voice MIDI, Hum to Song, Text to Song, Stems
//   LIBRARY ▾  — Sounds, Loops, Chords
//   FX ▾        — Vox, Stutter
//   MIDI (always visible)
// =============================================================================

import React, { useState, useRef, useEffect, useCallback } from 'react';

const GROUPS = [
  {
    id: 'beats',
    label: '🎹 BEATS',
    alwaysVisible: true,
    tabs: [{ id: 'beats', label: '🎹 SPX Beat Lab', title: 'Step Sequencer, Patterns, Song Mode' }],
  },
  {
    id: 'hardware',
    label: '🔴 HARDWARE',
    alwaysVisible: false,
    tabs: [
      { id: 'sp1200',  label: '🔴 SP-1200',     title: 'E-mu 1987 · 26kHz · asymmetric saturation · boom bap' },
      { id: 'spx3000', label: '🎛️ SPX3000',     title: 'MPC3000 engine · 12-bit DAC · 4 banks · 96 PPQN' },
      { id: 'spx60',   label: '🎛️ SPX-60',      title: '12-bit 40kHz · Linn swing · 4-velocity layers' },
      { id: 'spx10',   label: '🎹 SPX-10',  title: 'ASR-10 · 16-bit · OTTO chip · keyboard' },
      { id: 'spx-eps', label: '🎛️ SPX-EPS',     title: '13-bit 29kHz · DOC chip · lo-fi grit' },
      { id: 'spx950',  label: '🎛️ SPX-950',     title: '12-bit 40kHz · R-2R ladder · West Coast warm' },
      { id: 'spx1000', label: '🎛️ SPX-1000',    title: '16-bit 44.1kHz · linear PCM · clean' },
      { id: 'triple',  label: '🗡️ SPX Trident',  title: 'SP-1200 + SPX3000 + SPX-3200 · unified 3-engine · master clock' },
    ],
  },
  {
    id: 'create',
    label: '✂️ CREATE',
    alwaysVisible: false,
    tabs: [
      { id: 'sampler',    label: '🎧 Sampler',    title: 'Sample Editor · Waveform · Chop · ADSR' },
      { id: 'chop',       label: '✂️ Chop',        title: 'Sample Chop — slice, trim, assign to pads' },
      { id: 'drumpad',    label: '🥁 Drum Kit',    title: 'MPC Pads · Performance · Kits' },
      { id: 'synth',      label: '🎛️ Synth',       title: 'Subtractive Synthesizer' },
      { id: 'drumdesign', label: '🥁 Drum Design', title: 'Drum Synthesis Designer' },
      { id: 'instrument', label: '🎸 Instrument',  title: 'Custom Instrument Builder' },
    ],
  },
  {
    id: 'ai',
    label: '🤖 AI',
    alwaysVisible: false,
    tabs: [
      { id: 'aibeats',    label: '🤖 AI Beats',     title: 'AI Beat Pattern Generator' },
      { id: 'voicemidi',  label: '🎤 Voice MIDI',   title: 'Voice to MIDI Converter' },
      { id: 'humtosong',  label: '🎵 Hum to Song',  title: 'Hum a melody — AI builds a full beat' },
      { id: 'texttosong', label: '✍️ Text to Song', title: 'Text prompt to generated song' },
      { id: 'stems',      label: '✂️ Stems',         title: 'AI Stem Separator — vocals, drums, bass, other' },
    ],
  },
  {
    id: 'library',
    label: '🔊 LIBRARY',
    alwaysVisible: false,
    tabs: [
      { id: 'sounds', label: '🔊 Sounds', title: 'Freesound Sample Browser — 500k+ free sounds' },
      { id: 'loops',  label: '🔁 Loops',  title: 'Looperman Loop Browser — 4M+ free loops' },
      { id: 'chords', label: '🎼 Chords', title: 'Chord Progression Generator' },
    ],
  },
  {
    id: 'fx',
    label: '⚡ FX',
    alwaysVisible: false,
    tabs: [
      { id: 'vox',     label: '🎙️ Vox',     title: 'SPX VoxEngine — vocoder · formant · unison · harmonizer · arp' },
      { id: 'stutter', label: '⚡ Stutter',  title: 'Beat-Synced Stutter / Glitch FX — Gross Beat style' },
    ],
  },
  {
    id: 'midi',
    label: '🎹 MIDI',
    alwaysVisible: true,
    tabs: [{ id: 'midi', label: '🎹 MIDI Map', title: 'MIDI Controller Mapping — assign notes, velocity curves, transpose' }],
  },
];

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  nav: {
    display: 'flex',
    alignItems: 'stretch',
    gap: 0,
    background: '#0a1628',
    borderBottom: '2px solid #1a2a3a',
    padding: '0 8px',
    flexShrink: 0,
    position: 'relative',
    zIndex: 20,
  },
  groupBtn: (isActive, isOpen) => ({
    padding: '0 14px',
    height: 38,
    background: isActive ? '#0d1f35' : isOpen ? '#0d1a2a' : 'transparent',
    color: isActive ? '#00ffc8' : isOpen ? '#dde0f0' : '#5a7088',
    border: 'none',
    borderBottom: isActive ? '2px solid #00ffc8' : '2px solid transparent',
    cursor: 'pointer',
    fontSize: '0.72rem',
    fontWeight: isActive || isOpen ? 700 : 400,
    letterSpacing: '0.4px',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    whiteSpace: 'nowrap',
    transition: 'all 0.12s',
    position: 'relative',
    fontFamily: "'JetBrains Mono', monospace",
  }),
  arrow: (isOpen) => ({
    fontSize: 8,
    opacity: 0.6,
    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
    transition: 'transform 0.15s',
    marginLeft: 2,
  }),
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    minWidth: 220,
    background: '#0d1a2e',
    border: '1px solid rgba(255,255,255,0.1)',
    borderTop: 'none',
    borderRadius: '0 0 6px 6px',
    zIndex: 100,
    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
    overflow: 'hidden',
  },
  dropdownItem: (isActive) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '9px 16px',
    background: isActive ? 'rgba(0,255,200,0.08)' : 'transparent',
    color: isActive ? '#00ffc8' : '#8888aa',
    cursor: 'pointer',
    fontSize: '0.75rem',
    fontWeight: isActive ? 700 : 400,
    borderLeft: isActive ? '3px solid #00ffc8' : '3px solid transparent',
    transition: 'all 0.1s',
    fontFamily: "'JetBrains Mono', monospace",
    borderBottom: '1px solid rgba(255,255,255,0.04)',
  }),
  activePill: {
    fontSize: 9,
    padding: '1px 6px',
    borderRadius: 3,
    background: 'rgba(0,255,200,0.15)',
    color: '#00ffc8',
    fontWeight: 700,
    letterSpacing: 0.3,
  },
};

// ── Component ──────────────────────────────────────────────────────────────────
export default function SBMDropdownNav({ activeTab, setActiveTab }) {
  const [openGroup, setOpenGroup] = useState(null);
  const navRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setOpenGroup(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleGroupClick = useCallback((groupId, group) => {
    if (group.alwaysVisible) {
      // Direct tab switch for always-visible single tabs
      setActiveTab(group.tabs[0].id);
      setOpenGroup(null);
    } else {
      setOpenGroup(openGroup === groupId ? null : groupId);
    }
  }, [openGroup, setActiveTab]);

  const handleTabClick = useCallback((tabId) => {
    setActiveTab(tabId);
    setOpenGroup(null);
  }, [setActiveTab]);

  const isGroupActive = (group) => group.tabs.some(t => t.id === activeTab);

  const getActiveLabel = (group) => {
    const active = group.tabs.find(t => t.id === activeTab);
    return active ? active.label : null;
  };

  return (
    <div style={S.nav} ref={navRef}>
      {GROUPS.map((group) => {
        const groupActive = isGroupActive(group);
        const isOpen = openGroup === group.id;
        const activeLabel = getActiveLabel(group);

        return (
          <div key={group.id} style={{ position: 'relative' }}>
            <button
              style={S.groupBtn(groupActive, isOpen)}
              onClick={() => handleGroupClick(group.id, group)}
              title={group.tabs.map(t => t.label).join(' · ')}
            >
              {/* Show active tab label inside group if one is selected */}
              {groupActive && !group.alwaysVisible
                ? activeLabel
                : group.label
              }
              {!group.alwaysVisible && (
                <span style={S.arrow(isOpen)}>▼</span>
              )}
              {groupActive && !group.alwaysVisible && (
                <span style={S.activePill}>●</span>
              )}
            </button>

            {/* Dropdown */}
            {isOpen && !group.alwaysVisible && (
              <div style={S.dropdown}>
                <div style={{ padding: '6px 16px 4px', fontSize: 9, fontWeight: 700, letterSpacing: 1, color: '#3a5070', textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace" }}>
                  {group.label.replace(/^[^ ]+ /, '')}
                </div>
                {group.tabs.map((tab) => (
                  <div
                    key={tab.id}
                    style={S.dropdownItem(tab.id === activeTab)}
                    onClick={() => handleTabClick(tab.id)}
                    title={tab.title}
                    onMouseEnter={(e) => {
                      if (tab.id !== activeTab) {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                        e.currentTarget.style.color = '#dde0f0';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (tab.id !== activeTab) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = '#8888aa';
                      }
                    }}
                  >
                    <span>{tab.label}</span>
                    {tab.id === activeTab && <span style={{ marginLeft: 'auto', ...S.activePill }}>active</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
