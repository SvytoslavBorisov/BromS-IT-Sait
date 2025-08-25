// src/lib/blog/mdx.tsx
// Универсальный рендер: MDX (SSR) + TeX (CSR через KaTeX-парсер)

import { MDXRemote } from "next-mdx-remote/rsc";
import type { ComponentProps } from "react";
import Image from "next/image";

// свои компоненты
import { Attribution } from "@/components/blog/Attribution";
import { Toc } from "@/components/blog/Toc";
import { CodeBlock } from "@/components/blog/CodeBlock";

// LaTeX для MDX-математики (останется работать в .mdx)
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

// клиентский «переключатель формата»
import RenderContentClient from "./RenderContentClient";

export const mdxComponents = {
  pre: (props: ComponentProps<"pre">) => (
    <div className="my-4 overflow-x-auto rounded-xl border">
      <pre {...props} />
    </div>
  ),
  code: CodeBlock,
  img: (p: any) => (
    <Image
      {...p}
      alt={p.alt ?? ""}
      width={p.width ?? 1200}
      height={p.height ?? 630}
    />
  ),
  Attribution,
  Toc,
};

// ⚠️ критично: восстановим «слетевшие» слэши (\b, \t → U+0008/U+0009)
function restoreLostBackslashes(input: string): string {
  if (!input) return "";
  return input
    .replace(/\u0008/g, "\\")           // backspace (из "\b")
    .replace(/\u0009(?=[A-Za-z\\])/g, "\\") // tab (из "\t") только если дальше идет слово/слэш
    .replace(/\u000B(?=[A-Za-z\\])/g, "\\") // \v
    .replace(/\u000C(?=[A-Za-z\\])/g, "\\"); // \f
}

function looksLikeTeX(src: string): boolean {
  const s = restoreLostBackslashes(src.trimStart());

  // ВАЖНО: здесь используем String.raw, чтобы литерал содержал реальный бэкслеш.
  if (s.startsWith(String.raw`\documentclass`)) return true;

  // остальное — через корректные regex c двойными слэшами
  if (/\\begin\{document\}/.test(s)) return true;

  // поймаем распространенные команды/окружения
  if (/\\(section\*?|subsection\*?|usepackage|begin\{equation\*?\}|begin\{center\}|begin\{itemize\}|begin\{enumerate\})/.test(s)) {
    return true;
  }

  // если вверху YAML фронт-маттер, а дальше сразу TeX — тоже пропустим в TeX-рендер
  if (/^---\s*[\s\S]*?---/.test(s) && /\\(documentclass|begin\{document\})/.test(s)) {
    return true;
  }

  return false;
}

export function RenderMdx({ source }: { source: string }) {
  if (looksLikeTeX(source)) {
    return <RenderContentClient type="tex" source={source} />;
  }

  return (
    <MDXRemote
      source={source}
      components={mdxComponents as any}
      options={{
        mdxOptions: {
          remarkPlugins: [remarkMath],
          rehypePlugins: [rehypeKatex],
        },
      }}
    />
  );
}
