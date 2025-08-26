"use client";

import React, { useEffect, useRef, useState } from "react";

/**
 * SECURITY INSPECTOR — /inspector (Fullscreen CyberSec Papers, Please-like)
 *
 * Новое:
 *  • 10 дней кампании + модификаторы (карантин, PKI-инцидент, визовый режим, кибер-угроза)
 *  • Новые проверки: ID-префикс по стране, риск-скор, белый список CA, возраст ≥18, разрешённые цели, транзит-дни
 *  • Усиленный анти-спуф (0↔o, 1↔l, 3↔e, 5↔s, 7↔t), совпадение имён во всех доках
 *  • Стабильный CYBER-QR (предгенерированный паттерн, без мерцания)
 *  • Ачивки: Perfect Day, 3-дн. стрик, Anti-Spoof Hunter, PKI Paranoid, Zero-Warnings
 *  • HUD/тикер, журнал аудита, конфетти при «идеале», сохранение прогресса (localStorage)
 *
 * Управление: A — Approve, D — Deny, N/Enter — Next, R — Restart, H — Help
 */

// ---------- Типы и утилиты ----------

type Vec2 = { x: number; y: number };

type CountryCode = "Nordland" | "Vesria" | "Kolechia" | "Redland";
type Purpose = "Visit" | "Work" | "Transit";

interface Passport {
  name: string;
  country: CountryCode;
  id: string;            // PREFIX-#####
  expires: number;       // день
  sex: "M" | "F";
  birth: string;         // YYYY-MM-DD
  photoHue: number;
}

interface Permit {
  name: string;
  purpose: Purpose;
  expires: number;
}

interface CyberPass {
  mfaCode: string;
  mfaValid: boolean;
  certExpires: number;
  idChecksumOk: boolean;
  malwareHashListed: boolean;
  issuer: "CN=Nordland Root" | "CN=GlobalTrust" | "CN=QuestionableCA";
  riskScore: number;       // 0..100
  qrBlocks: { x: number; y: number }[]; // стабильный «QR»
}

interface Applicant {
  passport: Passport;
  permit?: Permit;
  cyber: CyberPass;
  isCitizen: boolean;
  banned?: boolean;
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
  // базовые
  allowCitizensOnly?: boolean;
  foreignersNeedPermit?: boolean;
  denyExpiredPassport?: boolean;
  mustMatchName?: boolean;
  banCountry?: CountryCode;
  // кибер
  requireIdChecksum?: boolean;
  requireMFA?: boolean;
  requireValidCert?: boolean;
  denyMalwareHash?: boolean;
  antiSpoofName?: boolean;
  // расширенные
  requireCountryIdPrefix?: boolean;
  trustedIssuers?: Array<CyberPass["issuer"]>;
  maxRisk?: number; // допускать только ниже порога
  allowedPurposes?: Purpose[];
  transitOnly?: boolean; // день только транзита
  minAge?: number; // >=
}

interface EvalResult { shouldApprove: boolean; reasons: string[]; }

const maleNames = ["Anton","Boris","Dmitry","Egor","Felix","Gleb","Ivan","Kirill","Leo","Maks"];
const femaleNames = ["Alina","Bella","Daria","Elena","Eva","Inna","Lena","Nora","Olga","Vera"];
const countries: CountryCode[] = ["Nordland","Vesria","Kolechia","Redland"];
const purposes: Purpose[] = ["Visit","Work","Transit"];

const countryIdPrefix: Record<CountryCode,string> = {
  Nordland: "NRD", Vesria: "VSR", Kolechia: "KLC", Redland: "RDL"
};

const MAX_WARNINGS = 3;
const ENTRANTS_PER_DAY = 9;
const PAY_OK = 6;
const FINE_BAD = -10;

function clamp(v:number,a:number,b:number){ return Math.max(a, Math.min(b, v)); }
function mix(a:number,b:number,t:number){ return a + (b - a) * t; }
function rand(a:number,b:number){ return a + Math.random() * (b - a); }
function choice<T>(arr:T[]){ return arr[Math.floor(Math.random()*arr.length)]; }
function pad(n:number){ return n<10 ? "0"+n : ""+n; }
function ageFromBirth(birth:string){ // грубая оценка
  const y = parseInt(birth.slice(0,4),10);
  return clamp(2025 - (isNaN(y)?1990:y), 16, 70);
}
function idGen(prefix?:string){
  const head = prefix ?? (String.fromCharCode(65+Math.floor(Math.random()*26)) + String.fromCharCode(65+Math.floor(Math.random()*26)) + String.fromCharCode(65+Math.floor(Math.random()*26)));
  return `${head}-${Math.floor(10000+Math.random()*90000)}`;
}

// Luhn по цифрам
function luhnOk(digits:string){
  let sum=0, dbl=false;
  for (let i=digits.length-1;i>=0;i--){
    const c=digits[i]; if (c<'0'||c>'9') continue;
    let x = c.charCodeAt(0)-48;
    if (dbl){ x*=2; if (x>9) x-=9; }
    sum+=x; dbl=!dbl;
  }
  return sum % 10 === 0;
}

