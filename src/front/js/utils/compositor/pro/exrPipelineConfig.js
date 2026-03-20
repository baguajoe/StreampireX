export const PRO_FORMATS = [
  { id: "png", name: "PNG", supportedInBrowser: true },
  { id: "jpeg", name: "JPEG", supportedInBrowser: true },
  { id: "webm", name: "WebM", supportedInBrowser: true },
  { id: "exr", name: "OpenEXR", supportedInBrowser: false, backendRequired: true },
  { id: "prores", name: "ProRes", supportedInBrowser: false, backendRequired: true },
];

export function getExportCapability(formatId) {
  return PRO_FORMATS.find((f) => f.id === formatId) || null;
}
