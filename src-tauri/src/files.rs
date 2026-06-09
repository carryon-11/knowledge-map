// H2: 파일 첨부 — 복사/해시/휴지통 이동/열기. DB 는 건드리지 않는다(JS 가 sql 플러그인으로 기록).

use std::fs;
use std::path::PathBuf;

use sha2::{Digest, Sha256};
use tauri::{AppHandle, Runtime};
use tauri_plugin_opener::OpenerExt;

use crate::app_data_dir;

#[derive(serde::Serialize)]
pub struct FileMeta {
    original_name: String,
    extension: Option<String>,
    mime_type: Option<String>,
    file_size: i64,
    file_hash: String,
    /// storage 베이스 기준 상대경로(= 저장 파일명). 런타임에 베이스와 합쳐 resolve.
    file_path: String,
}

/// storage 베이스(`<appLocalData>/storage`)를 보장하고 반환. `.trash` 도 함께 생성한다.
fn storage_base() -> Result<PathBuf, String> {
    let base = app_data_dir()?.join("storage");
    fs::create_dir_all(&base).map_err(|e| e.to_string())?;
    fs::create_dir_all(base.join(".trash")).map_err(|e| e.to_string())?;
    Ok(base)
}

/// 소스 파일을 `storage/{dest_id}.{ext}` 로 복사하고 메타데이터를 반환한다.
#[tauri::command]
pub fn import_file(source_path: String, dest_id: String) -> Result<FileMeta, String> {
    let src = PathBuf::from(&source_path);
    if !src.is_file() {
        return Err(format!("소스 파일을 찾을 수 없습니다: {source_path}"));
    }

    let original_name = src
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| dest_id.clone());
    let extension = src.extension().map(|e| e.to_string_lossy().to_lowercase());

    let base = storage_base()?;
    let stored_name = match &extension {
        Some(ext) => format!("{dest_id}.{ext}"),
        None => dest_id.clone(),
    };
    let dest = base.join(&stored_name);

    // 원본을 한 번 읽어 그대로 저장 + 동일 바이트로 해시.
    let bytes = fs::read(&src).map_err(|e| format!("읽기 실패: {e}"))?;
    fs::write(&dest, &bytes).map_err(|e| format!("저장 실패: {e}"))?;

    let file_size = bytes.len() as i64;
    let mut hasher = Sha256::new();
    hasher.update(&bytes);
    let digest = hasher.finalize();
    let file_hash: String = digest.iter().map(|b| format!("{b:02x}")).collect();

    let mime_type = mime_guess::from_path(&src).first().map(|m| m.to_string());

    Ok(FileMeta {
        original_name,
        extension,
        mime_type,
        file_size,
        file_hash,
        file_path: stored_name,
    })
}

/// 첨부 원본을 `storage/.trash/` 로 이동(soft-delete 의 물리 처리). 하드 삭제하지 않는다.
#[tauri::command]
pub fn trash_attachment(file_path: String) -> Result<(), String> {
    let base = storage_base()?;
    let src = base.join(&file_path);
    if !src.exists() {
        return Ok(()); // 이미 없으면 DB 정합성 우선해 성공 처리
    }
    let dest = base.join(".trash").join(&file_path);
    if dest.exists() {
        let _ = fs::remove_file(&dest);
    }
    fs::rename(&src, &dest).map_err(|e| format!("휴지통 이동 실패: {e}"))?;
    Ok(())
}

/// 첨부 원본을 OS 기본 프로그램으로 연다(opener 플러그인의 Rust API 사용 → JS 권한 스코프 불필요).
#[tauri::command]
pub fn open_attachment<R: Runtime>(app: AppHandle<R>, file_path: String) -> Result<(), String> {
    let base = storage_base()?;
    let abs = base.join(&file_path);
    if !abs.exists() {
        return Err("원본 파일을 찾을 수 없습니다.".into());
    }
    app.opener()
        .open_path(abs.to_string_lossy().to_string(), None::<&str>)
        .map_err(|e| format!("열기 실패: {e}"))
}
