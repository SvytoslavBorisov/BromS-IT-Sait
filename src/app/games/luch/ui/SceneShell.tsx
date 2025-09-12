// luch/ui/SceneShell.tsx
"use client";
import { ReactNode } from "react";
import SceneBackground from "./SceneBackground";

export default function SceneShell({
  compact, top, canvas, subtitle, left, right,
}: {
  compact: boolean;
  top: ReactNode;
  canvas: ReactNode;
  subtitle?: ReactNode;
  left: ReactNode;
  right: ReactNode;
}) {
  return (
    <div className="scene">
      <SceneBackground />
      {/* Верхняя панель */}
      <div style={{ position: "relative", zIndex: 1, paddingInline: 12 }}>{top}</div>
      {/* Сцена */}
      <div style={{ position: "relative", zIndex: 1, paddingInline: 12 }}>
        <div className="card" style={{ width:"100%", maxWidth:1280, margin:"0 auto", padding: compact ? 8 : 12 }}>
          {canvas}
        </div>
        {subtitle && (
          <div style={{ maxWidth:1280, margin:"8px auto 0", opacity:.7, fontSize:12, textAlign:"right" }}>
            {subtitle}
          </div>
        )}
      </div>
      {/* Нижние панели */}
      <div
        style={{
          position:"relative", zIndex:1, width:"100%", maxWidth:1280, margin:"0 auto 24px auto",
          display:"grid", gridTemplateColumns: compact ? "1fr" : "1fr 1fr", gap:16, padding:"0 12px",
        }}
      >
        <div className="panel" style={{ padding: compact ? 8 : 12 }}>{left}</div>
        <div className="panel" style={{ padding: compact ? 8 : 12 }}>{right}</div>
      </div>
    </div>
  );
}
