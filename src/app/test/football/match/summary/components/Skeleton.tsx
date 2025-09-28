"use client";
import React from "react";

export function SummarySkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-4 w-2/3 bg-neutral-200 dark:bg-neutral-800 rounded" />
      <div className="flex gap-3">
        <div className="h-16 flex-1 bg-neutral-200 dark:bg-neutral-800 rounded-xl" />
        <div className="w-8" />
        <div className="h-16 flex-1 bg-neutral-200 dark:bg-neutral-800 rounded-xl" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="h-14 bg-neutral-200 dark:bg-neutral-800 rounded-xl" />
        <div className="h-14 bg-neutral-200 dark:bg-neutral-800 rounded-xl" />
        <div className="h-14 bg-neutral-200 dark:bg-neutral-800 rounded-xl" />
        <div className="h-14 bg-neutral-200 dark:bg-neutral-800 rounded-xl" />
      </div>
    </div>
  );
}
