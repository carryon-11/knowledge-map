import { useState } from "react";
import { FILE_TYPES, guessFileType, type FileType } from "../db";

function basename(p: string): string {
  return p.replace(/[\\/]+$/, "").split(/[\\/]/).pop() ?? p;
}

interface ImportModalProps {
  paths: string[];
  onConfirm: (items: { path: string; fileType: FileType }[]) => void | Promise<void>;
  onCancel: () => void;
}

/** 드롭한 파일들의 유형을 확인/선택해 등록하는 모달. */
export function ImportModal({ paths, onConfirm, onCancel }: ImportModalProps) {
  const [types, setTypes] = useState<FileType[]>(() => paths.map(guessFileType));
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    try {
      await onConfirm(paths.map((p, i) => ({ path: p, fileType: types[i] })));
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
          {paths.map((p, i) => (
            <li className="import-row" key={p + i}>
              <span className="import-name" title={p}>
                {basename(p)}
              </span>
              <select
                value={types[i]}
                onChange={(e) =>
                  setTypes((prev) => {
                    const next = [...prev];
                    next[i] = e.target.value as FileType;
                    return next;
                  })
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
