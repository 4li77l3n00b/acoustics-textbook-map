// 声学基础考点：把 output/viz 的离线页面装进一个本地窗口（资源在编译时嵌入）
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("failed to start 声学基础考点");
}
