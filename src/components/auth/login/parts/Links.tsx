// src/components/auth/login/parts/Links.tsx
import Link from "next/link";

type Props = {
  onForgot?: () => void;
};

export default function Links({ onForgot }: Props) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      {onForgot ? (
        <button
          type="button"
          onClick={onForgot}
          className="text-sm text-emerald-700 hover:text-emerald-800 underline-offset-4 hover:underline"
        >
          Забыли пароль?
        </button>
      ) : (
        <Link
          href="/auth/forgot"
          className="text-sm text-emerald-700 hover:text-emerald-800 underline-offset-4 hover:underline"
        >
          Забыли пароль?
        </Link>
      )}
    </div>
  );
}