// Спуф-нормализация и карта
const homoglyphMap: Record<string,string> = { "0":"o","1":"l","3":"e","5":"s","7":"t" };
const reverseMap: Record<string,string> = { "o":"0","l":"1","e":"3","s":"5","t":"7" };
function normalizeName(s:string){
  return s.toLowerCase()
    .split("")
    .map(ch => homoglyphMap[ch] ?? ch)
    .join("");
}
function canonicalName(n:string){ return normalizeName(n.replace(/\*/g,"").trim()); }

function maybeSpoof(name:string){
  if (Math.random()<0.14){
    return { spoofed:true, out: name.replace(/[oletis]/i, m => reverseMap[m.toLowerCase()] ?? m) };
  }
  return { spoofed:false, out:name };
}

// ---------- Генераторы ----------

function stableQR(seed:number, count=28){
  // простейший LCG
  let s = (seed|0) ^ 0x9e3779b9;
  const arr:{x:number;y:number}[] = [];
  for (let i=0;i<count;i++){
    s = (s*1664525 + 1013904223) >>> 0;
    const x = 4 + (s % 52);
    s = (s*1664525 + 1013904223) >>> 0;
    const y = 4 + (s % 52);
    arr.push({x,y});
  }
  return arr;
}

function makePassport(today:number): Passport {
  const sex = Math.random()<0.5 ? "M" : "F";
  const name = sex==="M" ? choice(maleNames) : choice(femaleNames);
  const country = choice(countries);
  const expires = today + Math.floor(rand(-2, 7));
  const birth = `${1981 + Math.floor(Math.random()*20)}-${pad(1+Math.floor(Math.random()*12))}-${pad(1+Math.floor(Math.random()*28))}`;

  // 80% — корректный префикс, иначе «ошибка»
  const usePrefix = Math.random()<0.8;
  const id = idGen(usePrefix ? countryIdPrefix[country] : undefined);

  return { name, country, id, expires, sex, birth, photoHue: Math.floor(rand(0,360)) };
}

function makePermit(pass:Passport, today:number): Permit | undefined {
  // для граждан 25% случаев — без пермита, иначе 75% иностранцам и 25% граждан с Work
  const p: Purpose = choice(purposes);
  const maybeStar = Math.random()<0.12;
  return {
    name: maybeStar ? pass.name.replace(/.$/, c => (c==="a" ? "o" : c+"*")) : pass.name,
    purpose: p,
    expires: today + Math.floor(rand(-2, 7)),
  };
}

function makeCyber(pass:Passport, today:number): CyberPass {
  const digits = pass.id.replace(/\D/g,"");
  const checksum = luhnOk(digits);
  const mfaValid = Math.random() < 0.78;
  const certExpires = today + Math.floor(rand(-2, 7));
  const issuer = choice(["CN=Nordland Root","CN=GlobalTrust","CN=QuestionableCA"] as const);
  const malwareHashListed = Math.random() < 0.08;
  const mfaCode = String(Math.floor(Math.random()*1000000)).padStart(6,"0");
  // риск основан на флагах
  let risk = Math.floor(rand(5, 35));
  if (!checksum) risk += 25;
  if (!mfaValid) risk += 15;
  if (certExpires < today) risk += 20;
  if (issuer === "CN=QuestionableCA") risk += 12;
  if (malwareHashListed) risk += 30;
  risk = clamp(risk, 0, 100);
  const seed = parseInt(digits.slice(-6) || "0", 10) ^ risk;
  const qrBlocks = stableQR(seed, 34);
  return { mfaCode, mfaValid, certExpires, idChecksumOk: checksum, malwareHashListed, issuer, riskScore: risk, qrBlocks };
}

