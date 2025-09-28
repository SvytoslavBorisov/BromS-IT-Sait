"use client";
export function EmptyState() {
  return (
    <div className="mt-20 flex flex-col items-center text-center gap-4">
      <div className="w-20 h-20 rounded-2xl bg-neutral-200 dark:bg-neutral-800 grid place-items-center text-3xl">📄</div>
      <div>
        <div className="text-xl font-semibold">Загрузите файл событий матча (events/{"{match_id}"}.json)</div>
        <div className="text-neutral-500 mt-1 max-w-xl">Файл формата StatsBomb v4: Pass, Shot, Carry, Duel и т.д. Интерфейс посчитает метрики по каждому игроку.</div>
      </div>
    </div>
  );
}