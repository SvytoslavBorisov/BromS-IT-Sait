"use client";


export function StickyCTA() {
  return (
    <div className="md:hidden fixed bottom-0 inset-x-0 z-40">
      <div className="mx-3 mb-3 rounded-2xl bg-white/95 backdrop-blur-lg ring-1 ring-black/10 shadow-lg p-2 flex gap-2">
        <a href="tel:+7XXXXXXXXXX" className="flex-1 rounded-xl bg-neutral-900 text-white py-2 text-center">Позвонить</a>
        <a href="https://t.me/yourhandle" className="flex-1 rounded-xl bg-neutral-100 text-neutral-900 ring-1 ring-black/10 py-2 text-center">Telegram</a>
      </div>
    </div>
  );
}
