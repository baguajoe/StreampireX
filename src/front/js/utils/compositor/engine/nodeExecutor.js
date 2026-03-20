export function executeSingleNode(node, inputs = [], frame = 0) {
  if (!node) return null;

  switch (node.type) {
    case "mediaIn":
      return {
        kind: "media",
        nodeId: node.id,
        mediaUrl: node.mediaUrl || null,
        mediaType: node.mediaType || "image",
        width: node.width || 320,
        height: node.height || 180,
        frame,
      };

    case "text":
      return {
        kind: "text",
        nodeId: node.id,
        text: node.value || "Text",
        x: node.x ?? 320,
        y: node.y ?? 180,
        fontSize: node.fontSize ?? 42,
        color: node.color || "#ffffff",
        frame,
      };

    case "color":
      return {
        kind: "color",
        nodeId: node.id,
        color: node.value || "#00ffc8",
        frame,
      };

    case "blur":
      return {
        kind: "blur",
        nodeId: node.id,
        amount: node.params?.amount ?? 8,
        input: inputs[0] || null,
        frame,
      };

    case "transform":
      return {
        kind: "transform",
        nodeId: node.id,
        tx: node.params?.tx ?? 0,
        ty: node.params?.ty ?? 0,
        scale: node.params?.scale ?? 1,
        rotation: node.params?.rotation ?? 0,
        input: inputs[0] || null,
        frame,
      };

    case "merge":
      return {
        kind: "merge",
        nodeId: node.id,
        blendMode: node.params?.blendMode || "normal",
        inputs,
        frame,
      };

    case "shader":
      return {
        kind: "shader",
        nodeId: node.id,
        shader: node.shader || "basicColor",
        params: node.params || {},
        frame,
      };

    case "output":
      return {
        kind: "output",
        nodeId: node.id,
        input: inputs[0] || null,
        frame,
      };

    default:
      return {
        kind: "unknown",
        nodeId: node.id,
        type: node.type,
        inputs,
        frame,
      };
  }
}
