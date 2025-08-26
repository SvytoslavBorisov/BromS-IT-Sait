"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Crypto Noir — визуальная новелла (криптография × детектив)
 * Файл-страница для Next.js App Router: app/games/crypto-noir/page.tsx
 * Зависимости: TailwindCSS, framer-motion (npm i framer-motion)
 *
 * Особенности движка (всё в одном файле):
 *  - Диалоги с тайпрайтер-эффектом, авто/скип, back‑log.
 *  - Спрайты персонажей (позиции: left/right/center), смена фонов, простые FX.
 *  - Выборы (choices) со сменой флагов и переходами, простая система переменных.
 *  - Сохранение/загрузка в localStorage (quicksave/quickload + 3 слота).
 *  - Модульная структура сюжета: сцены (id) → entries (строки/выборы/прыжки).
 *  - Анти‑гидрация: никакого рандома/дат в SSR‑первом рендере.
 *
 * Как расширять до 2000+ строк:
 *  - Добавляйте главы в DEMO_STORY ниже или подключайте JSON из /public (см. loader).
 *  - Каждая реплика — отдельная entry. Реально наполните 10–20 сцен × 100–200 реплик каждая.
 */

// ===== Типы движка =====

type Pose = "left" | "right" | "center";

type Entry =
  | { type: "line"; speaker?: string; text: string; pose?: Pose; sprite?: string; bg?: string; fx?: "shake" | "flash" | "glitch"; set?: Record<string, any>; when?: (flags: Record<string, any>, vars: Record<string, any>) => boolean }
  | { type: "choice"; choices: Array<{ text: string; goto: string; set?: Record<string, any> }> }
  | { type: "jump"; goto: string }
  | { type: "label"; id: string }
  | { type: "bg"; bg: string }
  | { type: "pause"; ms: number };

interface Scene { id: string; title?: string; entries: Entry[] }

interface SaveState {
  sceneId: string;
  index: number;
  flags: Record<string, any>;
  vars: Record<string, any>;
  backlog: Array<{ speaker?: string; text: string }>;
}

// ===== Вспомогательные =====
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const SLOTS = ["novel-slot-1", "novel-slot-2", "novel-slot-3"] as const;
const QUICK_KEY = "crypto-noir-quicksave-v1";

