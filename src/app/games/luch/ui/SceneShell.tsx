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
    <div
      className="scene"
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <SceneBackground />

      {/* Верхняя панель */}
      <div style={{ zIndex: 1, padding: compact ? 8 : 12 }}>{top}</div>

      {/* Сцена (занимает всё доступное пространство) */}
      <div
        style={{
          zIndex: 1,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div style={{ width: "100%", height: "100%" }}>{canvas}</div>

        {subtitle && (
          <div
            style={{
              opacity: 0.7,
              fontSize: 12,
              textAlign: "right",
              marginTop: 8,
              width: "100%",
              paddingRight: 12,
            }}
          >
            {subtitle}
          </div>
        )}
      </div>

      {/* Нижние панели */}
      <div
        style={{
          zIndex: 1,
          display: "grid",
          gridTemplateColumns: compact ? "1fr" : "1fr 1fr",
          gap: 16,
          padding: compact ? 8 : 12,
          width: "100%",
        }}
      >
        <div className="panel" style={{ padding: compact ? 8 : 12 }}>{left}</div>
        <div className="panel" style={{ padding: compact ? 8 : 12 }}>{right}</div>
      </div>
    </div>
  );
}
