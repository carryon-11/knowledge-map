-- Harness 0 초기 스키마 (migration version 1)
-- 주의: 스키마 임의 변경 금지. 변경이 필요하면 새 마이그레이션(0002_*.sql)을 추가한다.
-- 이 파일은 lib.rs 에서 include_str! 로 포함되어 플러그인 마이그레이션으로 적용된다.

-- nodes: 트리 (root/folder/note만; 파일은 노드가 아님)
CREATE TABLE nodes (
  id          TEXT PRIMARY KEY,            -- uuid
  parent_id   TEXT REFERENCES nodes(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('root','folder','note')),
  title       TEXT NOT NULL,
  description TEXT,                         -- 짧은 요약
  content     TEXT,                         -- note 본문(markdown)
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_nodes_parent ON nodes(parent_id);

-- files: 노드에 매다는 첨부 (1 node : N files)
-- node_id nullable + ON DELETE SET NULL → 노드 삭제돼도 첨부 행은 남아 휴지통 처리 가능
-- deleted_at: NULL=활성, 값 있으면 휴지통
CREATE TABLE files (
  id             TEXT PRIMARY KEY,
  node_id        TEXT REFERENCES nodes(id) ON DELETE SET NULL,
  original_name  TEXT NOT NULL,
  extension      TEXT,
  file_type      TEXT,                      -- HWP/HWPX/PDF/PPT/PPTX/DOCX/Image/기타
  mime_type      TEXT,
  file_size      INTEGER,
  file_hash      TEXT,                      -- sha256, 중복 감지
  file_path      TEXT NOT NULL,             -- storage 내부 경로
  extracted_text TEXT,                      -- 파서 결과(없으면 NULL)
  deleted_at     TEXT,                      -- 휴지통 여부
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_files_node ON files(node_id);
CREATE INDEX idx_files_hash ON files(file_hash);

-- tags / node_tags (태그는 노드 단위)
CREATE TABLE tags (
  id   TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);
CREATE TABLE node_tags (
  node_id TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  tag_id  TEXT NOT NULL REFERENCES tags(id)  ON DELETE CASCADE,
  PRIMARY KEY (node_id, tag_id)
);

-- links: 위계와 별개인 노드 간 연결(관련 노드)
CREATE TABLE links (
  id             TEXT PRIMARY KEY,
  source_node_id TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  target_node_id TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  relation_type  TEXT,
  memo           TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_links_source ON links(source_node_id);
CREATE INDEX idx_links_target ON links(target_node_id);

-- 전문검색(FTS5): note 본문 + 파일 추출 텍스트
CREATE VIRTUAL TABLE search_fts USING fts5(
  text,
  ref_id UNINDEXED,   -- node_id 또는 file_id
  kind   UNINDEXED    -- 'node' | 'file'
);
