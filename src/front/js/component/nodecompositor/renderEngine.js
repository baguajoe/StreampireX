export function renderToImage(element, filename = "frame.png") {
  if (!element) return;

  try {
    const canvas = document.createElement("canvas");
    const rect = element.getBoundingClientRect();

    canvas.width = rect.width;
    canvas.height = rect.height;

    const ctx = canvas.getContext("2d");

    // Simple fallback render (solid background)
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const link = document.createElement("a");
    link.download = filename;
    link.href = canvas.toDataURL("image/png");
    link.click();
  } catch (err) {
    console.error("Render failed:", err);
  }
}
