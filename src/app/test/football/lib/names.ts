// src/app/test/football/lib/names.ts

export type NameMode = "display" | "short"; // display: Kylian Mbappé; short: K. Mbappé

// Частицы/предлоги, идущие с фамилией
const SURNAME_PARTICLES = new Set<string>([
  "de", "da", "do", "dos", "das",
  "del", "de-la", "de", "la", "le", "du",
  "di", "della",
  "van", "von",
  "bin", "ibn", "al", "el"
]);

// Бразильские постфиксы, которые редко используют публично
const BRAZIL_SUFFIX = new Set<string>(["júnior", "junior", "filho", "neto"]);

type Pref = { display: string; short?: string };

// Небольшой словарь общеупотребимых форм (можно расширять)
const PREFERRED_MAP: Record<string, Pref> = {
  "kylian mbappe lottin": { display: "Kylian Mbappé", short: "K. Mbappé" },
  "kylian mbappé lottin": { display: "Kylian Mbappé", short: "K. Mbappé" },
  "lionel andres messi cuccittini": { display: "Lionel Messi", short: "L. Messi" },
  "lionel andrés messi cuccittini": { display: "Lionel Messi", short: "L. Messi" },
  "cristiano ronaldo dos santos aveiro": { display: "Cristiano Ronaldo", short: "C. Ronaldo" },
  "neymar da silva santos junior": { display: "Neymar", short: "Neymar" },
  "neymar da silva santos júnior": { display: "Neymar", short: "Neymar" },
  "angel fabian di maria hernandez": { display: "Ángel Di María", short: "Á. Di María" },
  "ángel fabián di maría hérnandez": { display: "Ángel Di María", short: "Á. Di María" },
  "kevin de bruyne": { display: "Kevin De Bruyne", short: "K. De Bruyne" },
};

function normalizeKey(s: string): string {
  // нормализуем пробелы + убираем диакритику только для ключа словаря
  return s
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Возвращает «красивое» футбольное имя.
 *  - mode="display": привычная форма (Kylian Mbappé, Lionel Messi, Ángel Di María)
 *  - mode="short": компактно (K. Mbappé, L. Messi, Á. Di María)
 */
export function prettyPlayerName(full?: string, mode: NameMode = "display"): string {
  if (!full) return "Игрок";

  const raw = full.trim().replace(/\s+/g, " ");
  const key = normalizeKey(raw);
  const pref = PREFERRED_MAP[key];
  if (pref) return mode === "short" ? (pref.short ?? pref.display) : pref.display;

  const parts = raw.split(" ");
  const partsLower = parts.map(p => p.toLowerCase());

  // Одно слово (Pelé, Neymar, Hulk)
  if (parts.length === 1) return parts[0];

  // Бразильские постфиксы — часто публично используется только данное имя
  if (partsLower.some(p => BRAZIL_SUFFIX.has(p))) {
    const given = parts[0];
    return mode === "short" ? given : given;
  }

  // Собираем «основную» фамилию
  function buildPrimarySurname(): string {
    const n = parts.length;

    // Обработка составных фамилий с частицей: Di María, De Bruyne, Van Dijk, De la Fuente
    for (let i = Math.max(0, n - 3); i <= Math.max(0, n - 2); i++) {
      const w = partsLower[i];
      if (SURNAME_PARTICLES.has(w)) {
        const next = i + 1 < n ? parts[i + 1] : "";
        if (!next) break;

        // «de la», «de los», «de las»
        if (w === "de" && i + 2 < n) {
          const w2 = partsLower[i + 1];
          if (w2 === "la" || w2 === "los" || w2 === "las") {
            const w3 = parts[i + 2];
            if (w3) return `${parts[i]} ${parts[i + 1]} ${w3}`;
          }
        }
        return `${parts[i]} ${next}`;
      }
    }

    // Испанско-португальская схема: берём предпоследнее (отцовскую) фамилию
    return parts[n - 2];
  }

  const given = parts[0];
  const surname = buildPrimarySurname();

  if (mode === "display") {
    return `${given} ${surname}`;
  }

  // mode = "short"
  const initial = given.includes("-")
    ? given.split("-").map(g => g[0]).join("-")
    : given[0];
  return `${initial}. ${surname}`;
}

/** Совместимость с твоим прежним API: инициал + фамилия */
export function shortName(full?: string): string {
  return prettyPlayerName(full, "short");
}