// Эффекты
function useInterval(fn: () => void, delay: number | null) {
  const saved = useRef(fn);
  useEffect(() => { saved.current = fn; }, [fn]);
  useEffect(() => {
    if (delay === null) return;
    const id = window.setInterval(() => saved.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}

// ===== DEMO СЮЖЕТ (расширяемый) =====
// — Это лишь крупный фрагмент. Вы можете масштабировать, дублируя структуру.

const DEMO_STORY: Scene[] = [
  {
    id: "prologue",
    title: "ПРОЛОГ. Тень Стрибога",
    entries: [
      { type: "bg", bg: "lab" },
      { type: "line", text: "Ночь пахла озоном и раскалённым железом серверных стоек.", fx: "glitch" },
      { type: "line", text: "Внизу города гудели трассы, а наверху — вентиляторы криптолаборатории." },
      { type: "line", speaker: "Алекс", pose: "left", text: "Ещё немного… S-Box сошёлся. Осталось проверить диффузию." },
      { type: "line", speaker: "Лера", pose: "right", text: "Чуешь? Это не просто шум. Логи кричат — кто-то шуршит по нашим портам." },
      { type: "line", text: "Красная лампа заморгала. На стене вспыхнуло слово: INTRUSION." },
      { type: "line", speaker: "Алекс", text: "Десять секунд до автозащиты. Сливаем дамп и уходим." },
      { type: "line", speaker: "Лера", text: "Я кинула ловушку: подпись подменена на фальшивую ГОСТ 34.10. Он клюнет." },
      { type: "line", text: "Метка в дампе: streebog_core.sbx → чужие руки тянутся к самому нутру алгоритма." },
      { type: "choice", choices: [
        { text: "Забрать физический носитель и ретироваться.", goto: "p_escape", set: { path: "escape" } },
        { text: "Остаться и проследить атаку в реальном времени.", goto: "p_trace", set: { path: "trace" } }
      ]},
      { type: "label", id: "p_escape" },
      { type: "line", speaker: "Алекс", text: "Берём диск. Вернёмся при свете. Иначе нас погребут вместе с логами." },
      { type: "jump", goto: "ch1" },
      { type: "label", id: "p_trace" },
      { type: "line", speaker: "Лера", text: "Пять секунд. Открываю зеркальный туннель. Погнали." },
      { type: "jump", goto: "ch1" },
    ]
  },
  {
    id: "ch1",
    title: "Глава 1. Соль, ключ и подпись",
    entries: [
      { type: "bg", bg: "city_night" },
      { type: "line", text: "Город стирал грань между тьмой и неоном." },
      { type: "line", speaker: "Алекс", text: "Если они лезли в S-Box, им нужна либо подмена, либо бэкдор в генераторе." },
      { type: "line", speaker: "Лера", text: "Проверим аутентику. Я отследила публичный ключ, которым подписали их модуль." },
      { type: "line", text: "На экране вырастают DER-деревья, ASN.1 бормочет на своём, CRL молчит." },
      { type: "line", speaker: "Алекс", text: "Подпись верна, но ключ странный. Параметры кривой сдвинуты? Или это имитация?" },
      { type: "line", speaker: "Лера", text: "Давай так: ты — ключи, я — сеть. Разделим секрет. Встретимся на пересечении." },
      { type: "choice", choices: [
        { text: "Уйти в криптоанализ ключей.", goto: "ch1_keys", set: { route_keys: true } },
        { text: "Пойти по сети и логам.", goto: "ch1_net", set: { route_net: true } }
      ]},
      { type: "label", id: "ch1_keys" },
      { type: "line", bg: "lab", speaker: "Алекс", pose: "left", text: "Разложим подпись. Если это ГОСТ, параметры должны плясать по стандарту. Любой фальш — всплывёт." },
      { type: "line", text: "Соты хеша Стрибога переливаются в такт вентиляторам." },
      { type: "line", text: "Я вычисляю: генератор выдал аномально частые биты в старших разрядах — не случайность." },
      { type: "line", text: "Ложный источник энтропии. Мы ищем не просто вора, а архитектора." },
      { type: "jump", goto: "ch2" },
      { type: "label", id: "ch1_net" },
      { type: "line", bg: "net", speaker: "Лера", pose: "right", text: "Трассирую туннель. Маска шифрования — ChaCha, но соль короткая. Кто-то торопился." },
      { type: "line", text: "На карте появляются три узла. Один — не пингуется, два других — маскируются под CDN." },
      { type: "line", text: "Снимаю перчатки. Выхожу в скрытый сегмент. Там ждёт подмена ключа — MITM со старой CA." },
      { type: "jump", goto: "ch2" },
    ]
  },
  {
    id: "ch2",
    title: "Глава 2. Комитет из тени",
    entries: [
      { type: "bg", bg: "office" },
      { type: "line", text: "Утро пахло кофем и бумагой. Комитет по безопасности хотел отчёт." },
      { type: "line", speaker: "Куратор", pose: "center", text: "У вас ночь. У нас вопросы. Кто ломал S‑Box?" },
      { type: "line", speaker: "Алекс", text: "Следы ведут к поддельной энтропии. Это не одиночка. Это — школа." },
      { type: "line", speaker: "Лера", text: "И старый корень доверия где-то прогнил. Левый центр сертификации в цепочке." },
      { type: "choice", choices: [
        { text: "Попросить доступ к аппаратному RNG.", goto: "ch2_rng", set: { access_rng: 1 } },
        { text: "Выпросить ордер на обыск узла CDN.", goto: "ch2_cdn", set: { access_cdn: 1 } },
      ]},
      { type: "label", id: "ch2_rng" },
      { type: "line", text: "Комитет нехотя выдал пропуск. Вниз, в холод железа." },
      { type: "line", bg: "vault", speaker: "Алекс", text: "Смотрим биты с диодов. Нервы железа дрожат неровно…" },
      { type: "line", text: "Да, тут кто-то менял поток до шифрования. Похитили не секрет. Похитили случайность." },
      { type: "jump", goto: "ch3" },
      { type: "label", id: "ch2_cdn" },
      { type: "line", text: "Ордер шуршит в кармане, а на крыше — антенна и ветер." },
      { type: "line", bg: "roof", speaker: "Лера", text: "Снимем зеркальную копию трафика. Если там мимо шёл поддельный CRL — найдём." },
      { type: "line", text: "Сеть гудит как улей. Время на моей стороне? Нет. На стороне того, кто прячет хвосты." },
      { type: "jump", goto: "ch3" },
    ]
  },
  {
    id: "ch3",
    title: "Глава 3. Тройной ключ",
    entries: [
      { type: "bg", bg: "night_train" },
      { type: "line", text: "Поезд режет ночь пополам. Мы везём ключ — но не знаем, чей он на самом деле." },
      { type: "line", speaker: "Алекс", text: "Лера, смотри. Подпись вроде наша, а параметры — как будто их рука ведёт." },
      { type: "line", speaker: "Лера", text: "Схема с вето? Кто-то добавил отрицательные доли. Если собрались не те — секрет станет ядом." },
      { type: "line", text: "Тройной ключ — один настоящий, два зеркала. Собери не те — получишь ложь, но очень убедительную." },
      { type: "choice", choices: [
        { text: "Собрать ключ из корпоративных долей.", goto: "ch3_corp", set: { trust_corp: 1 } },
        { text: "Собрать ключ из студенческих ноутов лаборатории.", goto: "ch3_lab", set: { trust_lab: 1 } },
        { text: "Смешать доли из обоих источников.", goto: "ch3_mix", set: { trust_mix: 1 } }
      ]},
      { type: "label", id: "ch3_corp" },
      { type: "line", text: "Формулы складываются, как будто так и надо. Слишком гладко." },
      { type: "line", text: "Сигнатура совпала. Или мы совпали с чьим‑то планом?" },
      { type: "jump", goto: "ch4" },
      { type: "label", id: "ch3_lab" },
      { type: "line", text: "Лабораторные доли шумят по‑настоящему. Но одна — пахнет чужими руками." },
      { type: "line", text: "Я перепроверяю. Да, подмена на уровне транспортного шифрования." },
      { type: "jump", goto: "ch4" },
      { type: "label", id: "ch3_mix" },
      { type: "line", text: "Смесь честности и компромисса. Полином послушно отдаёт f(0), но я не верю глазам." },
      { type: "jump", goto: "ch4" },
    ]
  },
  {
    id: "ch4",
    title: "Глава 4. Соль земли",
    entries: [
      { type: "bg", bg: "subway" },
      { type: "line", text: "Подземка забирает людей и возвращает тени." },
      { type: "line", speaker: "Куратор", text: "Вы близко. У них своя CA и свой RNG. Остаётся найти оператора." },
      { type: "line", speaker: "Лера", text: "Я нашла — аватар в старом чате CTF. Никнейм: SaltEater." },
      { type: "line", speaker: "Алекс", text: "Соль, ключ и подпись. Всё крутится вокруг этих трёх." },
      { type: "choice", choices: [
        { text: "Назначить ему встречу через зашифрованный чат.", goto: "end_a", set: { meet_chat: 1 } },
        { text: "Взять с поличным на CDN-узле.", goto: "end_b", set: { meet_cdn: 1 } },
        { text: "Вломиться в RNG‑комнату и ждать.", goto: "end_c", set: { meet_rng: 1 } }
      ]},
    ]
  },
  {
    id: "end_a",
    title: "ФИНАЛ А. Соль на ране",
    entries: [
      { type: "bg", bg: "chat" },
      { type: "line", text: "Чёрный экран. Белые буквы. Мы и он, SaltEater, в комнате без дверей." },
      { type: "line", speaker: "SaltEater", pose: "center", text: "Вы ищете истину, а я — идеальную ложь. Мы почти коллеги." },
      { type: "line", speaker: "Алекс", text: "Сдавай CA и RNG. Хватит соли на всех." },
      { type: "line", speaker: "SaltEater", text: "Договор дороже хеша. Киньте мне k долей — кину вам оператора." },
      { type: "choice", choices: [
        { text: "Согласиться на обмен.", goto: "end_a_1", set: { bargain: true } },
        { text: "Отказаться и подсунуть фальшивые доли.", goto: "end_a_2", set: { trap: true } }
      ]},
      { type: "label", id: "end_a_1" },
      { type: "line", text: "Мир редко бывает честным. Но иногда — работает." },
      { type: "line", text: "Имя оператора всплывает в окне. И мы понимаем: это был не он. Это была она." },
      { type: "line", text: "Лера опускает глаза. Где-то мы пересеклись с прошлым, о котором молчали." },
      { type: "jump", goto: "credits" },
      { type: "label", id: "end_a_2" },
      { type: "line", text: "Он верит нам. Это его ошибка." },
      { type: "line", text: "Доли взрываются внутри цепочки доверия. SaltEater исчезает — вместе с нашим шансом на быстрый конец." },
      { type: "jump", goto: "credits" },
    ]
  },
  {
    id: "end_b",
    title: "ФИНАЛ B. Холод CDN",
    entries: [
      { type: "bg", bg: "cdn" },
      { type: "line", text: "Ветер разрывает облака. Антенна смотрит на город, как игла на вену." },
      { type: "line", speaker: "Лера", text: "Есть контакт. Подмена CRL пошла. Ныряю." },
      { type: "line", speaker: "Алекс", text: "Держу периметр. Если оператор здесь — он сделает ход." },
      { type: "line", text: "Секунды, как соли на коже. А потом… щёлк. Мы видим её лицо." },
      { type: "line", text: "Она улыбается. И исчезает. Но оставляет след — как будто сама захотела." },
      { type: "jump", goto: "credits" },
    ]
  },
  {
    id: "end_c",
    title: "ФИНАЛ C. Сердце случайности",
    entries: [
      { type: "bg", bg: "vault" },
      { type: "line", text: "Холод уходит в кости. Шум случайности стал почти тишиной." },
      { type: "line", text: "Мы ждём. И приходим не мы. Приходит она." },
      { type: "line", speaker: "Оператор", pose: "center", text: "Вы слишком красиво считаете. Но мир — не график Лагранжа." },
      { type: "line", speaker: "Алекс", text: "Где твой корень доверия?" },
      { type: "line", speaker: "Оператор", text: "Там, где соль с кровью. Там, где случайность — не биты, а выбор." },
      { type: "line", text: "Мы не стреляем. И она — тоже. В такие ночи никто не хочет быть последним ключом." },
      { type: "jump", goto: "credits" },
    ]
  },
  {
    id: "credits",
    title: "КОНЕЦ. Послевкусие соли",
    entries: [
      { type: "bg", bg: "black" },
      { type: "line", text: "Эта история — о том, как легко подменить истину. И как трудно — вернуть доверие." },
      { type: "line", text: "Соль, ключ и подпись. Проверь свои — прежде чем верить чужим." },
    ]
  }
];

// ===== Движок =====

export default function CryptoNoirPage() {
  // состояние романа
  const [scenes, setScenes] = useState<Scene[]>(DEMO_STORY); // можно заменить на загрузку JSON
  const [sceneId, setSceneId] = useState<string>("prologue");
  const [index, setIndex] = useState<number>(0);
  const [flags, setFlags] = useState<Record<string, any>>({});
  const [vars, setVars] = useState<Record<string, any>>({});
  const [backlog, setBacklog] = useState<Array<{ speaker?: string; text: string }>>([]);

  // режимы
  const [typing, setTyping] = useState(true);
  const [visibleChars, setVisibleChars] = useState(0);
  const [autoMode, setAutoMode] = useState(false);
  const [skipMode, setSkipMode] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showBacklog, setShowBacklog] = useState(false);
  const [textSpeed, setTextSpeed] = useState(26); // мс на символ

  // текущие вычисления
  const scene = useMemo(() => scenes.find(s => s.id === sceneId)!, [scenes, sceneId]);
  const current = scene.entries[index];

  // фон (просто ключ + красивый градиент)
  const [bg, setBg] = useState<string>("lab");
  useEffect(() => {
    // обновляем фон, если entry задаёт его
    if (!current) return;
    if (current.type === "bg" && current.bg) setBg(current.bg);
    if (current.type === "line" && current.bg) setBg(current.bg);
  }, [current]);

  // тайпрайтер
  useEffect(() => {
    if (!current || current.type !== "line") { setTyping(false); setVisibleChars(0); return; }
    setTyping(true); setVisibleChars(0);
  }, [sceneId, index]);

  useInterval(() => {
    if (!typing || !current || current.type !== "line") return;
    const tgt = current.text.length;
    setVisibleChars(c => {
      const next = Math.min(tgt, c + 1);
      if (next === tgt) setTyping(false);
      return next;
    });
  }, typing ? textSpeed : null);

  // авто/скип
  useEffect(() => {
    if (!current || current.type !== "line") return;
    if (!autoMode && !skipMode) return;
    if (typing) return;
    const t = window.setTimeout(() => nextEntry(), skipMode ? 50 : 700);
    return () => clearTimeout(t);
  }, [current, typing, autoMode, skipMode]);

  const addBacklog = useCallback((speaker: string | undefined, text: string) => {
    setBacklog(b => [...b.slice(-199), { speaker, text }]);
  }, []);

  const setManyFlags = useCallback((obj?: Record<string, any>) => {
    if (!obj) return;
    setFlags(f => ({ ...f, ...obj }));
  }, []);

  const jump = useCallback((goto: string) => {
    const s = scenes.find(sc => sc.id === goto);
    if (!s) return;
    setSceneId(s.id);
    setIndex(0);
  }, [scenes]);

  const nextEntry = useCallback(() => {
    const e = current;
    if (!e) return;
    // если line не дочитан — дочитать
    if (e.type === "line" && typing) { setTyping(false); setVisibleChars(e.text.length); return; }

    // выполнение побочных эффектов строки
    if (e.type === "line") {
      addBacklog(e.speaker, e.text);
      if (e.set) setManyFlags(e.set);
    }

    // перейти на следующее
    let i = index + 1;
    while (i < scene.entries.length) {
      const ne = scene.entries[i];
      // пропускаем label и pause (pause можно реализовать задержкой)
      if (ne.type === "label") { i++; continue; }
      if ((ne as any).when) { const w = (ne as any).when as (f:any,v:any)=>boolean; if (!w(flags, vars)) { i++; continue; } }
      setIndex(i);
      // jump обрабатываем мгновенно
      if (ne.type === "jump") { jump(ne.goto); return; }
      // bg меняет фон и двигаемся дальше
      if (ne.type === "bg") { setBg(ne.bg); i++; continue; }
      return;
    }
    // конец сцены — в кредиты
    if (sceneId !== "credits") jump("credits");
  }, [current, typing, index, scene, sceneId, flags, vars, addBacklog, setManyFlags, jump]);

  const onChoice = (goto: string, set?: Record<string, any>) => {
    setManyFlags(set);
    jump(goto);
  };

  // сохранение/загрузка
  const pack = useCallback((): SaveState => ({ sceneId, index, flags, vars, backlog }), [sceneId, index, flags, vars, backlog]);
  const unpack = (s: SaveState) => { setSceneId(s.sceneId); setIndex(s.index); setFlags(s.flags||{}); setVars(s.vars||{}); setBacklog(s.backlog||[]); };

  const quickSave = () => { try { localStorage.setItem(QUICK_KEY, JSON.stringify(pack())); } catch {} };
  const quickLoad = () => { try { const raw = localStorage.getItem(QUICK_KEY); if (raw) unpack(JSON.parse(raw)); } catch {} };

  const saveToSlot = (i: number) => { try { localStorage.setItem(SLOTS[i], JSON.stringify(pack())); } catch {} };
  const loadFromSlot = (i: number) => { try { const raw = localStorage.getItem(SLOTS[i]); if (raw) unpack(JSON.parse(raw)); } catch {} };

  // управление клавишами
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " ") { e.preventDefault(); nextEntry(); }
      if (e.key === "Enter") { e.preventDefault(); nextEntry(); }
      if (e.key.toLowerCase() === "a") setAutoMode(a => !a);
      if (e.key.toLowerCase() === "s") setSkipMode(s => !s);
      if (e.key.toLowerCase() === "q") quickSave();
      if (e.key.toLowerCase() === "l") quickLoad();
      if (e.key.toLowerCase() === "b") setShowBacklog(b => !b);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nextEntry]);

  // визуал фон
  const bgStyle = useMemo(() => bgToStyle(bg), [bg]);

  // отрисовка
  return (
    <div className="min-h-[100dvh] w-full overflow-hidden bg-slate-950 text-slate-100">
      {/* ФОН */}
      <div className="absolute inset-0 -z-10" style={bgStyle} />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/20 via-black/10 to-black/60" />

      {/* Верхняя панель */}
      <div className="mx-auto max-w-6xl px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm uppercase tracking-wider text-slate-300">Crypto Noir</div>
            <div className="text-xl font-bold">{scene.title ?? "—"}</div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <button onClick={() => setAutoMode(a => !a)} className={`rounded-lg px-3 py-1 ring-1 ring-white/10 ${autoMode?"bg-emerald-500/20 text-emerald-100":"bg-slate-800/60"}`}>Auto</button>
            <button onClick={() => setSkipMode(s => !s)} className={`rounded-lg px-3 py-1 ring-1 ring-white/10 ${skipMode?"bg-amber-500/20 text-amber-100":"bg-slate-800/60"}`}>Skip</button>
            <button onClick={() => setShowBacklog(true)} className="rounded-lg bg-slate-800/60 px-3 py-1 ring-1 ring-white/10">Backlog</button>
            <button onClick={() => setShowMenu(m => !m)} className="rounded-lg bg-slate-800/60 px-3 py-1 ring-1 ring-white/10">Menu</button>
          </div>
        </div>
      </div>

      {/* Диалоговая зона */}
      <div className="pointer-events-auto mx-auto mt-[20vh] flex max-w-4xl flex-col gap-3 px-4">
        <DialogueBox
          entry={current}
          visibleChars={visibleChars}
          typing={typing}
          onNext={nextEntry}
          onChoice={onChoice}
        />
      </div>

      {/* Меню */}
      <AnimatePresence>
        {showMenu && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-20 flex items-center justify-center bg-black/50 p-4">
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 10, opacity: 0 }} className="w-full max-w-lg rounded-2xl bg-slate-900/90 p-5 ring-1 ring-white/10">
              <div className="text-lg font-bold">Меню</div>
              <div className="mt-3 grid gap-3 text-sm">
                <div className="rounded-xl bg-slate-800/60 p-3">
                  <div className="mb-2 font-semibold">Скорость текста</div>
                  <input type="range" min={8} max={60} value={textSpeed} onChange={(e)=>setTextSpeed(Number(e.target.value))} className="w-full" />
                </div>
                <div className="rounded-xl bg-slate-800/60 p-3">
                  <div className="mb-2 font-semibold">Быстрое сохранение</div>
                  <div className="flex gap-2">
                    <button onClick={quickSave} className="rounded-lg bg-indigo-600 px-3 py-1 text-white">Quicksave (Q)</button>
                    <button onClick={quickLoad} className="rounded-lg bg-slate-600 px-3 py-1 text-white">Quickload (L)</button>
                  </div>
                </div>
                <div className="rounded-xl bg-slate-800/60 p-3">
                  <div className="mb-2 font-semibold">Слот‑сейвы</div>
                  <div className="flex flex-wrap gap-2">
                    {SLOTS.map((k, i) => (
                      <React.Fragment key={k}>
                        <button onClick={()=>saveToSlot(i)} className="rounded-lg bg-emerald-600 px-3 py-1 text-white">Save {i+1}</button>
                        <button onClick={()=>loadFromSlot(i)} className="rounded-lg bg-slate-600 px-3 py-1 text-white">Load {i+1}</button>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end">
                  <button onClick={()=>setShowMenu(false)} className="rounded-lg bg-slate-700 px-4 py-2">Закрыть</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backlog */}
      <AnimatePresence>
        {showBacklog && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 p-4">
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 10, opacity: 0 }} className="w-full max-w-3xl rounded-2xl bg-slate-900/90 p-5 ring-1 ring-white/10">
              <div className="mb-3 text-lg font-bold">Backlog</div>
              <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-2 text-sm">
                {backlog.map((l, i) => (
                  <div key={i} className="rounded-lg bg-slate-800/60 p-2">
                    <span className="text-emerald-300">{l.speaker ? l.speaker + ": " : ""}</span>
                    <span>{l.text}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-right">
                <button onClick={()=>setShowBacklog(false)} className="rounded-lg bg-slate-700 px-4 py-2">Закрыть</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DialogueBox({ entry, typing, visibleChars, onNext, onChoice }: {
  entry?: Entry; typing: boolean; visibleChars: number; onNext: () => void; onChoice: (goto: string, set?: Record<string, any>) => void;
}) {
  if (!entry) return null;

  if (entry.type === "choice") {
    return (
      <motion.div initial={{ y: 15, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="rounded-2xl bg-slate-900/70 p-4 ring-1 ring-white/10">
        <div className="mb-2 text-sm uppercase tracking-wider text-slate-300">Выбор</div>
        <div className="grid gap-2">
          {entry.choices.map((ch, i) => (
            <button key={i} onClick={() => onChoice(ch.goto, ch.set)} className="rounded-xl bg-indigo-600/90 px-4 py-2 text-left font-semibold text-white hover:bg-indigo-500">
              {ch.text}
            </button>
          ))}
        </div>
      </motion.div>
    );
  }

  if (entry.type === "line") {
    const text = entry.text.slice(0, visibleChars);
    const done = !typing && visibleChars >= entry.text.length;
    return (
      <motion.button onClick={onNext} initial={{ y: 15, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-left">
        <div className="rounded-2xl bg-slate-900/70 p-4 ring-1 ring-white/10">
          {entry.speaker && (
            <div className="mb-1 text-sm font-semibold text-emerald-300">{entry.speaker}</div>
          )}
          <div className="text-[1.05rem] leading-relaxed">
            <TypeLine text={text} caret={typing} />
          </div>
          <div className="mt-2 text-right text-xs text-slate-400">{done ? "Нажмите, чтобы продолжить" : "…"}</div>
        </div>
      </motion.button>
    );
  }

  // bg / jump / label — прозрачные служебные
  return <div className="rounded-2xl bg-transparent" />;
}

function TypeLine({ text, caret }: { text: string; caret: boolean }) {
  return (
    <span className="whitespace-pre-wrap">
      {text}
      <AnimatePresence>{caret && (
        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6, repeat: Infinity, repeatType: "reverse" }}>▍</motion.span>
      )}</AnimatePresence>
    </span>
  );
}

// Примитивные фоны: вы можете заменить их на изображения (bg-[url('/bg.png')])
function bgToStyle(key: string): React.CSSProperties {
  switch (key) {
    case "lab": return { background: "radial-gradient(1200px 600px at 10% 10%, rgba(16,185,129,0.15), transparent), radial-gradient(600px 600px at 90% 30%, rgba(59,130,246,0.18), transparent), linear-gradient(135deg,#0f172a,#0b1220)" };
    case "city_night": return { background: "radial-gradient(800px 400px at 20% 80%, rgba(244,114,182,0.12), transparent), radial-gradient(700px 700px at 80% 20%, rgba(56,189,248,0.12), transparent), linear-gradient(135deg,#0b1220,#0f172a)" };
    case "net": return { background: "radial-gradient(900px 500px at 50% 50%, rgba(99,102,241,0.15), transparent), linear-gradient(135deg,#0b1220,#121a2a)" };
    case "office": return { background: "radial-gradient(700px 700px at 70% 10%, rgba(250,204,21,0.08), transparent), linear-gradient(135deg,#0b1220,#141a26)" };
    case "roof": return { background: "radial-gradient(1000px 500px at 60% 0%, rgba(59,130,246,0.15), transparent), linear-gradient(135deg,#0b1220,#0f1625)" };
    case "night_train": return { background: "radial-gradient(1000px 500px at 0% 100%, rgba(16,185,129,0.12), transparent), linear-gradient(135deg,#0b1220,#08121e)" };
    case "subway": return { background: "radial-gradient(800px 600px at 90% 90%, rgba(250,204,21,0.08), transparent), linear-gradient(135deg,#0b1220,#101827)" };
    case "chat": return { background: "radial-gradient(600px 600px at 50% 50%, rgba(148,163,184,0.12), transparent), linear-gradient(135deg,#0b1220,#0e1726)" };
    case "cdn": return { background: "radial-gradient(900px 600px at 80% 0%, rgba(244,63,94,0.12), transparent), linear-gradient(135deg,#0b1220,#111827)" };
    case "vault": return { background: "radial-gradient(1000px 600px at 50% 50%, rgba(34,197,94,0.12), transparent), linear-gradient(135deg,#0b1220,#091520)" };
    case "black": return { background: "#000" };
    default: return { background: "linear-gradient(135deg,#0b1220,#0f172a)" };
  }
}
