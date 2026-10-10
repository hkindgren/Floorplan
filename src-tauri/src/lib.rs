// Native side of Setplan: open/save dialogs, reading and writing drawing files, PDF/PNG exports,
// and opening .setplan files from Finder (double-click, "Open With", drop on the Dock icon).
use std::fs;
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
#[allow(unused_imports)]
use tauri::{Emitter, Manager};
use tauri_plugin_dialog::DialogExt;

#[derive(Default)]
struct Pending(Mutex<Vec<String>>);

/// Set once the web view has flushed its last save (or after a timeout), so the app may quit.
static QUITTING: AtomicBool = AtomicBool::new(false);

fn err<E: std::fmt::Display>(e: E) -> String {
    e.to_string()
}

/// Write via a temp file + rename, so Dropbox / iCloud never syncs a half-written drawing.
fn write_atomic(path: &str, bytes: &[u8]) -> Result<(), String> {
    let p = Path::new(path);
    if let Some(dir) = p.parent() {
        if !dir.as_os_str().is_empty() {
            fs::create_dir_all(dir).map_err(err)?;
        }
    }
    let name = p.file_name().ok_or("bad path")?.to_string_lossy().to_string();
    let tmp = p.with_file_name(format!(".{}.tmp", name));
    fs::write(&tmp, bytes).map_err(err)?;
    fs::rename(&tmp, p).map_err(err)
}

/// Decodes what JavaScript's encodeURIComponent produced (the path header of binary writes).
fn percent_decode(s: &str) -> String {
    let b = s.as_bytes();
    let mut out = Vec::with_capacity(b.len());
    let mut i = 0;
    while i < b.len() {
        if b[i] == b'%' && i + 2 < b.len() {
            if let Ok(v) = u8::from_str_radix(&s[i + 1..i + 3], 16) {
                out.push(v);
                i += 3;
                continue;
            }
        }
        out.push(b[i]);
        i += 1;
    }
    String::from_utf8_lossy(&out).into_owned()
}

/// Makes sure a chosen save path ends in the expected extension (the dialog may leave it off).
fn with_ext(path: String, exts: &[String]) -> String {
    let lower = path.to_lowercase();
    if exts.is_empty() || exts.iter().any(|e| lower.ends_with(&format!(".{}", e.to_lowercase()))) {
        path
    } else {
        format!("{}.{}", path, exts[0])
    }
}

fn is_drawing(path: &str) -> bool {
    let l = path.to_lowercase();
    l.ends_with(".setplan") || l.ends_with(".json")
}

#[tauri::command]
fn quit_now(app: tauri::AppHandle) {
    QUITTING.store(true, Ordering::SeqCst);
    app.exit(0);
}

/// Frontend console output ends up in the terminal / Console.app.
#[tauri::command]
fn debug_log(level: String, msg: String) {
    eprintln!("[web {}] {}", level, msg);
}

/// Debug builds started with SETPLAN_SELFTEST_DIR run a scripted test (used by CI).
#[tauri::command]
fn selftest_dir() -> Option<String> {
    if cfg!(debug_assertions) {
        std::env::var("SETPLAN_SELFTEST_DIR").ok()
    } else {
        None
    }
}

#[tauri::command]
async fn pick_open_file(app: tauri::AppHandle, title: String) -> Option<String> {
    let picked = app
        .dialog()
        .file()
        .set_title(title)
        .add_filter("Setplan-ritning", &["setplan", "json"])
        .blocking_pick_file()?;
    picked.into_path().ok().map(|p| p.to_string_lossy().to_string())
}

#[tauri::command]
async fn pick_save_file(
    app: tauri::AppHandle,
    title: String,
    default_name: String,
    filter_name: String,
    exts: Vec<String>,
) -> Option<String> {
    let ext_refs: Vec<&str> = exts.iter().map(|s| s.as_str()).collect();
    let picked = app
        .dialog()
        .file()
        .set_title(title)
        .set_file_name(default_name)
        .add_filter(filter_name, &ext_refs)
        .blocking_save_file()?;
    picked
        .into_path()
        .ok()
        .map(|p| with_ext(p.to_string_lossy().to_string(), &exts))
}

#[tauri::command]
fn read_text(path: String) -> Option<String> {
    fs::read_to_string(path).ok()
}

#[tauri::command]
fn write_text(path: String, text: String) -> Result<(), String> {
    write_atomic(&path, text.as_bytes())
}

#[tauri::command]
fn write_binary(request: tauri::ipc::Request) -> Result<(), String> {
    let path = request
        .headers()
        .get("x-path")
        .and_then(|v| v.to_str().ok())
        .map(percent_decode)
        .ok_or("missing x-path header")?;
    match request.body() {
        tauri::ipc::InvokeBody::Raw(bytes) => write_atomic(&path, bytes),
        _ => Err("expected a binary body".into()),
    }
}

#[tauri::command]
fn file_exists(path: String) -> bool {
    Path::new(&path).is_file()
}

