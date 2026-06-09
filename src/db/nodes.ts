import { getDb } from "./database";
import type { NodeRow, NodeType } from "./types";

// ── 조회 ────────────────────────────────────────────────

/** 모든 노드를 생성순으로 반환 (트리 구성용). */
export async function getAllNodes(): Promise<NodeRow[]> {
  const db = await getDb();
  return db.select<NodeRow[]>(
    "SELECT * FROM nodes ORDER BY created_at, sort_order",
  );
}

/** 특정 부모의 직속 자식만 반환. parentId=null 이면 최상위. */
export async function getChildren(parentId: string | null): Promise<NodeRow[]> {
  const db = await getDb();
  if (parentId === null) {
    return db.select<NodeRow[]>(
      "SELECT * FROM nodes WHERE parent_id IS NULL ORDER BY created_at, sort_order",
    );
  }
  return db.select<NodeRow[]>(
    "SELECT * FROM nodes WHERE parent_id = $1 ORDER BY created_at, sort_order",
    [parentId],
  );
}

/** 단일 노드 조회. */
export async function getNode(id: string): Promise<NodeRow | null> {
  const db = await getDb();
  const rows = await db.select<NodeRow[]>("SELECT * FROM nodes WHERE id = $1", [id]);
  return rows[0] ?? null;
}

// ── 루트 보장 (멱등 + StrictMode 안전) ──────────────────

let rootPromise: Promise<NodeRow> | null = null;

/**
 * type=root 노드가 정확히 1개 존재하도록 보장한다.
 * 모듈 레벨 프로미스로 메모이즈 → StrictMode 가 effect 를 2번 호출해도 INSERT 는 1번만.
 */
export function ensureRoot(): Promise<NodeRow> {
  if (!rootPromise) rootPromise = doEnsureRoot();
  return rootPromise;
}

async function doEnsureRoot(): Promise<NodeRow> {
  const db = await getDb();
  const existing = await db.select<NodeRow[]>(
    "SELECT * FROM nodes WHERE type = 'root' ORDER BY created_at LIMIT 1",
  );
  if (existing.length > 0) return existing[0];

  const id = crypto.randomUUID();
  await db.execute(
    "INSERT INTO nodes (id, parent_id, type, title) VALUES ($1, NULL, 'root', $2)",
    [id, "내 지식 구조"],
  );
  const rows = await db.select<NodeRow[]>("SELECT * FROM nodes WHERE id = $1", [id]);
  return rows[0];
}

// ── 생성 / 수정 / 삭제 ──────────────────────────────────

export interface CreateNodeInput {
  parentId: string;
  /** root 는 ensureRoot 로만 생성한다. */
  type: Exclude<NodeType, "root">;
  title: string;
}

/** 노드를 생성하고 생성된 행을 반환한다. */
export async function createNode(input: CreateNodeInput): Promise<NodeRow> {
  const db = await getDb();
  const id = crypto.randomUUID();
  await db.execute(
    "INSERT INTO nodes (id, parent_id, type, title) VALUES ($1, $2, $3, $4)",
    [id, input.parentId, input.type, input.title],
  );
  const rows = await db.select<NodeRow[]>("SELECT * FROM nodes WHERE id = $1", [id]);
  return rows[0];
}

/** 제목만 변경. */
export async function renameNode(id: string, title: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    "UPDATE nodes SET title = $1, updated_at = datetime('now') WHERE id = $2",
    [title, id],
  );
}

export interface UpdateNodePatch {
  title?: string;
  description?: string | null;
  content?: string | null;
  memo?: string | null; // H3: 자유 메모
}

/** title/description/content/memo 부분 수정. updated_at 자동 갱신. */
export async function updateNode(id: string, patch: UpdateNodePatch): Promise<void> {
  const sets: string[] = [];
  const vals: unknown[] = [];
  let i = 1;
  if (patch.title !== undefined) { sets.push(`title = $${i++}`); vals.push(patch.title); }
  if (patch.description !== undefined) { sets.push(`description = $${i++}`); vals.push(patch.description); }
  if (patch.content !== undefined) { sets.push(`content = $${i++}`); vals.push(patch.content); }
  if (patch.memo !== undefined) { sets.push(`memo = $${i++}`); vals.push(patch.memo); }
  if (sets.length === 0) return;
  sets.push("updated_at = datetime('now')");
  vals.push(id);
  const db = await getDb();
  await db.execute(`UPDATE nodes SET ${sets.join(", ")} WHERE id = $${i}`, vals);
}

/** 노드 삭제. 하위 노드는 FK(ON DELETE CASCADE)로 함께 삭제된다. */
export async function deleteNode(id: string): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM nodes WHERE id = $1", [id]);
}
