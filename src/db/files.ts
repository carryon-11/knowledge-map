import { invoke } from "@tauri-apps/api/core";
import { getDb } from "./database";
import type { FileRow, FileType } from "./types";

export const FILE_TYPES: FileType[] = [
  "HWP",
  "HWPX",
  "PDF",
  "PPT",
  "PPTX",
  "DOCX",
  "Image",
  "기타",
];

/** 파일 경로/이름의 확장자로 기본 유형을 추정한다. */
export function guessFileType(pathOrName: string): FileType {
  const name = pathOrName.replace(/[\\/]+$/, "").split(/[\\/]/).pop() ?? "";
  const ext = name.includes(".") ? name.split(".").pop()!.toLowerCase() : "";
  switch (ext) {
    case "hwp":
      return "HWP";
    case "hwpx":
      return "HWPX";
    case "pdf":
      return "PDF";
    case "ppt":
      return "PPT";
    case "pptx":
      return "PPTX";
    case "doc":
    case "docx":
      return "DOCX";
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "webp":
    case "bmp":
    case "svg":
      return "Image";
    default:
      return "기타";
  }
}

/** Rust `import_file` 가 반환하는 메타데이터(snake_case). */
export interface ImportedMeta {
  original_name: string;
  extension: string | null;
  mime_type: string | null;
  file_size: number;
  file_hash: string;
  file_path: string;
}

/** 소스 파일을 storage 로 복사하고 메타데이터를 받는다(DB 미기록). */
export async function importFile(sourcePath: string): Promise<ImportedMeta> {
  return invoke<ImportedMeta>("import_file", {
    sourcePath,
    destId: crypto.randomUUID(),
  });
}

/** files 행 INSERT. node_id = 첨부할 노드. 반환: file id. */
export async function insertFile(
  meta: ImportedMeta,
  nodeId: string,
  fileType: FileType,
): Promise<string> {
  const db = await getDb();
  const id = crypto.randomUUID();
  await db.execute(
    `INSERT INTO files
       (id, node_id, original_name, extension, file_type, mime_type, file_size, file_hash, file_path)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      id,
      nodeId,
      meta.original_name,
      meta.extension,
      fileType,
      meta.mime_type,
      meta.file_size,
      meta.file_hash,
      meta.file_path,
    ],
  );
  return id;
}

/** 노드의 활성 첨부(deleted_at IS NULL)만 생성순으로. */
export async function getAttachments(nodeId: string): Promise<FileRow[]> {
  const db = await getDb();
  return db.select<FileRow[]>(
    "SELECT * FROM files WHERE node_id = $1 AND deleted_at IS NULL ORDER BY created_at",
    [nodeId],
  );
}

/** OS 기본 프로그램으로 첨부 원본 열기. */
export async function openAttachment(filePath: string): Promise<void> {
  await invoke("open_attachment", { filePath });
}

/** soft-delete: 원본을 .trash 로 이동 후 deleted_at 갱신(하드 삭제 금지). */
export async function softDeleteFile(file: FileRow): Promise<void> {
  await invoke("trash_attachment", { filePath: file.file_path });
  const db = await getDb();
  await db.execute(
    "UPDATE files SET deleted_at = datetime('now'), updated_at = datetime('now') WHERE id = $1",
    [file.id],
  );
}

/** extracted_text 갱신(파서 결과 저장). H4 의 files_au 트리거가 자동 재색인 → 내용 검색됨. */
export async function setExtractedText(fileId: string, text: string | null): Promise<void> {
  const db = await getDb();
  await db.execute(
    "UPDATE files SET extracted_text = $1, updated_at = datetime('now') WHERE id = $2",
    [text, fileId],
  );
}

/** 아직 추출 안 된 PDF/HWPX 활성 첨부(백필 대상). */
export async function getUnextractedFiles(): Promise<FileRow[]> {
  const db = await getDb();
  return db.select<FileRow[]>(
    "SELECT * FROM files WHERE deleted_at IS NULL AND extracted_text IS NULL AND file_type IN ('PDF','HWPX') ORDER BY created_at",
  );
}
