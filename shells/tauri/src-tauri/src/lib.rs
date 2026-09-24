// The app is a thin shell around the web app in apps/web. All features live in
// the bundled web assets. Native plugins are used only for:
//   - dialog + fs: choose / read course-bundle files and save learning backups
//     (works offline, without any server);
//   - opener: open the download page for app updates in the system browser.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
