// src/lib/blog/RenderTexClient.tsx
"use client";

/**
 * RenderTexClient — рендер .tex (YAML фронт‑маттер + преамбула) прямо в браузере.
 * Порядок критичен: сначала математика → плейсхолдеры, потом окружения и инлайн-команды.
 *
 * deps: npm i katex isomorphic-dompurify
 */

import { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import DOMPurify from "isomorphic-dompurify";

type Props = { source: string };

// ---------- FRONT‑MATTER ----------
function stripFrontMatter(input: string): string {
  const s = input ?? "";
  if (!s.startsWith("---")) return s;
  const end = s.indexOf("\n---", 3);
  if (end === -1) return s;
  return s.slice(end + 4).replace(/^\s*\r?\n/, "");
}

/** Если строка попала как обычная JS-строка и потеряла обратные слэши — минимально восстанавливаем */
function restoreLostBackslashes(input: string): string {
  if (!input) return "";
  let s = input;
  s = s.replace(/\u0008/g, "\\");                  // \b
  s = s.replace(/\u0009(?=[A-Za-z\\])/g, "\\");    // \t
  s = s.replace(/\u000B(?=[A-Za-z\\])/g, "\\");    // \v
  s = s.replace(/\u000C(?=[A-Za-z\\])/g, "\\");    // \f
  return s;
}

// ---------- ПРЕАМБУЛА ----------
function stripPreambleKeepDocumentBody(input: string): string {
  const s = (input ?? "").replace(/\r\n/g, "\n");
  const b = s.indexOf("\\begin{document}");
  const e = s.indexOf("\\end{document}");
  return b !== -1 && e !== -1 && e > b ? s.slice(b + 16, e).trim() : s.trim();
}

// ---------- KaTeX ----------
function renderMath(src: string, displayMode: boolean) {
  try {
    return katex.renderToString(src, {
      displayMode,
      throwOnError: false,
      strict: "ignore",
      macros: {
        "\\RR": "\\mathbb{R}",
        "\\GF": "\\mathrm{GF}",
        "\\RS": "\\mathrm{RS}",
        "\\PP": "\\mathcal{P}",
        "\\GG": "\\mathcal{G}",
        "\\BB": "\\mathcal{B}",
        "\\deg": "\\operatorname{deg}"
      },
      trust: true,
      output: "htmlAndMathml",
    });
  } catch {
    const esc = src.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return `<code>${esc}</code>`;
  }
}

// ---------- МАТЕМАТИКА → ПЛЕЙСХОЛДЕРЫ ----------
type MathPart = { i: number; v: string; display: boolean };
const MATH_TOKEN = (i: number) => `§§MATH${i}§§`;

function findClosing(raw: string, from: number, close: string) {
  for (let i = from; i < raw.length; i++) {
    if (raw[i] === "\\") { i++; continue; }
    if (raw.startsWith(close, i)) return i;
  }
  return -1;
}

function extractMathPlaceholders(s: string): { text: string; parts: MathPart[] } {
  let i = 0;
  let out = "";
  const parts: MathPart[] = [];
  const push = (v: string, display: boolean) => {
    const idx = parts.length;
    parts.push({ i: idx, v, display });
    out += MATH_TOKEN(idx);
  };

  while (i < s.length) {
    if (s.startsWith("$$", i)) {
      i += 2;
      const j = findClosing(s, i, "$$");
      if (j !== -1) { push(s.slice(i, j), true); i = j + 2; continue; }
      out += "$$"; continue;
    }
    if (s.startsWith("\\[", i)) {
      i += 2;
      const j = s.indexOf("\\]", i);
      if (j !== -1) { push(s.slice(i, j), true); i = j + 2; continue; }
      out += "\\["; continue;
    }
    if (s.startsWith("\\(", i)) {
      i += 2;
      const j = s.indexOf("\\)", i);
      if (j !== -1) { push(s.slice(i, j), false); i = j + 2; continue; }
      out += "\\("; continue;
    }
    if (s[i] === "$") {
      i++;
      const j = findClosing(s, i, "$");
      if (j !== -1) { push(s.slice(i, j), false); i = j + 1; continue; }
      out += "$"; continue;
    }
    out += s[i];
    i++;
  }

  return { text: out, parts };
}

// ---------- helpers команд/окружений ----------
function findBalancedBraces(s: string, openIdx: number) {
  if (s[openIdx] !== "{") return null;
  let depth = 0;
  for (let i = openIdx; i < s.length; i++) {
    if (s[i] === "\\") { i++; continue; }
    if (s[i] === "{") depth++;
    else if (s[i] === "}") { depth--; if (depth === 0) return { end: i, inner: s.slice(openIdx + 1, i) }; }
  }
  return null;
}

function replaceCmd1(src: string, cmdLiteral: string, wrap: (inner: string) => string) {
  let i = 0;
  while (i < src.length) {
    const needle = "\\" + cmdLiteral + "{";
    const idx = src.indexOf(needle, i);
    if (idx === -1) break;
    const brace = idx + needle.length - 1;
    const bal = findBalancedBraces(src, brace);
    if (!bal) break;
    const before = src.slice(0, idx), after = src.slice(bal.end + 1);
    const rep = wrap(bal.inner);
    src = before + rep + after;
    i = before.length + rep.length;
  }
  return src;
}

function replaceCmd2(src: string, cmdLiteral: string, wrap: (a: string, b: string) => string) {
  let i = 0;
  while (i < src.length) {
    const head = "\\" + cmdLiteral + "{";
    const idx = src.indexOf(head, i);
    if (idx === -1) break;
    const o1 = idx + head.length - 1;
    const b1 = findBalancedBraces(src, o1);
    if (!b1) { i = idx + 1; continue; }
    const o2 = b1.end + 1;
    if (src[o2] !== "{") { i = idx + 1; continue; }
    const b2 = findBalancedBraces(src, o2);
    if (!b2) { i = idx + 1; continue; }
    const before = src.slice(0, idx), after = src.slice(b2.end + 1);
    const rep = wrap(b1.inner, b2.inner);
    src = before + rep + after;
    i = before.length + rep.length;
  }
  return src;
}

// сохраняем «сырые» <a …>…</a>
const RAW_ANCHOR = "§§RAW_ANCHOR§§";
const SAFE_TAG = /<a\b[^>]*>[\s\S]*?<\/a>/gi;
function protectRawAnchors(s: string) { return s.replace(SAFE_TAG, m => RAW_ANCHOR + m + RAW_ANCHOR); }
function unprotectRawAnchors(s: string) { return s.replaceAll(RAW_ANCHOR, ""); }

// Разбор окружений по всему тексту
type EnvHandler = (body: string, opt?: string) => string;
function replaceEnvAll(src: string, name: string, handler: EnvHandler) {
  let i = 0;
  while (i < src.length) {
    const start = src.indexOf(`\\begin{${name}}`, i);
    if (start === -1) break;

    let pos = start + (`\\begin{${name}}`).length;
    let opt: string | undefined;
    if (src[pos] === "[") {
      const close = src.indexOf("]", pos);
      if (close !== -1) { opt = src.slice(pos + 1, close); pos = close + 1; }
    }

    const end = src.indexOf(`\\end{${name}}`, pos);
    if (end === -1) { i = start + 1; continue; }

    const body = src.slice(pos, end);
    const before = src.slice(0, start);
    const after = src.slice(end + (`\\end{${name}}`).length);
    const rep = handler(body, opt);
    src = before + rep + after;
    i = before.length + rep.length;
  }
  return src;
}

function processBlockEnvs(s: string): string {
  // базовые блоки
  s = replaceEnvAll(s, "center", (body) => `<div class="text-center">${body.trim()}</div>`);
  s = replaceEnvAll(s, "quote",  (body) => `<blockquote>${body.trim()}</blockquote>`);
  s = replaceEnvAll(s, "itemize", (body) => {
    const items = body.split(/\\item\b/g).map(t => t.trim()).filter(Boolean).map(t => `<li>${t}</li>`).join("");
    return `<ul>${items}</ul>`;
  });
  s = replaceEnvAll(s, "enumerate", (body, opt) => {
    const attrs: string[] = [];
    if (opt) {
      const start = opt.match(/start\s*=\s*(\d+)/i);
      if (start) attrs.push(`start="${start[1]}"`);
      if (/\(a\)/i.test(opt)) attrs.push(`type="a"`);
      if (/\(A\)/i.test(opt)) attrs.push(`type="A"`);
      if (/\(i\)/i.test(opt)) attrs.push(`type="i"`);
      if (/\(I\)/i.test(opt)) attrs.push(`type="I"`);
    }
    const items = body.split(/\\item\b/g).map(t => t.trim()).filter(Boolean).map(t => `<li>${t}</li>`).join("");
    return `<ol ${attrs.join(" ")}>${items}</ol>`;
  });

  // --- мат. блоки ---
  const mathBlock = (body: string) => `<div class="my-4">${renderMath(body.trim(), true)}</div>`;
  s = replaceEnvAll(s, "equation*", mathBlock);
  s = replaceEnvAll(s, "equation",  mathBlock);
  s = replaceEnvAll(s, "displaymath", mathBlock);
  s = replaceEnvAll(s, "align*",    mathBlock);
  s = replaceEnvAll(s, "align",     mathBlock);
  s = replaceEnvAll(s, "gather*",   mathBlock);
  s = replaceEnvAll(s, "gather",    mathBlock);
  s = replaceEnvAll(s, "multline*", mathBlock);
  s = replaceEnvAll(s, "multline",  mathBlock);

  // framed → бордер‑бокс
  s = replaceEnvAll(s, "framed", (body) => {
    const inner = body.trim();
    return `<div style="border:1px solid #ddd;border-radius:8px;padding:12px;margin:12px 0;background:#fafafa">${inner}</div>`;
  });

  // листинги
  s = replaceEnvAll(s, "lstlisting", (body) => {
    const esc = body.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return `<pre><code>${esc.trim()}</code></pre>`;
  });

  return s;
}

function processSections(s: string): string {
  const h = (level: 2 | 3 | 4) => (title: string) => {
    const id = slugify(title);
    const base =
      level === 2
        ? "text-2xl font-semibold mt-6 mb-3"
        : level === 3
        ? "text-xl font-semibold mt-5 mb-2"
        : "text-lg font-semibold mt-4 mb-2";

    return `<h${level} id="${id}" class="hd hd-${level} ${base}">
      <a class="hd-anchor" href="#${id}" aria-label="Ссылка на раздел"></a>
      ${title}
    </h${level}>`;
  };

  s = replaceCmd1(s, "section*", h(2));
  s = replaceCmd1(s, "subsection*", h(3));
  s = replaceCmd1(s, "subsubsection*", h(4));
  s = replaceCmd1(s, "section", h(2));
  s = replaceCmd1(s, "subsection", h(3));
  s = replaceCmd1(s, "subsubsection", h(4));

  // \paragraph{...} — используем как подзаголовок уровня h4
  s = replaceCmd1(s, "paragraph", h(4));

  return s;
}

function processInline(s: string): string {
  // текстовые команды
  s = replaceCmd1(s, "textbf", (i) => `<strong>${i}</strong>`);
  s = replaceCmd1(s, "textit", (i) => `<em>${i}</em>`);
  s = replaceCmd1(s, "emph", (i) => `<em>${i}</em>`);
  s = replaceCmd1(s, "underline", (i) => `<u>${i}</u>`);
  s = replaceCmd1(s, "texttt", (i) => `<code>${i}</code>`);
  s = replaceCmd1(s, "enquote", (i) => `«${i}»`);

  // ссылки
  s = replaceCmd2(s, "href", (url, txt) => {
    const safe = url.replace(/"/g, "&quot;");
    return `<a href="${safe}" target="_blank" rel="noopener noreferrer">${txt}</a>`;
  });
  s = replaceCmd1(s, "url", (url) => {
    const safe = url.replace(/"/g, "&quot;");
    return `<a href="${safe}" target="_blank" rel="noopener noreferrer">${safe}</a>`;
  });

  // размеры
  const wrap = (cls: string) => (i: string) => `<span class="${cls}">${i}</span>`;
  s = s.replace(/\{\s*\\LARGE\s+([^{}]+)\}/g, (_m, b) => wrap("text-2xl font-semibold")(b));
  s = s.replace(/\{\s*\\Large\s+([^{}]+)\}/g, (_m, b) => wrap("text-xl")(b));
  s = s.replace(/\{\s*\\large\s+([^{}]+)\}/g, (_m, b) => wrap("text-lg")(b));
  s = s.replace(/\{\s*\\small\s+([^{}]+)\}/g, (_m, b) => wrap("text-sm")(b));
  s = s.replace(/^\\small\s+(.+)$/gm, (_m, line) => `<span class="text-sm">${line}</span>`);
  s = s.replace(/^\\Large\s+(.+)$/gm, (_m, line) => `<span class="text-xl">${line}</span>`);
  s = s.replace(/^\\LARGE\s+(.+)$/gm, (_m, line) => `<span class="text-2xl font-semibold">${line}</span>`);

  // горизонтальные линии
  s = s.replace(/\\hrulefill\b/g, `<span style="display:inline-block;width:100%;border-bottom:1px solid currentColor;vertical-align:middle"></span>`);
  s = s.replace(/\\hrule\b/g, `<hr />`);

  // ссылки на метки и сами метки
  s = replaceCmd1(s, "label", () => "");                 // убираем \label{...}
  s = replaceCmd1(s, "eqref", (i) => `(${i})`);          // \eqref{eq:RS} → (eq:RS)
  s = replaceCmd1(s, "ref", (i) => `${i}`);              // \ref{eq:RS} → eq:RS

  // незначимые: \noindent
  s = s.replace(/\\noindent\b/g, "");

  // пробелы/переносы
  s = s.replace(/\\quad/g, `<span style="display:inline-block;width:1em"></span>`);
  s = s.replace(/\\qquad/g, `<span style="display:inline-block;width:2em"></span>`);
  s = s.replace(/\\vspace\{([^}]+)\}/g, (_m, h) => `<div style="height:${h}"></div>`);
  s = s.replace(/\\\\\s*\[(.*?)\]/g, (_m, pad) => `<br /><span style="display:block;height:${pad}"></span>`);
  s = s.replace(/\\\\/g, "<br />");

  return s;
}

function wrapParagraphs(s: string): string {
  const isBlockHtml = (b: string) =>
    /^<(div|ul|ol|li|h[1-6]|blockquote|pre|table|p|span|br|code|hr|math|semantics|mrow|mi|mn|mo|mfrac|msup|msub|msubsup|mover|munder|munderover|mtable|mtr|mtd|annotation)\b/i.test(b);

  // иногда раньше было экранирование и мы видим &lt;div ...&gt; как текст — такие блоки тоже не оборачиваем
  const looksEscapedHtml = (b: string) => /^&lt;[a-zA-Z]/.test(b.trim());

  const blocks = s
    .split(/\n{2,}/)
    .map(b => b.trim())
    .filter(Boolean)
    .map(b => (isBlockHtml(b) || looksEscapedHtml(b))
      ? b
      : `<p>${b.replace(/\n+/g, " ")}</p>`
    );

  return blocks.join("\n");
}

function sanitizeHtml(s: string) {
  return DOMPurify.sanitize(s, {
    ALLOWED_TAGS: [
      "p","br","div","span","em","strong","u","code","pre","a","hr",
      "ul","ol","li","h2","h3","h4","blockquote",
      "math","semantics","mrow","mi","mn","mo","mfrac","msup","msub",
      "msubsup","mover","munder","munderover","mtable","mtr","mtd","annotation"
    ],
    ALLOWED_ATTR: [
      "id","class","href","rel","target","style","aria-hidden","columnalign","rowalign"
    ],
  });
}

// ---------- конвейер ----------
function texToHtml(raw: string): string {
  if (!raw) return "";

  // 0) фронт‑маттер
  let s = stripFrontMatter(raw);

  // 1) восстановить потерянные слэши
  s = restoreLostBackslashes(s);

  // 2) взять содержимое документа
  s = stripPreambleKeepDocumentBody(s);

  // 3) защитим «сырые» <a> из исходника
  s = protectRawAnchors(s);

  // 4) убрать строчные комментарии
  s = s.replace(/(^|[\n\r])\s*%[^\n\r]*/g, "\n");

  // 5) МАТЕМАТИКА В ПЛЕЙСХОЛДЕРЫ
  const { text: withPH, parts } = extractMathPlaceholders(s);

  // 6) блоковые окружения
  let t = processBlockEnvs(withPH);

  // 7) секции/инлайн-форматирование
  t = processSections(t);
  t = processInline(t);

  // 8) сохранить разрешённые теги/плейсхолдеры при экранировании
  const KEEP = "§§KEEP§§";
  t = t
    .replace(/<(\/?)(strong|em|u|code|a|div|ul|ol|li|h[2-6]|blockquote|br|pre|span|hr|math|semantics|mrow|mi|mn|mo|mfrac|msup|msub|msubsup|mover|munder|munderover|mtable|mtr|mtd|annotation)([^>]*)>/gi, `${KEEP}<$1$2$3>`)
    .replace(/§§MATH(\d+)§§/g, `${KEEP}§§MATH$1§§`)
    .replaceAll(KEEP, "");

  // 9) вернуть KaTeX вместо плейсхолдеров
  for (const m of parts) {
    const html = renderMath(m.v, m.display);
    t = t.replaceAll(MATH_TOKEN(m.i), html);
  }

  // 10) параграфы
  let withParas = wrapParagraphs(t);

  // 11) вернуть «сырые» <a> и санитизировать
  withParas = unprotectRawAnchors(withParas);
  return sanitizeHtml(withParas);
}

function slugify(raw: string): string {
  // убираем команды TeX и формулы
  let s = raw
    .replace(/\\[a-zA-Z]+\*?(?:\{[^{}]*\})*/g, " ")
    .replace(/\$[^$]*\$/g, " ")
    .replace(/\\\(|\\\)|\\\[|\\\]/g, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // транслитерация кириллицы
  s = s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  const map: Record<string,string> = {
    а:"a", б:"b", в:"v", г:"g", д:"d", е:"e", ё:"e", ж:"zh", з:"z", и:"i", й:"y",
    к:"k", л:"l", м:"m", н:"n", о:"o", п:"p", р:"r", с:"s", т:"t", у:"u", ф:"f",
    х:"h", ц:"ts", ч:"ch", ш:"sh", щ:"sch", ы:"y", э:"e", ю:"yu", я:"ya",
    ь:"", ъ:""
  };
  s = s.replace(/[А-Яа-яЁё]/g, (ch) => {
    const low = ch.toLowerCase();
    const tr = map[low] ?? "";
    return ch === ch.toUpperCase() ? tr.toUpperCase() : tr;
  });

  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "section";
}

function escapePreservingTags(input: string): string {
  const tagRe = /<(\/?)(strong|em|u|code|a|div|ul|ol|li|h[2-6]|blockquote|br|pre|span|hr|math|semantics|mrow|mi|mn|mo|mfrac|msup|msub|msubsup|mover|munder|munderover|mtable|mtr|mtd|annotation)([^>]*)>/gi;

  const saved: string[] = [];
  const withPlaceholders = input.replace(tagRe, (m) => {
    const id = saved.push(m) - 1;
    return `§§TAG${id}§§`;
  });

  const escaped = withPlaceholders
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return escaped.replace(/§§TAG(\d+)§§/g, (_m, n) => saved[Number(n)]);
}

export default function RenderTexClient({ source }: { source: string }) {
  const html = useMemo(() => texToHtml(source ?? ""), [source]);

  return (
    <article
      className="tex-content max-w-none"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
