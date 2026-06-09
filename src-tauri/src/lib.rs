// Tauri v2 백엔드 진입점.
// H0: SQLite 연결 + 마이그레이션. H2: 파일 첨부 커맨드. H3: memo(0002). H4: 검색 FTS5 trigram(0003).
// H5: 텍스트 추출(extract_text — PDF/HWPX).

use tauri_plugin_sql::{Migration, MigrationKind};

mod files;
mod parsers;

/// 앱 식별자. tauri.conf.json 의 "identifier" 와 반드시 일치해야 한다.
const APP_IDENTIFIER: &str = "com.knowledgemap.app";

/// 앱 로컬 데이터 디렉토리(`<LocalAppData>/<identifier>`).
/// knowledge.db 와 첨부 storage 의 공통 베이스. 런타임에 resolve 하므로 데이터 폴더 이동에도 견딘다.
pub fn app_data_dir() -> Result<std::path::PathBuf, String> {
    dirs::data_local_dir()
        .map(|d| d.join(APP_IDENTIFIER))
        .ok_or_else(|| "로컬 데이터 디렉토리를 찾을 수 없습니다".to_string())
}

/// DB 연결 문자열. `add_migrations` 키와 JS `Database.load` 인자에 동일하게 쓰여야 한다(정확 매칭).
fn db_connection_string() -> String {
    let dir = app_data_dir().expect("로컬 데이터 디렉토리를 찾을 수 없습니다");
    std::fs::create_dir_all(&dir).expect("앱 로컬 데이터 디렉토리 생성 실패");
    format!("sqlite:{}", dir.join("knowledge.db").to_string_lossy())
}

/// 프론트엔드가 마이그레이션 키와 동일한 연결 문자열을 얻기 위한 커맨드.
#[tauri::command]
fn db_connection_url() -> String {
    db_connection_string()
}

/// 마이그레이션 목록(append-only). 새 변경은 항상 새 version 으로 추가하고 기존 것은 수정하지 않는다.
fn migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "create_initial_schema",
            sql: include_str!("../migrations/0001_init.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "add_memo_to_nodes",
            sql: include_str!("../migrations/0002_add_memo.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "search_fts_trigram",
            sql: include_str!("../migrations/0003_search_trigram.sql"),
            kind: MigrationKind::Up,
        },
    ]
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let db_url = db_connection_string();

    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(&db_url, migrations())
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            db_connection_url,
            files::import_file,
            files::trash_attachment,
            files::open_attachment,
            parsers::extract_text
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
