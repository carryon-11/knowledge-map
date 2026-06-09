import type { NodeRow, FileRow } from "../db";
import { TagSection } from "./TagSection";
import { MemoSection } from "./MemoSection";

function formatSize(bytes: number | null): string {
  if (bytes == null) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

interface RightPanelProps {
  selected: NodeRow | null;
  attachments: FileRow[];
  extracting: Set<string>;
  dragging: boolean;
  onOpen: (file: FileRow) => void;
  onDelete: (file: FileRow) => void;
  onSaveMemo: (memo: string) => void | Promise<void>;
}

/** 우측 패널 — 첨부(H2)+추출표시(H5) + 태그/메모(H3) + 관련 노드(placeholder). */
export function RightPanel({
  selected,
  attachments,
  extracting,
  dragging,
  onOpen,
  onDelete,
  onSaveMemo,
}: RightPanelProps) {
  return (
    <>
      <div className="pane-header">관련 정보</div>

      {/* 첨부 파일 (H2) */}
      <div className="ph-section">
        <div className="ph-title">첨부 파일</div>
        <div className={"drop-zone" + (dragging ? " dragging" : "")}>
          {dragging && selected && <div className="drop-banner">여기에 놓아 첨부</div>}

          {!selected ? (
            <div className="drop-hint">노드를 먼저 선택하세요</div>
          ) : attachments.length === 0 ? (
            <div className="drop-hint">파일을 창에 끌어다 놓으면 이 노드에 첨부됩니다</div>
          ) : (
            <ul className="attach-list">
              {attachments.map((f) => (
                <li className="attach-item" key={f.id}>
                  <div className="attach-main">
                    <div className="attach-name" title={f.original_name}>
                      {f.original_name}
                    </div>
                    <div className="attach-meta">
                      <span className="type-badge">{f.file_type ?? "기타"}</span>
                      <span>{formatSize(f.file_size)}</span>
                      {extracting.has(f.id) ? (
                        <span className="extract-tag">추출 중…</span>
                      ) : f.extracted_text ? (
                        <span className="extract-tag done" title="텍스트 추출됨 → 내용 검색 가능">
                          텍스트 ✓
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="attach-actions">
                    <button className="btn" onClick={() => onOpen(f)}>
                      열기
                    </button>
                    <button className="btn btn-danger" onClick={() => onDelete(f)}>
                      삭제
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* 태그 (H3) */}
      <TagSection nodeId={selected?.id ?? null} />

      {/* 메모 (H3) */}
      <MemoSection node={selected} onSave={onSaveMemo} />

      {/* 관련 노드 — 맵과 함께 나중에 (placeholder 유지) */}
      <div className="ph-section">
        <div className="ph-title">관련 노드</div>
        <div className="ph-note">다음 단계에서 구현</div>
      </div>
    </>
  );
}
