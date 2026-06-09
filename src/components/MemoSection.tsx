import { useEffect, useRef, useState } from "react";
import type { NodeRow } from "../db";

interface MemoSectionProps {
  node: NodeRow | null;
  onSave: (memo: string) => void | Promise<void>;
}

/** 우측 "메모" — nodes.memo 에 바인딩. blur 시 변경분 자동 저장. */
export function MemoSection({ node, onSave }: MemoSectionProps) {
  const [memo, setMemo] = useState("");
  const savedRef = useRef("");
  const [savedTick, setSavedTick] = useState(false);

  // 선택 노드가 바뀔 때만 초기화(id 기준).
  useEffect(() => {
    const v = node?.memo ?? "";
    setMemo(v);
    savedRef.current = v;
    setSavedTick(false);
  }, [node?.id]);

  async function handleBlur() {
    if (!node) return;
    if (memo === savedRef.current) return; // 변경 없으면 저장 안 함
    await onSave(memo);
    savedRef.current = memo;
    setSavedTick(true);
  }

  const dirty = memo !== savedRef.current;

  return (
    <div className="ph-section">
      <div className="ph-title">메모</div>
      {!node ? (
        <div className="ph-note">노드를 선택하세요</div>
      ) : (
        <>
          <textarea
            className="memo-area"
            value={memo}
            placeholder="이 노드에 대한 자유 메모… (입력 후 바깥 클릭 시 저장)"
            onChange={(e) => {
              setMemo(e.target.value);
              setSavedTick(false);
            }}
            onBlur={handleBlur}
          />
          <div className="memo-status">
            {dirty ? "미저장 (포커스 해제 시 저장)" : savedTick ? "저장됨" : ""}
          </div>
        </>
      )}
    </div>
  );
}
