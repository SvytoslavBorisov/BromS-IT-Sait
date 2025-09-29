// src/components/auth/login/parts/Links.tsx
import Link from "next/link";

export default function Links() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <Link
        href="/auth/forgot"
        className="text-sm text-emerald-700 hover:text-emerald-800 underline-offset-4 hover:underline"
      >
        Забыли пароль?
      </Link>
    </div>
  );
}
