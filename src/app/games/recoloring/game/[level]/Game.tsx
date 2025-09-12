"use client";

import React, { useMemo, useState, useEffect } from "react";
import TopBar from "./components/TopBar";
import Inventory from "./components/Inventory";
import SettingsPanel from "./components/SettingsPanel";
import GameCanvas from "./canvas/GameCanvas";

import {
  Difficulty,
  InventoryItem,
  SegmentObj,
  CircleObj,
  MirrorSpec,
} from "./engine/types";
import { MOBILE_BREAKPOINT } from "./engine/constants";
import { generateLevel } from "./engine/levelGen";
import { genId } from "./engine/utils";

/**
 * Game.tsx — главный «оркестратор».
 * Здесь только состояние, генерация уровня и «склейка» канваса + панелей.
 * Важно: никаких абсолютов/оверлеев — панели идут ВНЕ поля.
 */

export default function Game() {
  /** ---------- Адаптация к экрану ---------- */
  const [vw, setVw] = useState(1200);
  useEffect(() => {
    const on = () => setVw(window.innerWidth);
    on();
    window.addEventListener("resize", on, { passive: true });
    return () => window.removeEventListener("resize", on);
  }, []);
  const compact = vw < MOBILE_BREAKPOINT;

  /** ---------- Параметры уровня ---------- */
  const [seed, setSeed] = useState(() => Math.random().toString(36).slice(2, 8));
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [level, setLevel] = useState(() => generateLevel(seed, difficulty));

  /** Источник/угол, стартовые зеркала, стены/круги */
  const [sourcePct, setSourcePct] = useState(level.srcPct);
  const [sourceDeg, setSourceDeg] = useState(level.srcDeg);

  const [mainMirror, setMainMirror] = useState<MirrorSpec>(level.mirrorsPct[0]);
  const [extraMirrorsPct, setExtraMirrorsPct] = useState<MirrorSpec[]>(
    level.mirrorsPct.slice(1)
  );

  const [frameWallsPct] = useState<SegmentObj[]>(level.frameWallsPct);
  const [innerWallsPct] = useState<SegmentObj[]>(level.innerWallsPct);
  const [circlesPct, setCirclesPct] = useState<CircleObj[]>([
    ...level.filtersPct,
    ...level.decoysPct,
    level.goalPct,
  ]);

  /** Размещённые игроком отражатели */
  const [placedReflectorsPct, setPlacedReflectorsPct] = useState<SegmentObj[]>([]);

  /** Инвентарь и режим установки */
  const [inventory, setInventory] = useState<InventoryItem[]>([
    { id: "itm-s-1", kind: "reflector_short", qty: 2, lengthPct: 0.12 },
    { id: "itm-l-1", kind: "reflector_long",  qty: 1, lengthPct: 0.20 },
    { id: "itm-a-1", kind: "reflector_arc",   qty: 1, arcRadiusPct: 0.10 },
  ]);
  const [placeMode, setPlaceMode] = useState<InventoryItem["kind"] | null>(null);

  /** ---------- Механики верхнего меню ---------- */
  const goal = useMemo(() => circlesPct.find((c) => c.kind === "goal")!, [circlesPct]);
  const requiredMask = goal.requiredMask ?? 0;

  const regenerate = (newSeed?: string, newDifficulty?: Difficulty) => {
    const s = newSeed ?? Math.random().toString(36).slice(2, 8);
    const d = newDifficulty ?? difficulty;
    const L = generateLevel(s, d);
    setSeed(s);
    setDifficulty(d);
    setLevel(L);
    setSourcePct(L.srcPct);
    setSourceDeg(L.srcDeg);
    setMainMirror(L.mirrorsPct[0]);
    setExtraMirrorsPct(L.mirrorsPct.slice(1));
    setCirclesPct([...L.filtersPct, ...L.decoysPct, L.goalPct]);
    setPlacedReflectorsPct([]);
    setPlaceMode(null);
  };

  /** ---------- Установка предмета из инвентаря ---------- */
  const placeReflector = (kind: InventoryItem["kind"], A_pct: { x: number; y: number }, B_pct: { x: number; y: number }) => {
    setPlacedReflectorsPct((prev) => [...prev, { id: genId("place"), kind: "mirror", A: A_pct, B: B_pct }]);
    setInventory((prev) =>
      prev.map((it) => (it.kind === kind && it.qty > 0 ? { ...it, qty: it.qty - 1 } : it))
    );
  };

  /** ---------- Перетаскивание фильтров ---------- */
  const updateFilterPos = (id: string, newPct: { x: number; y: number }) => {
    setCirclesPct((prev) => prev.map((c) => (c.id === id && c.kind === "filter" ? { ...c, C: newPct } : c)));
  };

  /** ---------- Поворот/перемещение зеркал ---------- */
  const rotateById = (mirrorId: string, deltaDeg: number) => {
    if (mirrorId === mainMirror.id) {
      setMainMirror((m) => ({ ...m, deg: m.deg + deltaDeg }));
    } else {
      setExtraMirrorsPct((list) =>
        list.map((m) => (m.id === mirrorId ? { ...m, deg: m.deg + deltaDeg } : m))
      );
    }
  };
  const moveMirrorById = (mirrorId: string, centerPct: { x: number; y: number }) => {
    if (mirrorId === mainMirror.id) {
      setMainMirror((m) => ({ ...m, center: centerPct }));
    } else {
      setExtraMirrorsPct((list) =>
        list.map((m) => (m.id === mirrorId ? { ...m, center: centerPct } : m))
      );
    }
  };

  /** ---------- Рендер ---------- */
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateRows: "auto auto auto",
        gap: 16,
        background:
          "linear-gradient(180deg, #0b0f16 0%, #0e1421 45%, #0a0f18 100%)",
        color: "#e7edf6",
        fontFamily: "Inter, system-ui, Segoe UI, Roboto, Arial, sans-serif",
      }}
    >
      <TopBar
        compact={compact}
        difficulty={difficulty}
        seed={seed}
        requiredMask={requiredMask}
        onChangeDifficulty={(d) => regenerate(undefined, d)}
        onSeedChange={setSeed}
        onSeedCommit={() => regenerate(seed, difficulty)}
        onGenerate={() => regenerate()}
      />

      {/* Игровое поле — центр сцены */}
      <div
        style={{
          width: "100%",
          maxWidth: 1280,
          margin: "0 auto",
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(255,255,255,0.04)",
          background:
            "radial-gradient(1200px 500px at 10% 100%, rgba(64,112,255,0.07) 0, transparent 60%), radial-gradient(1200px 500px at 90% 0%, rgba(88,255,200,0.06) 0, transparent 60%), #0c1120",
          padding: 12,
        }}
      >
        <GameCanvas
          compact={compact}
          sourcePct={sourcePct}
          sourceDeg={sourceDeg}
          setSourceDeg={setSourceDeg}
          mainMirror={mainMirror}
          setMainMirror={setMainMirror}
          extraMirrorsPct={extraMirrorsPct}
          setExtraMirrorsPct={setExtraMirrorsPct}
          frameWallsPct={frameWallsPct}
          innerWallsPct={innerWallsPct}
          circlesPct={circlesPct}
          setCirclesPct={setCirclesPct}
          placedReflectorsPct={placedReflectorsPct}
          setPlacedReflectorsPct={setPlacedReflectorsPct}
          placeMode={placeMode}
          setPlaceMode={setPlaceMode}
          placeReflector={placeReflector}
          updateFilterPos={updateFilterPos}
          rotateById={rotateById}
          moveMirrorById={moveMirrorById}
        />
      </div>

      {/* Панели под полем — также не перекрывают */}
      <div
        style={{
          width: "100%",
          maxWidth: 1280,
          margin: "0 auto 24px auto",
          display: "grid",
          gridTemplateColumns: compact ? "1fr" : "1fr 1fr",
          gap: 16,
          padding: "0 12px",
        }}
      >
        <Inventory
          compact={compact}
          items={inventory}
          placeMode={placeMode}
          onPick={(kind) => setPlaceMode(kind)}
          onCancel={() => setPlaceMode(null)}
        />

        <SettingsPanel
          compact={compact}
          difficulty={difficulty}
          seed={seed}
          onChangeSeed={setSeed}
          onCommitSeed={() => regenerate(seed, difficulty)}
          onChangeDifficulty={(d) => regenerate(undefined, d)}
          onNew={() => regenerate()}
        />
      </div>
    </div>
  );
}
