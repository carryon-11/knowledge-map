import { useEffect, useState } from "react";
import type { NodeRow } from "../db";

export interface DetailPatch {
  title: string;
  description: string | null;
  content: string | null;
}

interface NodeDetailProps {
  node: NodeRow | null;
  onSave: (patch: DetailPatch) => void | Promise<void>;
}

/** 중앙 패널 — 선택 노드의 title/description(노트면 content) 편집·저장. */
export function NodeDetail({ node, onSave }: NodeDetailProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  // 선택 노드가 바뀔 때만 폼 초기화. id 기준이라 저장 후 리로드로 폼이 덮이지 않는다.
  useEffect(() => {
    setTitle(node?.title ?? "");
    setDescription(node?.description ?? "");
    setContent(node?.content ?? "");
    setSavedAt(null);
  }, [node?.id]);

  if (!node) {
    return (
      <>
        <div className="pane-header">노드 상세</div>
        <div className="empty">왼쪽 트리에서 노드를 선택하세요.</div>
      </>
    );
  }

  const isNote = node.type === "note";

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({
        title: title.trim() === "" ? "(제목 없음)" : title.trim(),
        description: description.trim() === "" ? null : description,
        content: isNote ? (content === "" ? null : content) : null,
      });
      setSavedAt(new Date().toLocaleTimeString());
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="pane-header">
        <span>노드 상세</span>
        <span className="type-badge">{node.type}</span>
      </div>
      <div className="detail">
        <div className="field">
          <label>제목</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="field">
          <label>설명 (description)</label>
          <input
            type="text"
            value={description}
            placeholder="짧은 요약"
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {isNote && (
          <div className="field">
            <label>본문 (content · 마크다운 텍스트)</label>
            <textarea
              value={content}
              placeholder="노트 본문…"
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
        )}

        <div className="detail-actions">
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "저장 중…" : "저장"}
          </button>
          {savedAt && <span className="meta">저장됨 · {savedAt}</span>}
          <span className="meta meta-right">수정: {node.updated_at}</span>
        </div>
      </div>
    </>
  );
}
