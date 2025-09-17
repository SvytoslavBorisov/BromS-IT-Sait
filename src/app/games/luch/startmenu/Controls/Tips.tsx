// app/games/luch/startmenu/Controls/Tips.tsx
"use client";

import React from "react";

export default function Tips() {
  return (
    <details className="tips">
      <summary>Как играть</summary>
      <div className="body">
        Перетаскивай <b>зеркала</b> и <b>фильтры</b>, вращай их и направляй луч к цели.
        Каналы RGB смешиваются — добейся <i>нужной маски</i>. В верхней панели видна цель.
      </div>
      <style jsx>{`
        .tips {
          margin-top: 12px;
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 12px;
          padding: 10px 12px;
          background: rgba(255,255,255,.03);
        }
        summary { cursor: pointer; font-weight: 700; }
        .body { margin-top: 8px; opacity: .9; font-size: 14px; }
      `}</style>
    </details>
  );
}
