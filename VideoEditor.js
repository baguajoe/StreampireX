import React, { useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import VideoEditorComponent from "../component/VideoEditorComponent";

// ── Renders inside a full-screen portal that escapes site layout ──
const VideoEditor = () => {
  const portalRef = useRef(null);

  if (!portalRef.current) {
    const el = document.createElement('div');
    el.id = 'spx-video-editor-portal';
    Object.assign(el.style, {
      position: 'fixed', inset: '0', zIndex: '1000',
      background: '#04040c', display: 'flex',
      flexDirection: 'column', overflow: 'hidden',
      fontFamily: "'JetBrains Mono', monospace",
      color: '#f0f4f8', fontSize: '12px', userSelect: 'none',
    });
    document.body.appendChild(el);
    portalRef.current = el;
  }

  useEffect(() => {
    const el = portalRef.current;
    // Hide site nav while editor is open
    const toHide = document.querySelectorAll('nav, header, .navbar, .sidebar, [class*="Navbar"], [class*="sidebar"]');
    toHide.forEach(n => { n._spxDisplay = n.style.display; n.style.display = 'none'; });
    document.body.style.overflow = 'hidden';
    return () => {
      toHide.forEach(n => { n.style.display = n._spxDisplay || ''; });
      document.body.style.overflow = '';
      if (el && el.parentNode) el.parentNode.removeChild(el);
      portalRef.current = null;
    };
  }, []);

  if (!portalRef.current) return null;
  return ReactDOM.createPortal(<VideoEditorComponent />, portalRef.current);
};

export default VideoEditor;
