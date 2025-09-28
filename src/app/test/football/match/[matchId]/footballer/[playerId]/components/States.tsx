// States.tsx
"use client";

export function LoadingState() {
  return (
    <div className="text-sm text-neutral-500">
      <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-neutral-300 mr-2" />
      Загрузка…
    </div>
  );
}

export function ErrorState({ text }: { text: string }) {
  return <div className="text-sm text-red-600">{text}</div>;
}

export function EmptyState({ text }: { text: string }) {
  return <div className="text-sm text-neutral-500">{text}</div>;
}