/// Shows the file in Finder.
#[tauri::command]
fn reveal(path: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open").arg("-R").arg(&path).spawn().map_err(err)?;
    }
    let _ = path;
    Ok(())
}

/// Files opened from Finder before / while the web view was ready; handed over once.
#[tauri::command]
fn take_pending_opens(state: tauri::State<Pending>) -> Vec<String> {
    std::mem::take(&mut *state.0.lock().unwrap())
}

#[allow(dead_code)] // only used on macOS
fn queue_opens(handle: &tauri::AppHandle, paths: Vec<String>) {
    let paths: Vec<String> = paths.into_iter().filter(|p| is_drawing(p)).collect();
    if paths.is_empty() {
        return;
    }
    handle.state::<Pending>().0.lock().unwrap().extend(paths);
    let _ = handle.emit("open-paths-ready", ());
    if let Some(w) = handle.get_webview_window("main") {
        let _ = w.unminimize();
        let _ = w.set_focus();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(Pending::default())
        .setup(|app| {
            // Files passed on the command line (Linux / Windows "Open with")
            let args: Vec<String> = std::env::args().skip(1).filter(|a| is_drawing(a)).collect();
            if !args.is_empty() {
                app.state::<Pending>().0.lock().unwrap().extend(args);
            }
            // Debug builds: SETPLAN_SELFTEST_DIR runs the in-app self-test, then quits (CI).
            #[cfg(debug_assertions)]
            if std::env::var("SETPLAN_SELFTEST_DIR").is_ok() {
                let h = app.handle().clone();
                std::thread::spawn(move || {
                    let secs = std::env::var("SETPLAN_SELFTEST_SECS").ok().and_then(|s| s.parse().ok()).unwrap_or(30);
                    std::thread::sleep(std::time::Duration::from_secs(secs));
                    QUITTING.store(true, Ordering::SeqCst);
                    h.exit(0);
                });
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            quit_now,
            debug_log,
            selftest_dir,
            pick_open_file,
            pick_save_file,
            read_text,
            write_text,
            write_binary,
            file_exists,
            reveal,
            take_pending_opens
        ])
        .build(tauri::generate_context!())
        .expect("error while building the app");

    app.run(|handle, event| {
        #[cfg(any(target_os = "macos", target_os = "ios"))]
        if let tauri::RunEvent::Opened { urls } = &event {
            let paths: Vec<String> = urls
                .iter()
                .filter_map(|u| u.to_file_path().ok())
                .map(|p| p.to_string_lossy().to_string())
                .collect();
            queue_opens(handle, paths);
        }
        // Cmd+Q / closing the window: let the web view write its last changes first.
        if let tauri::RunEvent::ExitRequested { api, code, .. } = &event {
            if code.is_none() && !QUITTING.load(Ordering::SeqCst) {
                api.prevent_exit();
                let _ = handle.emit("flush-before-quit", ());
                let h = handle.clone();
                std::thread::spawn(move || {
                    std::thread::sleep(std::time::Duration::from_secs(4));
                    QUITTING.store(true, Ordering::SeqCst);
                    h.exit(0);
                });
            }
        }
        let _ = (handle, &event);
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn decodes_paths() {
        assert_eq!(percent_decode("%2FUsers%2Fhk%2FStudio%20%C3%A5%C3%A4%C3%B6.pdf"), "/Users/hk/Studio åäö.pdf");
        assert_eq!(percent_decode("plain"), "plain");
        assert_eq!(percent_decode("bad%zz"), "bad%zz");
        assert_eq!(percent_decode("end%"), "end%");
    }

    #[test]
    fn adds_missing_extension() {
        let e = vec!["setplan".to_string()];
        assert_eq!(with_ext("/a/Studio".into(), &e), "/a/Studio.setplan");
        assert_eq!(with_ext("/a/Studio.SETPLAN".into(), &e), "/a/Studio.SETPLAN");
        assert_eq!(with_ext("/a/x.pdf".into(), &[]), "/a/x.pdf");
    }

    #[test]
    fn drawings_only() {
        assert!(is_drawing("/a/b.setplan"));
        assert!(is_drawing("/a/old.setplan.json"));
        assert!(!is_drawing("/a/photo.jpg"));
    }

    #[test]
    fn atomic_write() {
        let dir = std::env::temp_dir().join(format!("setplan-test-{}", std::process::id()));
        let p = dir.join("sub/plan.setplan");
        let ps = p.to_string_lossy().to_string();
        write_atomic(&ps, b"{\"a\":1}").unwrap();
        write_atomic(&ps, b"{\"a\":2}").unwrap();
        assert_eq!(fs::read_to_string(&p).unwrap(), "{\"a\":2}");
        assert!(file_exists(ps.clone()));
        assert_eq!(fs::read_dir(p.parent().unwrap()).unwrap().count(), 1, "no temp file left behind");
        fs::remove_dir_all(dir).unwrap();
    }
}
