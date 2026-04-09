// =============================================================================
// PATCH: SamplerBeatMaker.js — wire 5 new sampler tabs
// =============================================================================
//
// STEP 1 — Add imports near the top (after existing SP1200Tab / SPX3000Tab imports)
// ─────────────────────────────────────────────────────────────────────────────
import SPX60Tab        from './SPX60Tab';
import SPXEPSTab       from './SPXEPSTab';
import SPXS950Tab      from './SPXS950Tab';
import SPXS1000Tab     from './SPXS1000Tab';
import { useSamplerMasterClock } from './samplerMasterClock';

// STEP 2 — Add master clock hook inside the SamplerBeatMaker component body
// (add after existing state declarations, isPlaying and bpm must already exist)
// ─────────────────────────────────────────────────────────────────────────────
const masterClock = useSamplerMasterClock(bpm, isPlaying);

// STEP 3 — Add 5 new tab entries to the tab list array
// Find the existing tab list (the array containing 'spx3000', 'sp1200', 'triple')
// Add these entries:
// ─────────────────────────────────────────────────────────────────────────────
{ id: 'spx60',    label: '🎛️ SPX-60',    title: 'SPX-60 — 12-bit 40kHz, Linn swing, 4-vel layers, sigma-delta DAC' },
{ id: 'spx-eps',  label: '🎛️ SPX-EPS',   title: 'SPX-EPS — 13-bit 29kHz, DOC chip, low-mid grit, textured lo-fi' },
{ id: 'spx950',   label: '🎛️ SPX-950',   title: 'SPX-950 — 12-bit 40kHz, R-2R ladder DAC, West Coast warm' },
{ id: 'spx1000',  label: '🎛️ SPX-1000',  title: 'SPX-1000 — 16-bit 44.1kHz, linear PCM, clean West Coast sound' },

// STEP 4 — Add tab render blocks inside the {activeTab === '...'} section
// Place after the existing sp1200 block, before the stems/triple block
// ─────────────────────────────────────────────────────────────────────────────
{activeTab === 'spx60' && (
  <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
    <SPX60Tab
      onExport={onExport}
      onSendToArrange={onSendToArrange}
      isEmbedded={true}
      masterClock={masterClock}
      onSendToTriple={(padIdx, buffer, name) => { setActiveTab('triple'); }}
    />
  </div>
)}
{activeTab === 'spx-eps' && (
  <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
    <SPXEPSTab
      onExport={onExport}
      onSendToArrange={onSendToArrange}
      isEmbedded={true}
      masterClock={masterClock}
      onSendToTriple={(padIdx, buffer, name) => { setActiveTab('triple'); }}
    />
  </div>
)}
{activeTab === 'spx950' && (
  <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
    <SPXS950Tab
      onExport={onExport}
      onSendToArrange={onSendToArrange}
      isEmbedded={true}
      masterClock={masterClock}
      onSendToTriple={(padIdx, buffer, name) => { setActiveTab('triple'); }}
    />
  </div>
)}
{activeTab === 'spx1000' && (
  <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
    <SPXS1000Tab
      onExport={onExport}
      onSendToArrange={onSendToArrange}
      isEmbedded={true}
      masterClock={masterClock}
      onSendToTriple={(padIdx, buffer, name) => { setActiveTab('triple'); }}
    />
  </div>
)}

// NOTE: masterClock also works with existing SP1200Tab and SPX3000Tab —
// just add masterClock={masterClock} to those two components as well
// if you want them linkable to the shared clock too.
