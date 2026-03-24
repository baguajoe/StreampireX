export const buildDockLayout = (workspace, activeMonitorPreset) => {
  const monitorClassMap = {
    source_program: "monitor-preset-standard",
    program_large: "monitor-preset-program-large",
    source_large: "monitor-preset-source-large",
    stacked: "monitor-preset-stacked"
  };

  return {
    workspace,
    monitorClass: monitorClassMap[activeMonitorPreset] || "monitor-preset-standard"
  };
};
