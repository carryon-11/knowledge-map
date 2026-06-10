import { useEffect, useState } from "react";
import { FILE_TYPES, guessFileType, type FileType } from "../db";

function basename(p: string): string {
  return p.replace(/[\\/]+$/, "").split(/[\\/]/).pop() ?? p;
}

interface ImportModalProps {
  paths: string[];
  onConfirm: (items: { path: string; fileType: FileType }[]) => void | Promise<void>;
  onCancel: () => void;
}

/**
 * 드롭한 파일들의 유형을 확인/선택해 등록하는 모달.
 * 유형 상태는 경로 키 Record 로 관리 — 모달이 열린 채 파일을 추가로 드롭해
 * paths 가 바뀌어도(병합) 기존 선택을 잃지 않고 새 항목만 기본값으로 채운다.
 */
export function ImportModal({ paths, onConfirm, onCancel }: ImportModalProps) {
  const [types, setTypes] = useState<Record<string, FileType>>(() =>
    Object.fromEntries(paths.map((p) => [p, guessFileType(p)])),
  );
  const [busy, setBusy] = useState(false);

  // paths 가 바뀌면(추가 드롭 병합) 새 경로만 기본값으로 보충한다.
  useEffect(() => {
    setTypes((prev) => {
      const next = { ...prev };
      for (const p of paths) {
        if (!(p in next)) next[p] = guessFileType(p);
      }
      return next;
    });
  }, [paths]);

  async function confirm() {
    setBusy(true);
    try {
      await onConfirm(
        paths.map((p) => ({ path: p, fileType: types[p] ?? guessFileType(p) })),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={busy ? undefined : onCancel}>
      <div
        className="modal wide"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <h3>첨부 등록 ({paths.length})</h3>
        <p>파일 유형을 확인하고 등록하세요. 확장자로 기본값이 추정됩니다.</p>
        <ul className="import-list">
          {paths.map((p) => (
            <li className="import-row" key={p}>
              <span className="import-name" title={p}>
                {basename(p)}
              </span>
              <select
                value={types[p] ?? guessFileType(p)}
                onChange={(e) =>
                  setTypes((prev) => ({ ...prev, [p]: e.target.value as FileType }))
                }
              >
                {FILE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ul>
        <div className="modal-actions">
          <button className="btn" onClick={onCancel} disabled={busy}>
            취소
          </button>
          <button className="btn btn-primary" onClick={confirm} disabled={busy} autoFocus>
            {busy ? "등록 중…" : "등록"}
          </button>
        </div>
      </div>
    </div>
  );
}
