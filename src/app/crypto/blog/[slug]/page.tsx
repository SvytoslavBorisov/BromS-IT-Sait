import { getPostBySlug } from "@/lib/blog/getPostBySlug";
import { RenderMdx } from "@/lib/blog/mdx";
import { PdfButton } from "@/components/blog/PdfButton";

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { meta, content } = await getPostBySlug(slug);

  return (
    <main className="flex justify-center px-4 py-10 bg-gradient-to-b from-white to-gray-50 dark:from-gray-950 dark:to-gray-900 min-h-screen">
      <article className="w-full max-w-3xl rounded-2xl bg-white dark:bg-gray-950 shadow-xl p-8 prose prose-lg prose-neutral dark:prose-invert transition-all">
        <header className="border-b border-gray-200 dark:border-gray-800 pb-6 mb-8">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-3">
            {meta.title}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">{meta.description}</p>
          <div className="mt-5">
            <PdfButton slug={slug} />
          </div>
        </header>

        <section className="prose prose-neutral dark:prose-invert prose-headings:font-semibold prose-h1:text-3xl prose-h2:text-2xl prose-p:leading-relaxed">
          <RenderMdx source={content} />
        </section>
      </article>
    </main>
  );
}
