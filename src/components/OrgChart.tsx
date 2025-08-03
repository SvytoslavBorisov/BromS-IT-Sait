// src/components/participants/OrgChart.tsx
"use client"

import { useState, useRef, useEffect } from "react"
import dynamic from "next/dynamic"
import { ParticipantNode } from "@/app/api/participants/route"

// react-d3-tree не поддерживает SSR, поэтому грузим динамически
const Tree = dynamic(() => import("react-d3-tree"), { ssr: false })

interface OrgChartProps {
  data: ParticipantNode[]  // массив корневых узлов
}

export default function OrgChart({ data }: OrgChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

  // Измеряем контейнер, чтобы передать Tree правильный размер
  useEffect(() => {
    function update() {
      if (containerRef.current) {
        const { offsetWidth: width, offsetHeight: height } = containerRef.current
        setDimensions({ width, height })
      }
    }
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])

  // Библиотека ждёт формат { name, children?: [...] }
  // Если у вас несколько корней, можно «обернуть» их единым вымышленным корнем,
  // или отрисовать массив деревьев по очереди
  const treeData = data

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "600px" }}
      className="border"
    >
      {dimensions.width > 0 && (
        <Tree
          data={treeData}
          orientation="vertical"         // «сверху вниз»
          pathFunc="elbow"              // «переломную» линию между узлами
          translate={{ x: dimensions.width / 2, y: 50 }}  
          nodeSize={{ x: 200, y: 100 }} // размер прямоугольника + отступ
          renderCustomNodeElement={(rd3tProps) => (
            <g>
              <rect
                width={150}
                height={50}
                x={-75}
                y={-25}
                fill="white"
                stroke="gray"
                strokeWidth={1}
                rx={4}
              />
              <text textAnchor="middle" y={5} style={{ fontSize: "12px" }}>
                {rd3tProps.nodeDatum.name}
              </text>
            </g>
          )}
        />
      )}
    </div>
  )
}
