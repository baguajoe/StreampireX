export function getCanvasFilter(effects = []) {
  if (!Array.isArray(effects) || effects.length === 0) return "none";

  const filters = [];

  effects.forEach((fx) => {
    if (!fx || !fx.type) return;
    if (fx.type === "blur") filters.push(`blur(${fx.value ?? 0}px)`);
    if (fx.type === "brightness") filters.push(`brightness(${fx.value ?? 100}%)`);
    if (fx.type === "contrast") filters.push(`contrast(${fx.value ?? 100}%)`);
    if (fx.type === "saturate") filters.push(`saturate(${fx.value ?? 100}%)`);
    if (fx.type === "hueRotate") filters.push(`hue-rotate(${fx.value ?? 0}deg)`);
  });

  return filters.length ? filters.join(" ") : "none";
}
