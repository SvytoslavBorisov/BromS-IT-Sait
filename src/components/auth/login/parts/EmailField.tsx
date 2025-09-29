// src/components/auth/login/parts/EmailField.tsx
import { Mail } from "lucide-react";
import { inputBase, labelBase } from "../styles";

export default function EmailField({
  value, onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className={labelBase}>Email</label>
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 opacity-70">
          <Mail className="h-5 w-5 text-neutral-400" />
        </span>
        <input
          type="email"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          autoComplete="email"
          placeholder="you@example.com"
          className={`${inputBase} pl-12`}
        />
      </div>
    </div>
  );
}
