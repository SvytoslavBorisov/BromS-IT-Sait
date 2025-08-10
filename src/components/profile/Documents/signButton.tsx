"use client";
import React from "react";

interface SignButtonProps {
  disabled: boolean;
  loading: boolean;
  onClick: () => void;
}

export function SignButton({ disabled, loading, onClick }: SignButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`px-4 py-2 rounded ${
        disabled
          ? "bg-gray-300 text-gray-600 cursor-not-allowed"
          : "bg-blue-600 text-white hover:bg-blue-700"
      }`}
    >
      {loading ? "Загрузка..." : "Подписать документ"}
    </button>
  );
}