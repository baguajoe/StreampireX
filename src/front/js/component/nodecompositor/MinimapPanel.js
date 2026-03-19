import React from "react";

export default function MinimapPanel({ nodes = [], selectedNodeId = null }) {
    return (
        <div className="nc-panel">
            <div className="nc-panel-title">Minimap</div>

            <div
                style={{
                    position: "relative",
                    width: "100%",
                    height: 160,
                    borderRadius: 10,
                    background: "#0b0f14",
                    border: "1px solid #1e2330",
                    overflow: "hidden"
                }}
            >
                {nodes.length === 0 ? (
                    <div
                        style={{
                            position: "absolute",
                            inset: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#6b7280",
                            fontSize: 12
                        }}
                    >
                        No nodes yet
                    </div>
                ) : (
                    nodes.map((node) => {
                        const x = Math.max(0, Math.min(90, (node.x || 0) / 12));
                        const y = Math.max(0, Math.min(85, (node.y || 0) / 8));
                        const w = Math.max(10, Math.min(30, (node.width || 160) / 10));
                        const h = Math.max(8, Math.min(20, (node.height || 80) / 10));

                        return (
                            <div
                                key={node.id}
                                title={node?.properties?.name || node?.label || node?.type || "Node"}
                                style={{
                                    position: "absolute",
                                    left: `${x}%`,
                                    top: `${y}%`,
                                    width: `${w}px`,
                                    height: `${h}px`,
                                    borderRadius: 4,
                                    background:
                                        node.id === selectedNodeId
                                            ? "rgba(0,255,200,0.9)"
                                            : "rgba(255,255,255,0.18)",
                                    border:
                                        node.id === selectedNodeId
                                            ? "1px solid #00ffc8"
                                            : "1px solid rgba(255,255,255,0.08)"
                                }}
                            />
                        );
                    })
                )}
            </div>

            <div className="nc-preview-meta" style={{ marginTop: 10 }}>
                <div className="nc-dim">Nodes: {nodes.length}</div>
                <div className="nc-dim">
                    Selected: {selectedNodeId ? selectedNodeId : "None"}
                </div>
            </div>
        </div>
    );
}