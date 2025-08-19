// components/ui/badge.tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "secondary" | "destructive" | "outline";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
}

const variantClasses: Record<Variant, string> = {
  default:
    "bg-primary text-primary-foreground hover:bg-primary/90",
  secondary:
    "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  destructive:
    "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  outline:
    "text-foreground border border-input bg-transparent",
};

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold transition-colors select-none",
          variantClasses[variant],
          className
        )}
        {...props}
      />
    );
  }
);
Badge.displayName = "Badge";
