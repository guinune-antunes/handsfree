// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::fs;
use std::net::TcpStream;
use std::path::PathBuf;
use std::time::Duration;

/// Configuração do aplicativo persistida localmente
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppConfig {
    pub host: String,
    pub port: u16,
    pub nickname: String,
}

/// Retorna o caminho do arquivo de configuração
fn config_path() -> PathBuf {
    let mut path = dirs::config_dir().unwrap_or_else(|| PathBuf::from("."));
    path.push("discord-clone-leve");
    fs::create_dir_all(&path).ok();
    path.push("config.json");
    path
}

/// Valida se o endereço IP:Porta é acessível via TCP
/// Retorna Ok(()) se conectou, Err(mensagem) caso contrário
#[tauri::command]
async fn validate_connection(host: String, port: u16) -> Result<String, String> {
    let addr = format!("{}:{}", host, port);

    // Tentar conectar com timeout de 5 segundos
    let result = tokio::task::spawn_blocking(move || {
        TcpStream::connect_timeout(
            &addr.parse().map_err(|e| format!("Endereço inválido: {}", e))?,
            Duration::from_secs(5),
        )
        .map_err(|e| format!("Não foi possível conectar a {}:{} — {}", host, port, e))
    })
    .await
    .map_err(|e| format!("Erro interno: {}", e))?;

    match result {
        Ok(_) => Ok("Conectado com sucesso!".to_string()),
        Err(e) => Err(e),
    }
}

/// Salva a configuração localmente em config.json
#[tauri::command]
async fn save_config(config: AppConfig) -> Result<(), String> {
    let path = config_path();
    let json = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("Erro ao serializar config: {}", e))?;
    fs::write(&path, json).map_err(|e| format!("Erro ao salvar config: {}", e))?;
    Ok(())
}

/// Carrega a configuração salva do disco
#[tauri::command]
async fn load_config() -> Result<Option<AppConfig>, String> {
    let path = config_path();
    if !path.exists() {
        return Ok(None);
    }
    let content =
        fs::read_to_string(&path).map_err(|e| format!("Erro ao ler config: {}", e))?;
    let config: AppConfig =
        serde_json::from_str(&content).map_err(|e| format!("Erro ao parsear config: {}", e))?;
    Ok(Some(config))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            validate_connection,
            save_config,
            load_config
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
