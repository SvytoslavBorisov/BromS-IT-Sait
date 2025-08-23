import { MDXRemote } from "next-mdx-remote/rsc";
import Image from "next/image";
import type { ComponentProps } from "react";

// свои компоненты
import { Attribution } from "@/components/blog/Attribution";
import { Toc } from "@/components/blog/Toc";
import { CodeBlock } from "@/components/blog/CodeBlock";

export const mdxComponents = {
  pre: (props: ComponentProps<"pre">) => (
    <div className="my-4 overflow-x-auto rounded-xl border">
      <pre {...props} />
    </div>
  ),
  code: CodeBlock,
  img: (p: any) => <Image {...p} alt={p.alt ?? ""} width={p.width ?? 1200} height={p.height ?? 630} />,
  Attribution,
  Toc,
};

export function RenderMdx({ source }: { source: string }) {
  return <MDXRemote source={source} components={mdxComponents as any} />;
}
