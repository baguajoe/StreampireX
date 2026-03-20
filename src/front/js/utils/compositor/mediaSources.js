export function createMediaCanvas(node, width = 1280, height = 720) {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  const ctx = c.getContext("2d");

  const p = node?.properties || {};
  const bg = p.bg || "#16263d";
  const fg = p.color || "#00ffc8";
  const title = p.name || "Media In";
  const mediaUrl = p.mediaUrl || "local://placeholder";

  const g = ctx.createLinearGradient(0, 0, width, height);
  g.addColorStop(0, bg);
  g.addColorStop(1, "#0d1117");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = fg;
  ctx.lineWidth = 6;
  ctx.strokeRect(30, 30, width - 60, height - 60);

  ctx.fillStyle = fg;
  ctx.font = "bold 48px Arial";
  ctx.fillText(title, 70, 100);

  ctx.fillStyle = "#ffffff";
  ctx.font = "24px Arial";
  ctx.fillText(mediaUrl, 70, 150);

  ctx.fillStyle = "#ff8a00";
  ctx.fillRect(100, 220, 260, 160);
  ctx.fillStyle = "#00ff00";
  ctx.fillRect(420, 260, 260, 160);

  return c;
}

export function createTextCanvas(node, width = 1280, height = 720) {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  const ctx = c.getContext("2d");

  const p = node?.properties || {};
  const text = p.text || "SPX Text";
  const color = p.color || "#ffffff";
  const fontSize = p.fontSize || 60;
  const fontWeight = p.fontWeight || 800;
  const x = ((p.x ?? 50) / 100) * width;
  const y = ((p.y ?? 50) / 100) * height;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "rgba(0,0,0,0)";
  ctx.fillRect(0, 0, width, height);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;
  ctx.font = `${fontWeight} ${fontSize}px Arial`;
  ctx.fillText(text, x, y);

  return c;
}
