import React, { useMemo } from "react";

export default function NodeEnginePanel({
  frame = 0,
  evaluation = null,
}) {
  const summary = useMemo(() => {
    if (!evaluation) return null;
    return {
      frame,
      passCount: evaluation.schedule?.length || 0,
      executed: evaluation.executed || [],
      cacheHits: evaluation.cacheHits || [],
      finalOutput: evaluation.finalOutput || null,
    };
  }, [frame, evaluation]);

  return (
    <div className="motion-panel">
      <div className="motion-panel-title">Final Node Engine</div>
      <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 12, lineHeight: 1.45 }}>
{JSON.stringify(summary, null, 2)}
      </pre>
    </div>
  );
}
