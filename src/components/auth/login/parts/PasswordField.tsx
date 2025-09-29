// src/components/auth/login/parts/PasswordField.tsx
import { Eye, EyeOff, Lock } from "lucide-react";
import { inputBase, labelBase } from "../styles";

export default function PasswordField({
  value, onChange, show, onToggleShow,
}: {
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggleShow: () => void;
}) {
  return (
    <div>
      <label className={labelBase}>Пароль</label>
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 opacity-70">
          <Lock className="h-5 w-5 text-neutral-400" />
        </span>
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          autoComplete="current-password"
          placeholder="••••••••"
          className={`${inputBase} pl-12 pr-14`}
        />
        <button
          type="button"
          onClick={onToggleShow}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-xl p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 transition"
          aria-label={show ? "Скрыть пароль" : "Показать пароль"}
          tabIndex={-1}
        >
          {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );
}
