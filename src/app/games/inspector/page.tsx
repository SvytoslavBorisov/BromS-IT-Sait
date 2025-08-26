"use client";

import React, { useEffect, useRef, useState } from "react";

/**
 * SECURITY INSPECTOR — /inspector
 * 
 * Мини‑симулятор в духе Papers, Please:
 *  • Очередь посетителей с паспортом и разрешением на въезд
 *  • Правила меняются по дням (1→3) и влияют на принятие решения
 *  • Перетаскиваемые документы на столе (паспорт/разрешение)
 *  • Штампы APPROVE (A) / DENY (D) c анимацией, кнопки кликабельны
 *  • Система жалованья, штрафов и предупреждений; завершение смены
 *  • Красивый неон‑деск, тени, понятный HUD и книга правил справа
 * 
 * Установка: создайте файл src/app/inspector/page.tsx и перейдите на /inspector
 */

// ---------------- Types ----------------

type Vec2 = { x: number; y: number };

interface Passport {
  name: string;
  country: CountryCode;
  id: string; // ABC-#####
  expires: number; // игровой «день», до какого дня действителен паспорт
  sex: "M" | "F";
  birth: string; // YYYY-MM-DD (декор)
  photoHue: number; // для цветного «фото»
}

interface Permit {
  name: string;
  purpose: Purpose;
  expires: number; // день
}

interface Applicant {
  passport: Passport;
  permit?: Permit; // у иностранцев может быть обязателен по правилам
  isCitizen: boolean; // гражданин Nordland
  banned?: boolean; // из запрещённой страны
}

type CountryCode = "Nordland" | "Vesria" | "Kolechia" | "Redland";

type Purpose = "Visit" | "Work" | "Transit";

interface DocRect {
  kind: "passport" | "permit";
  x: number; y: number; w: number; h: number;
  dragging?: boolean; dx?: number; dy?: number;
}

interface Rules {
  day: number; // 1..3
  text: string[]; // подсказки
  allowCitizensOnly: boolean; // День 1
  foreignersNeedPermit: boolean; // День 2+
  denyExpiredPassport: boolean; // День 2+
  mustMatchName: boolean; // День 3
  banCountry?: CountryCode; // День 3 — Redland
}

// ---------------- Constants ----------------

const WORLD_W = 1280;
const WORLD_H = 720;

const DESK = { x: 0, y: 140, w: WORLD_W, h: WORLD_H - 140 };
const PASSPORT_INIT: DocRect = { kind: "passport", x: 180, y: 260, w: 320, h: 200 };
const PERMIT_INIT: DocRect = { kind: "permit", x: 560, y: 240, w: 300, h: 180 };

const MAX_WARNINGS = 3;

// День завершается после N посетителей
const ENTRANTS_PER_DAY = 8;

// Оплата/штрафы
const PAY_OK = 5;
const FINE_BAD = -10;

// ---------------- Utilities ----------------

function clamp(v: number, a: number, b: number) { return Math.max(a, Math.min(b, v)); }
function mix(a: number, b: number, t: number) { return a + (b - a) * t; }
function rand(a: number, b: number) { return a + Math.random() * (b - a); }
function choice<T>(arr: T[]) { return arr[Math.floor(Math.random() * arr.length)]; }
function pad(n: number) { return n < 10 ? "0" + n : String(n); }
function idGen() { return `${String.fromCharCode(65 + Math.floor(Math.random()*26))}${String.fromCharCode(65 + Math.floor(Math.random()*26))}${String.fromCharCode(65 + Math.floor(Math.random()*26))}-${Math.floor(10000 + Math.random()*90000)}`; }

const maleNames = ["Anton", "Boris", "Dmitry", "Egor", "Felix", "Gleb", "Ivan", "Kirill", "Leo", "Maks" ];
const femaleNames = ["Alina", "Bella", "Daria", "Elena", "Eva", "Inna", "Lena", "Nora", "Olga", "Vera" ];
const countries: CountryCode[] = ["Nordland", "Vesria", "Kolechia", "Redland"];
const purposes: Purpose[] = ["Visit", "Work", "Transit"];

