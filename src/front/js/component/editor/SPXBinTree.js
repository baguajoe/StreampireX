import React, { useMemo, useState } from "react";

const FolderNode = ({
  node,
  depth = 0,
  expanded,
  toggleNode,
  activeNodeId,
  setActiveNodeId
}) => {
  const isOpen = !!expanded[node.id];
  const isActive = activeNodeId === node.id;
  const hasChildren = Array.isArray(node.children) && node.children.length > 0;

  return (
    <div className="spx-bin-node">
      <button
        className={`spx-bin-row ${isActive ? "is-active" : ""}`}
        style={{ paddingLeft: `${12 + depth * 14}px` }}
        onClick={() => {
          setActiveNodeId(node.id);
          if (hasChildren) toggleNode(node.id);
        }}
      >
        <span className="spx-bin-chevron">{hasChildren ? (isOpen ? "▾" : "▸") : "•"}</span>
        <span className="spx-bin-label">{node.name}</span>
        {typeof node.count === "number" ? (
          <span className="spx-bin-count">{node.count}</span>
        ) : null}
      </button>

      {hasChildren && isOpen && (
        <div className="spx-bin-children">
          {node.children.map((child) => (
            <FolderNode
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              toggleNode={toggleNode}
              activeNodeId={activeNodeId}
              setActiveNodeId={setActiveNodeId}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const SPXBinTree = ({ tree = [], activeNodeId, setActiveNodeId }) => {
  const initialExpanded = useMemo(() => {
    const map = {};
    tree.forEach((n) => {
      map[n.id] = true;
    });
    return map;
  }, [tree]);

  const [expanded, setExpanded] = useState(initialExpanded);

  const toggleNode = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="spx-panel spx-bin-tree-panel">
      <div className="spx-section-title">Bins</div>
      <div className="spx-bin-tree">
        {tree.map((node) => (
          <FolderNode
            key={node.id}
            node={node}
            expanded={expanded}
            toggleNode={toggleNode}
            activeNodeId={activeNodeId}
            setActiveNodeId={setActiveNodeId}
          />
        ))}
      </div>
    </div>
  );
};

export default SPXBinTree;
