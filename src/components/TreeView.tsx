import type { NodeRow, NodeType } from "../db";

const ICON: Record<NodeType, string> = {
  root: "🗂️",
  folder: "📁",
  note: "📄",
};

export interface TreeViewProps {
  nodes: NodeRow[];
  selectedId: string | null;
  expanded: Set<string>;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  onAddFolder: (parentId: string) => void;
  onAddNote: (parentId: string) => void;
  onDelete: (node: NodeRow) => void;
}

/** parent_id 기반 위계 트리. 무거운 외부 라이브러리 없이 재귀 컴포넌트로 렌더. */
export function TreeView(props: TreeViewProps) {
  // parent_id -> 자식 목록
  const byParent = new Map<string | null, NodeRow[]>();
  for (const n of props.nodes) {
    const arr = byParent.get(n.parent_id) ?? [];
    arr.push(n);
    byParent.set(n.parent_id, arr);
  }
  const roots = props.nodes.filter((n) => n.parent_id === null);

  return (
    <div className="tree">
      {roots.map((r) => (
        <TreeNodeRow key={r.id} node={r} depth={0} byParent={byParent} ctx={props} />
      ))}
    </div>
  );
}

interface TreeNodeRowProps {
  node: NodeRow;
  depth: number;
  byParent: Map<string | null, NodeRow[]>;
  ctx: TreeViewProps;
}

function TreeNodeRow({ node, depth, byParent, ctx }: TreeNodeRowProps) {
  const children = byParent.get(node.id) ?? [];
  const isFolderish = node.type === "root" || node.type === "folder";
  const hasChildren = children.length > 0;
  const isOpen = ctx.expanded.has(node.id);

  return (
    <>
      <div
        className={"tree-row" + (ctx.selectedId === node.id ? " selected" : "")}
        style={{ paddingLeft: 6 + depth * 14 }}
        onClick={() => ctx.onSelect(node.id)}
      >
        <span
          className="tree-twisty"
          onClick={(e) => {
            e.stopPropagation();
            if (isFolderish && hasChildren) ctx.onToggle(node.id);
          }}
        >
          {isFolderish && hasChildren ? (isOpen ? "▼" : "▶") : ""}
        </span>
        <span className="tree-icon">{ICON[node.type]}</span>
        <span className="tree-label">{node.title}</span>
        <span className="tree-actions">
          {isFolderish && (
            <>
              <button
                title="하위 폴더 추가"
                onClick={(e) => {
                  e.stopPropagation();
                  ctx.onAddFolder(node.id);
                }}
              >
                ＋폴더
              </button>
              <button
                title="하위 노트 추가"
                onClick={(e) => {
                  e.stopPropagation();
                  ctx.onAddNote(node.id);
                }}
              >
                ＋노트
              </button>
            </>
          )}
          {node.type !== "root" && (
            <button
              title="삭제"
              onClick={(e) => {
                e.stopPropagation();
                ctx.onDelete(node);
              }}
            >
              삭제
            </button>
          )}
        </span>
      </div>

      {isFolderish &&
        isOpen &&
        children.map((c) => (
          <TreeNodeRow key={c.id} node={c} depth={depth + 1} byParent={byParent} ctx={ctx} />
        ))}
    </>
  );
}
