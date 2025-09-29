// src/components/auth/login/parts/SubmitButton.tsx
import { Loader2, LogIn } from "lucide-react";

export default function SubmitButton({ loading }: { loading: boolean }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="group relative w-full overflow-hidden rounded-2xl bg-emerald-500 font-semibold py-3.5 transition
                 hover:brightness-110 focus:outline-none focus:ring-4 focus:ring-emerald-300/40 disabled:opacity-60 disabled:cursor-not-allowed text-white"
    >
      <span className="pointer-events-none absolute inset-0 translate-y-[110%] group-hover:translate-y-0 transition-transform duration-500 ease-out bg-gradient-to-t from-black/10 to-transparent" />
      <span className="relative inline-flex items-center justify-center gap-2 text-base">
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Входим…
          </>
        ) : (
          <>
            <LogIn className="h-5 w-5" />
            Войти
          </>
        )}
      </span>
    </button>
  );
}
