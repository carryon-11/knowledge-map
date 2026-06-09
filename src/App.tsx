import { useCallback, useEffect, useRef, useState } from "react";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import "./App.css";
import {
  ensureRoot,
  getAllNodes,
  createNode,
  updateNode,
  deleteNode,
  getAttachments,
  importFile,
  insertFile,
  openAttachment,
  softDeleteFile,
  setExtractedText,
  getUnextractedFiles,
  type NodeRow,
  type FileRow,
  type FileType,
} from "./db";
import { isExtractable, extractForFile } from "./parsers";
import { TreeView } from "./components/TreeView";
import { NodeDetail, type DetailPatch } from "./components/NodeDetail";
import { RightPanel } from "./components/RightPanel";
import { ConfirmModal } from "./components/ConfirmModal";
import { ImportModal } from "./components/ImportModal";
import { SearchBar } from "./components/SearchBar";
import { UpdateBanner } from "./components/UpdateBanner";

function App() {
  const [nodes, setNodes] = useState<NodeRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<NodeRow | null>(null);

  // H2/H5: 첨부 + 추출 상태
  const [attachments, setAttachments] = useState<FileRow[]>([]);
  const [extracting, setExtracting] = useState<Set<string>>(new Set());
  const [dragging, setDragging] = useState(false);
  const [pendingImport, setPendingImport] = useState<{ paths: string[]; nodeId: string } | null>(null);
  const [dropWarning, setDropWarning] = useState(false);

  // drag-drop 콜백이 최신 선택값을 읽도록 ref 로 유지(리스너는 1회만 등록).
  const selectedIdRef = useRef<string | null>(null);
  selectedIdRef.current = selectedId;

  const reload = useCallback(async (): Promise<NodeRow[]> => {
    const all = await getAllNodes();
    setNodes(all);
    return all;
  }, []);

  const refreshAttachmentsIfCurrent = useCallback((nodeId: string) => {
    if (selectedIdRef.current === nodeId) {
      getAttachments(nodeId).then(setAttachments).catch(() => {});
    }
  }, []);

  // 초기화: 루트 보장(멱등) → 로드 → 루트 펼침/선택
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const root = await ensureRoot();
      const all = await getAllNodes();
      if (cancelled) return;
      setNodes(all);
      setExpanded((prev) => new Set(prev).add(root.id));
      setSelectedId((cur) => cur ?? root.id);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // H5: 시작 시 미추출 PDF/HWPX 백필 추출(기존 첨부도 검색되게). 비차단·best-effort.
  useEffect(() => {
    if (loading) return;
    let cancelled = false;
    (async () => {
      let pending: FileRow[] = [];
      try {
        pending = await getUnextractedFiles();
      } catch {
        return;
      }
      for (const f of pending) {
        if (cancelled) break;
        try {
          const text = await extractForFile(f.file_path, f.file_type ?? "");
          if (text) await setExtractedText(f.id, text);
        } catch (e) {
          console.error("백필 추출 실패:", e);
        }
      }
      if (!cancelled && selectedIdRef.current) {
        getAttachments(selectedIdRef.current).then(setAttachments).catch(() => {});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loading]);

  // 선택 노드의 첨부 로드
  useEffect(() => {
    let cancelled = false;
    if (!selectedId) {
      setAttachments([]);
      return;
    }
    getAttachments(selectedId).then((a) => {
      if (!cancelled) setAttachments(a);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  // 네이티브 drag-drop 리스너 (1회 등록, ref 로 최신 선택 참조)
  useEffect(() => {
    let active = true;
    let unlisten: (() => void) | undefined;
    (async () => {
      try {
        const un = await getCurrentWebview().onDragDropEvent((event) => {
          const p = event.payload;
          if (p.type === "drop") {
            setDragging(false);
            const paths = p.paths ?? [];
            if (paths.length === 0) return;
            const nodeId = selectedIdRef.current;
            if (!nodeId) {
              setDropWarning(true);
              setTimeout(() => setDropWarning(false), 2500);
              return;
            }
            setPendingImport({ paths, nodeId });
          } else if (p.type === "leave") {
            setDragging(false);
          } else {
            setDragging(true); // over / enter
          }
        });
        if (active) unlisten = un;
        else un();
      } catch (e) {
        console.error("drag-drop 리스너 등록 실패:", e);
      }
    })();
    return () => {
      active = false;
      if (unlisten) unlisten();
    };
  }, []);

  const toggle = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // 검색 결과 클릭 → 해당 노드로 점프(선택 + 조상 전부 펼침)
  const handleJump = useCallback(
    (nodeId: string) => {
      setSelectedId(nodeId);
      setExpanded((prev) => {
        const next = new Set(prev);
        const byId = new Map(nodes.map((n) => [n.id, n]));
        let cur = byId.get(nodeId);
        while (cur && cur.parent_id) {
          next.add(cur.parent_id);
          cur = byId.get(cur.parent_id);
        }
        return next;
      });
    },
    [nodes],
  );

  const addChild = useCallback(
    async (parentId: string, type: "folder" | "note") => {
      const created = await createNode({
        parentId,
        type,
        title: type === "folder" ? "새 폴더" : "새 노트",
      });
      setExpanded((prev) => new Set(prev).add(parentId));
      await reload();
      setSelectedId(created.id);
    },
    [reload],
  );

  const handleSave = useCallback(
    async (patch: DetailPatch) => {
      if (!selectedId) return;
      await updateNode(selectedId, patch);
      await reload();
    },
    [selectedId, reload],
  );

  // H3: 우측 메모 저장(nodes.memo)
  const handleSaveMemo = useCallback(
    async (memo: string) => {
      if (!selectedId) return;
      await updateNode(selectedId, { memo: memo === "" ? null : memo });
      await reload();
    },
    [selectedId, reload],
  );

  const confirmDelete = useCallback(async () => {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setPendingDelete(null);
    await deleteNode(target.id); // 하위는 FK cascade 로 함께 삭제
    const all = await reload();
    setSelectedId((cur) => {
      if (cur && !all.some((n) => n.id === cur)) {
        return all.find((n) => n.type === "root")?.id ?? null;
      }
      return cur;
    });
  }, [pendingDelete, reload]);

  // H2/H5: 드롭한 파일 등록 → Rust 복사 + files INSERT → (지원 타입) 비차단 추출
  const confirmImport = useCallback(
    async (items: { path: string; fileType: FileType }[]) => {
      const target = pendingImport?.nodeId ?? null;
      setPendingImport(null);
      if (!target) return;

      const inserted: { id: string; fileType: FileType; filePath: string }[] = [];
      for (const it of items) {
        const meta = await importFile(it.path);
        const id = await insertFile(meta, target, it.fileType);
        inserted.push({ id, fileType: it.fileType, filePath: meta.file_path });
      }
      refreshAttachmentsIfCurrent(target);

      // 추출(비차단): 지원 타입만. 결과는 extracted_text 에 저장 → FTS 트리거 자동 색인.
      for (const f of inserted) {
        if (!isExtractable(f.fileType)) continue;
        setExtracting((prev) => new Set(prev).add(f.id));
        extractForFile(f.filePath, f.fileType)
          .then((text) => (text ? setExtractedText(f.id, text) : undefined))
          .catch((e) => console.error("추출/저장 실패:", e))
          .finally(() => {
            setExtracting((prev) => {
              const n = new Set(prev);
              n.delete(f.id);
              return n;
            });
            refreshAttachmentsIfCurrent(target);
          });
      }
    },
    [pendingImport, refreshAttachmentsIfCurrent],
  );

  const handleOpen = useCallback(async (f: FileRow) => {
    try {
      await openAttachment(f.file_path);
    } catch (e) {
      console.error("열기 실패:", e);
    }
  }, []);

  const handleDeleteAttachment = useCallback(async (f: FileRow) => {
    await softDeleteFile(f); // .trash 이동 + deleted_at
    const cur = selectedIdRef.current;
    if (cur) setAttachments(await getAttachments(cur));
  }, []);

  const selected = nodes.find((n) => n.id === selectedId) ?? null;

  if (loading) {
    return (
      <div className="app-shell">
        <div className="empty">불러오는 중…</div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <UpdateBanner />
      <header className="topbar">
        <div className="brand">knowledge-map</div>
        <SearchBar onJump={handleJump} />
      </header>

      <div className="app">
        <aside className="pane pane-left">
          <div className="pane-header">구조</div>
          <TreeView
            nodes={nodes}
            selectedId={selectedId}
            expanded={expanded}
            onSelect={setSelectedId}
            onToggle={toggle}
            onAddFolder={(pid) => addChild(pid, "folder")}
            onAddNote={(pid) => addChild(pid, "note")}
            onDelete={setPendingDelete}
          />
        </aside>

        <section className="pane pane-center">
          <NodeDetail node={selected} onSave={handleSave} />
        </section>

        <aside className="pane pane-right">
          <RightPanel
            selected={selected}
            attachments={attachments}
            extracting={extracting}
            dragging={dragging}
            onOpen={handleOpen}
            onDelete={handleDeleteAttachment}
            onSaveMemo={handleSaveMemo}
          />
        </aside>
      </div>

      {pendingDelete && (
        <ConfirmModal
          title="삭제 확인"
          message={
            pendingDelete.type === "folder"
              ? `"${pendingDelete.title}" 폴더와 그 안의 모든 하위 항목이 함께 삭제됩니다. 계속할까요?`
              : `"${pendingDelete.title}" 노트를 삭제할까요?`
          }
          confirmLabel="삭제"
          danger
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      {pendingImport && (
        <ImportModal
          paths={pendingImport.paths}
          onConfirm={confirmImport}
          onCancel={() => setPendingImport(null)}
        />
      )}

      {dropWarning && <div className="toast">노드를 먼저 선택하세요</div>}
    </div>
  );
}

export default App;