function makeApplicant(today:number): Applicant {
  const passport = makePassport(today);
  const isCitizen = passport.country === "Nordland";
  const permit = (!isCitizen || Math.random()<0.25) ? makePermit(passport, today) : undefined;

  let spoofed = false;
  if (permit && Math.random()<0.5){
    const s = maybeSpoof(permit.name); permit.name = s.out; spoofed ||= s.spoofed;
  } else if (Math.random()<0.2){
    const s = maybeSpoof(passport.name); passport.name = s.out; spoofed ||= s.spoofed;
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

// ---------- Правила по дням + модификаторы ----------

type Modifier =
  | { kind: "quarantine"; country: CountryCode }
  | { kind: "pki_incident"; allowOnly: Array<CyberPass["issuer"]> }
  | { kind: "transit_day" }
  | { kind: "high_risk_day"; cap: number };

function rulesForDay(day:number, mod?:Modifier): Rules {
  // Базовые правила по дням (1..10)
  const base: Rules[] = [
    // 1
    {
      day: 1,
      text: ["День 1: Въезд только для граждан Nordland.", "Иностранцам — ОТКАЗ."],
      allowCitizensOnly: true,
    },
    // 2
    {
      day: 2,
      text: ["День 2: Иностранцам — только при наличии разрешения.", "Паспорт должен быть действителен.", "ID обязан проходить чексумму Luhn."],
      foreignersNeedPermit: true,
      denyExpiredPassport: true,
      requireIdChecksum: true,
    },
    // 3
    {
      day: 3,
      text: [
        "День 3: Совпадение имён (анти-спуф) обязательно.",
        "Требуется валидный MFA и неистёкший TLS.",
        "Запрещён въезд граждан Redland.",
        "Хэш в базе вредоносов = ОТКАЗ."
      ],
      foreignersNeedPermit: true,
      denyExpiredPassport: true,
      mustMatchName: true,
      requireMFA: true,
      requireValidCert: true,
      denyMalwareHash: true,
      banCountry: "Redland",
      antiSpoofName: true
    },
    // 4
    {
      day: 4,
      text: [
        "День 4: ID должен иметь корректный префикс по стране (NRD/VSR/KLC/RDL).",
        "Допускаются только низкорисковые (< 60)."
      ],
      foreignersNeedPermit: true,
      denyExpiredPassport: true,
      mustMatchName: true,
      requireMFA: true,
      requireValidCert: true,
      requireCountryIdPrefix: true,
      maxRisk: 60
    },
    // 5
    {
      day: 5,
      text: [
        "День 5: Въезд лиц младше 18 — запрещён.",
        "Разрешённые цели: Visit, Work."
      ],
      foreignersNeedPermit: true,
      denyExpiredPassport: true,
      mustMatchName: true,
      requireMFA: true,
      requireValidCert: true,
      requireCountryIdPrefix: true,
      maxRisk: 55,
      minAge: 18,
      allowedPurposes: ["Visit","Work"]
    },
    // 6
    {
      day: 6,
      text: [
        "День 6: Transit-пассажиры должны иметь валидные коды и TLS.",
        "RISK < 50. QuestionableCA допускается только при неистёкшем сертификате."
      ],
      foreignersNeedPermit: true,
      denyExpiredPassport: true,
      mustMatchName: true,
      requireMFA: true,
      requireValidCert: true,
      requireCountryIdPrefix: true,
      maxRisk: 50
    },
    // 7
    {
      day: 7,
      text: [
        "День 7: Жёсткий PKI-режим — доверяем только Nordland Root и GlobalTrust.",
        "RISK < 45. Любые несоответствия имён — ОТКАЗ."
      ],
      foreignersNeedPermit: true,
      denyExpiredPassport: true,
      mustMatchName: true,
      antiSpoofName: true,
      requireMFA: true,
      requireValidCert: true,
      requireCountryIdPrefix: true,
      maxRisk: 45,
      trustedIssuers: ["CN=Nordland Root","CN=GlobalTrust"]
    },
    // 8
    {
      day: 8,
      text: [
        "День 8: Только транзит. Разрешения обязательны для иностранцев.",
        "RISK < 40. QuestionableCA — ОТКАЗ."
      ],
      foreignersNeedPermit: true,
      denyExpiredPassport: true,
      mustMatchName: true,
      antiSpoofName: true,
      requireMFA: true,
      requireValidCert: true,
      requireCountryIdPrefix: true,
      transitOnly: true,
      maxRisk: 40,
      trustedIssuers: ["CN=Nordland Root","CN=GlobalTrust"]
    },
    // 9
    {
      day: 9,
      text: [
        "День 9: Визовый режим ужесточён. Только цели: Work.",
        "RISK < 35. Любой сомнительный издатель — ОТКАЗ."
      ],
      foreignersNeedPermit: true,
      denyExpiredPassport: true,
      mustMatchName: true,
      antiSpoofName: true,
      requireMFA: true,
      requireValidCert: true,
      requireCountryIdPrefix: true,
      maxRisk: 35,
      allowedPurposes: ["Work"],
      trustedIssuers: ["CN=Nordland Root","CN=GlobalTrust"]
    },
    // 10
    {
      day: 10,
      text: [
        "День 10: Критический уровень угрозы.",
        "RISK < 30. Только белые CA. Любая просрочка/несовпадение — ОТКАЗ."
      ],
      foreignersNeedPermit: true,
      denyExpiredPassport: true,
      mustMatchName: true,
      antiSpoofName: true,
      requireMFA: true,
      requireValidCert: true,
      requireCountryIdPrefix: true,
      maxRisk: 30,
      trustedIssuers: ["CN=Nordland Root","CN=GlobalTrust"]
    },
  ];

  const idx = clamp(day, 1, 10) - 1;
  const r = { ...base[idx] };

  // применяем модификатор дня
  if (mod?.kind === "quarantine") {
    r.text = [...r.text, `Карантин: граждане ${mod.country} временно не допускаются.`];
    r.banCountry = mod.country;
  } else if (mod?.kind === "pki_incident") {
    r.text = [...r.text, "PKI-инцидент: разрешены только издатели:", ...mod.allowOnly];
    r.trustedIssuers = mod.allowOnly.slice();
    r.requireValidCert = true;
  } else if (mod?.kind === "transit_day") {
    r.text = [...r.text, "Только транзит в течение дня."];
    r.transitOnly = true;
  } else if (mod?.kind === "high_risk_day") {
    r.text = [...r.text, `Усиление: RISK < ${mod.cap}.`];
    r.maxRisk = Math.min(r.maxRisk ?? 100, mod.cap);
  }

  return r;
}

// ---------- Оценка заявителя ----------

function evaluate(app: Applicant, rules: Rules, today: number): EvalResult {
  const reasons: string[] = [];

  // базовые
  if (rules.allowCitizensOnly && !app.isCitizen) reasons.push("Иностранцам сегодня нельзя");
  if (rules.banCountry && app.passport.country === rules.banCountry) reasons.push(`Граждане ${rules.banCountry} не допускаются`);
  if (rules.denyExpiredPassport && app.passport.expires < today) reasons.push("Паспорт просрочен");

  // возраст
  if (rules.minAge && ageFromBirth(app.passport.birth) < rules.minAge) reasons.push(`Младше ${rules.minAge}`);

  // пермит
  if (!app.isCitizen && rules.foreignersNeedPermit) {
    if (!app.permit) reasons.push("Нет разрешения у иностранца");
    else if (app.permit.expires < today) reasons.push("Разрешение просрочено");
  }

  // цели
  if (rules.transitOnly) {
    if (!app.permit || app.permit.purpose !== "Transit") reasons.push("Сегодня разрешён только транзит");
  }
  if (rules.allowedPurposes && app.permit) {
    if (!rules.allowedPurposes.includes(app.permit.purpose)) reasons.push(`Запрещённая цель: ${app.permit.purpose}`);
  }

  // анти-спуф и совпадение имён
  if (rules.mustMatchName) {
    if (app.permit) {
      const p = canonicalName(app.passport.name);
      const q = canonicalName(app.permit.name);
      if (p !== q) reasons.push("Имя в паспорте и разрешении не совпадает (анти-спуф)");
    }
  }
  if (rules.antiSpoofName) {
    // даже без пермита проверим «подозрение» (косвенно)
    if (/[0|1|3|5|7]/.test(app.passport.name)) reasons.push("Подозрение на гомоглифы в имени");
  }

  // кибер-часть
  if (rules.requireIdChecksum && !app.cyber.idChecksumOk) reasons.push("ID не проходит Luhn");
  if (rules.requireMFA && !app.cyber.mfaValid) reasons.push("MFA не прошёл проверку");
  if (rules.requireValidCert) {
    if (app.cyber.certExpires < today) reasons.push("TLS-сертификат истёк");
  }
  if (rules.trustedIssuers) {
    if (!rules.trustedIssuers.includes(app.cyber.issuer)) reasons.push("Издатель сертификата вне белого списка");
  } else if (rules.requireValidCert) {
    if (app.cyber.issuer === "CN=QuestionableCA") reasons.push("Сомнительный издатель сертификата");
  }
  if (rules.denyMalwareHash && app.cyber.malwareHashListed) reasons.push("Хэш найден в базе зловредов");
  if (rules.requireCountryIdPrefix) {
    const pref = app.passport.id.split("-")[0];
    if (pref !== countryIdPrefix[app.passport.country]) reasons.push("Неверный ID-префикс для страны");
  }
  if (rules.maxRisk !== undefined && app.cyber.riskScore >= rules.maxRisk) reasons.push(`RISK ${app.cyber.riskScore} ≥ ${rules.maxRisk}`);

  return { shouldApprove: reasons.length === 0, reasons };
}

// ---------- Компонент ----------

export default function Page(){
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // для отрисовки панелей «ачивки/прогресс»
  const [uiReady, setUiReady] = useState(false);

  useEffect(() => {
    const cvs = canvasRef.current!;
    const ctx = cvs.getContext("2d")!;

    // Ретина-ресайз
    function resize(){
      const DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      const w = window.innerWidth, h = window.innerHeight;
      cvs.style.width = w + "px"; cvs.style.height = h + "px";
      cvs.width = Math.floor(w * DPR); cvs.height = Math.floor(h * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize, { passive: true });

    // ---------- Состояние игры ----------
    let day = 1;
    let today = 1;
    let processedToday = 0;
    let modifier: Modifier | undefined = randomModifier();
    let rules = rulesForDay(day, modifier);

    // Прогресс
    let warnings = 0;
    let credits = 0;
    let bestDay = loadNumber("insp_best_day", 1);
    let totalApprovals = loadNumber("insp_total_approvals", 0);

    // ачивки
    let perfectToday = true;
    let perfectStreak = 0;
    let caughtSpoofs = 0;
    let pkiParanoid = 0;

    const achievements = new Set<string>(loadArray("insp_achv", []));

    let current: Applicant | null = null;
    let evalCache: EvalResult | null = null;
    let verdict: "APPROVED" | "DENIED" | null = null;
    let verdictTime = 0;

    // Документы
    const mkRects = () => {
      const W = window.innerWidth, H = window.innerHeight;
      const baseY = Math.max(146, Math.round(H*0.22));
      return {
        passportRect: { kind:"passport", x: Math.round(W*0.28), y: baseY+36, w: 330, h: 206 } as DocRect,
        permitRect:   { kind:"permit",   x: Math.round(W*0.60), y: baseY+10, w: 312, h: 180 } as DocRect,
        cyberRect:    { kind:"cyber",    x: Math.round(W*0.40), y: baseY+220, w: 350, h: 198 } as DocRect,
      };
    };
    let { passportRect, permitRect, cyberRect } = mkRects();

    // Ввод
    const mouse = { x:0, y:0, down:false };
    function ptIn(mx:number,my:number,r:{x:number,y:number,w:number,h:number}){ return mx>=r.x && mx<=r.x+r.w && my>=r.y && my<=r.y+r.h; }

    // Журнал/тикер/советы
    const auditLog: string[] = [];
    const tips = [
      "Совет: проверяй Luhn у ID — быстрый индикатор подделки.",
      "Совет: QuestionableCA — красный флаг в кризисные дни.",
      "Совет: анти-спуф (0↔o, 1↔l, 3↔e, 5↔s, 7↔t).",
      "Совет: ID-префикс должен совпадать со страной.",
      "Совет: следи за дневными модификаторами — они меняют правила.",
    ];
    const tickerThreats = [
      "SOC: Фишинг с доменов vesria-mail[.]com и redland-post[.]net",
      "SOC: Невалидные цепочки TLS у GlobalTrust — проверяйте срок",
      "SOC: Поток малвари из Redland — не игнорируйте риск-скор",
      "SOC: Гомоглифные атаки в именах усилились",
    ];
    let ticker = choice(tickerThreats);
    let showHelp = true;

    function pushLog(s:string){
      auditLog.unshift(`[Day ${day}] ${s}`);
      if (auditLog.length > 20) auditLog.pop();
    }

    function newApplicant(){
      current = makeApplicant(today);
      evalCache = null; verdict = null; verdictTime = 0;
      ({ passportRect, permitRect, cyberRect } = mkRects());
      // косвенно — найден спуф
      if (current?.spoofed) caughtSpoofs++;
    }

    function saveProgress(){
      saveNumber("insp_best_day", Math.max(bestDay, day));
      saveNumber("insp_total_approvals", totalApprovals);
      saveArray("insp_achv", Array.from(achievements));
    }

    // модификатор дня (случайный, но не чаще чем раз в 2 дня)
    function randomModifier(): Modifier | undefined {
      const roll = Math.random();
      if (roll < 0.18) return { kind:"quarantine", country: choice(["Vesria","Kolechia","Redland"]) };
      if (roll < 0.33) return { kind:"pki_incident", allowOnly:["CN=Nordland Root"] };
      if (roll < 0.42) return { kind:"transit_day" };
      if (roll < 0.55) return { kind:"high_risk_day", cap: 45 };
      return undefined;
    }

    // ---------- Ввод ----------
    function onPointerMove(e:PointerEvent){
      const r = cvs.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
      dragUpdate();
    }
    function onPointerDown(e:PointerEvent){
      if (e.button !== 0) return;
      mouse.down = true;
      dragStart(mouse.x, mouse.y);
      const a = approveBtn(); const d = denyBtn();
      if (ptIn(mouse.x, mouse.y, a)) doVerdict(true);
      else if (ptIn(mouse.x, mouse.y, d)) doVerdict(false);
    }
    function onPointerUp(){ mouse.down = false; dragEnd(); }
    function onKey(e:KeyboardEvent){
      if (e.type!=="keydown") return;
      if (e.code==="KeyA") doVerdict(true);
      if (e.code==="KeyD") doVerdict(false);
      if (e.code==="KeyN" || e.code==="Enter") nextIfReady();
      if (e.code==="KeyH") { showHelp=!showHelp; }
      if (e.code==="KeyR") { hardRestart(); }
    }

    window.addEventListener("pointermove", onPointerMove, { passive:true });
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp, { passive:true });
    window.addEventListener("keydown", onKey);

    // Drag
    function dragStart(mx:number,my:number){
      for (const r of [cyberRect, permitRect, passportRect]){ // top-most first
        if (ptIn(mx,my,r)){ r.dragging = true; r.dx = mx - r.x; r.dy = my - r.y; return; }
      }
    }
    function dragUpdate(){
      for (const r of [passportRect, permitRect, cyberRect]){
        if (r.dragging){ r.x = mouse.x - (r.dx||0); r.y = mouse.y - (r.dy||0); }
      }
    }
    function dragEnd(){ passportRect.dragging=false; permitRect.dragging=false; cyberRect.dragging=false; }

    // Вердикт
    function doVerdict(approve:boolean){
      if (!current || verdict) return;
      const res = evalCache || evaluate(current, rules, today);
      evalCache = res;
      verdict = approve ? "APPROVED" : "DENIED";
      verdictTime = 1.0;

      const correct = (approve === res.shouldApprove);
      credits += correct ? PAY_OK : FINE_BAD;
      if (!correct){ warnings += 1; perfectToday = false; }
      else { totalApprovals++; if (current.cyber.issuer!=="CN=QuestionableCA") pkiParanoid++; }

      pushLog(`${approve ? "APPROVE" : "DENY"} — ${correct ? "OK" : "ERR"}${res.reasons.length ? ` | ${res.reasons.join("; ")}` : ""}`);

      setTimeout(() => {
        processedToday += 1;
        if (Math.random()<0.2){ ticker = choice(tickerThreats); pushLog(`SOC: ${ticker}`); }

        if (warnings >= MAX_WARNINGS){
          // Game Over — остаёмся на экране
          saveProgress();
        } else if (processedToday >= ENTRANTS_PER_DAY){
          // конец дня
          if (perfectToday){
            achievements.add("Perfect Day");
            perfectStreak++;
            if (perfectStreak>=3) achievements.add("Perfect Streak x3");
            burstConfetti();
          } else {
            perfectStreak = 0;
          }
          if (caughtSpoofs>=5) achievements.add("Anti-Spoof Hunter");
          if (pkiParanoid>=12) achievements.add("PKI Paranoid");
          if (warnings===0) achievements.add("Zero Warnings");

          day = clamp(day + 1, 1, 10);
          bestDay = Math.max(bestDay, day);
          today += 1;
          processedToday = 0;
          warnings = 0;
          perfectToday = true;
          caughtSpoofs = 0;
          pkiParanoid = 0;

          // новый модификатор через день
          if (day % 2 === 0) modifier = randomModifier();
          rules = rulesForDay(day, modifier);
          pushLog(`Начинается День ${day}`);
          saveProgress();
        }
        newApplicant();
      }, 900);
    }
    function nextIfReady(){ if (!current) newApplicant(); }

    function hardRestart(){
      day = 1; today = 1; processedToday = 0; warnings = 0; credits = 0;
      perfectStreak = 0; caughtSpoofs = 0; pkiParanoid = 0; achievements.clear();
      modifier = randomModifier();
      rules = rulesForDay(day, modifier);
      pushLog("Новая смена начата");
      newApplicant();
    }

    // ---------- Инициализация ----------
    newApplicant();

    // ---------- Цикл ----------
    let last = performance.now();
    let raf = 0;
    const confetti: {x:number;y:number;vx:number;vy:number;life:number}[] = [];

    function burstConfetti(){
      const W = window.innerWidth; const H = window.innerHeight;
      for (let i=0;i<80;i++){
        const ang = rand(-Math.PI, 0); const spd = rand(1.2, 2.4);
        confetti.push({
          x: W*0.5 + rand(-80,80), y: H*0.28 + rand(-20,20),
          vx: Math.cos(ang)*spd, vy: Math.sin(ang)*spd - 1.2,
          life: 1
        });
      }
    }

    function tick(){
      const now = performance.now(); const dt = Math.min(32, now - last); last = now;
      update(dt);
      draw();
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    function update(dt:number){
      if (verdictTime>0) verdictTime = Math.max(0, verdictTime - dt*0.004);
      // конфетти
      for (const p of confetti){
        p.x += p.vx * dt * 0.8;
        p.y += p.vy * dt * 0.8;
        p.vy += 0.002*dt;
        p.life -= 0.008*dt;
      }
      while (confetti.length && confetti[0].life<=0) confetti.shift();
    }

    // ---------- Рендер ----------
    function headerH(){ return Math.max(120, Math.round(window.innerHeight * 0.16)); }
    function rightPaneW(){ return Math.min(380, Math.max(280, Math.round(window.innerWidth * 0.26))); }

    function approveBtn(){
      const W = window.innerWidth, H = window.innerHeight;
      const w = Math.min(230, Math.max(180, Math.round(W * 0.18)));
      const h = 58; const y = H - h - 22; const gap = 18;
      const x = Math.round(W/2 - w - gap/2);
      return { x, y, w, h };
    }
    function denyBtn(){
      const W = window.innerWidth, H = window.innerHeight;
      const w = Math.min(230, Math.max(180, Math.round(W * 0.18)));
      const h = 58; const y = H - h - 22; const gap = 18;
      const x = Math.round(W/2 + gap/2);
      return { x, y, w, h };
    }

    function draw(){
      const W = window.innerWidth, H = window.innerHeight;

      // BG с мягким неоном + виньеткой
      const bg = ctx.createLinearGradient(0,0,0,H);
      bg.addColorStop(0, "#061018"); bg.addColorStop(1, "#0b1620");
      ctx.fillStyle = bg; ctx.fillRect(0,0,W,H);
      ctx.fillStyle = "rgba(255,255,255,0.04)";
      for (let y=0;y<H;y+=3){ ctx.fillRect(0,y,W,1); } // скан-лайны
      ctx.fillStyle = "rgba(0,0,0,0.25)"; // виньетка
      ctx.beginPath();
      ctx.roundRect(-20,-20,W+40,H+40,40);
      ctx.strokeStyle = "rgba(52,241,255,0.05)";
      ctx.stroke();

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
      drawModifiersBadge(W,H);

      drawButtons();
      drawFooter(W,H);

      if (verdict && verdictTime>0 && current) drawStamp(W,H,verdict,verdictTime);
      if (warnings >= MAX_WARNINGS) drawGameOver(W,H);
      drawTicker(W,H);
      if (showHelp) drawHelp(W,H);

      // Конфетти
      for (const p of confetti){
        ctx.globalAlpha = clamp(p.life,0,1);
        ctx.fillStyle = `hsl(${(p.x+p.y)%360},90%,60%)`;
        ctx.fillRect(p.x, p.y, 3, 6);
        ctx.globalAlpha = 1;
      }

      setUiReady(true);
    }

    function drawHeader(W:number,H:number){
      const HH = headerH();
      ctx.save();
      // панель
      const lg = ctx.createLinearGradient(0,0,0,HH);
      lg.addColorStop(0,"#0b1b24"); lg.addColorStop(1,"#0a1720");
      ctx.fillStyle = lg; ctx.fillRect(0,0,W,HH);
      ctx.strokeStyle = "#163142"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0,HH); ctx.lineTo(W,HH); ctx.stroke();

      ctx.fillStyle = "#ccf5ff"; ctx.font = "900 24px ui-sans-serif, system-ui"; ctx.textAlign = "left";
      ctx.fillText("SECURITY INSPECTOR", 24, 36);

      ctx.font = "700 14px ui-sans-serif"; ctx.fillStyle = "#a6e9ff";
      ctx.fillText(`ДЕНЬ: ${day}/10`, 24, 64);
      ctx.fillText(`ПОСЕТИТЕЛЕЙ: ${processedToday}/${ENTRANTS_PER_DAY}`, 24, 86);
      ctx.fillText(`ПРЕДУПРЕЖДЕНИЙ: ${warnings}/${MAX_WARNINGS}`, 24, 108);

      ctx.textAlign = "right";
      ctx.fillText(`ЖАЛОВАНЬЕ: ${credits} cr`, W - 24, 36);
      ctx.fillText(`ЛУЧШИЙ ДЕНЬ: ${bestDay}`, W - 24, 58);
      ctx.fillText(`ОДОБРЕНО ВСЕГО: ${totalApprovals}`, W - 24, 80);

      // ачивки (иконки-бейджи)
      const badges = badgeList(achievements);
      let bx = W - 24; const by = 102;
      ctx.textAlign = "right"; ctx.font = "700 12px ui-sans-serif"; ctx.fillStyle = "#bfefff";
      for (const b of badges){ bx -= 84; drawBadge(bx, by-18, b); }

      ctx.restore();
    }

    function drawBadge(x:number,y:number,label:string){
      ctx.save();
      ctx.fillStyle = "rgba(50,220,255,0.08)";
      ctx.roundRect(x, y, 80, 24, 10); ctx.fill();
      ctx.strokeStyle = "#2dbddd"; ctx.lineWidth = 1; ctx.roundRect(x,y,80,24,10); ctx.stroke();
      ctx.fillStyle = "#d6fbff"; ctx.font = "700 11px ui-sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(label, x+40, y+12);
      ctx.restore();
    }

    function drawDesk(W:number,H:number){
      const y = headerH();
      const h = H - y;
      ctx.save();
      const grd = ctx.createLinearGradient(0,y,0,y+h);
      grd.addColorStop(0,"#0a1119"); grd.addColorStop(1,"#0b1822");
      ctx.fillStyle = grd; ctx.fillRect(0,y,W,h);
      ctx.shadowColor = "#36e6ff"; ctx.shadowBlur = 22;
      ctx.strokeStyle = "rgba(54,230,255,0.45)"; ctx.lineWidth = 1.5; ctx.strokeRect(0.5, y+0.5, W-1, h-1);
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
      const x = 24, y = headerH() + 16, w = 224, h = 286;
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

      const px = r.x + 14, py = r.y + 14, pw = 92, ph = 112;
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
      ctx.fillText(`Рожд.: ${pass.birth} (≈${ageFromBirth(pass.birth)})`, tx, ty+106);
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
      ctx.fillText(`RISK: ${c.riskScore}`, tx, ty+106);

      // стабильный псевдо-QR
      const qx = r.x + r.w - 80, qy = r.y + 20;
      ctx.strokeStyle = "#a780ff"; ctx.lineWidth = 1; ctx.strokeRect(qx, qy, 60, 60);
      for (const b of c.qrBlocks){
        ctx.fillStyle = (b.x + b.y) % 2 ? "#a780ff" : "#6d52b3";
        ctx.fillRect(qx + b.x, qy + b.y, 3, 3);
      }

      ctx.restore();
    }

    function drawRulebook(W:number,H:number){
      const x = W - rightPaneW(), y = headerH() + 16, w = rightPaneW() - 24, h = 230;
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
      const x = W - rightPaneW(), y = headerH() + 16 + 244, w = rightPaneW() - 24, h = Math.min(270, H - y - 128);
      ctx.save();
      ctx.fillStyle = "#101820"; roundRectPath(x,y,w,h,12); ctx.fill();
      ctx.strokeStyle = "#225066"; ctx.lineWidth = 2; roundRectPath(x,y,w,h,12); ctx.stroke();
      ctx.fillStyle = "#bfefff"; ctx.font = "800 16px ui-sans-serif"; ctx.textAlign = "center";
      ctx.fillText("ЖУРНАЛ", x + w/2, y + 28);

      ctx.textAlign = "left"; ctx.font = "600 12px ui-sans-serif"; ctx.fillStyle = "#9cdcff";
      let yy = y + 50;
      for (const row of auditLog.slice(0, Math.floor((h-60)/16))){ ctx.fillText(row, x + 12, yy); yy += 16; }
      ctx.restore();
    }

    function drawModifiersBadge(W:number,H:number){
      if (!modifier) return;
      const label = (
        modifier.kind==="quarantine" ? `КАРАНТИН: ${modifier.country}` :
        modifier.kind==="pki_incident" ? `PKI-ИНЦИДЕНТ` :
        modifier.kind==="transit_day" ? `ДЕНЬ ТРАНЗИТА` :
        `HIGH-RISK CAP`
      );
      const w = 180, h = 26, x = 24, y = headerH() - h - 4;
      ctx.save();
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.roundRect(x,y,w,h,10); ctx.fill();
      ctx.strokeStyle = "#ffd54a"; ctx.lineWidth = 1; ctx.roundRect(x,y,w,h,10); ctx.stroke();
      ctx.fillStyle = "#ffeaa0"; ctx.font = "800 12px ui-sans-serif"; ctx.textAlign ="center"; ctx.textBaseline="middle";
      ctx.fillText(label, x + w/2, y + h/2);
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
      ctx.fillText("A — разрешить • D — отказать • N/Enter — следующий • R — рестарт • H — подсказки • Перетаскивай документы мышью", 16, H - 16);
      ctx.restore();
    }

    function drawStamp(W:number,H:number,v:"APPROVED"|"DENIED", t:number){
      const cy = headerH() + 128;
      const cx = W * 0.5;
      const s = mix(0.6, 1, 1 - t);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((-0.25 + 0.5 * (1 - t)));
      ctx.scale(s, s);
      const w = 268, h = 92;
      const color = v === "APPROVED" ? "#20ffc1" : "#ff4d57";
      ctx.globalAlpha = 0.93;
      ctx.strokeStyle = color; ctx.lineWidth = 6; roundRectPath(-w/2,-h/2,w,h,10); ctx.stroke();
      ctx.globalAlpha = 0.98; ctx.fillStyle = color; ctx.font = "900 40px ui-sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
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
      ctx.fillText(`Нажми R, чтобы начать заново`, W/2, H/2 + 38);
      ctx.restore();
    }

    function drawTicker(W:number,H:number){
      const barH = 26; const y = headerH() - barH; const text = String(ticker);
      ctx.save();
      ctx.globalAlpha = 0.92;
      ctx.fillStyle = "#06121a"; ctx.fillRect(0,y,W,barH);
      ctx.strokeStyle = "#2dbddd"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke();

      ctx.fillStyle = "#9be7ff"; ctx.font = "700 12px ui-sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
      const tw = ctx.measureText(text).width; const L = W + tw + 40; const t = performance.now() * 0.08;
      const x = W - (t % L);
      ctx.fillText(text, x, y + barH/2);
      ctx.fillText(text, x - L, y + barH/2);
      ctx.restore();
    }

    function drawHelp(W:number,H:number){
      const idx = Math.floor((performance.now() / 4200) % tips.length) | 0;
      const s = tips[idx];
      const w = Math.min(540, Math.max(320, Math.round(W * 0.42)));
      const h = 68; const x = 24; const y = H - h - 88;

      ctx.save();
      ctx.globalAlpha = 0.94;
      ctx.fillStyle = "#0b1b24"; roundRectPath(x,y,w,h,12); ctx.fill();
      ctx.strokeStyle = "#2dbddd"; ctx.lineWidth = 2; roundRectPath(x,y,w,h,12); ctx.stroke();

      ctx.fillStyle = "#c7f1ff"; ctx.font = "700 13px ui-sans-serif"; ctx.textAlign = "left";
      let yy = y + 24; const maxW = w - 24, lh = 18; let line = "";
      for (const wd of s.split(" ")){
        const t = line + wd + " ";
        if (ctx.measureText(t).width > maxW){ ctx.fillText(line, x+12, yy); line = wd + " "; yy += lh; }
        else line = t;
      }
      ctx.fillText(line, x+12, yy);
      ctx.restore();
    }

    // --- utils: бейджи/сохранение ---
    function badgeList(set:Set<string>): string[] {
      const all = ["Perfect Day","Perfect Streak x3","Anti-Spoof Hunter","PKI Paranoid","Zero Warnings"];
      return all.filter(b => set.has(b));
    }
    function loadNumber(k:string, def:number){ try{ const v = Number(localStorage.getItem(k)); return isNaN(v)?def:v; }catch{ return def; } }
    function saveNumber(k:string, v:number){ try{ localStorage.setItem(k, String(v)); }catch{} }
    function loadArray(k:string, def:string[]){ try{ const v = localStorage.getItem(k); return v? JSON.parse(v) : def; }catch{ return def; } }
    function saveArray(k:string, arr:string[]){ try{ localStorage.setItem(k, JSON.stringify(arr)); }catch{} }

    setUiReady(true);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointerMove as any);
      window.removeEventListener("pointerdown", onPointerDown as any);
      window.removeEventListener("pointerup", onPointerUp as any);
      window.removeEventListener("keydown", onKey as any);
      window.removeEventListener("resize", resize as any);
    };
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0, background: "#061017" }}>
      <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />
      {/* Лёгкая подсказка поверх (монтируется один раз) */}
      {uiReady ? null : <div style={{position:"absolute",inset:0,display:"grid",placeItems:"center",color:"#bfefff",fontWeight:800}}>Loading…</div>}
    </div>
  );
}
