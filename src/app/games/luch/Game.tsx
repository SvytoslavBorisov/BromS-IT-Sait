// luch/Game.tsx
"use client";

import TopBar from "./components/TopBar";
import Inventory from "./components/Inventory";
import SettingsPanel from "./components/SettingsPanel";
import GameCanvas from "./canvas/GameCanvas";

import { useViewport } from "./hooks/useViewport";
import { useLevelState } from "./hooks/useLevelState";
import SceneShell from "./ui/SceneShell";
import { createDefaultInventory } from "./state/inventory";
import { useEffect } from "react";

export default function Game() {
  const { compact } = useViewport();
  const st = useLevelState("normal");

  // первичная инициализация инвентаря (выносим из хука, чтобы можно было подменять)
  useEffect(() => {
    if (!st.inventory.length) st.setInventory(createDefaultInventory());
  }, [st]);

  return (
    <SceneShell
      compact={compact}
      top={
        <TopBar
          compact={compact}
          difficulty={st.difficulty}
          seed={st.seed}
          requiredMask={st.requiredMask}
          onChangeDifficulty={(d) => st.regenerate(undefined, d)}
          onSeedChange={st.setSeed}
          onSeedCommit={() => st.regenerate(st.seed, st.difficulty)}
          onGenerate={() => st.regenerate()}
        />
      }
      canvas={
        <GameCanvas
          compact={compact}
          sourcePct={st.sourcePct}
          sourceDeg={st.sourceDeg}
          setSourceDeg={st.setSourceDeg}
          mainMirror={st.mainMirror}
          setMainMirror={st.setMainMirror}
          extraMirrorsPct={st.extraMirrorsPct}
          setExtraMirrorsPct={st.setExtraMirrorsPct}
          frameWallsPct={st.frameWallsPct}
          innerWallsPct={st.innerWallsPct}
          circlesPct={st.circlesPct}
          setCirclesPct={st.setCirclesPct}
          placedReflectorsPct={st.placedReflectorsPct}
          setPlacedReflectorsPct={st.setPlacedReflectorsPct}
          placeMode={st.placeMode}
          setPlaceMode={st.setPlaceMode}
          placeReflector={st.placeReflector}
          updateFilterPos={st.updateFilterPos}
          rotateById={st.rotateById}
          moveMirrorById={st.moveMirrorById}
          movePlacedById={st.movePlacedById}
          rotatePlacedById={st.rotatePlacedById}
        />
      }
      subtitle={"Советы: перетаскивай фильтры и вращай зеркала — ищи минимальный путь луча до цели."}
      left={
        <Inventory
          compact={compact}
          items={st.inventory}
          placeMode={st.placeMode}
          onPick={(kind) => st.setPlaceMode(kind)}
          onCancel={() => st.setPlaceMode(null)}
        />
      }
      right={
        <SettingsPanel
          compact={compact}
          difficulty={st.difficulty}
          seed={st.seed}
          onChangeSeed={st.setSeed}
          onCommitSeed={() => st.regenerate(st.seed, st.difficulty)}
          onChangeDifficulty={(d) => st.regenerate(undefined, d)}
          onNew={() => st.regenerate()}
        />
      }
    />
  );
}
