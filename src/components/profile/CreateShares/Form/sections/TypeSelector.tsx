"use client";

import { FileType } from "@/lib/crypto/shares";

export default function TypeSelector({
  type,
  createCert,
  onTypeChange,
  onToggleCreateCert,
}: {
  type: FileType;
  createCert: boolean;
  onTypeChange: (t: FileType) => void;
  onToggleCreateCert: (v: boolean) => void;
}) {
  return (
    <div className="rounded-2xl border p-4 shadow-sm bg-white/60 space-y-3">
      <div>
        <label className="block text-sm font-medium mb-1">Тип разделения</label>
        <select
          value={type}
          onChange={(e) => onTypeChange(e.target.value as FileType)}
          className="border rounded-xl px-3 py-2 w-full outline-none focus:ring-2 focus:ring-black/10"
        >
          <option value="CUSTOM">Пользовательский (секрет в поле ниже)</option>
          <option value="ASYMMETRIC">Асимметричный (ключ/сертификат)</option>
        </select>
      </div>

      {type === "ASYMMETRIC" && (
        <div className="flex items-center justify-between rounded-xl border px-3 py-3 bg-gray-50">
          <div className="flex flex-col">
            <span className="text-sm font-medium">Создать сертификат</span>
            <span className="text-xs text-muted-foreground">
              При включении — будет сгенерирован X.509 и предложено скачать.
            </span>
          </div>
          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              className="peer sr-only"
              checked={createCert}
              onChange={(e) => onToggleCreateCert(e.target.checked)}
            />
            <span className="w-10 h-6 bg-gray-300 rounded-full relative transition-all peer-checked:bg-emerald-500">
              <span className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-all peer-checked:left-4"></span>
            </span>
          </label>
        </div>
      )}
    </div>
  );
}
