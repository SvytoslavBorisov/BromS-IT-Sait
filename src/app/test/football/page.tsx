import ClientApp from "./ClientApp";

export default function Page() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-neutral-100 dark:from-neutral-950 dark:to-neutral-900 text-neutral-900 dark:text-neutral-100">
      <header className="px-4 md:px-8 py-6 border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-extrabold tracking-tight">Match Player Stats — StatsBomb</h1>
          <p className="text-sm text-neutral-500">Загрузите events JSON (v4) и изучайте детальную статистику.</p>
        </div>
      </header>
      <ClientApp />
      <footer className="py-10 text-center text-xs text-neutral-500">© {new Date().getFullYear()} — Scout UI</footer>
    </div>
  );
}