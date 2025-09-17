// app/games/luch/startmenu/Controls/SeedField.tsx
"use client";

import React, { useMemo, useState } from "react";
import NeonButton from "../ui/NeonButton";

type Props = { seed: string; onChange: (s: string) => void };

export default function SeedField({ seed, onChange }: Props) {
  const [local, setLocal] = useState(seed);
  const valid = useMemo(() => /^[a-z0-9\-_.]{2,32}$/i.test(local), [local]);

  // Синхронизация внешнего пропса -> локального (если вдруг меняется снаружи)
  React.useEffect(() => setLocal(seed), [seed]);

  const randomize = () => onChange(Math.random().toString(36).slice(2, 10));
  const commit = () => onChange(local.trim());

  const copyLink = async () => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("seed", local);
      navigator.clipboard && (await navigator.clipboard.writeText(url.toString()));
    } catch { /* ignore */ }
  };

  return (
    <section className="box">
      <h3>Seed</h3>
      <div className="row">
        <input
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={commit}
          placeholder="например, prism-42"
          className={`inp ${valid ? "" : "bad"}`}
          aria-invalid={!valid}
          aria-label="Seed"
        />
        <NeonButton onClick={randomize} variant="ghost">Random</NeonButton>
        <NeonButton onClick={commit}    variant="ghost">Apply</NeonButton>
        <NeonButton onClick={copyLink}  variant="ghost">Copy link</NeonButton>
      </div>
      {!valid && <div className="warn">Допустимы буквы/цифры/-. _ (2–32 символа)</div>}

      <style jsx>{`
        .box {
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,.08);
          padding: 14px;
          background: linear-gradient(180deg, rgba(255,255,255,.03), rgba(255,255,255,.015));
        }
        h3 { margin: 0 0 10px 0; font-size: 14px; opacity: .9; letter-spacing: .2px; }
        .row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
        .inp {
          min-width: 220px;
          flex: 1 1 220px;
          background: rgba(255,255,255,.04);
          color: #fff;
          border: 1px solid rgba(255,255,255,.16);
          border-radius: 10px;
          padding: 10px 12px;
          outline: none;
        }
        .inp:focus { border-color: rgba(124,214,255,.55); box-shadow: 0 0 0 3px rgba(124,214,255,.18) }
        .inp.bad { border-color: #ff7997; background: rgba(255,120,151,.08) }
        .warn { margin-top: 8px; font-size: 12px; color: #ffabc0 }
      `}</style>
    </section>
  );
}
