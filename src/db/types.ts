// nodes 테이블 행 타입.
export type NodeType = "root" | "folder" | "note";

export interface NodeRow {
  id: string;
  parent_id: string | null;
  type: NodeType;
  title: string;
  description: string | null; // 짧은 요약(가운데 패널)
  content: string | null; // note 본문
  memo: string | null; // 자유 메모(우측 패널, 마이그레이션 0002)
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// files 테이블 행 타입 + 파일 유형.
export type FileType =
  | "HWP"
  | "HWPX"
  | "PDF"
  | "PPT"
  | "PPTX"
  | "DOCX"
  | "Image"
  | "기타";

export interface FileRow {
  id: string;
  node_id: string | null;
  original_name: string;
  extension: string | null;
  file_type: string | null;
  mime_type: string | null;
  file_size: number | null;
  file_hash: string | null;
  file_path: string;
  extracted_text: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

// tags 테이블 행 타입.
export interface TagRow {
  id: string;
  name: string;
}
