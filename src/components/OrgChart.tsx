"use client";
import React, { useMemo } from "react";
import Tree, { RawNodeDatum } from "react-d3-tree";
import type { ParticipantNode } from "@/types/participants"; // ВАЖНО: type-only, не из /api!

type OrgChartProps = {
  data: ParticipantNode[]; // твои данные (массив «корней»)
};

// Адаптер в формат react-d3-tree:
function toRawNode(node: ParticipantNode): RawNodeDatum {
  return {
    // Гарантируем, что name — строка
    name: node.name ?? `#${node.id}`,
    // что-то полезное можно положить в attributes (отображаются во всплывашке)
    attributes: {
      id: node.id,
      managerId: node.managerId ?? "—",
    },
    // рекурсивно маппим детей
    children: node.children?.map(toRawNode),
  };
}

export default function OrgChart({ data }: OrgChartProps) {
  // Конвертируем ТОЛЬКО один раз на входные данные
  const rawData = useMemo<RawNodeDatum[]>(
    () => (Array.isArray(data) ? data.map(toRawNode) : [toRawNode(data as any)]),
    [data]
  );

  return (
    <div style={{ width: "100%", height: "600px" }}>
      {/* Библиотека принимает либо 1 RawNodeDatum, либо RawNodeDatum[] */}
      <Tree
        data={rawData.length === 1 ? rawData[0] : rawData}
        translate={{ x: 300, y: 80 }}
        orientation="vertical"
        separation={{ siblings: 1, nonSiblings: 1.2 }}
        initialDepth={1}
        zoom={0.8}
        pathFunc="diagonal"
      />
    </div>
  );
}
