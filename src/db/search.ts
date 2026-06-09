import { getDb } from "./database";

export interface SearchResult {
  kind: "node" | "file";
  refId: string;
  label: string; // 노드 제목 또는 파일명
  snippet: string | null;
  jumpNodeId: string | null; // 이동할 노드(파일이면 그 파일의 node_id)
  fileType: string | null;
}

interface RawRow {
  ref_id: string;
  kind: string;
  snip: string | null;
  node_title: string | null;
  file_name: string | null;
  file_node_id: string | null;
  file_type: string | null;
}

function toResult(r: RawRow): SearchResult {
  if (r.kind === "file") {
    return {
      kind: "file",
      refId: r.ref_id,
      label: r.file_name ?? "(파일)",
      snippet: r.snip,
      jumpNodeId: r.file_node_id,
      fileType: r.file_type,
    };
  }
  return {
    kind: "node",
    refId: r.ref_id,
    label: r.node_title ?? "(제목 없음)",
    snippet: r.snip,
    jumpNodeId: r.ref_id,
    fileType: null,
  };
}

/**
 * 전문검색.
 * - 유니코드 ≥3글자: search_fts(trigram) MATCH + snippet. 한글/임의 부분문자열 매칭.
 * - 2글자 이하: trigram 미동작 → base 컬럼 LIKE '%q%' 폴백.
 * soft-deleted 파일은 인덱스/LIKE(deleted_at IS NULL) 양쪽에서 제외된다.
 */
export async function search(query: string): Promise<SearchResult[]> {
  const q = query.trim();
  if (!q) return [];
  const db = await getDb();

  if ([...q].length >= 3) {
    // 특수문자(AND/OR/" 등)를 연산자로 해석하지 않도록 큰따옴표 phrase 로 감싸 리터럴 매칭.
    const phrase = '"' + q.replace(/"/g, '""') + '"';
    const rows = await db.select<RawRow[]>(
      `SELECT m.ref_id, m.kind, m.snip,
              n.title AS node_title,
              f.original_name AS file_name, f.node_id AS file_node_id, f.file_type AS file_type
         FROM (
           SELECT ref_id, kind,
                  snippet(search_fts, 0, '[', ']', '…', 8) AS snip,
                  rank
             FROM search_fts
            WHERE search_fts MATCH $1
            ORDER BY rank
            LIMIT 50
         ) m
         LEFT JOIN nodes n ON m.kind = 'node' AND n.id = m.ref_id
         LEFT JOIN files f ON m.kind = 'file' AND f.id = m.ref_id`,
      [phrase],
    );
    return rows.map(toResult);
  }

  // 2글자 이하: base 컬럼 LIKE 폴백
  const like = "%" + q + "%";
  const rows = await db.select<RawRow[]>(
    `SELECT id AS ref_id, 'node' AS kind, NULL AS snip,
            title AS node_title, NULL AS file_name, NULL AS file_node_id, NULL AS file_type
       FROM nodes
      WHERE (COALESCE(title,'')||' '||COALESCE(description,'')||' '||COALESCE(content,'')||' '||COALESCE(memo,'')) LIKE $1
     UNION ALL
     SELECT id AS ref_id, 'file' AS kind, NULL AS snip,
            NULL AS node_title, original_name AS file_name, node_id AS file_node_id, file_type AS file_type
       FROM files
      WHERE deleted_at IS NULL
        AND (COALESCE(original_name,'')||' '||COALESCE(extracted_text,'')) LIKE $2
      LIMIT 50`,
    [like, like],
  );
  return rows.map(toResult);
}
