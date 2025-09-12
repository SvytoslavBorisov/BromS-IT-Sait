// luch/hooks/useLevelState.ts
"use client";
import { useMemo, useState } from "react";
import {
  Difficulty, SegmentObj, CircleObj, MirrorSpec, LevelSpec, InventoryItem,
} from "../engine/types";
import { generateLevel } from "../engine/levelGen";
import { spendItem } from "../state/inventory";
import { addPlacedReflector } from "../state/placement";


function segToPolar(A:{x:number;y:number}, B:{x:number;y:number}) {
  const cx = (A.x + B.x) / 2, cy = (A.y + B.y) / 2;
  const dx = B.x - A.x, dy = B.y - A.y;
  const len = Math.hypot(dx, dy);
  const deg = (Math.atan2(dy, dx) * 180) / Math.PI;
  return { center: { x: cx, y: cy }, deg, len };
}
function polarToSeg(center:{x:number;y:number}, deg:number, len:number) {
  const r = (deg * Math.PI) / 180;
  const hx = (Math.cos(r) * len) / 2;
  const hy = (Math.sin(r) * len) / 2;
  return {
    A: { x: center.x - hx, y: center.y - hy },
    B: { x: center.x + hx, y: center.y + hy },
  };
}

export function useLevelState(initialDifficulty: Difficulty = "normal") {
  const [seed, setSeed] = useState(() => Math.random().toString(36).slice(2, 8));
  const [difficulty, setDifficulty] = useState<Difficulty>(initialDifficulty);
  const [level, setLevel] = useState<LevelSpec>(() => generateLevel(seed, difficulty));

  const [sourcePct, setSourcePct] = useState(level.srcPct);
  const [sourceDeg, setSourceDeg] = useState(level.srcDeg);

  const [mainMirror, setMainMirror] = useState<MirrorSpec>(level.mirrorsPct[0]);
  const [extraMirrorsPct, setExtraMirrorsPct] = useState<MirrorSpec[]>(
    level.mirrorsPct.slice(1)
  );

  const [frameWallsPct] = useState<SegmentObj[]>(level.frameWallsPct);
  const [innerWallsPct] = useState<SegmentObj[]>(level.innerWallsPct);
  const [circlesPct, setCirclesPct] = useState<CircleObj[]>([
    ...level.filtersPct, ...level.decoysPct, level.goalPct,
  ]);

  const [placedReflectorsPct, setPlacedReflectorsPct] = useState<SegmentObj[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]); // заполняется снаружи
  const [placeMode, setPlaceMode] = useState<InventoryItem["kind"] | null>(null);

  const goal = useMemo(() => circlesPct.find((c) => c.kind === "goal")!, [circlesPct]);
  const requiredMask = goal.requiredMask ?? 0;

  function regenerate(newSeed?: string, newDifficulty?: Difficulty) {
    const s = newSeed ?? Math.random().toString(36).slice(2, 8);
    const d = newDifficulty ?? difficulty;
    const L = generateLevel(s, d);
    setSeed(s); setDifficulty(d); setLevel(L);
    setSourcePct(L.srcPct); setSourceDeg(L.srcDeg);
    setMainMirror(L.mirrorsPct[0]); setExtraMirrorsPct(L.mirrorsPct.slice(1));
    setCirclesPct([...L.filtersPct, ...L.decoysPct, L.goalPct]);
    setPlacedReflectorsPct([]); setPlaceMode(null);
  }

  function placeReflector(kind: InventoryItem["kind"], A: {x:number;y:number}, B: {x:number;y:number}) {
    setPlacedReflectorsPct(prev => addPlacedReflector(prev, A, B));
    setInventory(prev => spendItem(prev, kind));
  }

  function updateFilterPos(id: string, newPct: {x:number;y:number}) {
    setCirclesPct(prev => prev.map(c => (c.id === id && c.kind === "filter") ? { ...c, C: newPct } : c));
  }

  function rotateById(mirrorId: string, deltaDeg: number) {
    if (mirrorId === mainMirror.id) {
      setMainMirror(m => ({ ...m, deg: m.deg + deltaDeg }));
    } else {
      setExtraMirrorsPct(list => list.map(m => m.id === mirrorId ? { ...m, deg: m.deg + deltaDeg } : m));
    }
  }

  function moveMirrorById(mirrorId: string, centerPct: {x:number;y:number}) {
    if (mirrorId === mainMirror.id) {
      setMainMirror(m => ({ ...m, center: centerPct }));
    } else {
      setExtraMirrorsPct(list => list.map(m => m.id === mirrorId ? { ...m, center: centerPct } : m));
    }
  }

function movePlacedById(id: string, newCenter:{x:number;y:number}) {
  setPlacedReflectorsPct(prev =>
    prev.map(s => {
      if (s.id !== id) return s;
      const { center, deg, len } = segToPolar(s.A, s.B);
      const seg = polarToSeg(newCenter, deg, len);
      return { ...s, A: seg.A, B: seg.B };
    })
  );
}

function rotatePlacedById(id: string, deltaDeg: number) {
  setPlacedReflectorsPct(prev =>
    prev.map(s => {
      if (s.id !== id) return s;
      const { center, deg, len } = segToPolar(s.A, s.B);
      const seg = polarToSeg(center, deg + deltaDeg, len);
      return { ...s, A: seg.A, B: seg.B };
    })
  );
}

  return {
    // данные
    seed, setSeed, difficulty, setDifficulty, level,
    sourcePct, setSourcePct, sourceDeg, setSourceDeg,
    mainMirror, setMainMirror, extraMirrorsPct, setExtraMirrorsPct,
    frameWallsPct, innerWallsPct, circlesPct, setCirclesPct,
    placedReflectorsPct, setPlacedReflectorsPct,
    inventory, setInventory, placeMode, setPlaceMode,
    goal, requiredMask,

    // действия
    regenerate, placeReflector, updateFilterPos, rotateById, moveMirrorById,
    movePlacedById,
    rotatePlacedById,
    };
}
