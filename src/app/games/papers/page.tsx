// src/app/inspector/page.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";

/**
 * SECURITY INSPECTOR — /inspector  (Fullscreen + CyberSec features)
 *
 * Новое:
 *  • Полноэкранный канвас (автоматический ретина‑ресайз, всегда вписывается в вьюпорт)
 *  • Кнопки APPROVE/DENY и HUD адаптивно расставлены — не уезжают за экран
 *  • Третий документ: CYBER PASS (MFA‑код, валидность TLS‑серта, Luhn‑чексумма ID, флаг "hash in malware DB")
 *  • Правила Дня 2–3 включают проверки из кибербеза (MFA, TLS expiry, checksum, анти‑спуф имен)
 *  • Анти‑спуфинг имён (гомоглифы: 0→o, 1→l, 3→e, 5→s, 7→t)
 *  • Случайные SOC‑алерты (тикер угроз), «штраф‑ивенты» и журнал аудита справа
 *  • Ачивки за безошибочные решения
 *
 * Управление:
 *  • A — Approve, D — Deny, N — Next (посетитель), H — скрыть/показать подсказки
 */

type Vec2 = { x: number; y: number };

type CountryCode = "Nordland" | "Vesria" | "Kolechia" | "Redland";
type Purpose = "Visit" | "Work" | "Transit";

interface Passport {
  name: string;
  country: CountryCode;
  id: string;          // ABC-#####
  expires: number;     // игровой «день»
  sex: "M" | "F";
  birth: string;
  photoHue: number;
}

interface Permit {
  name: string;
  purpose: Purpose;
  expires: number;     // день
}

interface CyberPass {
  // Игровые поля для «киберпроверки»
  mfaCode: string;         // декор (6 знаков)
  mfaValid: boolean;       // «угадано»/валидно для сегодня
  certExpires: number;     // TLS‑сертификат до дня X
  idChecksumOk: boolean;   // Luhn‑проверка по цифрам паспорта
  malwareHashListed: boolean; // будто бы найден в «базе зловредов»
  issuer: "CN=Nordland Root" | "CN=GlobalTrust" | "CN=QuestionableCA";
}

interface Applicant {
  passport: Passport;
  permit?: Permit;
  cyber: CyberPass;
  isCitizen: boolean;
  banned?: boolean;
  // для спуфинга имён (подмена символов)
  spoofed?: boolean;
}

interface DocRect {
  kind: "passport" | "permit" | "cyber";
  x: number; y: number; w: number; h: number;
  dragging?: boolean; dx?: number; dy?: number;
}

interface Rules {
  day: number;
  text: string[];
  // классические
  allowCitizensOnly: boolean;
  foreignersNeedPermit: boolean;
  denyExpiredPassport: boolean;
  mustMatchName: boolean;
  banCountry?: CountryCode;
  // кибер‑правила
  requireIdChecksum: boolean;
  requireMFA: boolean;
  requireValidCert: boolean;
  denyMalwareHash: boolean;
  antiSpoofName: boolean;
}

interface EvalResult { shouldApprove: boolean; reasons: string[]; }

const maleNames = ["Anton","Boris","Dmitry","Egor","Felix","Gleb","Ivan","Kirill","Leo","Maks"];
const femaleNames = ["Alina","Bella","Daria","Elena","Eva","Inna","Lena","Nora","Olga","Vera"];
const countries: CountryCode[] = ["Nordland","Vesria","Kolechia","Redland"];
const purposes: Purpose[] = ["Visit","Work","Transit"];

const MAX_WARNINGS = 3;
const ENTRANTS_PER_DAY = 8;
const PAY_OK = 5;
const FINE_BAD = -10;

function clamp(v: number, a: number, b: number){ return Math.max(a, Math.min(b, v)); }
function mix(a: number, b: number, t: number){ return a + (b - a) * t; }
function rand(a: number, b: number){ return a + Math.random() * (b - a); }
function choice<T>(arr: T[]){ return arr[Math.floor(Math.random() * arr.length)]; }
function pad(n: number){ return n < 10 ? "0"+n : ""+n; }
function idGen(){ return `${String.fromCharCode(65+Math.floor(Math.random()*26))}${String.fromCharCode(65+Math.floor(Math.random()*26))}${String.fromCharCode(65+Math.floor(Math.random()*26))}-${Math.floor(10000+Math.random()*90000)}`; }

