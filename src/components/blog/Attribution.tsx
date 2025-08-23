"use client";
import { use } from "react";

export function Attribution(props:any) {
  // В реальном проекте передай эти поля через контекст/пропсы
  const meta = (props?.meta) ?? {};
  if (!meta?.source) return null;

  const s = meta.source;
  return (
    <div className="mt-10 rounded-xl border bg-muted/30 p-4 text-sm">
      <div className="font-medium">Основано на первоисточнике</div>
      <div className="mt-1">
        {s.title}{s.doi ? `, DOI: ${s.doi}` : ""}{s.url ? <> — <a className="underline" href={s.url} target="_blank">ссылка</a></> : null}
      </div>
      {meta.license ? <div className="mt-1 text-muted-foreground">{meta.license}</div> : null}
    </div>
  );
}
