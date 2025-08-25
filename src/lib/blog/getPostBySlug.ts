// src/lib/blog/getPostBySlug.ts
import path from "node:path";
import { promises as fs } from "node:fs";
import matter from "gray-matter";

export type PostMeta = {
  title?: string;
  description?: string;
  date?: string;
  tags?: string[];
  cover?: string;
  license?: string;
  source?: unknown;
  [k: string]: unknown;
};

export type PostFull = {
  meta: PostMeta;
  content: string; // сырая строка: MDX или TeX (RenderMdx сам поймёт)
  format: "tex" | "mdx" | "md";
  slug: string;
};

const BLOG_DIR = path.resolve(process.cwd(), "public", "content", "blog");

async function tryRead(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return null;
  }
}

export async function getPostBySlug(slug: string): Promise<PostFull> {
  // Поддерживаем несколько вариантов имён
  const base = path.join(BLOG_DIR, slug);
  const candidates = [
    path.join(base, "index.tex"),
    path.join(base, "index.mdx"),
    path.join(base, "index.md"),
    // запасные варианты на всякий
    path.join(BLOG_DIR, `${slug}.tex`),
    path.join(BLOG_DIR, `${slug}.mdx`),
    path.join(BLOG_DIR, `${slug}.md`),
  ];

  let raw: string | null = null;
  let picked = "";
  for (const p of candidates) {
    raw = await tryRead(p);
    if (raw !== null) {
      picked = p;
      break;
    }
  }

  if (raw === null) {
    // Дадим понятное сообщение и правильный ожидаемый путь
    const expected = path.join(BLOG_DIR, slug, "index.tex");
    throw new Error(
      `Пост не найден. Ожидался файл: ${expected}\n` +
      `Создай его и положи LaTeX/MDX с фронт-маттером '---'.`
    );
  }

  // gray-matter корректно отделит YAML даже в .tex
  const { data, content } = matter(raw);

  // Определим формат по расширению
  const ext = path.extname(picked).toLowerCase();
  const format: PostFull["format"] =
    ext === ".tex" ? "tex" : ext === ".mdx" ? "mdx" : "md";

  const meta: PostMeta = { ...(data as any) };

  // Минимальные дефолты
  if (!meta.title) meta.title = slug;
  if (!meta.description) meta.description = "";

  return { meta, content, format, slug };
}
