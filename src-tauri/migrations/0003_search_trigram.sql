-- Harness 4 마이그레이션 (version 3) — append-only. 0001/0002 는 수정하지 않는다.
-- search_fts 를 trigram 토크나이저로 재생성(한글 부분검색) + 백필 + 동기화 트리거.
-- (search_fts 는 파생 인덱스라 DROP 안전 — 소스 데이터 아님. 앱 측 수동 동기화 코드 불필요.)
-- 실제 SQLite(foreign_keys ON, recursive_triggers OFF)에서 사전 검증 완료.

DROP TABLE IF EXISTS search_fts;
CREATE VIRTUAL TABLE search_fts USING fts5(
  text,
  ref_id UNINDEXED,
  kind   UNINDEXED,
  tokenize = 'trigram'
);

-- 백필: 기존 노드/활성 파일을 인덱싱
INSERT INTO search_fts(text, ref_id, kind)
  SELECT COALESCE(title,'')||' '||COALESCE(description,'')||' '||COALESCE(content,'')||' '||COALESCE(memo,''), id, 'node'
  FROM nodes;
INSERT INTO search_fts(text, ref_id, kind)
  SELECT COALESCE(original_name,'')||' '||COALESCE(extracted_text,''), id, 'file'
  FROM files WHERE deleted_at IS NULL;

-- nodes 동기화
CREATE TRIGGER nodes_ai AFTER INSERT ON nodes BEGIN
  INSERT INTO search_fts(text, ref_id, kind)
  VALUES (COALESCE(NEW.title,'')||' '||COALESCE(NEW.description,'')||' '||COALESCE(NEW.content,'')||' '||COALESCE(NEW.memo,''), NEW.id, 'node');
END;
CREATE TRIGGER nodes_au AFTER UPDATE ON nodes BEGIN
  DELETE FROM search_fts WHERE kind='node' AND ref_id=OLD.id;
  INSERT INTO search_fts(text, ref_id, kind)
  VALUES (COALESCE(NEW.title,'')||' '||COALESCE(NEW.description,'')||' '||COALESCE(NEW.content,'')||' '||COALESCE(NEW.memo,''), NEW.id, 'node');
END;
-- BEFORE DELETE + 재귀 CTE: 폴더 삭제 시 (cascade 로 지워질) 모든 자손의 검색행을 함께 제거.
-- recursive_triggers(기본 OFF)에 의존하지 않도록 최상위 삭제 트리거에서 하위 전체를 처리한다.
CREATE TRIGGER nodes_bd BEFORE DELETE ON nodes BEGIN
  DELETE FROM search_fts WHERE kind='node' AND ref_id IN (
    WITH RECURSIVE sub(id) AS (
      SELECT OLD.id
      UNION ALL
      SELECT n.id FROM nodes n JOIN sub s ON n.parent_id = s.id
    )
    SELECT id FROM sub
  );
END;

-- files 동기화 (soft-delete = deleted_at; 채워지면 인덱스에서 제거)
CREATE TRIGGER files_ai AFTER INSERT ON files WHEN NEW.deleted_at IS NULL BEGIN
  INSERT INTO search_fts(text, ref_id, kind)
  VALUES (COALESCE(NEW.original_name,'')||' '||COALESCE(NEW.extracted_text,''), NEW.id, 'file');
END;
CREATE TRIGGER files_au AFTER UPDATE ON files BEGIN
  DELETE FROM search_fts WHERE kind='file' AND ref_id=OLD.id;
  INSERT INTO search_fts(text, ref_id, kind)
  SELECT COALESCE(NEW.original_name,'')||' '||COALESCE(NEW.extracted_text,''), NEW.id, 'file'
  WHERE NEW.deleted_at IS NULL;
END;
CREATE TRIGGER files_ad AFTER DELETE ON files BEGIN
  DELETE FROM search_fts WHERE kind='file' AND ref_id=OLD.id;
END;
