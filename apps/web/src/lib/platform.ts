/** True inside the Tauri shells (Android APK / desktop), which bundle the web app locally. */
export const isNativeShell = !/^https?:$/.test(location.protocol) || location.hostname === 'tauri.localhost';
