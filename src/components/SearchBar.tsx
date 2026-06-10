import { useEffect, useRef, useState } from "react";
import { search, type SearchResult } from "../db";

interface SearchBarProps {
  onJump: (nodeId: string) => void;
}

/** 상단 검색창 + 결과 드롭다운. 결과 클릭 → onJump(해당 노드). */
export function SearchBar({ onJump }: SearchBarProps) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // 디바운스 검색. cancelled 가드: 이미 발사된 이전 검색이 늦게 도착해
  // 최신 결과를 덮어쓰는 역전(race)을 방지한다.
  useEffect(() => {
    const term = q.trim();
    if (!term) {
      setResults([]);
      setOpen(false);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const r = await search(term);
        if (!cancelled) {
          setResults(r);
          setOpen(true);
        }
      } catch (e) {
        console.error("검색 실패:", e);
      }
    }, 180);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q]);

  // 바깥 클릭 시 닫기
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function jump(r: SearchResult) {
    if (!r.jumpNodeId) return;
    onJump(r.jumpNodeId);
    setOpen(false);
  }

  return (
    <div className="search-box" ref={boxRef}>
      <input
        className="search-input"
        value={q}
        placeholder="검색…  (한글 3자 이상 부분검색, 2자 이하 일치)"
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => {
          if (results.length) setOpen(true);
        }}
      />
      {open && (
        <div className="search-results">
          {results.length === 0 ? (
            <div className="search-empty">결과 없음</div>
          ) : (
            results.map((r) => (
              <button
                className="search-result"
                key={r.kind + ":" + r.refId}
                onClick={() => jump(r)}
                disabled={!r.jumpNodeId}
                title={r.jumpNodeId ? "이동" : "이동할 노드 없음"}
              >
                <span className="search-kind">{r.kind === "file" ? "📄" : "🗂"}</span>
                <span className="search-main">
                  <span className="search-label">{r.label}</span>
                  {r.snippet && <span className="search-snippet">{r.snippet}</span>}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