// Simple Luhn over digits only
function luhnOk(digits: string){
  let sum = 0; let dbl = false;
  for (let i = digits.length - 1; i >= 0; i--){
    let x = parseInt(digits[i],10);
    if (Number.isNaN(x)) continue;
    if (dbl){ x *= 2; if (x > 9) x -= 9; }
    sum += x; dbl = !dbl;
  }
  return sum % 10 === 0;
}

// Спуф‑нормализация: 0→o, 1→l, 3→e, 5→s, 7→t (и наоборот)
function normalizeName(s: string){
  const map: Record<string,string> = { "0":"o","1":"l","3":"e","5":"s","7":"t" };
  const rev: Record<string,string> = { "o":"0","l":"1","e":"3","s":"5","t":"7" };
  return s
    .toLowerCase()
    .split("")
    .map(ch => map[ch] ?? ch)
    .join("")
    .replace(/[0|1|3|5|7]/g, c => map[c])
    .replace(/[o|l|e|s|t]/g, c => rev[c] ? c : c); // фактически стабилизируем
}

// --------- Генераторы документов ---------

function makePassport(today: number): Passport {
  const sex = Math.random() < 0.5 ? "M" : "F";
  const name = sex === "M" ? choice(maleNames) : choice(femaleNames);
  const country = choice(countries);
  const expires = today + Math.floor(rand(-2, 6)); // может быть просрочен
  const birth = `${1980 + Math.floor(Math.random()*20)}-${pad(1+Math.floor(Math.random()*12))}-${pad(1+Math.floor(Math.random()*28))}`;
  return { name, country, id: idGen(), expires, sex, birth, photoHue: Math.floor(rand(0,360)) };
}

function makePermit(pass: Passport, today: number): Permit {
  // 10% — мелкая ошибка имени
  const maybeStar = Math.random() < 0.1;
  return {
    name: maybeStar ? pass.name.replace(/.$/, (c)=> (c === "a" ? "o" : c+"*")) : pass.name,
    purpose: choice(purposes),
    expires: today + Math.floor(rand(-2, 6))
  };
}

function makeCyber(pass: Passport, today: number): CyberPass {
  const digits = pass.id.replace(/\D/g,"");
  const checksum = luhnOk(digits);
  const mfaValid = Math.random() < 0.8; // 80% «правильные»
  const certExpires = today + Math.floor(rand(-2, 6));
  // зловредный хэш редко, но метко
  const malwareHashListed = Math.random() < 0.08;
  const issuer = choice(["CN=Nordland Root","CN=GlobalTrust","CN=QuestionableCA"] as const);
  const mfaCode = String(Math.floor(Math.random()*1000000)).padStart(6,"0");
  return { mfaCode, mfaValid, certExpires, idChecksumOk: checksum, malwareHashListed, issuer };
}

function maybeSpoof(name: string){
  if (Math.random() < 0.12){
    // заменим один символ на гомоглиф
    return {
      spoofed: true,
      out: name.replace(/[o|l|e|s|t]/i, m => ({o:"0",l:"1",e:"3",s:"5",t:"7"}[m.toLowerCase()] || m))
    };
  }
  return { spoofed: false, out: name };
}

function makeApplicant(today: number): Applicant {
  const passport = makePassport(today);
  const isCitizen = passport.country === "Nordland";
  const permit = (!isCitizen || Math.random() < 0.2) ? makePermit(passport, today) : undefined;

  // Спуфим имя в одном из документов иногда
  let spoofed = false;
  if (permit && Math.random() < 0.5){
    const s = maybeSpoof(permit.name);
    permit.name = s.out; spoofed = s.spoofed;
  } else if (Math.random() < 0.2) {
    const s = maybeSpoof(passport.name);
    passport.name = s.out; spoofed = s.spoofed;
  }

  return {
    passport,
    permit,
    cyber: makeCyber(passport, today),
    isCitizen,
    banned: passport.country === "Redland",
    spoofed
  };
}

