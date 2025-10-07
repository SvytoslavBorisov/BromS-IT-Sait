"use client";

import React from "react";

export default function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
      role="alert"
    >
      {message}
    </div>
  );
}
