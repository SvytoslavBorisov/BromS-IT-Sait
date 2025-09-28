"use client";

import Timeline from "./Timeline";

export default function TimelinePanel({
  items,
  title = "Таймлайн действий",
}: {
  items: Parameters<typeof Timeline>[0]["items"];
  title?: string;
}) {
  return (
    <section className="rounded-2xl border border-neutral-200 shadow-sm bg-white overflow-hidden">
      <div className="px-5 py-4 border-b border-neutral-100">
        <h2 className="text-lg font-semibold text-neutral-800">{title}</h2>
      </div>

      {/* Контейнер фиксированной высоты со своим скроллом */}
      <div
        className="
          pr-2
          overflow-y-auto
          timeline-scroll
          h-[70vh]               /* мобильные */
          sm:h-[75vh]
          md:h-[calc(100vh-260px)] /* десктоп: почти весь экран */
        "
      >
        <div className="p-5">
          <Timeline items={items} />
        </div>
      </div>
    </section>
  );
}
