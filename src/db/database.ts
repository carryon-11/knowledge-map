import Database from "@tauri-apps/plugin-sql";
import { invoke } from "@tauri-apps/api/core";

// DB 싱글톤. 최초 호출 시 한 번만 로드한다.
let dbPromise: Promise<Database> | null = null;

/**
 * SQLite 연결을 반환한다(싱글톤).
 *
 * 연결 문자열은 Rust 의 `db_connection_url` 커맨드에서 받아온다. 이렇게 해야
 * 백엔드 마이그레이션 키와 **정확히 같은 문자열**로 로드되어 마이그레이션이
 * 실행되고, DB 파일이 appLocalDataDir/knowledge.db 에 생성된다.
 */
export function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const url = await invoke<string>("db_connection_url");
      return Database.load(url);
    })();
  }
  return dbPromise;
}
