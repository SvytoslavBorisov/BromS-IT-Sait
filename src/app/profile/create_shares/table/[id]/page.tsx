"use client"
import { useParams } from "next/navigation"
import { usePoker } from "@/lib/usePoker"
import type { PlayerPresence } from "@/types/realtime"

export default function Table() {
  const params = useParams<{ id: string }>()
  const tableId = params?.id ?? ""
  const { state, presence, act } = usePoker(tableId)

  return (
    <main style={{ padding: 24 }}>
      <h2>Стол: {tableId}</h2>
      <div>Игроков онлайн: {presence.length}</div>

      <ul style={{ marginTop: 8 }}>
        {presence.map((p: PlayerPresence) => (
          <li key={p.id}>{p.name ?? p.id}</li>
        ))}
      </ul>

      <div style={{ marginTop: 12 }}>Банк: {state?.pot ?? 0}</div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button onClick={() => act("START_HAND")}>Новая раздача</button>
        <button onClick={() => act("BET", 50)}>Bet 50</button>
        <button onClick={() => act("FOLD")}>Fold</button>
      </div>
    </main>
  )
}