function makePassport(today: number): Passport {
  const sex = Math.random() < 0.5 ? "M" : "F";
  const name = sex === "M" ? choice(maleNames) : choice(femaleNames);
  const country = choice(countries);
  const expires = today + Math.floor(rand(-2, 6)); // может быть просрочен
  const birth = `${1980 + Math.floor(Math.random()*20)}-${pad(1+Math.floor(Math.random()*12))}-${pad(1+Math.floor(Math.random()*28))}`;
  return {
    name,
    country,
    id: idGen(),
    expires,
    sex,
    birth,
    photoHue: Math.floor(rand(0, 360)),
  };
}

function makePermit(pass: Passport, today: number): Permit {
  return {
    name: Math.random() < 0.9 ? pass.name : (pass.name + "*") /* иногда ошибка имени */, 
    purpose: choice(purposes),
    expires: today + Math.floor(rand(-2, 6)), // тоже может быть просрочен
  };
}

function makeApplicant(today: number): Applicant {
  const passport = makePassport(today);
  const isCitizen = passport.country === "Nordland";
  const permit = !isCitizen || Math.random() < 0.2 ? makePermit(passport, today) : undefined; // и у граждан иногда попадается разрешение
  return {
    passport,
    permit,
    isCitizen,
    banned: passport.country === "Redland",
  };
}

function rulesForDay(day: number): Rules {
  if (day <= 1) return {
    day: 1,
    text: [
      "День 1: Въезд только для граждан Nordland.",
      "Иностранцев — ОТКАЗ.",
    ],
    allowCitizensOnly: true,
    foreignersNeedPermit: false,
    denyExpiredPassport: false,
    mustMatchName: false,
  };
  if (day === 2) return {
    day: 2,
    text: [
      "День 2: Иностранцам требуется разрешение на въезд.",
      "Просроченные паспорта — ОТКАЗ.",
    ],
    allowCitizensOnly: false,
    foreignersNeedPermit: true,
    denyExpiredPassport: true,
    mustMatchName: false,
  };
  return {
    day: 3,
    text: [
      "День 3: Иностранцам — разрешение обязательно.",
      "Паспорта с истёкшим сроком недействительны.",
      "Имя в паспорте и разрешении должно совпадать.",
      "Въезд граждан Redland запрещён.",
    ],
    allowCitizensOnly: false,
    foreignersNeedPermit: true,
    denyExpiredPassport: true,
    mustMatchName: true,
    banCountry: "Redland",
  };
}

interface EvalResult { shouldApprove: boolean; reasons: string[]; }

function evaluate(app: Applicant, rules: Rules, today: number): EvalResult {
  const reasons: string[] = [];

  // Страна/гражданство
  if (rules.allowCitizensOnly && !app.isCitizen) {
    reasons.push("День 1: иностранцам запрещён въезд");
  }

  // Бан страны
  if (rules.banCountry && app.passport.country === rules.banCountry) {
    reasons.push(`День 3: въезд граждан ${rules.banCountry} запрещён`);
  }

  // Паспорт просрочен?
  if (rules.denyExpiredPassport && app.passport.expires < today) {
    reasons.push("Паспорт просрочен");
  }

  // Разрешение
  if (!app.isCitizen && rules.foreignersNeedPermit) {
    if (!app.permit) reasons.push("Нет разрешения на въезд у иностранца");
    else if (app.permit.expires < today) reasons.push("Разрешение просрочено");
  }

  // Совпадение имени
  if (rules.mustMatchName && app.permit) {
    if (normalize(app.passport.name) !== normalize(app.permit.name)) {
      reasons.push("Имя в паспорте и разрешении не совпадает");
    }
  }

  return { shouldApprove: reasons.length === 0, reasons };
}

function normalize(s: string) { return s.trim().toLowerCase(); }

// ---------------- Component ----------------

