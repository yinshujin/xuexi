// The app is a thin shell around the web app in apps/web: all features live in
// the bundled web assets, which talk to the family site (catalog, course packs,
// sync API) over HTTPS. No native commands are needed.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
