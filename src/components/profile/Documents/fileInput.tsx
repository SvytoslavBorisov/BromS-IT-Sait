"use client";
import React from "react";

interface FileInputProps {
  onFileChange: (file: File | null) => void;
}

export function FileInput({ onFileChange }: FileInputProps) {
  return (
    <div>
      <label className="block mb-1 font-medium">Загрузите документ</label>
      <input
        type="file"
        accept=".pdf,.docx"
        onChange={e => onFileChange(e.target.files?.[0] ?? null)}
        className="block w-full"
      />
    </div>
  );
}