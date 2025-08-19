// components/ui/progress.tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Значение прогресса в процентах [0..100] */
  value?: number;
}

export const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, ...props }, ref) => {
    const clamped = Math.max(0, Math.min(100, value ?? 0));

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(clamped)}
        className={cn(
          "relative h-2 w-full overflow-hidden rounded-full bg-muted",
          className
        )}
        {...props}
      >
        <div
          className="h-full w-full translate-x-[-100%] rounded-full bg-primary transition-transform duration-500"
          style={{
            transform: `translateX(-${100 - clamped}%)`,
          }}
        />
      </div>
    );
  }
);
Progress.displayName = "Progress";
