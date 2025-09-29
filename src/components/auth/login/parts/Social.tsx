// src/components/auth/login/parts/Social.tsx
import { ShieldCheck } from "lucide-react";
import { VKTile } from "../../VKButton";
import { YandexTile } from "../../YandexButton";

export default function Social() {
  return (
    <div className="mt-7 space-y-3">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-neutral-200" />
        <span className="text-xs text-neutral-500">или войдите через</span>
        <div className="h-px flex-1 bg-neutral-200" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <VKTile />
        <YandexTile />
      </div>

    </div>
  );
}
