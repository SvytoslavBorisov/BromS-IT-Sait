export type PostMeta = {
  slug: string;
  title: string;
  description?: string;         // в полном мета можно оставить опционально
  date?: string;
  tags?: string[];
  cover?: string | null;
  license?: string | null;
  source?: {
    title?: string;
    doi?: string;
    url?: string;
    type?: "translation" | "inspiration" | "quote";
  } | null;
};

// Краткое представление для карточек — ЗДЕСЬ делаем обязательные description/tags
export type PostSummary = {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  date?: string;
  cover?: string | null;
};

export type PostFull = {
  meta: PostMeta;
  content: string;
};
