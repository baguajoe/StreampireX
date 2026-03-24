import React, { useEffect, useRef, useState } from "react";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const DEFAULT_LAYOUT = {
  left: 290,
  right: 320
};

const STORAGE_KEY = "spx-editor-panel-widths";

const loadSaved = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_LAYOUT;
    const parsed = JSON.parse(raw);
    return {
      left: Number(parsed.left) || DEFAULT_LAYOUT.left,
      right: Number(parsed.right) || DEFAULT_LAYOUT.right
    };
  } catch (_) {
    return DEFAULT_LAYOUT;
  }
};

const saveLayout = (layout) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  } catch (_) {}
};

const SPXResizableWorkspace = ({ left, center, right, bottom }) => {
  const wrapRef = useRef(null);
  const dragRef = useRef(null);
  const [sizes, setSizes] = useState(loadSaved);

  useEffect(() => {
    saveLayout(sizes);
  }, [sizes]);

  useEffect(() => {
    const handleMove = (e) => {
      if (!dragRef.current || !wrapRef.current) return;

      const rect = wrapRef.current.getBoundingClientRect();
      const minCenter = 420;
      const minLeft = 220;
      const maxLeft = 520;
      const minRight = 260;
      const maxRight = 520;

      if (dragRef.current === "left") {
        const nextLeft = clamp(e.clientX - rect.left, minLeft, rect.width - sizes.right - minCenter);
        setSizes((prev) => ({ ...prev, left: Math.min(nextLeft, maxLeft) }));
      }

      if (dragRef.current === "right") {
        const nextRight = clamp(rect.right - e.clientX, minRight, rect.width - sizes.left - minCenter);
        setSizes((prev) => ({ ...prev, right: Math.min(nextRight, maxRight) }));
      }
    };

    const handleUp = () => {
      dragRef.current = null;
      document.body.classList.remove("spx-resizing");
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [sizes.right, sizes.left]);

  const startDrag = (side) => {
    dragRef.current = side;
    document.body.classList.add("spx-resizing");
  };

  return (
    <div className="spx-editor-direct-workspace">
      <div
        ref={wrapRef}
        className="spx-editor-direct-top spx-editor-direct-top-resizable"
        style={{
          "--spx-left-width": `${sizes.left}px`,
          "--spx-right-width": `${sizes.right}px`
        }}
      >
        <aside className="spx-editor-direct-left">
          {left}
        </aside>

        <div
          className="spx-panel-resizer spx-panel-resizer-left"
          onMouseDown={() => startDrag("left")}
          title="Drag to resize panels"
        />

        <main className="spx-editor-direct-center">
          {center}
        </main>

        <div
          className="spx-panel-resizer spx-panel-resizer-right"
          onMouseDown={() => startDrag("right")}
          title="Drag to resize panels"
        />

        <aside className="spx-editor-direct-right">
          {right}
        </aside>
      </div>

      <div className="spx-editor-direct-bottom">
        {bottom}
      </div>
    </div>
  );
};

export default SPXResizableWorkspace;
