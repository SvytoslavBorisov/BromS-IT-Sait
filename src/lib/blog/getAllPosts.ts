import { promises as fs } from "fs";
import path from "path";
import matter from "gray-matter";
import type { PostSummary } from "./types";

const BLOG_DIR = path.join(process.cwd(), "public", "content", "blog");

export async function getAllPosts(): Promise<PostSummary[]> {
  let entries: string[] = [];
  try {
    entries = await fs.readdir(BLOG_DIR, { withFileTypes: false });
  } catch {
    return []; // если папки нет — вернем пустой список
  }

  const posts: PostSummary[] = [];
  for (const slug of entries) {
    const mdxPath = path.join(BLOG_DIR, slug, "index.tex");
    try {
      const raw = await fs.readFile(mdxPath, "utf8");
      const { data } = matter(raw);
      posts.push({
        slug,
        title: data.title ?? slug,
        description: data.description ?? "",
        date: data.date ?? null,
        tags: data.tags ?? [],
        cover: data.cover ?? null,
      } as PostSummary);
    } catch {
      // пропускаем, если файл отсутствует/битый
    }
  }

  // сортировка по дате ↓
  posts.sort((a, b) => {
    const da = a.date ? Date.parse(a.date) : 0;
    const db = b.date ? Date.parse(b.date) : 0;
    return db - da;
  });

  return posts;
}
