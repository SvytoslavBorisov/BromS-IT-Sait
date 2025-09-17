// app/games/luch/startmenu/Header.tsx
"use client";

import React from "react";

export default function Header() {
  return (
    <div className="hdr">
      <div className="logo">
        <div className="prism" />
      </div>
      <div className="txt">
        <div className="title">Light Beams 360</div>
        <div className="tag">Отражай лучи • Смешивай RGB • Достигай цели</div>
      </div>

      <style jsx>{`
        .hdr {
          display: flex; gap: 14px; align-items: center; flex-wrap: wrap;
        }
        .logo {
          width: 60px; height: 60px; border-radius: 16px;
          background: linear-gradient(135deg, #5ec5ff22, #ff7ca822);
          display: grid; place-items: center;
          box-shadow: inset 0 0 0 1px rgba(255,255,255,.06), 0 8px 24px rgba(0,0,0,.5);
        }
        .prism {
          width: 26px; height: 26px; transform: rotate(45deg); border-radius: 6px;
          background: conic-gradient(from 0deg, #6ec7ff, #6effa7, #ff86b7, #6ec7ff);
          filter: saturate(1.2) brightness(1.05);
        }
        .txt { line-height: 1.05 }
        .title { font-size: 26px; font-weight: 900; letter-spacing: .3px; }
        .tag { opacity: .85; font-size: 13px }
        @media (min-width: 860px) { .title { font-size: 28px } }
      `}</style>
    </div>
  );
}
