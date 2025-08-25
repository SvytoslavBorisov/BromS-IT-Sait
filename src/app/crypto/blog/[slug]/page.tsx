// src/app/crypto/blog/[slug]/page.tsx
import { getPostBySlug } from "@/lib/blog/getPostBySlug";
import { RenderMdx } from "@/lib/blog/mdx";
import ReaderChrome from "./ReaderChrome";

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { meta, content } = await getPostBySlug(slug);

  return (
    <ReaderChrome meta={meta} slug={slug} defaultTheme="paper">
      <RenderMdx source={content} />
    </ReaderChrome>
  );
}
