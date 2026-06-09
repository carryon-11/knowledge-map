import { getDb } from "./database";
import type { TagRow } from "./types";

/** 전체 태그(자동완성 제안용). */
export async function getAllTags(): Promise<TagRow[]> {
  const db = await getDb();
  return db.select<TagRow[]>("SELECT * FROM tags ORDER BY name");
}

/** 노드에 연결된 태그들. */
export async function getNodeTags(nodeId: string): Promise<TagRow[]> {
  const db = await getDb();
  return db.select<TagRow[]>(
    `SELECT t.* FROM tags t
       JOIN node_tags nt ON nt.tag_id = t.id
      WHERE nt.node_id = $1
      ORDER BY t.name`,
    [nodeId],
  );
}

/**
 * 태그명을 노드에 연결한다.
 * - 같은 이름 태그는 재사용(tags.name UNIQUE → INSERT OR IGNORE 후 id 조회).
 * - 같은 노드-태그 연결은 복합 PK 라 INSERT OR IGNORE 로 중복 자동 방지.
 */
export async function addTagToNode(nodeId: string, name: string): Promise<void> {
  const tagName = name.trim();
  if (!tagName) return;
  const db = await getDb();

  await db.execute("INSERT OR IGNORE INTO tags (id, name) VALUES ($1, $2)", [
    crypto.randomUUID(),
    tagName,
  ]);
  const rows = await db.select<TagRow[]>("SELECT id FROM tags WHERE name = $1", [tagName]);
  const tagId = rows[0]?.id;
  if (!tagId) return;

  await db.execute(
    "INSERT OR IGNORE INTO node_tags (node_id, tag_id) VALUES ($1, $2)",
    [nodeId, tagId],
  );
}

/** 노드에서 태그 연결만 해제한다(태그 자체는 보존 — 다른 노드가 쓸 수 있음). */
export async function removeTagFromNode(nodeId: string, tagId: string): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM node_tags WHERE node_id = $1 AND tag_id = $2", [
    nodeId,
    tagId,
  ]);
}
