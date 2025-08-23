import { promises as fs } from "fs";
import path from "path";
import matter from "gray-matter";
import type { PostFull } from "./types";

const BLOG_DIR = path.join(process.cwd(), "public", "content", "blog");

export async function getPostBySlug(slug: string): Promise<PostFull> {
  const mdxPath = path.join(BLOG_DIR, slug, "index.mdx");
  const raw = await fs.readFile(mdxPath, "utf8");
  const { data, content } = matter(raw);

  const meta = {
    slug,
    title: data.title ?? slug,
    description: data.description ?? "",
    date: data.date ?? null,
    tags: data.tags ?? [],
    cover: data.cover ?? null,
    license: data.license ?? null,
    source: data.source ?? null,
  };

  return { meta, content };
}
