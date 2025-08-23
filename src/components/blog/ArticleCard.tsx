import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function ArticleCard({ post }:{ post: { slug:string; title:string; description:string; tags:string[] }}) {
  return (
    <Card className="group h-full overflow-hidden">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap gap-2">{post.tags?.slice(0,2).map(t => (
          <Badge key={t} variant="secondary" className="rounded-full">{t}</Badge>
        ))}</div>
        <CardTitle className="text-xl leading-snug">
          <Link href={`/crypto/blog/${post.slug}`} className="transition-colors group-hover:text-primary">{post.title}</Link>
        </CardTitle>
        <CardDescription className="text-sm leading-relaxed">{post.description}</CardDescription>
      </CardHeader>
    </Card>
  );
}
