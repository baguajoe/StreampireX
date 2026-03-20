def process_node_passes(nodes: list, edges: list):
    node_map = {n["id"]: n for n in nodes}
    ordered = [n["id"] for n in nodes]
    passes = []

    for node_id in ordered:
        node = node_map[node_id]
        passes.append({
            "node_id": node_id,
            "type": node.get("type"),
            "params": node.get("params", {}),
            "inputs": node.get("inputs", {}),
            "media_url": node.get("mediaUrl")
        })

    return {"passes": passes, "edge_count": len(edges)}
