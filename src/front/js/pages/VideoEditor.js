import React, { useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import VideoEditorComponent from "../component/videoeditor/SPXCutEditor";
// CSS lives in src/front/styles/SPXCut.css (loaded via index.css)

const VideoEditor = () => {
  const portalRef = useRef(null);

  if (!portalRef.current) {
    const el = document.createElement('div');
    el.id = 'spx-video-editor-portal';
    el.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#06060f;overflow:hidden;display:flex;flex-direction:column;';
    document.body.appendChild(el);
    portalRef.current = el;
  }

  useEffect(() => {
    const el = portalRef.current;
    // Hide site nav
    const toHide = document.querySelectorAll('nav, header, .navbar, [class*="Navbar"]');
    toHide.forEach(n => { n._spxD = n.style.display; n.style.display = 'none'; });
    document.body.style.overflow = 'hidden';
    return () => {
      toHide.forEach(n => { n.style.display = n._spxD || ''; });
      document.body.style.overflow = '';
      if (el && el.parentNode) el.parentNode.removeChild(el);
      portalRef.current = null;
    };
  }, []);

  if (!portalRef.current) return null;
  return ReactDOM.createPortal(<VideoEditorComponent />, portalRef.current);
};

export default VideoEditor;
