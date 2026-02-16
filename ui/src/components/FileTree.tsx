import { useState, useCallback } from 'react';

export interface FileTreeNode {
  name: string;
  type: 'directory' | 'file';
  /** M = Modified, A = Added, D = Deleted */
  status?: 'M' | 'A' | 'D';
  additions?: number;
  deletions?: number;
  children?: FileTreeNode[];
  /** Shown for collapsed directories, e.g. "(12 files)" */
  fileCount?: number;
}

export interface FileTreeProps {
  nodes: FileTreeNode[];
  onFileClick?: (path: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  M: 'text-yellow-500',
  A: 'text-primary',
  D: 'text-red-400',
};

function DirectoryNode({
  node,
  depth,
  onFileClick,
}: {
  node: FileTreeNode;
  depth: number;
  onFileClick?: (path: string) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children && node.children.length > 0;

  const toggle = useCallback(() => setExpanded(prev => !prev), []);

  if (!hasChildren && node.fileCount) {
    // Collapsed directory placeholder
    return (
      <div className="group mt-2">
        <div
          className="flex items-center gap-1.5 text-[#72728a] hover:text-[#e2e2e7] cursor-pointer transition-colors h-[24px]"
          onClick={toggle}
        >
          <span className="material-symbols-outlined text-[14px]">arrow_right</span>
          <span>{node.name}</span>
          <span className="text-[10px] opacity-60">({node.fileCount} files)</span>
        </div>
      </div>
    );
  }

  return (
    <div className={depth > 0 ? 'group mt-2' : 'group'}>
      <div
        className="flex items-center gap-1.5 text-[#e2e2e7] mb-1 cursor-pointer hover:text-white"
        onClick={toggle}
      >
        <span
          className={`material-symbols-outlined text-[14px] transition-transform ${expanded ? 'rotate-90' : ''}`}
        >
          arrow_right
        </span>
        <span className="font-semibold">{node.name}</span>
      </div>
      {expanded && node.children && (
        <div className="pl-5 flex flex-col gap-0.5 border-l border-[#2a2a35] ml-[7px]">
          {node.children.map(child =>
            child.type === 'directory' ? (
              <DirectoryNode
                key={child.name}
                node={child}
                depth={depth + 1}
                onFileClick={onFileClick}
              />
            ) : (
              <FileNode key={child.name} node={child} onClick={onFileClick} />
            ),
          )}
        </div>
      )}
    </div>
  );
}

function FileNode({
  node,
  onClick,
}: {
  node: FileTreeNode;
  onClick?: (path: string) => void;
}) {
  const statusColor = node.status ? STATUS_COLORS[node.status] || '' : '';

  return (
    <div
      className="flex items-center h-[24px] hover:bg-[#2a2a35]/30 rounded px-1.5 -ml-1.5 cursor-pointer"
      onClick={() => onClick?.(node.name)}
    >
      {node.status ? (
        <span className={`w-[14px] font-bold mr-1 ${statusColor}`}>{node.status}</span>
      ) : (
        <span className="w-[14px] mr-1" />
      )}
      <span className="text-[#72728a] mr-2">{node.name}</span>
      {node.additions != null && (
        <span className="ml-auto text-primary">+{node.additions}</span>
      )}
      {node.deletions != null && (
        <span className="ml-1.5 text-red-400">-{node.deletions}</span>
      )}
    </div>
  );
}

export function FileTree({ nodes, onFileClick }: FileTreeProps) {
  return (
    <div className="flex flex-col gap-1 font-mono text-[11px]">
      {nodes.map(node =>
        node.type === 'directory' ? (
          <DirectoryNode key={node.name} node={node} depth={0} onFileClick={onFileClick} />
        ) : (
          <FileNode key={node.name} node={node} onClick={onFileClick} />
        ),
      )}
    </div>
  );
}
