import { useEffect, useState } from "react";
import {
  addTagToNode,
  removeTagFromNode,
  getNodeTags,
  getAllTags,
  type TagRow,
} from "../db";

interface TagSectionProps {
  nodeId: string | null;
}

/** 우측 "태그" — 추가(재사용)/칩 표시/연결 해제. 태그 자체는 삭제하지 않는다. */
export function TagSection({ nodeId }: TagSectionProps) {
  const [tags, setTags] = useState<TagRow[]>([]);
  const [all, setAll] = useState<TagRow[]>([]);
  const [input, setInput] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const at = await getAllTags();
      if (!cancelled) setAll(at);
      if (nodeId) {
        const nt = await getNodeTags(nodeId);
        if (!cancelled) setTags(nt);
      } else if (!cancelled) {
        setTags([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [nodeId]);

  async function add() {
    const name = input.trim();
    if (!name || !nodeId) return;
    await addTagToNode(nodeId, name);
    setInput("");
    const [nt, at] = await Promise.all([getNodeTags(nodeId), getAllTags()]);
    setTags(nt);
    setAll(at);
  }

  async function remove(tagId: string) {
    if (!nodeId) return;
    await removeTagFromNode(nodeId, tagId);
    setTags(await getNodeTags(nodeId));
  }

  return (
    <div className="ph-section">
      <div className="ph-title">태그</div>
      {!nodeId ? (
        <div className="ph-note">노드를 선택하세요</div>
      ) : (
        <>
          <div className="tag-chips">
            {tags.length === 0 && <span className="ph-note">태그 없음</span>}
            {tags.map((t) => (
              <span className="tag-chip" key={t.id}>
                {t.name}
                <button className="tag-x" title="연결 해제" onClick={() => remove(t.id)}>
                  ×
                </button>
              </span>
            ))}
          </div>
          <form
            className="tag-input"
            onSubmit={(e) => {
              e.preventDefault();
              add();
            }}
          >
            <input
              list="tag-suggestions"
              value={input}
              placeholder="태그 추가…"
              onChange={(e) => setInput(e.target.value)}
            />
            <datalist id="tag-suggestions">
              {all.map((t) => (
                <option key={t.id} value={t.name} />
              ))}
            </datalist>
            <button className="btn" type="submit">
              추가
            </button>
          </form>
        </>
      )}
    </div>
  );
}
