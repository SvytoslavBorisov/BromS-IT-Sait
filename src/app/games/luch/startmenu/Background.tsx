// app/games/luch/startmenu/Background.tsx
"use client";

import React from "react";

export default function Background() {
  return (
    <>
      <style jsx>{`
        .bg {
          position: fixed; inset: 0; z-index: -1; pointer-events: none;
          background:
            radial-gradient(1200px 640px at 16% -6%, rgba(94,197,255,.12), transparent 60%),
            radial-gradient(1000px 560px at 88% -6%, rgba(255,124,168,.10), transparent 60%),
            linear-gradient(180deg, #0a0f18 0%, #0b1220 45%, #080c14 100%);
        }
        .dots { opacity: .09 }
        @media (max-width: 860px) {
          .bg { background:
            radial-gradient(900px 520px at 12% -8%, rgba(94,197,255,.10), transparent 60%),
            radial-gradient(860px 500px at 90% -8%, rgba(255,124,168,.08), transparent 60%),
            linear-gradient(180deg, #090e16 0%, #0a101c 45%, #070b12 100%);
          }
          .dots { opacity: .08 }
        }
      `}</style>

      <div className="bg" />
      <svg className="dots" viewBox="0 0 100 100" preserveAspectRatio="none"
           style={{ position: "fixed", inset: 0, zIndex: -1 }}>
        <defs>
          <pattern id="lbDots" width="3" height="3" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r=".42" fill="#cfd8ff" />
          </pattern>
          <radialGradient id="lbV" cx="50%" cy="48%" r="75%">
            <stop offset="70%" stopColor="white" stopOpacity="1" />
            <stop offset="100%" stopColor="white" stopOpacity="0.75" />
          </radialGradient>
        </defs>
        <rect x="0" y="0" width="100" height="100" fill="url(#lbDots)" />
        <rect x="0" y="0" width="100" height="100" fill="url(#lbV)" />
      </svg>
    </>
  );
}
