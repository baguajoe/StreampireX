/**
 * SPXCutMediaBin.js
 * Media bin: grid/list toggle, import, drag-to-timeline, thumbnails,
 * duration display, search, drop zone, resizable panel.
 * Zero inline CSS.
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { formatTimecode } from './hooks/usePlayback';
import { trackBlobUrl, revokeIfOwned } from './hooks/useEditorStore';

const MEDIA_TYPE_ICONS = { video: '🎬', audio: '🎵', image: '🖼️' };

function SPXCutMediaBin({ state, actions, drag }) {
  const [items,      setItems]      = useState([]);
  const [viewMode,   setViewMode]   = useState('grid');   // grid | list
  const [search,     setSearch]     = useState('');
  const [selected,   setSelected]   = useState(null);
  const [dragOver,   setDragOver]   = useState(false);
  const binRef = useRef(null);
  const resizerRef = useRef(null);
  // Mirror the latest items so a drag's live-getter can read the CURRENT bin item
  // at drop time (post-upload patch replaces the object; a dragstart snapshot goes stale).
  const itemsRef = useRef([]);
  itemsRef.current = items;

  // ── Listen for import events (from header file input) ─────
  useEffect(() => {
    const handler = (e) => {
      const { file, mediaType } = e.detail;
      const item = {
        id:        `media_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
        name:      file.name,
        file,
        src:       trackBlobUrl(URL.createObjectURL(file)),
        mediaType,
        duration:  0,
        size:      file.size,
        thumb:     null,
        // Cloud upload state — blob src is used for instant local UX,
        // source_url/public_id get filled in once the R2 upload resolves.
        uploadState: 'uploading',   // uploading | ready | failed
        source_url:  null,
        public_id:   null,
      };

      // Get duration for video/audio
      if (mediaType === 'video' || mediaType === 'audio') {
        const el = mediaType === 'video' ? document.createElement('video') : document.createElement('audio');
        el.src = item.src;
        el.onloadedmetadata = () => {
          item.duration = el.duration;
          setItems(prev => prev.map(i => i.id === item.id ? { ...i, duration: el.duration } : i));
        };
      }

      // Generate thumbnail for video
      if (mediaType === 'video') {
        const v = document.createElement('video');
        v.src = item.src;
        v.currentTime = 0.5;
        v.oncanplay = () => {
          try {
            const c = document.createElement('canvas');
            c.width = 80; c.height = 45;
            c.getContext('2d').drawImage(v, 0, 0, 80, 45);
            item.thumb = c.toDataURL('image/jpeg', 0.5);
            setItems(prev => prev.map(i => i.id === item.id ? { ...i, thumb: item.thumb } : i));
          } catch(_) {}
        };
      } else if (mediaType === 'image') {
        item.thumb = item.src;
      }

      setItems(prev => [...prev, item]);

      // ── Upload to R2 so the backend renderer can fetch it on export ──
      // Keep the blob src for instant preview; patch in cloud fields on success.
      uploadMediaItem(item);
    };

    // POST the File to the existing /api/video-editor/upload endpoint.
    // Patches the bin item's uploadState + source_url/public_id (+ server duration).
    const uploadMediaItem = (item) => {
      const base = process.env.REACT_APP_BACKEND_URL || '';
      const token = localStorage.getItem('token');
      const form = new FormData();
      form.append('file', item.file, item.name);

      fetch(`${base}/api/video-editor/upload`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      })
        .then(res => res.ok ? res.json() : Promise.reject(new Error(`Upload failed (${res.status})`)))
        .then(data => {
          const asset = data && data.asset;
          if (!asset || !asset.url) throw new Error('Upload response missing asset');
          setItems(prev => prev.map(i => i.id === item.id ? {
            ...i,
            uploadState: 'ready',
            source_url:  asset.url,
            public_id:   asset.r2_key,
            // Prefer server ffprobe duration when available; keep client value otherwise.
            duration:    (asset.duration && asset.duration > 0) ? asset.duration : i.duration,
          } : i));
          // Reconcile clips already dropped on the timeline before this upload
          // resolved (drag captured a null-source snapshot). Matched by the stable
          // bin item id — blob src diverges between bin item and clip, so it can't
          // be used as a join key.
          actions.resolveClipMedia(item.id, {
            source_url: asset.url,
            public_id:  asset.r2_key,
            duration:   (asset.duration && asset.duration > 0) ? asset.duration : item.duration,
          });
        })
        .catch(err => {
          console.warn('[SPX Cut] media upload failed:', err);
          setItems(prev => prev.map(i => i.id === item.id ? { ...i, uploadState: 'failed' } : i));
        });
    };

    window.addEventListener('spxcut:import', handler);
    return () => window.removeEventListener('spxcut:import', handler);
  }, []);

  // ── Resizer (drag to resize bin width) ────────────────────
  useEffect(() => {
    const rz = resizerRef.current;
    if (!rz) return;
    let startX, startW;
    const onDown = (e) => {
      startX = e.clientX;
      startW = binRef.current?.offsetWidth || 220;
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    };
    const onMove = (e) => {
      if (!binRef.current) return;
      const w = Math.max(140, Math.min(400, startW + (e.clientX - startX)));
      binRef.current.style.width = `${w}px`;
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    rz.addEventListener('mousedown', onDown);
    return () => rz.removeEventListener('mousedown', onDown);
  }, []);

  // ── File drop into bin ────────────────────────────────────
  const onBinDragOver = useCallback((e) => { e.preventDefault(); setDragOver(true); }, []);
  const onBinDragLeave = useCallback(() => setDragOver(false), []);
  const onBinDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    Array.from(e.dataTransfer.files).forEach(file => {
      const mediaType = file.type.startsWith('video') ? 'video'
        : file.type.startsWith('audio') ? 'audio' : 'image';
      window.dispatchEvent(new CustomEvent('spxcut:import', { detail: { file, mediaType } }));
    });
  }, []);

  // ── Import button ─────────────────────────────────────────
  const onImportClick = useCallback(() => {
    document.getElementById('spxcut-file-input')?.click();
  }, []);

  // ── Open in source monitor on double-click ────────────────
  const onItemDoubleClick = useCallback((item) => {
    if (item.mediaType === 'video' || item.mediaType === 'audio') {
      window.dispatchEvent(new CustomEvent('spxcut:opensource', {
        // Carry the stable id + already-uploaded cloud refs so an inserted clip
        // inherits them (reconcile keys on mediaItemId; no re-upload needed).
        detail: {
          file: item.file, src: item.src, duration: item.duration,
          mediaItemId: item.id,
          source_url:  item.source_url || null,
          public_id:   item.public_id || null,
        }
      }));
    }
  }, []);

  // ── Filtered items ────────────────────────────────────────
  const filtered = search
    ? items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
    : items;

  return (
    <>
      <div className="spxcut-media-bin" ref={binRef}>
        {/* Header */}
        <div className="spxcut-panel-header">
          <span className="spxcut-panel-title">Media Bin</span>
          <div className="spxcut-panel-actions">
            <button
              className={`spxcut-icon-btn${viewMode === 'grid' ? ' ibtn-active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >⊞</button>
            <button
              className={`spxcut-icon-btn${viewMode === 'list' ? ' ibtn-active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List View"
            >☰</button>
            <button
              className="spxcut-icon-btn"
              onClick={onImportClick}
              title="Import Media (Ctrl+I)"
            >+</button>
          </div>
        </div>

        {/* Search */}
        <div className="spxcut-search-bar">
          <input
            className="spxcut-search-input"
            placeholder="Search media..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Media grid/list */}
        <div
          className={`spxcut-media-grid${viewMode === 'list' ? ' media-list-view' : ''}`}
          onDragOver={onBinDragOver}
          onDragLeave={onBinDragLeave}
          onDrop={onBinDrop}
        >
          {filtered.map(item => (
            <div
              key={item.id}
              className={`spxcut-media-item${selected === item.id ? ' media-selected' : ''}`}
              draggable
              onDragStart={(e) => drag.startMediaDrag(e, item, () => itemsRef.current.find(i => i.id === item.id) || item)}
              onClick={() => setSelected(item.id)}
              onDoubleClick={() => onItemDoubleClick(item)}
              title={`${item.name} — Double-click to open in Source Monitor`}
            >
              <div className="spxcut-media-thumb">
                {item.thumb ? (
                  <img src={item.thumb} alt={item.name} />
                ) : (
                  <div className="spxcut-media-thumb-icon">
                    {MEDIA_TYPE_ICONS[item.mediaType] || '📄'}
                  </div>
                )}
                <span className={`spxcut-media-type-badge badge-${item.mediaType}`}>
                  {item.mediaType}
                </span>
              </div>
              <div className="spxcut-media-info">
                <div className="spxcut-media-name">{item.name}</div>
                {item.duration > 0 && (
                  <div className="spxcut-media-duration">{formatTimecode(item.duration)}</div>
                )}
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div
              className={`spxcut-media-drop-zone${dragOver ? ' dragging-over' : ''}`}
              onClick={onImportClick}
            >
              {dragOver ? '⬇ Drop to import' : '+ Import or drop media here'}
            </div>
          )}
        </div>
      </div>

      {/* Resize handle */}
      <div className="spxcut-resizer" ref={resizerRef} title="Drag to resize" />
    </>
  );
}

export default SPXCutMediaBin;
