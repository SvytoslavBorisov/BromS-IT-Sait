import { getAllPosts } from "@/lib/blog/getAllPosts";
import { ArticleCard } from "@/components/blog/ArticleCard";
import { Button } from "@/components/ui/button";
import Link from "next/link";


export default async function BlogIndex() {
  const posts = await getAllPosts(); // читает фронтмап MDX
  return (
    <section className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Статьи</h1>
        <Button variant="ghost" asChild><Link href="/">На главную</Link></Button>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {posts.map(p => <ArticleCard key={p.slug} post={p} />)}
      </div>
    </section>
  );
}
