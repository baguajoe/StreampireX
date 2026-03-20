export const LUT_PRESETS = [
  { id: "none", name: "None" },
  { id: "cinematic", name: "Cinematic" },
  { id: "teal_orange", name: "Teal/Orange" },
  { id: "cool_contrast", name: "Cool Contrast" },
];

export function applyLUTMeta(lutId = "none") {
  return LUT_PRESETS.find((l) => l.id === lutId) || LUT_PRESETS[0];
}
