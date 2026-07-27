use serde::{Deserialize, Serialize};
use tauri::Manager;
use url::Url;

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct LocalSource {
    id: String,
    name: String,
    base_url: String,
    allowed_hosts: Vec<String>,
    #[serde(default)]
    allow_private_networks: bool,
}

fn is_private_host(host: &str) -> bool {
    host == "localhost"
        || host.ends_with(".local")
        || host.starts_with("127.")
        || host.starts_with("10.")
        || host.starts_with("192.168.")
        || host.starts_with("169.254.")
        || host
            .strip_prefix("172.")
            .and_then(|rest| rest.split('.').next())
            .and_then(|octet| octet.parse::<u8>().ok())
            .is_some_and(|octet| (16..=31).contains(&octet))
        || host == "::1"
        || host.starts_with("fc")
        || host.starts_with("fd")
        || host.starts_with("fe80")
}

fn validate_source(source: &LocalSource) -> Result<(), String> {
    let url = Url::parse(&source.base_url).map_err(|_| "SOURCE_URL_INVALID".to_string())?;
    if url.scheme() != "https" {
        return Err("SOURCE_HTTPS_REQUIRED".to_string());
    }
    let host = url.host_str().ok_or_else(|| "SOURCE_HOST_MISSING".to_string())?;
    if is_private_host(host) && !source.allow_private_networks {
        return Err("SOURCE_PRIVATE_NETWORK_REQUIRES_EXPLICIT_DESKTOP_POLICY".to_string());
    }
    if !source.allowed_hosts.iter().any(|allowed| allowed == host) {
        return Err("SOURCE_HOST_NOT_ALLOWED".to_string());
    }
    Ok(())
}

#[tauri::command]
fn validate_local_source(source: LocalSource) -> Result<LocalSource, String> {
    validate_source(&source)?;
    Ok(source)
}

#[tauri::command]
fn platform_capabilities() -> serde_json::Value {
    serde_json::json!({
        "secureVault": true,
        "localSources": true,
        "pictureInPicture": true,
        "storeBuild": cfg!(feature = "custom-protocol")
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_stronghold::Builder::new(|password| {
            use std::hash::{Hash, Hasher};
            let mut hasher = std::collections::hash_map::DefaultHasher::new();
            password.hash(&mut hasher);
            hasher.finish().to_le_bytes().to_vec()
        }).build())
        .invoke_handler(tauri::generate_handler![
            validate_local_source,
            platform_capabilities
        ])
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                window.set_title("MarsTV")?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running MarsTV");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_insecure_source() {
        let source = LocalSource {
            id: "test".into(),
            name: "Test".into(),
            base_url: "http://media.example/api.php".into(),
            allowed_hosts: vec!["media.example".into()],
            allow_private_networks: false,
        };
        assert_eq!(validate_source(&source).unwrap_err(), "SOURCE_HTTPS_REQUIRED");
    }

    #[test]
    fn allows_explicit_private_household_source() {
        let source = LocalSource {
            id: "nas".into(),
            name: "NAS".into(),
            base_url: "https://192.168.1.8/api.php".into(),
            allowed_hosts: vec!["192.168.1.8".into()],
            allow_private_networks: true,
        };
        assert!(validate_source(&source).is_ok());
    }
}