function rulesForDay(day: number): Rules {
  if (day <= 1) return {
    day: 1,
    text: [
      "День 1: Въезд только для граждан Nordland.",
      "Иностранцам — ОТКАЗ.",
    ],
    allowCitizensOnly: true,
    foreignersNeedPermit: false,
    denyExpiredPassport: false,
    mustMatchName: false,
    banCountry: undefined,
    // кибер‑часть выключена
    requireIdChecksum: false, requireMFA: false, requireValidCert: false, denyMalwareHash: false, antiSpoofName: false,
  };
  if (day === 2) return {
    day: 2,
    text: [
      "День 2: Иностранцам требуется разрешение на въезд.",
      "Просроченные паспорта — ОТКАЗ.",
      "ID должен проходить чексумму (Luhn).",
    ],
    allowCitizensOnly: false,
    foreignersNeedPermit: true,
    denyExpiredPassport: true,
    mustMatchName: false,
    banCountry: undefined,
    requireIdChecksum: true, requireMFA: false, requireValidCert: false, denyMalwareHash: false, antiSpoofName: false,
  };
  return {
    day: 3,
    text: [
      "День 3: Иностранцам — разрешение ОБЯЗАТЕЛЬНО.",
      "Паспорт с истёкшим сроком — ОТКАЗ.",
      "Имена в документах должны совпадать (анти‑спуф).",
      "Въезд граждан Redland запрещён.",
      "Требуется валидный MFA и TLS‑сертификат.",
      "Хэш в базе малвари — ОТКАЗ.",
    ],
    allowCitizensOnly: false,
    foreignersNeedPermit: true,
    denyExpiredPassport: true,
    mustMatchName: true,
    banCountry: "Redland",
    requireIdChecksum: true, requireMFA: true, requireValidCert: true, denyMalwareHash: true, antiSpoofName: true,
  };
}

function canonicalName(n: string){
  return normalizeName(n.replace(/\*/g,"").trim());
}

function evaluate(app: Applicant, rules: Rules, today: number): EvalResult {
  const reasons: string[] = [];

  if (rules.allowCitizensOnly && !app.isCitizen) reasons.push("День 1: иностранцам запрещён въезд");
  if (rules.banCountry && app.passport.country === rules.banCountry) reasons.push(`День 3: граждане ${rules.banCountry} не допускаются`);
  if (rules.denyExpiredPassport && app.passport.expires < today) reasons.push("Паспорт просрочен");

  if (!app.isCitizen && rules.foreignersNeedPermit){
    if (!app.permit) reasons.push("Нет разрешения у иностранца");
    else if (app.permit.expires < today) reasons.push("Разрешение просрочено");
  }

  if (rules.mustMatchName){
    if (app.permit){
      const p = canonicalName(app.passport.name);
      const q = canonicalName(app.permit.name);
      if (p !== q) reasons.push("Имя в паспорте и разрешении не совпадает (анти‑спуф)");
    }
  }

  if (rules.requireIdChecksum){
    if (!app.cyber.idChecksumOk) reasons.push("ID не проходит чексумму (Luhn)");
  }
  if (rules.requireMFA){
    if (!app.cyber.mfaValid) reasons.push("MFA не прошёл проверку");
  }
  if (rules.requireValidCert){
    if (app.cyber.certExpires < today) reasons.push("TLS‑сертификат истёк");
    if (app.cyber.issuer === "CN=QuestionableCA") reasons.push("Сомнительный издатель сертификата");
  }
  if (rules.denyMalwareHash){
    if (app.cyber.malwareHashListed) reasons.push("Хэш найден в базе зловредов");
  }

  return { shouldApprove: reasons.length === 0, reasons };
}

// ---------------- Component ----------------

