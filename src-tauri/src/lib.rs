// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::fs;
use std::net::TcpStream;
use std::path::PathBuf;
use std::time::Duration;
use tauri::WindowEvent;

/// Configuração do aplicativo persistida localmente
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppConfig {
    pub host: String,
    pub port: u16,
    pub nickname: String,
}

/// Retorna o caminho do arquivo de configuração
fn config_path() -> PathBuf {
    let base = dirs::config_dir().unwrap_or_else(|| PathBuf::from("."));
    let mut path = base.clone();
    path.push("shelter");
    fs::create_dir_all(&path).ok();
    path.push("config.json");

    if !path.exists() {
        let legacy = base.join("discord-clone-leve").join("config.json");
        if legacy.exists() {
            fs::copy(&legacy, &path).ok();
        }
    }

    path
}

fn sanitize_host_port(host: &str, default_port: u16) -> (String, u16) {
    let mut h = host.trim();
    if let Some(pos) = h.find("://") {
        h = &h[pos + 3..];
    }
    if let Some(pos) = h.find('/') {
        h = &h[..pos];
    }
    if let Some(pos) = h.rfind(':') {
        let port_part = &h[pos + 1..];
        if let Ok(p) = port_part.parse::<u16>() {
            return (h[..pos].to_string(), p);
        }
        return (h[..pos].to_string(), default_port);
    }
    (h.to_string(), default_port)
}

/// Valida se o endereço IP:Porta é acessível via TCP
#[tauri::command]
async fn validate_connection(host: String, port: u16) -> Result<String, String> {
    let (clean_host, clean_port) = sanitize_host_port(&host, port);
    let result = tokio::task::spawn_blocking(move || {
        use std::net::ToSocketAddrs;
        let addrs: Vec<_> = (clean_host.as_str(), clean_port)
            .to_socket_addrs()
            .map_err(|e| format!("Endereço ou hostname inválido '{}': {}", clean_host, e))?
            .collect();

        if addrs.is_empty() {
            return Err("Nenhum endereço IP encontrado para o host informado.".to_string());
        }

        TcpStream::connect_timeout(&addrs[0], Duration::from_secs(5))
            .map_err(|e| format!("Não foi possível conectar a {}:{} (TCP 7880). Verifique se as portas estão liberadas no roteador ou firewall do servidor. Detalhes: {}", clean_host, clean_port, e))
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

/// Finalização limpa e imediata de todos os processos do Shelter
#[tauri::command]
fn force_exit() {
    std::process::exit(0);
}

// ========================================================
// GERENCIAMENTO LIMPO DE PROCESSOS NO WINDOWS (TASK MANAGER)
// Garante que WebView2 e sub-processos morram juntos
// ========================================================
#[cfg(windows)]
mod windows_process_mgmt {
    use std::ptr;
    type HANDLE = *mut std::ffi::c_void;
    type BOOL = i32;
    type DWORD = u32;

    const JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE: DWORD = 0x00002000;
    const JOB_OBJECT_EXTENDED_LIMIT_INFORMATION: i32 = 9;

    #[repr(C)]
    struct IO_COUNTERS {
        read_operation_count: u64,
        write_operation_count: u64,
        other_operation_count: u64,
        read_transfer_count: u64,
        write_transfer_count: u64,
        other_transfer_count: u64,
    }

    #[repr(C)]
    struct JOBOBJECT_BASIC_LIMIT_INFORMATION {
        per_process_user_time_limit: i64,
        per_job_user_time_limit: i64,
        limit_flags: DWORD,
        minimum_working_set_size: usize,
        maximum_working_set_size: usize,
        active_process_limit: DWORD,
        affinity: usize,
        priority_class: DWORD,
        scheduling_class: DWORD,
    }

    #[repr(C)]
    struct JOBOBJECT_EXTENDED_LIMIT_INFORMATION {
        basic_limit_information: JOBOBJECT_BASIC_LIMIT_INFORMATION,
        io_info: IO_COUNTERS,
        process_memory_limit: usize,
        job_memory_limit: usize,
        peak_process_memory_limit: usize,
        peak_job_memory_limit: usize,
    }

    extern "system" {
        fn CreateJobObjectW(lp_job_attributes: *mut std::ffi::c_void, lp_name: *const u16) -> HANDLE;
        fn SetInformationJobObject(
            h_job: HANDLE,
            job_object_info_class: i32,
            lp_job_object_info: *const std::ffi::c_void,
            cb_job_object_info_length: DWORD,
        ) -> BOOL;
        fn AssignProcessToJobObject(h_job: HANDLE, h_process: HANDLE) -> BOOL;
        fn GetCurrentProcess() -> HANDLE;
        fn CreateMutexW(lp_mutex_attributes: *mut std::ffi::c_void, b_initial_owner: BOOL, lp_name: *const u16) -> HANDLE;
        fn GetLastError() -> DWORD;
    }

    pub fn init_process_sandbox() {
        unsafe {
            // 1. Instância Única: se o Shelter já estiver aberto, não cria múltiplos processos
            let name: Vec<u16> = "Global\\Shelter_Single_Process_Lock\0".encode_utf16().collect();
            let mutex = CreateMutexW(ptr::null_mut(), 1, name.as_ptr());
            if !mutex.is_null() && GetLastError() == 183 {
                // Já existe uma instância aberta do Shelter rodando no PC
                std::process::exit(0);
            }

            // 2. Windows Job Object: Agrupa o processo principal e TODOS os sub-processos do WebView2
            // Ao fechar ou matar o Shelter no Gerenciador de Tarefas, o Windows encerra TODOS
            // os processos filhos instantaneamente no nível do kernel.
            let job = CreateJobObjectW(ptr::null_mut(), ptr::null());
            if !job.is_null() {
                let mut info: JOBOBJECT_EXTENDED_LIMIT_INFORMATION = std::mem::zeroed();
                info.basic_limit_information.limit_flags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
                SetInformationJobObject(
                    job,
                    JOB_OBJECT_EXTENDED_LIMIT_INFORMATION,
                    &info as *const _ as *const std::ffi::c_void,
                    std::mem::size_of::<JOBOBJECT_EXTENDED_LIMIT_INFORMATION>() as DWORD,
                );
                AssignProcessToJobObject(job, GetCurrentProcess());
                let _ = job;
            }
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(windows)]
    windows_process_mgmt::init_process_sandbox();

    // Ativa aceleração de hardware completa no WebView2
    std::env::set_var(
        "WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS",
        "--enable-features=VaapiVideoDecoder,PlatformHEVCDecoderSupport --enable-gpu-rasterization --enable-zero-copy --ignore-gpu-blocklist --enable-hardware-overlays --enable-accelerated-video-decode",
    );

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            validate_connection,
            save_config,
            load_config,
            force_exit
        ])
        .on_window_event(|_window, event| {
            if let WindowEvent::CloseRequested { .. } | WindowEvent::Destroyed = event {
                // Ao fechar a janela, garante finalização completa e imediata do processo
                std::process::exit(0);
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
