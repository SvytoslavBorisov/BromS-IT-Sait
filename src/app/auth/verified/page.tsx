"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { CheckCircle2, AlertTriangle, ShieldCheck, ArrowLeft, LogIn } from "lucide-react";
import Link from "next/link";

export default function VerifiedPage() {
  const qp = useSearchParams();
  const router = useRouter();
  const status = useMemo(() => qp.get("status") || "ok", [qp]);

  useEffect(() => {
    const t = setTimeout(() => router.push("/auth/login"), 2500);
    return () => clearTimeout(t);
  }, [router]);

  const map: Record<
    string,
    { title: string; desc: string; tone: "ok" | "warn" | "bad"; Icon: any }
  > = {
    ok: { title: "E-mail подтверждён", desc: "Теперь вы можете войти.", tone: "ok", Icon: CheckCircle2 },
    expired: {
      title: "Ссылка истекла",
      desc: "Отправьте письмо подтверждения ещё раз.",
      tone: "warn",
      Icon: AlertTriangle,
    },
    invalid: {
      title: "Ссылка недействительна",
      desc: "Проверьте письмо или запросите новое.",
      tone: "bad",
      Icon: ShieldCheck,
    },
  };

  const m = map[status] ?? map.invalid;

  const toneBox =
    m.tone === "ok"
      ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
      : m.tone === "warn"
      ? "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
      : "bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300";

  return (
    <div className="min-h-[70vh] w-full flex items-center justify-center px-4">
      <section
        className="
          w-full max-w-md rounded-2xl overflow-hidden shadow-lg
          bg-white/80 dark:bg-neutral-900/80 backdrop-blur
          ring-1 ring-neutral-200/70 dark:ring-neutral-800/70
        "
        aria-labelledby="verified-heading"
      >
        {/* Шапка (единый стиль) */}
        <div className="px-6 py-5 bg-gradient-to-r from-emerald-700 via-emerald-600 to-sky-600 text-white">
          <div className="flex items-center gap-2">
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/15">
              <m.Icon className="h-5 w-5" aria-hidden="true" />
            </div>
            <h1 id="verified-heading" className="text-lg font-semibold leading-none">
              {m.title}
            </h1>
          </div>
          <p className="mt-2 text-sm/relaxed text-white/85">{m.desc}</p>
        </div>

        {/* Контент */}
        <div className="p-6">
          <div className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 ${toneBox}`}>
            <m.Icon className="h-5 w-5" aria-hidden="true" />
            <span className="text-sm">Через пару секунд произойдёт переход на страницу входа.</span>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 focus:outline-none"
            >
              <LogIn className="h-4 w-4" aria-hidden="true" />
              Перейти ко входу
            </Link>
            <Link
              href="/auth/register"
              className="text-sm text-neutral-600 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 focus:outline-none"
            >
              Создать аккаунт
            </Link>
          </div>

          <div className="mt-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300 focus:outline-none"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              На главную
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
