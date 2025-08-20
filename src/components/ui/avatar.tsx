"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {}
export interface AvatarImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {}
export interface AvatarFallbackProps extends React.HTMLAttributes<HTMLSpanElement> {}

export const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted", className)}
        {...props}
      />
    );
  }
);
Avatar.displayName = "Avatar";

export const AvatarImage = React.forwardRef<HTMLImageElement, AvatarImageProps>(
  ({ className, ...props }, ref) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img ref={ref} className={cn("aspect-square h-full w-full", className)} {...props} />;
  }
);
AvatarImage.displayName = "AvatarImage";

export const AvatarFallback = React.forwardRef<HTMLSpanElement, AvatarFallbackProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn("flex h-full w-full items-center justify-center rounded-full bg-muted text-xs font-medium", className)}
        {...props}
      >
        {children}
      </span>
    );
  }
);
AvatarFallback.displayName = "AvatarFallback";

export default Avatar;
