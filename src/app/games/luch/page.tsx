// app/games/luch/page.tsx
"use client";

import dynamic from "next/dynamic";
import React, { useMemo, useState } from "react";
import StartMenu from "./startmenu/StartMenu";

const LightBeams360 = dynamic(() => import("./LightBeams360"), { ssr: false });

type Diff = "easy" | "normal" | "hard" | "insane";

export default function Page() {
  const [showGame, setShowGame] = useState(false);
  const [seed, setSeed] = useState("prisms-42");
  const [difficulty, setDifficulty] = useState<Diff>("normal");

  if (!showGame) {
    return (
      <StartMenu
        seed={seed}
        difficulty={difficulty}
        onSeedChange={setSeed}
        onDifficultyChange={setDifficulty}
        onStart={() => setShowGame(true)}
      />
    );
  }

  // Если нужно передать seed/сложность внутрь — можно
  // сохранить их в query (?seed=&difficulty=) или в zustand/контекст.
  // Базовая версия просто запускает игру с внутренними настройками.
  return <LightBeams360 />;
}
