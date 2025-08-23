import { getPostBySlug } from "@/lib/blog/getPostBySlug";
import { RenderMdx } from "@/lib/blog/mdx";
import { PdfButton } from "@/components/blog/PdfButton";

export default async function ArticlePage({ params }:{ params:{ slug:string }}) {
  const { meta, content } = await getPostBySlug(params.slug);
  return (
    <article className="mx-auto max-w-3xl px-6 py-10 prose prose-neutral dark:prose-invert">
      <header className="mb-6">
        <h1 className="mb-2">{meta.title}</h1>
        <p className="text-sm text-muted-foreground">{meta.description}</p>
        <div className="mt-3"><PdfButton slug={params.slug} /></div>
      </header>
      <RenderMdx source={content} />
    </article>
  );
}
