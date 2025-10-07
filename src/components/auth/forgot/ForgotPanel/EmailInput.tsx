"use client";

import React from "react";

export default function EmailInput({
  id,
  value,
  onChange,
  disabled,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-sm font-medium text-neutral-800"
      >
        E-mail
      </label>
      <input
        id={id}
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={!!disabled}
        className="
          w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5
          text-[15px] text-neutral-900 placeholder:text-neutral-400
          outline-none transition
          focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10
          disabled:opacity-60
        "
      />
    </div>
  );
}
