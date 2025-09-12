"use client";

/**
 * Обёртка для совместимости со старым путём импорта.
 * Весь реальный код — в Game.tsx
 */
import Game from "./Game";
export default function LightBeams360() {
  return <Game />;
}