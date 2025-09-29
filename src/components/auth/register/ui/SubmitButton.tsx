"use client";
import { Loader2 } from "lucide-react";

export default function SubmitButton({ loading }: { loading: boolean }) {
  return (
    <div className="md:col-span-2 pt-2">
      <button
        type="submit"
        disabled={loading}
        className="group relative w-full overflow-hidden rounded-xl bg-emerald-500 font-semibold py-3 transition
                   hover:brightness-110 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed text-white"
      >
        <span className="relative inline-flex items-center justify-center gap-2">
          {loading ? (<><Loader2 className="h-4 w-4 animate-spin" /> Генерация ключа и регистрация…</>)
                   : (<>Создать аккаунт</>)}
        </span>
      </button>
    </div>
  );
}
