"use client";

import { useState } from "react";

export type TreeNode = {
  id: string;
  name: string;
  publicKey: unknown;
  children: TreeNode[];
};

export default function ParticipantTree({ data }: { data: TreeNode[] }) {
  return (
    <ul className="pl-4 border-l-2 border-gray-300">
      {data.map((node) => (
        <TreeNodeItem key={node.id} node={node} />
      ))}
    </ul>
  );
}

function TreeNodeItem({ node }: { node: TreeNode }) {
  const [open, setOpen] = useState(true);
  const hasChildren = node.children.length > 0;

  return (
    <li className="mb-2">
      <div
        className="flex items-center cursor-pointer select-none"
        onClick={() => hasChildren && setOpen((v) => !v)}
      >
        {hasChildren && (
          <span className="mr-2">{open ? "▼" : "▶"}</span>
        )}
        <div>
          <div className="font-medium">{node.name}</div>
          {/* Можно показать публичный ключ или другой атрибут */}
          <div className="text-xs text-gray-500 break-all">
            {JSON.stringify(node.publicKey)}
          </div>
        </div>
      </div>
      {hasChildren && open && (
        <ParticipantTree data={node.children} />
      )}
    </li>
  );
}