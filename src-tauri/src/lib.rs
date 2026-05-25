mod commands;
mod services;
mod util;

use commands::{fs as fs_cmd, session, workspace};
use services::watcher::WatcherRegistry;

pub fn run() {
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info")).init();

    tauri::Builder::default()
        .manage(WatcherRegistry::default())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            fs_cmd::read_text_file,
            fs_cmd::write_text_file,
            fs_cmd::create_dir,
            fs_cmd::move_path,
            fs_cmd::delete_path,
            workspace::open_workspace,
            workspace::list_workspace,
            workspace::workspace_tree,
            workspace::watch_workspace,
            workspace::unwatch_workspace,
            session::ping,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Inkstone");
}