export default function Page(){
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const cvs = canvasRef.current!;
    const ctx = cvs.getContext("2d")!;

    // Полноэкранный ретина‑ресайз
    function resize(){
      const DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      const w = window.innerWidth;
      const h = window.innerHeight;
      cvs.style.width = w + "px";
      cvs.style.height = h + "px";
      cvs.width = Math.floor(w * DPR);
      cvs.height = Math.floor(h * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    // ---------- Игровое состояние ----------
    let day = 1;
    let today = 1;
    let processedToday = 0;
    let rules = rulesForDay(day);

    let warnings = 0;
    let credits = 0;

    let current: Applicant | null = null;
    let evalCache: EvalResult | null = null;
    let verdict: "APPROVED" | "DENIED" | null = null;
    let verdictTime = 0;

    // перетаскиваемые документы
    const mkRects = () => {
      const W = window.innerWidth, H = window.innerHeight;
      const baseY = Math.max(160, Math.round(H*0.23));
      return {
        passportRect: { kind: "passport", x: Math.round(W*0.28), y: baseY+40, w: 320, h: 200 } as DocRect,
        permitRect:   { kind: "permit",   x: Math.round(W*0.58), y: baseY+10, w: 300, h: 180 } as DocRect,
        cyberRect:    { kind: "cyber",    x: Math.round(W*0.40), y: baseY+210, w: 340, h: 190 } as DocRect,
      };
    };
    let { passportRect, permitRect, cyberRect } = mkRects();

    const mouse = { x: 0, y: 0, down: false };

    const auditLog: string[] = [];
    const tips = [
      "Совет: проверяй Luhn у ID — быстрый индикатор подделки.",
      "Совет: не верь сертификату от сомнительного издателя.",
      "Совет: несоответствие имён может быть спуфом (0↔o, 1↔l...).",
      "Совет: у иностранцев всегда спрашивай разрешение.",
      "Совет: просрочка — частый кейс. Смотри на дату.",
    ];
    const tickerThreats = [
      "SOC: Идут фишинговые рассылки от домена vesria-mail[.]com",
      "SOC: Обнаружены выдачи фальшивых сертификатов QuestionableCA",
      "SOC: Всплеск вредоносных хэшей по Redland",
      "SOC: Повышен уровень угрозы — тщательно сверяйте имена",
    ];
    let ticker = choice(tickerThreats);
    let showHelp = true;

    function pushLog(s: string){
      auditLog.unshift(`[Day ${day}] ${s}`);
      if (auditLog.length > 18) auditLog.pop();
    }

    function newApplicant(){
      current = makeApplicant(today);
      evalCache = null; verdict = null; verdictTime = 0;
      ({ passportRect, permitRect, cyberRect } = mkRects());
    }
    newApplicant();

    // ---------- Ввод ----------
    function onPointerMove(e: PointerEvent){
      const r = cvs.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
      dragUpdate();
    }
    function onPointerDown(e: PointerEvent){
      if (e.button !== 0) return;
      mouse.down = true;
      dragStart(mouse.x, mouse.y);
      const a = approveBtn();
      const d = denyBtn();
      if (ptIn(mouse.x, mouse.y, a)) doVerdict(true);
      else if (ptIn(mouse.x, mouse.y, d)) doVerdict(false);
    }
    function onPointerUp(){ mouse.down = false; dragEnd(); }
    function onKey(e: KeyboardEvent){
      if (e.type !== "keydown") return;
      if (e.code === "KeyA") doVerdict(true);
      if (e.code === "KeyD") doVerdict(false);
      if (e.code === "KeyN") nextIfReady();
      if (e.code === "KeyH") showHelp = !showHelp;
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("keydown", onKey);

    // Drag logic
    function dragStart(mx: number, my: number){
      for (const r of [cyberRect, permitRect, passportRect]){ // top-most first
        if (ptIn(mx,my,r)){ r.dragging = true; r.dx = mx - r.x; r.dy = my - r.y; return; }
      }
    }
    function dragUpdate(){
      for (const r of [passportRect, permitRect, cyberRect]){
        if (r.dragging){
          r.x = mouse.x - (r.dx || 0);
          r.y = mouse.y - (r.dy || 0);
        }
      }
    }
    function dragEnd(){ passportRect.dragging = false; permitRect.dragging = false; cyberRect.dragging = false; }
    function ptIn(mx:number,my:number,r:{x:number,y:number,w:number,h:number}){ return mx>=r.x && mx<=r.x+r.w && my>=r.y && my<=r.y+r.h; }

    // Вердикт
    function doVerdict(approve: boolean){
      if (!current || verdict) return;
      const res = evalCache || evaluate(current, rules, today);
      evalCache = res;
      verdict = approve ? "APPROVED" : "DENIED";
      verdictTime = 1.0;

      const correct = (approve === res.shouldApprove);
      credits += correct ? PAY_OK : FINE_BAD;
      if (!correct) warnings += 1;

      pushLog(`${approve ? "APPROVE" : "DENY"} — ${correct ? "OK" : "ERR"}${res.reasons.length ? ` | ${res.reasons.join("; ")}` : ""}`);

      // Ачивка за идеальный день
      if (processedToday === ENTRANTS_PER_DAY - 1 && warnings === 0 && !correct){
        pushLog("Почти идеальный день сорван одной ошибкой…");
      }

      setTimeout(() => {
        processedToday += 1;
        // Случайные SOC‑ивенты
        if (Math.random() < 0.18){
          ticker = choice(tickerThreats);
          pushLog(`SOC: ${ticker}`);
        }

        if (warnings >= MAX_WARNINGS){
          // game over — просто дождёмся рендера
        } else if (processedToday >= ENTRANTS_PER_DAY){
          day = clamp(day + 1, 1, 3);
          today += 1;
          processedToday = 0;
          rules = rulesForDay(day);
          pushLog(`Начинается День ${day}`);
        }
        newApplicant();
      }, 900);
    }
    function nextIfReady(){ if (!current) newApplicant(); }

    // ---------- Игровой цикл ----------
    let last = performance.now();
    let raf = 0;
    function tick(){
      const now = performance.now();
      const dt = Math.min(32, now - last); last = now;
      update(dt);
      draw();
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    function update(dt: number){
      if (verdictTime > 0) verdictTime = Math.max(0, verdictTime - dt * 0.004);
    }

    // ---------- Отрисовка ----------
    function headerH(){ return Math.max(120, Math.round(window.innerHeight * 0.16)); }
    function rightPaneW(){ return Math.min(360, Math.max(280, Math.round(window.innerWidth * 0.25))); }

    function approveBtn(){
      const W = window.innerWidth, H = window.innerHeight;
      const w = Math.min(220, Math.max(180, Math.round(W * 0.18)));
      const h = 56;
      const y = H - h - 20;
      const gap = 16;
      const x = Math.round(W/2 - w - gap/2);
      return { x, y, w, h };
    }
    function denyBtn(){
      const W = window.innerWidth, H = window.innerHeight;
      const w = Math.min(220, Math.max(180, Math.round(W * 0.18)));
      const h = 56;
      const y = H - h - 20;
      const gap = 16;
      const x = Math.round(W/2 + gap/2);
      return { x, y, w, h };
    }

    function draw(){
      const W = window.innerWidth, H = window.innerHeight;

      // BG
      const bg = ctx.createLinearGradient(0,0,0,H);
      bg.addColorStop(0, "#071018");
      bg.addColorStop(1, "#0b1620");
      ctx.fillStyle = bg; ctx.fillRect(0,0,W,H);

      drawHeader(W,H);
      drawDesk(W,H);
      drawPortrait(W,H);

      if (current){
        drawPassport(passportRect, current.passport);
        if (current.permit) drawPermit(permitRect, current.permit);
        drawCyber(cyberRect, current.cyber);
      }

      drawRulebook(W,H);
      drawAudit(W,H);

      drawButtons();

      drawFooter(W,H);

      if (verdict && verdictTime > 0 && current) drawStamp(W,H,verdict,verdictTime);
      if (warnings >= MAX_WARNINGS) drawGameOver(W,H);

      drawTicker(W,H);
      if (showHelp) drawHelp(W,H);
    }

    function drawHeader(W:number,H:number){
      const HH = headerH();
      ctx.save();
      ctx.fillStyle = "#0e1c27"; ctx.fillRect(0,0,W,HH);
      ctx.strokeStyle = "#163142"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0,HH); ctx.lineTo(W,HH); ctx.stroke();

      ctx.fillStyle = "#ccf5ff"; ctx.font = "900 24px ui-sans-serif, system-ui"; ctx.textAlign = "left";
      ctx.fillText("SECURITY INSPECTOR", 24, 36);

      ctx.font = "700 14px ui-sans-serif"; ctx.fillStyle = "#a6e9ff";
      ctx.fillText(`ДЕНЬ: ${day}`, 24, 64);
      ctx.fillText(`ПОСЕТИТЕЛЕЙ сегодня: ${processedToday}/${ENTRANTS_PER_DAY}`, 24, 88);
      ctx.fillText(`ПРЕДУПРЕЖДЕНИЙ: ${warnings}/${MAX_WARNINGS}`, 24, 112);

      ctx.textAlign = "right";
      ctx.fillText(`ЖАЛОВАНЬЕ: ${credits} cr`, W - 24, 36);
      ctx.restore();
    }

    function drawDesk(W:number,H:number){
      const y = headerH();
      const h = H - y;
      ctx.save();
      const grd = ctx.createLinearGradient(0, y, 0, y + h);
      grd.addColorStop(0, "#0a1119"); grd.addColorStop(1, "#0b1822");
      ctx.fillStyle = grd; ctx.fillRect(0, y, W, h);
      ctx.shadowColor = "#36e6ff"; ctx.shadowBlur = 24;
      ctx.strokeStyle = "#36e6ff"; ctx.lineWidth = 2; ctx.strokeRect(0.5, y + 0.5, W - 1, h - 1);
      ctx.restore();
    }

    function roundRectPath(x:number,y:number,w:number,h:number,r:number){
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

    function drawPortrait(W:number,H:number){
      if (!current) return;
      const x = 24, y = headerH() + 16, w = 220, h = 280;
      ctx.save();
      ctx.fillStyle = "#0f1a22"; roundRectPath(x,y,w,h,12); ctx.fill();
      ctx.strokeStyle = "#2dbddd"; ctx.lineWidth = 2; roundRectPath(x,y,w,h,12); ctx.stroke();
      ctx.save(); ctx.translate(x+18,y+18);
      ctx.fillStyle = `hsl(${current.passport.photoHue},70%,55%)`;
      roundRectPath(0,0,w-36,h-84,10); ctx.fill();
      ctx.restore();
      ctx.fillStyle = "#bfefff"; ctx.font = "800 14px ui-sans-serif"; ctx.textAlign = "center";
      ctx.fillText(current.passport.name, x + w/2, y + h - 30);
      ctx.restore();
    }

    function drawPassport(r:DocRect, pass:Passport){
      ctx.save();
      ctx.shadowColor = "#30d5ff"; ctx.shadowBlur = r.dragging ? 26 : 10;
      ctx.fillStyle = "#11202a"; roundRectPath(r.x,r.y,r.w,r.h,12); ctx.fill();
      ctx.shadowBlur = 0; ctx.strokeStyle = "#36e6ff"; ctx.lineWidth = 2; roundRectPath(r.x,r.y,r.w,r.h,12); ctx.stroke();

      const px = r.x + 14, py = r.y + 14, pw = 90, ph = 110;
      ctx.fillStyle = `hsl(${pass.photoHue},70%,55%)`;
      roundRectPath(px,py,pw,ph,8); ctx.fill();

      const tx = r.x + 120, ty = r.y + 20;
      ctx.fillStyle = "#bfefff"; ctx.font = "700 14px ui-sans-serif"; ctx.textAlign = "left";
      ctx.fillText("PASSPORT", tx, ty);
      ctx.font = "600 13px ui-sans-serif";
      ctx.fillText(`Имя: ${pass.name}`, tx, ty+26);
      ctx.fillText(`Страна: ${pass.country}`, tx, ty+46);
      ctx.fillText(`ID: ${pass.id}`, tx, ty+66);
      ctx.fillText(`Пол: ${pass.sex}`, tx, ty+86);
      ctx.fillText(`Рожд.: ${pass.birth}`, tx, ty+106);
      ctx.fillText(`Действителен до: День ${pass.expires}`, tx, ty+126);
      ctx.restore();
    }

    function drawPermit(r:DocRect, p:Permit){
      ctx.save();
      ctx.shadowColor = "#20ffc1"; ctx.shadowBlur = r.dragging ? 26 : 10;
      ctx.fillStyle = "#0f2520"; roundRectPath(r.x,r.y,r.w,r.h,12); ctx.fill();
      ctx.shadowBlur = 0; ctx.strokeStyle = "#20ffc1"; ctx.lineWidth = 2; roundRectPath(r.x,r.y,r.w,r.h,12); ctx.stroke();

      const tx = r.x + 18, ty = r.y + 22;
      ctx.fillStyle = "#c6ffef"; ctx.font = "700 14px ui-sans-serif"; ctx.textAlign = "left";
      ctx.fillText("ENTRY PERMIT", tx, ty);
      ctx.font = "600 13px ui-sans-serif";
      ctx.fillText(`Имя: ${p.name}`, tx, ty+26);
      ctx.fillText(`Цель: ${p.purpose}`, tx, ty+46);
      ctx.fillText(`Разрешение до: День ${p.expires}`, tx, ty+66);
      ctx.restore();
    }

    function drawCyber(r:DocRect, c:CyberPass){
      ctx.save();
      ctx.shadowColor = "#a780ff"; ctx.shadowBlur = r.dragging ? 26 : 10;
      ctx.fillStyle = "#1a1324"; roundRectPath(r.x,r.y,r.w,r.h,12); ctx.fill();
      ctx.shadowBlur = 0; ctx.strokeStyle = "#a780ff"; ctx.lineWidth = 2; roundRectPath(r.x,r.y,r.w,r.h,12); ctx.stroke();

      const tx = r.x + 18, ty = r.y + 22;
      ctx.fillStyle = "#efe1ff"; ctx.font = "800 14px ui-sans-serif"; ctx.textAlign = "left";
      ctx.fillText("CYBER PASS", tx, ty);

      ctx.font = "600 13px ui-sans-serif"; ctx.fillStyle = "#e6d7ff";
      ctx.fillText(`MFA: ${c.mfaCode} — ${c.mfaValid ? "VALID" : "INVALID"}`, tx, ty+26);
      ctx.fillText(`TLS: до Дня ${c.certExpires} (${c.issuer})`, tx, ty+46);
      ctx.fillText(`ID checksum: ${c.idChecksumOk ? "OK" : "FAIL"}`, tx, ty+66);
      ctx.fillText(`Malware DB: ${c.malwareHashListed ? "HIT" : "clean"}`, tx, ty+86);

      // псевдо‑QR для красоты
      const qx = r.x + r.w - 80, qy = r.y + 20;
      ctx.strokeStyle = "#a780ff"; ctx.strokeRect(qx, qy, 60, 60);
      for (let i=0;i<30;i++){
        const cx = qx + 4 + Math.floor(Math.random()*52);
        const cy = qy + 4 + Math.floor(Math.random()*52);
        ctx.fillStyle = (i%3===0) ? "#a780ff" : "#6d52b3";
        ctx.fillRect(cx, cy, 3, 3);
      }

      ctx.restore();
    }

    function drawRulebook(W:number,H:number){
      const x = W - rightPaneW(), y = headerH() + 16, w = rightPaneW() - 24, h = 220;
      ctx.save();
      ctx.fillStyle = "#0f1a22"; roundRectPath(x,y,w,h,12); ctx.fill();
      ctx.strokeStyle = "#2dbddd"; ctx.lineWidth = 2; roundRectPath(x,y,w,h,12); ctx.stroke();

      ctx.fillStyle = "#ccf5ff"; ctx.font = "800 16px ui-sans-serif"; ctx.textAlign = "center";
      ctx.fillText("КНИГА ПРАВИЛ", x + w/2, y + 28);

      ctx.textAlign = "left"; ctx.font = "600 13px ui-sans-serif"; ctx.fillStyle = "#aee9ff";
      let yy = y + 56;
      const wrap = (s:string) => {
        const maxW = w - 24, lh = 18; let line=""; for (const wd of s.split(" ")){
          const t = line + wd + " ";
          if (ctx.measureText(t).width > maxW){ ctx.fillText(line, x+12, yy); line = wd + " "; yy += lh; }
          else line = t;
        }
        ctx.fillText(line, x+12, yy); yy += 18;
      };
      for (const t of rules.text) wrap(t);
      ctx.restore();
    }

    function drawAudit(W:number,H:number){
      const x = W - rightPaneW(), y = headerH() + 16 + 240, w = rightPaneW() - 24, h = Math.min(260, H - y - 120);
      ctx.save();
      ctx.fillStyle = "#101820"; roundRectPath(x,y,w,h,12); ctx.fill();
      ctx.strokeStyle = "#225066"; ctx.lineWidth = 2; roundRectPath(x,y,w,h,12); ctx.stroke();
      ctx.fillStyle = "#bfefff"; ctx.font = "800 16px ui-sans-serif"; ctx.textAlign = "center";
      ctx.fillText("ЖУРНАЛ", x + w/2, y + 28);

      ctx.textAlign = "left"; ctx.font = "600 12px ui-sans-serif"; ctx.fillStyle = "#9cdcff";
      let yy = y + 50;
      for (const row of auditLog.slice(0, Math.floor((h-60)/16))){
        ctx.fillText(row, x + 12, yy); yy += 16;
      }
      ctx.restore();
    }

    function drawButtons(){
      const a = approveBtn(), d = denyBtn();
      // APPROVE
      ctx.save();
      ctx.fillStyle = "#0d2b23"; roundRectPath(a.x,a.y,a.w,a.h,14); ctx.fill();
      ctx.strokeStyle = "#20ffc1"; ctx.lineWidth = 2; roundRectPath(a.x,a.y,a.w,a.h,14); ctx.stroke();
      ctx.fillStyle = "#abfff0"; ctx.font = "900 18px ui-sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("APPROVE (A)", a.x + a.w/2, a.y + a.h/2);
      ctx.restore();
      // DENY
      ctx.save();
      ctx.fillStyle = "#2a1010"; roundRectPath(d.x,d.y,d.w,d.h,14); ctx.fill();
      ctx.strokeStyle = "#ff4d57"; ctx.lineWidth = 2; roundRectPath(d.x,d.y,d.w,d.h,14); ctx.stroke();
      ctx.fillStyle = "#ffd6db"; ctx.font = "900 18px ui-sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("DENY (D)", d.x + d.w/2, d.y + d.h/2);
      ctx.restore();
    }

    function drawFooter(W:number,H:number){
      ctx.save();
      ctx.fillStyle = "#bdefff"; ctx.font = "600 12px ui-sans-serif"; ctx.textAlign = "left";
      ctx.fillText("A — разрешить • D — отказать • N — следующий • H — подсказки • Перетаскивай документы мышью", 16, H - 16);
      ctx.restore();
    }

    function drawStamp(W:number,H:number,v:"APPROVED"|"DENIED", t:number){
      const cy = headerH() + 130;
      const cx = W * 0.5;
      const s = mix(0.6, 1, 1 - t);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((-0.25 + 0.5 * (1 - t)));
      ctx.scale(s, s);
      const w = 260, h = 86;
      const color = v === "APPROVED" ? "#20ffc1" : "#ff4d57";
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = color; ctx.lineWidth = 6; roundRectPath(-w/2,-h/2,w,h,10); ctx.stroke();
      ctx.globalAlpha = 0.95; ctx.fillStyle = color; ctx.font = "900 40px ui-sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(v, 0, 4);

      if (evalCache){
        ctx.globalAlpha = 1.0;
        const correct = (v === (evalCache.shouldApprove ? "APPROVED" : "DENIED"));
        const txt = correct ? "РЕШЕНИЕ ВЕРНО" : ("ОШИБКА: " + (evalCache.reasons[0] || "неверное решение"));
        ctx.font = "800 16px ui-sans-serif"; ctx.fillStyle = correct ? "#eafffb" : "#ffe3e5";
        ctx.fillText(txt, 0, h/2 + 24);
      }
      ctx.restore();
    }

    function drawGameOver(W:number,H:number){
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(0,0,W,H);
      ctx.fillStyle = "#ffe3e5"; ctx.font = "900 44px ui-sans-serif"; ctx.textAlign = "center";
      ctx.fillText("УВОЛЕН", W/2, H/2 - 24);
      ctx.font = "700 18px ui-sans-serif"; ctx.fillStyle = "#fff";
    ctx.fillText(`Счёт: ${credits} cr`, W/2, H/2 + 10);
      ctx.fillText(`Нажми F5, чтобы начать заново`, W/2, H/2 + 38);
      ctx.restore();
    }

    function drawTicker(W:number,H:number){
      const barH = 26;
      const y = headerH() - barH;
      const text = String(ticker);

      ctx.save();
      ctx.globalAlpha = 0.92;
      ctx.fillStyle = "#06121a"; ctx.fillRect(0, y, W, barH);
      ctx.strokeStyle = "#2dbddd"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();

      ctx.fillStyle = "#9be7ff"; ctx.font = "700 12px ui-sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "middle";

      const tw = ctx.measureText(text).width;
      const L = W + tw + 40;
      const t = performance.now() * 0.08;
      const x = W - (t % L);

      ctx.fillText(text, x, y + barH/2);
      ctx.fillText(text, x - L, y + barH/2);
      ctx.restore();
    }

    function drawHelp(W:number,H:number){
      const idx = Math.floor((performance.now() / 4000) % tips.length) | 0;
      const s = tips[idx];
      const w = Math.min(520, Math.max(320, Math.round(W * 0.4)));
      const h = 66;
      const x = 24;
      const y = H - h - 86;

      ctx.save();
      ctx.globalAlpha = 0.94;
      ctx.fillStyle = "#0b1b24"; roundRectPath(x,y,w,h,12); ctx.fill();
      ctx.strokeStyle = "#2dbddd"; ctx.lineWidth = 2; roundRectPath(x,y,w,h,12); ctx.stroke();

      ctx.fillStyle = "#c7f1ff"; ctx.font = "700 13px ui-sans-serif"; ctx.textAlign = "left";

      let yy = y + 24;
      const maxW = w - 24, lh = 18;
      let line = "";
      for (const wd of s.split(" ")){
        const t = line + wd + " ";
        if (ctx.measureText(t).width > maxW){
          ctx.fillText(line, x + 12, yy); line = wd + " "; yy += lh;
        } else line = t;
      }
      ctx.fillText(line, x + 12, yy);
      ctx.restore();
    }

    setReady(true);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0, background: "#061017" }}>
      <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />
    </div>
  );
} 
