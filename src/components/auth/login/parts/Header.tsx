// src/components/auth/login/parts/Header.tsx
import { LogIn } from "lucide-react";

export default function Header({
  title,
  subtitle,
  icon = "login",
}: {
  title: string;
  subtitle?: string;
  icon?: "login";
}) {
  return (
    <div className="flex flex-col gap-3 items-center justify-center px-6 pt-8 sm:pt-10">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 ring-1 ring-emerald-200">
        <LogIn className="h-6 w-6 text-emerald-600" />
      </div>
      <div className="text-center">
        <h2 className="text-xl sm:text-2xl font-semibold text-neutral-900">{title}</h2>
        {subtitle && <p className="text-sm text-neutral-600 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}
