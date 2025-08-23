"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

/**
 * Универсальный компонент для mdx:
 * - inline-код (<code>) рендерит как есть
 * - блок кода (className ~ language-*) — с кнопкой «Копировать» и бейджем языка
 */
export function CodeBlock(props: React.HTMLAttributes<HTMLElement>) {
  const isBlock = /language-/.test(props.className ?? "");
  if (!isBlock) {
    // inline <code>
    return <code {...props} />;
  }

  const lang =
    props.className?.match(/language-([\w+-]+)/)?.[1]?.toUpperCase() ?? "";
  const preRef = React.useRef<HTMLPreElement>(null);
  const [copied, setCopied] = React.useState(false);

  const copy = async () => {
    const text = preRef.current?.innerText ?? "";
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  };

  return (
    <div className="relative group my-4 rounded-xl border bg-muted/20">
      <div className="absolute left-2 top-2 text-xs text-muted-foreground">
        {lang}
      </div>
      <div className="absolute right-2 top-2">
        <Button size="sm" variant="outline" onClick={copy} className="h-7 px-2">
          {copied ? "Скопировано" : "Копировать"}
        </Button>
      </div>
      <pre ref={preRef} className="m-0 overflow-x-auto p-4">
        {props.children}
      </pre>
    </div>
  );
}
