// =============================================================================
// SPX Studio — Tauri backend commands
// =============================================================================

#[derive(serde::Serialize)]
struct VstPlugin {
    name:   String,
    path:   String,
    format: String,
}

#[tauri::command]
fn scan_vst_plugins() -> Vec<VstPlugin> {
    let mut plugins = Vec::new();
    let mut paths: Vec<String> = Vec::new();

    #[cfg(target_os = "windows")]
    {
        paths.push(r"C:\Program Files\Common Files\VST3".into());
        paths.push(r"C:\Program Files\Common Files\CLAP".into());
        if let Ok(h) = std::env::var("USERPROFILE") {
            paths.push(format!(r"{}\Documents\VST3", h));
        }
    }

    #[cfg(target_os = "macos")]
    {
        paths.push("/Library/Audio/Plug-Ins/VST3".into());
        paths.push("/Library/Audio/Plug-Ins/Components".into());
        paths.push("/Library/Audio/Plug-Ins/CLAP".into());
        if let Ok(h) = std::env::var("HOME") {
            paths.push(format!("{}/Library/Audio/Plug-Ins/VST3", h));
            paths.push(format!("{}/Library/Audio/Plug-Ins/Components", h));
        }
    }

    #[cfg(target_os = "linux")]
    {
        paths.push("/usr/lib/vst3".into());
        paths.push("/usr/local/lib/vst3".into());
        paths.push("/usr/lib/clap".into());
        if let Ok(h) = std::env::var("HOME") {
            paths.push(format!("{}/.vst3", h));
            paths.push(format!("{}/.clap", h));
        }
    }

    for base in paths {
        if let Ok(entries) = std::fs::read_dir(&base) {
            for e in entries.flatten() {
                let p = e.path();
                let fmt = match p.extension()
                    .and_then(|x| x.to_str())
                    .unwrap_or("")
                {
                    "vst3"      => "VST3",
                    "clap"      => "CLAP",
                    "component" => "AU",
                    _           => continue,
                };
                plugins.push(VstPlugin {
                    name:   p.file_stem()
                             .and_then(|s| s.to_str())
                             .unwrap_or("Unknown")
                             .into(),
                    path:   p.to_string_lossy().into(),
                    format: fmt.into(),
                });
            }
        }
    }
    plugins
}

#[tauri::command]
fn get_system_info() -> serde_json::Value {
    serde_json::json!({
        "platform": std::env::consts::OS,
        "arch":     std::env::consts::ARCH,
        "cores":    std::thread::available_parallelism()
                        .map(|n| n.get())
                        .unwrap_or(1),
    })
}

#[tauri::command]
fn write_binary_file(path: String, data: Vec<u8>) -> Result<(), String> {
    std::fs::write(&path, &data).map_err(|e| e.to_string())
}

#[tauri::command]
fn read_binary_file(path: String) -> Result<Vec<u8>, String> {
    std::fs::read(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_text_file(path: String, content: String) -> Result<(), String> {
    std::fs::write(&path, content).map_err(|e| e.to_string())
}

#[tauri::command]
fn read_text_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn path_exists(path: String) -> bool {
    std::path::Path::new(&path).exists()
}

#[tauri::command]
fn create_dir(path: String) -> Result<(), String> {
    std::fs::create_dir_all(&path).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            scan_vst_plugins,
            get_system_info,
            write_binary_file,
            read_binary_file,
            write_text_file,
            read_text_file,
            path_exists,
            create_dir,
        ])
        .run(tauri::generate_context!())
        .expect("error while running SPX Studio");
}