export default function Page() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const cvs = canvasRef.current!;
    const ctx = cvs.getContext("2d")!;

    // Retina / resize
    function resize() {
      const DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      const rect = cvs.getBoundingClientRect();
      const w = Math.max(900, Math.floor(rect.width));
      const h = Math.max(560, Math.floor(rect.height));
      cvs.width = Math.floor(w * DPR);
      cvs.height = Math.floor(h * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    const ro = new ResizeObserver(resize); ro.observe(cvs); resize();

    // State
    let day = 1; // 1..3
    let today = 1; // счётчик «дней» для дат
    let processedToday = 0;

    let rules = rulesForDay(day);

    let warnings = 0;
    let credits = 0;

    let current: Applicant | null = null;
    let evalCache: EvalResult | null = null;
    let verdict: "APPROVED" | "DENIED" | null = null;
    let verdictTime = 0; // для анимации штампа

    // Документы (перетаскиваемые карточки)
    let passportRect: DocRect = { ...PASSPORT_INIT };
    let permitRect: DocRect = { ...PERMIT_INIT };

    // Ввод
    const mouse = { x: 0, y: 0, down: false };

    function newApplicant() {
      current = makeApplicant(today);
      evalCache = null; verdict = null; verdictTime = 0;
      passportRect = { ...PASSPORT_INIT };
      permitRect = { ...PERMIT_INIT };
    }

    newApplicant();

    // Input handlers
    function onPointerMove(e: PointerEvent) {
      const r = cvs.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
      dragUpdate();
    }
    function onPointerDown(e: PointerEvent) {
      if (e.button !== 0) return;
      mouse.down = true;
      dragStart(mouse.x, mouse.y);
      // Клики по кнопкам APPROVE/DENY
      const a = approveBtn();
      const d = denyBtn();
      if (ptIn(mouse.x, mouse.y, a)) doVerdict(true);
      else if (ptIn(mouse.x, mouse.y, d)) doVerdict(false);
    }
    function onPointerUp() { mouse.down = false; dragEnd(); }

    function onKey(e: KeyboardEvent) {
      if (e.type === "keydown") {
        if (e.code === "KeyA") doVerdict(true);
        if (e.code === "KeyD") doVerdict(false);
        if (e.code === "KeyN") nextIfReady();
      }
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("keydown", onKey);

    // Drag logic
    function dragStart(mx: number, my: number) {
      for (const r of [permitRect, passportRect]) { // верхние по z проверяем первыми
        if (ptIn(mx, my, r)) {
          r.dragging = true; r.dx = mx - r.x; r.dy = my - r.y; return;
        }
      }
    }
    function dragUpdate() {
      for (const r of [passportRect, permitRect]) {
        if (r.dragging) { r.x = mouse.x - (r.dx || 0); r.y = mouse.y - (r.dy || 0); }
      }
    }
    function dragEnd() { passportRect.dragging = false; permitRect.dragging = false; }

    function ptIn(mx: number, my: number, r: {x:number,y:number,w:number,h:number}) {
      return mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h;
    }

    // Verdict
    function doVerdict(approve: boolean) {
      if (!current || verdict) return;
      const res = evalCache || evaluate(current, rules, today);
      evalCache = res;
      verdict = approve ? "APPROVED" : "DENIED";
      verdictTime = 1.0; // анимация штампа

      // Подсчёт
      const correct = (approve === res.shouldApprove);
      credits += correct ? PAY_OK : FINE_BAD;
      if (!correct) warnings += 1;

      // Через небольшую паузу — следующий
      setTimeout(() => {
        processedToday += 1;
        if (warnings >= MAX_WARNINGS) {
          // завершаем день поражением
        } else if (processedToday >= ENTRANTS_PER_DAY) {
          // новый день
          day = clamp(day + 1, 1, 3);
          today += 1;
          processedToday = 0;
          rules = rulesForDay(day);
        }
        newApplicant();
      }, 900);
    }

    function nextIfReady() {
      if (!current) newApplicant();
    }

    // Loop
    let last = performance.now();
    let raf = 0;

    function tick() {
      const now = performance.now();
      const dt = Math.min(32, now - last); last = now;

      update(dt);
      draw();

      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    function update(dt: number) {
      if (verdictTime > 0) verdictTime = Math.max(0, verdictTime - dt * 0.004);
    }

    function draw() {
      const r = cvs.getBoundingClientRect();
      const W = r.width, H = r.height;

      // BG
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "#0a0f16"); bg.addColorStop(1, "#0c141d");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

      // Header
      drawHeader(W, H);

      // Desk
      drawDesk(W, H);

      // Queue (левая панель, портрет)
      drawPortrait(W, H);

      // Docs — перетаскиваемые карточки
      if (current) {
        drawPassport(passportRect, current.passport);
        if (current.permit) drawPermit(permitRect, current.permit);
      }

      // Right rules/book
      drawRulebook(W, H);

      // Buttons: Approve / Deny
      drawButtons();

      // HUD footer
      drawFooter(W, H);

      // Stamp animation
      if (verdict && verdictTime > 0 && current) drawStamp(W, H, verdict, verdictTime);

      // If game over
      if (warnings >= MAX_WARNINGS) drawGameOver(W, H);
    }

    function drawHeader(W: number, H: number) {
      ctx.save();
      ctx.fillStyle = "#0e1c27"; ctx.fillRect(0, 0, W, 140);
      ctx.strokeStyle = "#163142"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 140); ctx.lineTo(W, 140); ctx.stroke();
      // Title
      ctx.fillStyle = "#ccf5ff"; ctx.font = "900 24px ui-sans-serif, system-ui"; ctx.textAlign = "left";
      ctx.fillText("SECURITY INSPECTOR", 24, 38);
      // Day / counters
      ctx.font = "700 14px ui-sans-serif, system-ui";
      ctx.fillStyle = "#a6e9ff";
      ctx.fillText(`ДЕНЬ: ${day}`, 24, 68);
      ctx.fillText(`ПОСЕТИТЕЛЕЙ сегодня: ${processedToday}/${ENTRANTS_PER_DAY}`, 24, 92);
      ctx.fillText(`ПРЕДУПРЕЖДЕНИЙ: ${warnings}/${MAX_WARNINGS}`, 24, 116);
      // Credits right
      ctx.textAlign = "right";
      ctx.fillText(`ЖАЛОВАНЬЕ: ${credits} cr`, W - 24, 38);
      ctx.restore();
    }

    function drawDesk(W: number, H: number) {
      ctx.save();
      const y = DESK.y; const h = DESK.h;
      // стол — неоновая кромка
      const grd = ctx.createLinearGradient(0, y, 0, y + h);
      grd.addColorStop(0, "#0a1119"); grd.addColorStop(1, "#0b1822");
      ctx.fillStyle = grd; ctx.fillRect(0, y, W, h);
      ctx.shadowColor = "#36e6ff"; ctx.shadowBlur = 24;
      ctx.strokeStyle = "#36e6ff"; ctx.lineWidth = 2; ctx.strokeRect(0.5, y + 0.5, W - 1, h - 1);
      ctx.restore();
    }

    function drawPortrait(W: number, H: number) {
      if (!current) return;
      ctx.save();
      const x = 24, y = 160, w = 200, h = 260;
      // рамка
      ctx.fillStyle = "#0f1a22"; roundRect(ctx, x, y, w, h, 12); ctx.fill();
      ctx.strokeStyle = "#2dbddd"; ctx.lineWidth = 2; roundRect(ctx, x, y, w, h, 12); ctx.stroke();
      // лицо — цветной прямоугольник
      ctx.save(); ctx.translate(x + 20, y + 20);
      ctx.fillStyle = `hsl(${current.passport.photoHue}, 70%, 55%)`;
      roundRect(ctx, 0, 0, w - 40, h - 80, 10); ctx.fill();
      ctx.restore();
      // подпись
      ctx.fillStyle = "#bfefff"; ctx.font = "800 14px ui-sans-serif"; ctx.textAlign = "center";
      ctx.fillText(current.passport.name, x + w / 2, y + h - 28);
      ctx.restore();
    }

    function drawPassport(r: DocRect, pass: Passport) {
      ctx.save();
      // тень
      ctx.shadowColor = "#30d5ff"; ctx.shadowBlur = r.dragging ? 26 : 10;
      // фон
      ctx.fillStyle = "#11202a"; roundRect(ctx, r.x, r.y, r.w, r.h, 12); ctx.fill();
      ctx.shadowBlur = 0; ctx.strokeStyle = "#36e6ff"; ctx.lineWidth = 2; roundRect(ctx, r.x, r.y, r.w, r.h, 12); ctx.stroke();

      // левый блок — «фото»
      const px = r.x + 14, py = r.y + 14, pw = 90, ph = 110;
      ctx.fillStyle = `hsl(${pass.photoHue}, 70%, 55%)`;
      roundRect(ctx, px, py, pw, ph, 8); ctx.fill();

      // правый блок — данные
      const tx = r.x + 120, ty = r.y + 20;
      ctx.fillStyle = "#bfefff"; ctx.font = "700 14px ui-sans-serif"; ctx.textAlign = "left";
      ctx.fillText("PASSPORT", tx, ty);
      ctx.font = "600 13px ui-sans-serif";
      ctx.fillText(`Имя: ${pass.name}`, tx, ty + 26);
      ctx.fillText(`Страна: ${pass.country}`, tx, ty + 46);
      ctx.fillText(`ID: ${pass.id}`, tx, ty + 66);
      ctx.fillText(`Пол: ${pass.sex}`, tx, ty + 86);
      ctx.fillText(`Рожд.: ${pass.birth}`, tx, ty + 106);
      ctx.fillText(`Действителен до: День ${pass.expires}`, tx, ty + 126);

      ctx.restore();
    }

    function drawPermit(r: DocRect, p: Permit) {
      ctx.save();
      ctx.shadowColor = "#20ffc1"; ctx.shadowBlur = r.dragging ? 26 : 10;
      ctx.fillStyle = "#0f2520"; roundRect(ctx, r.x, r.y, r.w, r.h, 12); ctx.fill();
      ctx.shadowBlur = 0; ctx.strokeStyle = "#20ffc1"; ctx.lineWidth = 2; roundRect(ctx, r.x, r.y, r.w, r.h, 12); ctx.stroke();

      const tx = r.x + 18, ty = r.y + 22;
      ctx.fillStyle = "#c6ffef"; ctx.font = "700 14px ui-sans-serif"; ctx.textAlign = "left";
      ctx.fillText("ENTRY PERMIT", tx, ty);
      ctx.font = "600 13px ui-sans-serif";
      ctx.fillText(`Имя: ${p.name}`, tx, ty + 26);
      ctx.fillText(`Цель: ${p.purpose}`, tx, ty + 46);
      ctx.fillText(`Разрешение до: День ${p.expires}`, tx, ty + 66);
      ctx.restore();
    }

    function drawRulebook(W: number, H: number) {
      const x = W - 300, y = 160, w = 276, h = 320;
      ctx.save();
      ctx.fillStyle = "#0f1a22"; roundRect(ctx, x, y, w, h, 12); ctx.fill();
      ctx.strokeStyle = "#2dbddd"; ctx.lineWidth = 2; roundRect(ctx, x, y, w, h, 12); ctx.stroke();

      ctx.fillStyle = "#ccf5ff"; ctx.font = "800 16px ui-sans-serif"; ctx.textAlign = "center";
      ctx.fillText("КНИГА ПРАВИЛ", x + w / 2, y + 28);

      ctx.textAlign = "left"; ctx.font = "600 13px ui-sans-serif"; ctx.fillStyle = "#aee9ff";
      let yy = y + 58;
      for (const t of rules.text) { wrapText(t, x + 14, yy, w - 28, 18); yy += 44; }
      ctx.restore();
    }

    function wrapText(s: string, x: number, y: number, maxW: number, lh: number) {
      const words = s.split(" ");
      let line = ""; let yy = y;
      for (let n = 0; n < words.length; n++) {
        const test = line + words[n] + " ";
        if (ctx.measureText(test).width > maxW && n > 0) {
          ctx.fillText(line, x, yy); line = words[n] + " "; yy += lh;
        } else line = test;
      }
      ctx.fillText(line, x, yy);
    }

    function approveBtn() { return { x: 320, y: DESK.y + DESK.h - 90, w: 180, h: 50 }; }
    function denyBtn() { return { x: 520, y: DESK.y + DESK.h - 90, w: 180, h: 50 }; }

    function drawButtons() {
      const a = approveBtn(); const d = denyBtn();
      // APPROVE
      ctx.save();
      ctx.fillStyle = "#0d2b23"; roundRect(ctx, a.x, a.y, a.w, a.h, 12); ctx.fill();
      ctx.strokeStyle = "#20ffc1"; ctx.lineWidth = 2; roundRect(ctx, a.x, a.y, a.w, a.h, 12); ctx.stroke();
      ctx.fillStyle = "#abfff0"; ctx.font = "900 18px ui-sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("APPROVE (A)", a.x + a.w/2, a.y + a.h/2);
      ctx.restore();
      // DENY
      ctx.save();
      ctx.fillStyle = "#2a1010"; roundRect(ctx, d.x, d.y, d.w, d.h, 12); ctx.fill();
      ctx.strokeStyle = "#ff4d57"; ctx.lineWidth = 2; roundRect(ctx, d.x, d.y, d.w, d.h, 12); ctx.stroke();
      ctx.fillStyle = "#ffd6db"; ctx.font = "900 18px ui-sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("DENY (D)", d.x + d.w/2, d.y + d.h/2);
      ctx.restore();
    }

    function drawFooter(W: number, H: number) {
      ctx.save();
      ctx.fillStyle = "#bdefff"; ctx.font = "600 12px ui-sans-serif"; ctx.textAlign = "left";
      ctx.fillText("A — разрешить, D — отказать, N — следующий (если доступен). Перетаскивай документы мышью.", 16, H - 16);
      ctx.restore();
    }

    function drawStamp(W: number, H: number, v: "APPROVED" | "DENIED", t: number) {
      const cx = W * 0.5; const cy = DESK.y + 150;
      const s = mix(0.6, 1, 1 - t);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((-0.25 + 0.5 * (1 - t)));
      ctx.scale(s, s);
      const w = 260, h = 86;
      const color = v === "APPROVED" ? "#20ffc1" : "#ff4d57";
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = color; ctx.lineWidth = 6; roundRect(ctx, -w/2, -h/2, w, h, 10); ctx.stroke();
      ctx.globalAlpha = 0.95; ctx.fillStyle = color; ctx.font = "900 40px ui-sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(v, 0, 4);

      // Если есть результат проверки — покажем снизу причину/успех
      if (evalCache) {
        ctx.globalAlpha = 1.0;
        const correct = (v === (evalCache.shouldApprove ? "APPROVED" : "DENIED"));
        const txt = correct ? "РЕШЕНИЕ ВЕРНО" : ("ОШИБКА: " + (evalCache.reasons[0] || "неверное решение"));
        ctx.font = "800 16px ui-sans-serif"; ctx.fillStyle = correct ? "#eafffb" : "#ffe3e5";
        ctx.fillText(txt, 0, h/2 + 24);
      }

      ctx.restore();
    }

    function drawGameOver(W: number, H: number) {
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#ffe3e5"; ctx.font = "900 42px ui-sans-serif"; ctx.textAlign = "center";
      ctx.fillText("УВОЛЕН", W/2, H/2 - 20);
      ctx.font = "700 18px ui-sans-serif"; ctx.fillStyle = "#fff";
      ctx.fillText(`Счёт: ${credits} cr`, W/2, H/2 + 14);
      ctx.fillText(`Нажми F5, чтобы начать заново`, W/2, H/2 + 42);
      ctx.restore();
    }

    function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    }

    setReady(true);

    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className="min-h-[60vh] w-full" style={{ display: "grid", placeItems: "center", background: "#061017" }}>
      <div style={{ width: "min(100%, 1200px)", aspectRatio: "16/9", position: "relative" }}>
        <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block", borderRadius: 18, boxShadow: "0 24px 80px rgba(0,0,0,.55), inset 0 0 0 1px rgba(54,230,255,.18)" }} />
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", borderRadius: 18, boxShadow: "inset 0 0 120px rgba(54,230,255,.07)" }} />
      </div>
      <div style={{ color: "#9eeaff", opacity: .85, fontSize: 12, marginTop: 8 }}>A — разрешить • D — отказать • N — следующий • Перетаскивай документы мышью</div>
    </div>
  );
}
