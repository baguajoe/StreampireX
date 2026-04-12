#!/usr/bin/env python3
css = '''/* =============================================================================
   PodcastDetailPage.css — StreamPireX Podcast Detail
   ============================================================================= */

.podcast-detail-container {
  min-height: 100vh;
  background: #06060f;
  color: #dde0f0;
  font-family: "Segoe UI", sans-serif;
}

.loading-state, .error-state {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; min-height: 60vh; gap: 16px; color: #5a7088;
}
.loading-icon, .error-icon { font-size: 48px; }
.loading-state p, .error-state p { font-size: 14px; color: #5a7088; }
.error-state h2 { color: #dde0f0; font-size: 20px; }

.podcast-hero {
  background:
    radial-gradient(ellipse at top left, rgba(0,255,200,0.06) 0%, transparent 50%),
    radial-gradient(ellipse at bottom right, rgba(255,102,0,0.04) 0%, transparent 50%),
    linear-gradient(180deg, #0a0a18 0%, #06060f 100%);
  border-bottom: 1px solid rgba(0,255,200,0.1);
  padding: 60px 0 40px;
}

.podcast-hero-inner {
  max-width: 1100px; margin: 0 auto; padding: 0 32px;
  display: flex; gap: 36px; align-items: flex-start; position: relative;
}

.back-button {
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
  color: #8888aa; padding: 8px 16px; border-radius: 6px; cursor: pointer;
  font-size: 13px; font-weight: 600; transition: all .15s; text-decoration: none;
}
.back-button:hover { color: #00ffc8; border-color: rgba(0,255,200,0.3); background: rgba(0,255,200,0.05); }

.podcast-cover-wrap { flex-shrink: 0; }

.podcast-detail-image {
  width: 200px; height: 200px; border-radius: 12px; object-fit: cover;
  box-shadow: 0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,255,200,0.1);
}

.podcast-image-placeholder {
  width: 200px; height: 200px; border-radius: 12px;
  background: linear-gradient(135deg, #0f1a2a, #1a2a3a);
  border: 1px solid rgba(0,255,200,0.12);
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
}
.placeholder-icon { font-size: 48px; opacity: 0.4; }
.placeholder-text { font-size: 24px; font-weight: 900; color: #00ffc8; letter-spacing: 2px; }

.podcast-meta { flex: 1; min-width: 0; }

.podcast-category {
  display: inline-block; background: rgba(0,255,200,0.08);
  border: 1px solid rgba(0,255,200,0.2); color: #00ffc8; font-size: 11px;
  font-weight: 700; padding: 4px 12px; border-radius: 20px;
  letter-spacing: 1px; text-transform: uppercase; margin-bottom: 12px;
}

.podcast-title { font-size: 2rem; font-weight: 900; color: #fff; margin: 0 0 8px; line-height: 1.2; letter-spacing: -0.5px; }
.podcast-host { font-size: 14px; color: #5a7088; margin: 0 0 12px; }
.podcast-host span { color: #00ffc8; font-weight: 600; }
.podcast-description { font-size: 14px; color: #8888aa; line-height: 1.7; margin: 0 0 20px; max-width: 600px; }

.podcast-stats { display: flex; gap: 20px; flex-wrap: wrap; margin-bottom: 20px; }
.podcast-stats span { font-size: 13px; color: #5a7088; }
.podcast-stats strong { color: #dde0f0; }

/* ── Action buttons ── */
.podcast-detail-container .podcast-actions {
  display: flex !important;
  flex-direction: row !important;
  flex-wrap: wrap !important;
  gap: 8px !important;
  margin: 0 !important;
  padding: 0 !important;
  background: transparent !important;
  grid-template-columns: unset !important;
}

.podcast-detail-container .action-btn {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 8px 16px !important;
  border-radius: 6px !important;
  border: 1px solid rgba(255,255,255,0.1) !important;
  background: rgba(255,255,255,0.04) !important;
  color: #dde0f0 !important;
  font-size: 13px !important;
  font-weight: 600 !important;
  cursor: pointer !important;
  white-space: nowrap !important;
  width: auto !important;
  height: auto !important;
  min-height: unset !important;
  min-width: unset !important;
  box-shadow: none !important;
}

.podcast-detail-container .action-btn:hover {
  background: rgba(255,255,255,0.08) !important;
  border-color: rgba(255,255,255,0.2) !important;
}

.podcast-detail-container .subscribe-btn {
  background: linear-gradient(135deg, #00ffc8, #00d4a8) !important;
  color: #000 !important;
  border-color: transparent !important;
  font-weight: 700 !important;
}

.podcast-detail-container .like-btn.liked {
  background: rgba(255,45,85,0.1) !important;
  border-color: rgba(255,45,85,0.3) !important;
  color: #ff2d55 !important;
}

/* ── Now Playing Bar ── */
.pod-player-bar {
  display: none; align-items: center; gap: 16px;
  background: #0d0d1a; border-top: 1px solid rgba(0,255,200,0.15);
  border-bottom: 1px solid rgba(0,255,200,0.08);
  padding: 12px 32px; position: sticky; top: 0; z-index: 100;
}
.pod-player-bar.visible { display: flex; }
.pod-play-btn {
  width: 36px; height: 36px; border-radius: 50%; border: none;
  background: #00ffc8; color: #000; font-size: 14px; cursor: pointer;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.pod-now-playing-info { flex: 1; min-width: 0; }
.pod-now-title { font-size: 13px; font-weight: 700; color: #00ffc8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pod-now-meta { font-size: 11px; color: #5a7088; }

/* ── Video Player ── */
.video-player-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.92);
  display: flex; align-items: center; justify-content: center; z-index: 9999;
}
.video-player-container { max-width: 900px; width: 90%; position: relative; }
.close-video-btn {
  position: absolute; top: -36px; right: 0;
  background: transparent; border: none; color: #8888aa; cursor: pointer; font-size: 14px;
}
.video-player { width: 100%; border-radius: 8px; }

/* ── Content ── */
.podcast-detail-content { max-width: 1100px; margin: 0 auto; padding: 32px; }

.detail-section h2 {
  font-size: 15px; font-weight: 800; color: #dde0f0;
  margin: 0 0 16px; letter-spacing: 0.5px;
  display: flex; align-items: center; gap: 8px;
}
.detail-section h2::after { content: ""; flex: 1; height: 1px; background: rgba(255,255,255,0.06); }

.empty-episodes { text-align: center; padding: 48px; color: #5a7088; }
.empty-episodes p { font-size: 16px; margin-bottom: 8px; }
.empty-episodes span { font-size: 13px; }

/* ── Episode List ── */
.podcast-detail-container .episode-list {
  list-style: none !important;
  padding: 0 !important;
  margin: 0 !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 8px !important;
}

.podcast-detail-container .episode-item {
  display: flex !important;
  flex-direction: row !important;
  align-items: center !important;
  gap: 14px !important;
  padding: 14px 16px !important;
  background: #0a0a18 !important;
  border: 1px solid rgba(255,255,255,0.06) !important;
  border-radius: 8px !important;
  cursor: pointer !important;
  transition: all .15s !important;
  margin: 0 !important;
}
.podcast-detail-container .episode-item:hover {
  background: #0f0f20 !important;
  border-color: rgba(0,255,200,0.15) !important;
}
.podcast-detail-container .episode-item.playing {
  background: rgba(0,255,200,0.04) !important;
  border-color: rgba(0,255,200,0.2) !important;
}

.episode-play-col { flex-shrink: 0; }

.ep-play-btn {
  width: 38px; height: 38px; border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.05); color: #dde0f0; font-size: 13px;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: all .15s; flex-shrink: 0;
}
.ep-play-btn:hover { background: rgba(0,255,200,0.1); border-color: rgba(0,255,200,0.3); color: #00ffc8; }
.ep-play-btn.playing { background: rgba(0,255,200,0.15); border-color: #00ffc8; color: #00ffc8; }
.ep-play-btn:disabled { opacity: 0.3; cursor: not-allowed; }

.episode-info { flex: 1; min-width: 0; }

.episode-header { display: flex; align-items: center; gap: 8px; margin-bottom: 3px; flex-wrap: wrap; }
.episode-number { font-size: 11px; color: #5a7088; font-weight: 700; }
.episode-header strong { font-size: 14px; color: #dde0f0; font-weight: 700; }

.video-badge {
  font-size: 10px; background: rgba(255,102,0,0.1);
  border: 1px solid rgba(255,102,0,0.25); color: #FF6600;
  padding: 2px 8px; border-radius: 10px; font-weight: 700;
}

.episode-description {
  font-size: 12px; color: #5a7088; line-height: 1.5; margin: 3px 0 5px;
  overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
}

.episode-meta { display: flex; gap: 12px; flex-wrap: wrap; }
.episode-meta span { font-size: 11px; color: #3a5070; }

/* Episode action buttons - stacked column */
.podcast-detail-container .episode-actions {
  display: flex !important;
  flex-direction: column !important;
  gap: 5px !important;
  flex-shrink: 0 !important;
  align-items: stretch !important;
  min-width: 85px !important;
}

.podcast-detail-container .play-button {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 6px 10px !important;
  border-radius: 5px !important;
  border: 1px solid rgba(0,255,200,0.2) !important;
  background: rgba(0,255,200,0.06) !important;
  color: #00ffc8 !important;
  font-size: 11px !important;
  font-weight: 700 !important;
  cursor: pointer !important;
  text-decoration: none !important;
  white-space: nowrap !important;
  width: 100% !important;
  box-sizing: border-box !important;
  transition: all .15s !important;
}
.podcast-detail-container .play-button:hover { background: rgba(0,255,200,0.12) !important; }
.podcast-detail-container .play-button.playing { background: rgba(0,255,200,0.15) !important; border-color: #00ffc8 !important; }
.podcast-detail-container .play-button.download {
  border-color: rgba(167,139,250,0.2) !important;
  background: rgba(167,139,250,0.06) !important;
  color: #a78bfa !important;
}
.podcast-detail-container .play-button.disabled { opacity: 0.3 !important; cursor: not-allowed !important; }

@media (max-width: 768px) {
  .podcast-hero-inner { flex-direction: column; padding: 0 20px; }
  .podcast-detail-image, .podcast-image-placeholder { width: 140px; height: 140px; }
  .podcast-title { font-size: 1.4rem; }
  .podcast-detail-content { padding: 20px; }
  .podcast-detail-container .episode-item { flex-wrap: wrap !important; }
  .podcast-detail-container .episode-actions { width: 100% !important; flex-direction: row !important; }
  .episode-play-col { display: none; }
}
'''

with open('/workspaces/SpectraSphere/src/front/styles/PodcastDetailPage.css', 'w') as f:
    f.write(css)
print('Done -', len(css), 'chars written')
