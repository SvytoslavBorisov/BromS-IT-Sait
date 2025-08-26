"use client";

import React, { useEffect, useRef, useState } from "react";

/**
 * Top-Down Life Sim — тёплый «лайт-Stardew», Fullscreen + Город в центре со стенами
 *
 * Управление:
 *  • WASD/Стрелки — ходьба
 *  • ЛКМ / Space — действовать/удар
 *  • E — взаимодействовать (кровать/лавка/сбор под ногами)
 *  • F — говорить с NPC (выбор ответов 1/2/3…, Esc — закрыть)
 *  • Tab или 1–4 — инструменты: [1] Тяпка, [2] Лейка, [3] Топор/Кирка/Удочка, [4] Семена
 *  • I — инвентарь, Q — квесты, B — магазин (рядом с лавкой), T — спать (у кровати)
 */

type Vec2 = { x: number; y: number };
type Tool = "hoe" | "can" | "tool" | "seeds";

type Item =
  | "wood" | "stone" | "fiber"
  | "parsnip_seed" | "parsnip"
  | "potato_seed" | "potato"
  | "wheat_seed" | "wheat"
  | "berry" | "fish" | "slime_goo";

type Weather = "sunny" | "rain";
type CropKind = "parsnip" | "potato" | "wheat";

interface Player {
  pos: Vec2; vel: Vec2; dir: number;
  speed: number; hp: number; stamina: number;
  tool: Tool; attackTimer: number; attackCd: number;
}

interface CropTile {
  tilled: boolean;
  watered: boolean;
  planted?: { kind: CropKind; stage: number; maxStage: number; };
}

interface Enemy {
  id: number;
  pos: Vec2; vel: Vec2; hp: number; aggro: boolean; wanderT: number;
}

interface Node {
  id: number; kind: "tree" | "rock" | "bush";
  pos: Vec2; hp: number; maxHp: number; respawnDay: number;
}

interface NPC {
  id: "mira" | "boris" | "lina";
  name: string; pos: Vec2;
  friendship: number; questState: "none" | "asked" | "ready" | "done";
}

interface Quest {
  id: "mira_wood" | "boris_stone" | "lina_fish";
  title: string; desc: string;
  needItem: Item; needCount: number; giver: NPC["id"];
  rewardG: number; state: "active" | "done";
}

interface Toast { x:number; y:number; text:string; life:number; }

interface Rect { x:number; y:number; w:number; h:number; }

const WORLD_W = 8000;
const WORLD_H = 6000;
const TILE = 40;
const SAVE_KEY = "topdown_farm_v3";

const MAX_HP = 100;
const MAX_ST = 100;
const CAMERA_LERP = 0.18;

const DAY_START_MIN = 6*60;
const DAY_END_MIN   = 26*60;
const MINUTES_PER_SEC = 18;

// Дом/ферма на юго-западе
const HOUSE: Rect = { x: 420,  y: 420,  w: 280, h: 220 };
const BED:   Rect = { x: HOUSE.x+44, y: HOUSE.y+128, w: 68, h: 40 };
const FARM:  Rect = { x: 720,  y: 720,  w: 1400, h: 1000 };

// Город в центре мира, окружён стенами; ворота N/E/S/W
const CITY: Rect = {
  x: WORLD_W/2 - 1000,
  y: WORLD_H/2 - 800,
  w: 2000, h: 1600
};
const GATE_W = 170;
const WALL_T = 40;

// Прочие зоны
const LAKE:  Rect = { x: CITY.x - 900, y: CITY.y + CITY.h + 200, w: 1100,  h: 520 };
const FOREST:Rect = { x: 300,  y: 1800, w: 1700, h: 1400 };
const MOUNT: Rect = { x: WORLD_W - 2200, y: 1600, w: 1500, h: 1400 };

// Лавка внутри города
const SHOP:  Rect = { x: CITY.x + CITY.w/2 - 180, y: CITY.y + 360, w: 360, h: 220 };

const ENEMY_R = 16;
const ENEMY_SPEED = 0.11;
const ENEMY_AGGRO_DIST = 420;
const COLLISION_DMG_PER_SEC = 7;

const ATTACK_ARC = Math.PI/2.6;
const ATTACK_RANGE = 90;
const ATTACK_SWISH = 140;
const ATTACK_CD = 380;
const ATTACK_DMG = 32;

const CropDefs: Record<CropKind, { stages:number; buy:number; sell:number }> = {
  parsnip: { stages: 3, buy: 8, sell: 20 },
  potato:  { stages: 4, buy: 12, sell: 28 },
  wheat:   { stages: 3, buy: 6, sell: 16 },
};

// ---- utils
const clamp = (v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
const mix = (a:number,b:number,t:number)=>a+(b-a)*t;
const dist = (a:Vec2,b:Vec2)=>Math.hypot(a.x-b.x,a.y-b.y);
const angle = (a:Vec2,b:Vec2)=>Math.atan2(b.y-a.y,b.x-a.x);
const inRect = (x:number,y:number,r:Rect,pad=0)=>x>r.x-pad && x<r.x+r.w+pad && y>r.y-pad && y<r.y+r.h+pad;
const nearRect = (p:Vec2, r:Rect, pad=0)=>inRect(p.x,p.y,r,pad);
const worldToCell = (x:number,y:number)=>({i:Math.floor(x/TILE), j:Math.floor(y/TILE)});
const cellToWorld = (i:number,j:number)=>({x:i*TILE+TILE/2, y:j*TILE+TILE/2});
const keyCell = (i:number,j:number)=>`${i}|${j}`;
const hsl = (h:number,s:number,l:number)=>`hsl(${h},${s}%,${l}%)`;
function rand(a:number,b:number){return a+Math.random()*(b-a)}
function choice<T>(arr:T[]){return arr[Math.floor(Math.random()*arr.length)]}
function rounded(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number){
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
}
// лёгкий value-noise (для травы)
function hash(i:number,j:number){ const s = Math.sin(i*127.1 + j*311.7)*43758.5453; return s-Math.floor(s); }
function noise(x:number,y:number){
  const i = Math.floor(x), j = Math.floor(y);
  const fx = x-i, fy = y-j;
  const a = hash(i,j), b = hash(i+1,j), c = hash(i,j+1), d = hash(i+1,j+1);
  const ux = fx*fx*(3-2*fx), uy = fy*fy*(3-2*fy);
  return mix(mix(a,b,ux), mix(c,d,ux), uy);
}

// ---- Component
export default function Page(){
  const canvasRef = useRef<HTMLCanvasElement|null>(null);
  const [ready, setReady] = useState(false);

  useEffect(()=>{
    const cvs = canvasRef.current!;
    const ctx = cvs.getContext("2d")!;

    // fullscreen retina
    function resize(){
      const DPR = Math.max(1, Math.min(2, window.devicePixelRatio||1));
      const w = window.innerWidth, h = window.innerHeight;
      cvs.style.width = w+"px"; cvs.style.height = h+"px";
      cvs.width = Math.floor(w*DPR); cvs.height = Math.floor(h*DPR);
      ctx.setTransform(DPR,0,0,DPR,0,0);
    }
    resize();
    window.addEventListener("resize", resize);

    // ---- State
    const player: Player = {
      pos: { x: HOUSE.x+HOUSE.w/2, y: HOUSE.y+HOUSE.h+60 },
      vel: { x: 0, y: 0 },
      dir: 0, speed: 0.28, hp: MAX_HP, stamina: MAX_ST, tool:"hoe",
      attackTimer: 0, attackCd: 0,
    };

    let gold = 0;
    let day = 1;
    let minutes = DAY_START_MIN;
    let weather: Weather = Math.random()<0.25 ? "rain":"sunny";

    const crops = new Map<string, CropTile>();
    let nodes: Node[] = []; let nextNodeId=1;
    let enemies: Enemy[] = []; let nextEnemyId=1;

    const npcs: NPC[] = [
      { id:"mira",  name:"Мира",  pos:{ x: CITY.x+CITY.w/2-220, y: CITY.y+420 }, friendship:0, questState:"none" },
      { id:"boris", name:"Борис", pos:{ x: CITY.x+CITY.w/2+220, y: CITY.y+560 }, friendship:0, questState:"none" },
      { id:"lina",  name:"Лина",  pos:{ x: CITY.x+CITY.w/2,     y: CITY.y+740 }, friendship:0, questState:"none" },
    ];

    const quests: Quest[] = [
      { id:"mira_wood",  title:"Подлатать лавку",    desc:"Принести Мире 15 дерева", needItem:"wood", needCount:15, giver:"mira",  rewardG:90, state:"active" },
      { id:"boris_stone",title:"Фундамент кузницы",  desc:"Принести Борису 20 камня", needItem:"stone", needCount:20, giver:"boris", rewardG:120, state:"active" },
      { id:"lina_fish",  title:"Поймать ужин",      desc:"Принести Лине 3 рыбы",     needItem:"fish",  needCount:3,  giver:"lina",  rewardG:80,  state:"active" },
    ];

    const inv = new Map<Item, number>([
      ["parsnip_seed", 8],
      ["potato_seed",  4],
      ["wheat_seed",   6],
      ["berry",        2],
    ]);

    const toasts: Toast[] = [];
    const camera = { x: player.pos.x-600, y: player.pos.y-340 };

    // ---- City walls (colliders): 4 стороны с проёмами-воротами
    const colliders: Rect[] = [];
    // верхняя стена (две части: слева от ворот и справа)
    colliders.push(
      { x: CITY.x, y: CITY.y - WALL_T, w: (CITY.w-GATE_W)/2, h: WALL_T },
      { x: CITY.x + (CITY.w+GATE_W)/2, y: CITY.y - WALL_T, w: (CITY.w-GATE_W)/2, h: WALL_T },
    );
    // нижняя стена
    colliders.push(
      { x: CITY.x, y: CITY.y + CITY.h, w: (CITY.w-GATE_W)/2, h: WALL_T },
      { x: CITY.x + (CITY.w+GATE_W)/2, y: CITY.y + CITY.h, w: (CITY.w-GATE_W)/2, h: WALL_T },
    );
    // левая стена
    colliders.push(
      { x: CITY.x - WALL_T, y: CITY.y, w: WALL_T, h: (CITY.h-GATE_W)/2 },
      { x: CITY.x - WALL_T, y: CITY.y + (CITY.h+GATE_W)/2, w: WALL_T, h: (CITY.h-GATE_W)/2 },
    );
    // правая стена
    colliders.push(
      { x: CITY.x + CITY.w, y: CITY.y, w: WALL_T, h: (CITY.h-GATE_W)/2 },
      { x: CITY.x + CITY.w, y: CITY.y + (CITY.h+GATE_W)/2, w: WALL_T, h: (CITY.h-GATE_W)/2 },
    );

    // generate world content (or load)
    load();

    if (!nodes.length){
      // лес
      for (let i=0;i<70;i++) nodes.push(makeNode("tree", rand(FOREST.x,FOREST.x+FOREST.w), rand(FOREST.y,FOREST.y+FOREST.h)));
      for (let i=0;i<36;i++) nodes.push(makeNode("bush", rand(FOREST.x-300,FOREST.x+FOREST.w+300), rand(FOREST.y-300,FOREST.y+FOREST.h+300)));
      // горы
      for (let i=0;i<60;i++) nodes.push(makeNode("rock", rand(MOUNT.x, MOUNT.x+MOUNT.w), rand(MOUNT.y, MOUNT.y+MOUNT.h)));
    }
    if (!enemies.length){
      // слаймы вокруг леса/гор + немного у озера
      for (let i=0;i<28;i++) enemies.push(makeEnemy(rand(FOREST.x,FOREST.x+FOREST.w), rand(FOREST.y,FOREST.y+FOREST.h)));
      for (let i=0;i<22;i++) enemies.push(makeEnemy(rand(MOUNT.x,MOUNT.x+MOUNT.w), rand(MOUNT.y,MOUNT.y+MOUNT.h)));
      for (let i=0;i<10;i++) enemies.push(makeEnemy(rand(LAKE.x,LAKE.x+LAKE.w), rand(LAKE.y,LAKE.y+LAKE.h)));
    }

    function makeNode(kind:Node["kind"], x:number,y:number):Node{
      const hp = kind==="tree" ? 3 : kind==="rock" ? 3 : 1;
      return { id: nextNodeId++, kind, pos:{x,y}, hp, maxHp:hp, respawnDay:0 };
    }
    function makeEnemy(x:number,y:number):Enemy{
      return { id: nextEnemyId++, pos:{x,y}, vel:{x:0,y:0}, hp:40, aggro:false, wanderT:Math.random()*2000 };
    }

    // ---- Input
    const keys = new Set<string>();
    const mouse = { x:0, y:0, worldX:0, worldY:0, down:false };

    function setToolSlot(n:string){
      if (n==="1") player.tool="hoe";
      else if (n==="2") player.tool="can";
      else if (n==="3") player.tool="tool";
      else if (n==="4") player.tool="seeds";
    }
    function cycleTool(){
      player.tool = player.tool==="hoe" ? "can" : player.tool==="can" ? "tool" : player.tool==="tool" ? "seeds" : "hoe";
    }

    // Централизованный обработчик — никаких листенеров «на каждый кадр»
    function onKey(e:KeyboardEvent){
      const down = e.type==="keydown";
      const rel = ["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","w","a","s","d","W","A","S","D"," ","Tab","1","2","3","4","E","e","I","i","Q","q","F","f","B","b","T","t","Escape"];
      if (rel.includes(e.key)) e.preventDefault();
      if (down) keys.add(e.key); else keys.delete(e.key);

      if (!down) return;

      // UI-первичность: если открыт диалог/магазин/инвентарь — обрабатываем их
      if (ui.dialog){
        if (e.key==="Escape"){ ui.dialog=null; return; }
        const idx = Number(e.key)-1;
        if (!isNaN(idx) && ui.dialog.choices && ui.dialog.choices[idx]){
          ui.dialog.choices[idx].next?.(); return;
        }
        return;
      }
      if (ui.shop){
        if (e.key==="1") shopBuy(0);
        else if (e.key==="2") shopBuy(1);
        else if (e.key==="3") shopBuy(2);
        else if (e.key==="4") shopBuy(3);
        else if (e.key==="B"||e.key==="b"||e.key==="Escape") ui.shop=false;
        return;
      }
      if (ui.inventory && (e.key==="I"||e.key==="i"||e.key==="Escape")){ ui.inventory=false; return; }
      if (ui.quests && (e.key==="Q"||e.key==="q"||e.key==="Escape")){ ui.quests=false; return; }

      // Игровые действия
      if (e.key==="Tab") cycleTool();
      if (["1","2","3","4"].includes(e.key)) setToolSlot(e.key);
      if (e.key===" "){ useActive(); }
      if (e.key==="E"||e.key==="e"){ interact(); }
      if (e.key==="F"||e.key==="f"){ talk(); }
      if (e.key==="I"||e.key==="i"){ ui.inventory = !ui.inventory; }
      if (e.key==="Q"||e.key==="q"){ ui.quests = !ui.quests; }
      if (e.key==="B"||e.key==="b"){ if (nearRect(player.pos, SHOP, 150)) ui.shop = !ui.shop; }
      if (e.key==="T"||e.key==="t"){ if (nearRect(player.pos, BED, 80)) sleep(); }
      if (e.key==="Escape"){ ui.inventory=false; ui.quests=false; ui.shop=false; }
    }
    function onPointerMove(e:PointerEvent){
      const r = cvs.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    }
    function onPointerDown(e:PointerEvent){
      if (e.button===0){ mouse.down=true; useActive(); }
    }
    function onPointerUp(e:PointerEvent){ if (e.button===0) mouse.down=false; }

    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);

    // ---- UI
    const ui = {
      inventory:false, quests:false, shop:false,
      dialog: null as null | { lines:string[], choices?:{label:string, next?:()=>void}[] },
    };

    // ---- Logic helpers
    function spendSt(v:number){ player.stamina = clamp(player.stamina - v, 0, MAX_ST); }
    function addItem(it:Item, n=1){ inv.set(it,(inv.get(it)||0)+n); toast(`+${n} ${label(it)}`); }
    function takeItem(it:Item, n=1){ const have=inv.get(it)||0; if (have<n) return false; inv.set(it, have-n); return true; }
    function hasItem(it:Item, n=1){ return (inv.get(it)||0) >= n; }
    function label(it:Item){
      switch(it){
        case "wood":return "Дерево"; case "stone":return "Камень"; case "fiber":return "Волокно";
        case "parsnip_seed":return "Семена пастернака"; case "parsnip":return "Пастернак";
        case "potato_seed":return "Семена картофеля"; case "potato":return "Картофель";
        case "wheat_seed":return "Семена пшеницы";   case "wheat":return "Пшеница";
        case "berry":return "Ягода"; case "fish":return "Рыба"; case "slime_goo":return "Слизь";
      }
    }
    function toast(text:string){ toasts.push({ x:player.pos.x, y:player.pos.y-28, text, life:1 }); }

    // Коллизии со стенами (учитываем «радиус» игрока)
    const PR = 12;
    function blocked(x:number,y:number){
      for (const c of colliders){
        const r:Rect = { x:c.x-PR, y:c.y-PR, w:c.w+2*PR, h:c.h+2*PR };
        if (inRect(x,y,r)) return true;
      }
      return false;
    }

    function update(dt:number){
      // время
      minutes += (MINUTES_PER_SEC*dt)/1000;
      if (minutes>=DAY_END_MIN) sleep();

      // курсор в мире
      mouse.worldX = camera.x + mouse.x;
      mouse.worldY = camera.y + mouse.y;

      // движение
      const up = keys.has("ArrowUp")||keys.has("w")||keys.has("W");
      const dn = keys.has("ArrowDown")||keys.has("s")||keys.has("S");
      const lf = keys.has("ArrowLeft")||keys.has("a")||keys.has("A");
      const rt = keys.has("ArrowRight")||keys.has("d")||keys.has("D");
      let ax=0, ay=0; if (up)ay-=1; if (dn)ay+=1; if (lf)ax-=1; if (rt)ax+=1;
      const len = Math.hypot(ax,ay)||1; ax/=len; ay/=len;
      const spd = player.speed*dt;

      // осевое перемещение с проверкой коллизий
      let nx = clamp(player.pos.x + ax*spd, 30, WORLD_W-30);
      if (!blocked(nx, player.pos.y)) player.pos.x = nx;
      let ny = clamp(player.pos.y + ay*spd, 30, WORLD_H-30);
      if (!blocked(player.pos.x, ny)) player.pos.y = ny;

      if (ax||ay) player.dir = Math.atan2(ay,ax);

      // реген стамины
      if (!ax && !ay) player.stamina = clamp(player.stamina + 0.02*dt, 0, MAX_ST);

      // камера
      const W = cvs.getBoundingClientRect().width, H = cvs.getBoundingClientRect().height;
      const tx = clamp(player.pos.x - W/2, 0, WORLD_W - W);
      const ty = clamp(player.pos.y - H/2, 0, WORLD_H - H);
      camera.x = mix(camera.x, tx, CAMERA_LERP);
      camera.y = mix(camera.y, ty, CAMERA_LERP);

      // атака таймеры
      player.attackCd = Math.max(0, player.attackCd - dt);
      player.attackTimer = Math.max(0, player.attackTimer - dt);

      // враги
      for (const e of enemies){
        if (e.hp<=0) continue;
        const d = dist(e.pos, player.pos);
        e.aggro = d < ENEMY_AGGRO_DIST;
        if (e.aggro){
          const a = angle(e.pos, player.pos);
          e.vel.x = Math.cos(a)*ENEMY_SPEED*dt;
          e.vel.y = Math.sin(a)*ENEMY_SPEED*dt;
        } else {
          e.wanderT -= dt;
          if (e.wanderT<=0){
            e.wanderT = 800+Math.random()*1400;
            const a = Math.random()*Math.PI*2;
            e.vel.x = Math.cos(a)*ENEMY_SPEED*0.5*dt;
            e.vel.y = Math.sin(a)*ENEMY_SPEED*0.5*dt;
          }
        }
        e.pos.x = clamp(e.pos.x + e.vel.x, 16, WORLD_W-16);
        e.pos.y = clamp(e.pos.y + e.vel.y, 16, WORLD_H-16);

        // контактный урон
        const col = Math.hypot(e.pos.x-player.pos.x, e.pos.y-player.pos.y) < ENEMY_R+12;
        if (col) player.hp = clamp(player.hp - (COLLISION_DMG_PER_SEC*dt)/1000, 0, MAX_HP);
      }

      // смерть: телепорт к кровати и -10g
      if (player.hp<=0){
        player.hp = MAX_HP*0.6;
        player.pos = { x: HOUSE.x+HOUSE.w/2, y: HOUSE.y+HOUSE.h+60 };
        gold = Math.max(0, gold-10);
        toast("Вы очнулись дома… −10g");
      }

      // тосты
      for (const t of toasts) t.life -= dt*0.0012;
      for (let i=toasts.length-1;i>=0;i--) if (toasts[i].life<=0) toasts.splice(i,1);
    }

    function useActive(){
      if (ui.inventory || ui.quests || ui.shop || ui.dialog) return;

      // боёвка всегда доступна
      if (player.attackCd<=0){ doAttack(); }

      // инструмент «tool»: лес/камни/рыбалка
      if (player.tool==="tool"){
        const n = nearestNode(64);
        if (n){
          spendSt(4);
          n.hp -= 1;
          if (n.hp<=0){
            if (n.kind==="tree"){ addItem("wood",3); if (Math.random()<0.25) addItem("fiber",1); }
            if (n.kind==="rock"){ addItem("stone",3); }
            if (n.kind==="bush"){ addItem("berry",1); }
            n.respawnDay = day + 2 + Math.floor(Math.random()*3);
            n.pos.x = -9999; n.pos.y = -9999;
          }
          return;
        }
        // рыбалка — по воде
        if (inRect(mouse.worldX, mouse.worldY, LAKE)){
          spendSt(6);
          const hit = Math.random()<0.55;
          if (hit) addItem("fish",1); else toast("Пусто…");
          return;
        }
      }

      // ферма: клетки
      const {i,j} = worldToCell(mouse.worldX, mouse.worldY);
      const pos = cellToWorld(i,j);
      if (!inRect(pos.x, pos.y, FARM)) return;

      const k = keyCell(i,j);
      if (!crops.has(k)) crops.set(k, { tilled:false, watered:false });
      const t = crops.get(k)!;

      if (player.tool==="hoe"){
        if (!t.tilled){ t.tilled=true; spendSt(2); }
      } else if (player.tool==="can"){
        if (t.tilled){ t.watered=true; }
      } else if (player.tool==="seeds"){
        if (t.tilled && !t.planted){
          const options: {seed:Item, kind:CropKind}[] = [
            {seed:"parsnip_seed", kind:"parsnip"},
            {seed:"potato_seed",  kind:"potato"},
            {seed:"wheat_seed",   kind:"wheat"},
          ];
          const pick = options.find(o=>hasItem(o.seed,1));
          if (pick){
            takeItem(pick.seed,1);
            t.planted = { kind: pick.kind, stage:0, maxStage:CropDefs[pick.kind].stages };
          } else {
            toast("Нет семян");
          }
        }
      } else if (player.tool==="tool"){
        // сбор
        if (t.planted && t.planted.stage>=t.planted.maxStage){
          const kind = t.planted.kind;
          addItem(kind==="parsnip"?"parsnip":kind==="potato"?"potato":"wheat", 1);
          t.planted = undefined; t.tilled=true; t.watered=false;
        }
      }
    }

    function doAttack(){
      player.attackCd = ATTACK_CD;
      player.attackTimer = ATTACK_SWISH;
      const a0 = player.dir;
      for (const e of enemies){
        if (e.hp<=0) continue;
        const d = dist(player.pos, e.pos);
        if (d>ATTACK_RANGE+ENEMY_R) continue;
        const ang = angle(player.pos, e.pos);
        const diff = Math.atan2(Math.sin(ang-a0), Math.cos(ang-a0));
        if (Math.abs(diff)<=ATTACK_ARC/2){
          e.hp -= ATTACK_DMG;
          e.vel.x += Math.cos(a0) * (220/Math.max(20,d));
          e.vel.y += Math.sin(a0) * (220/Math.max(20,d));
          if (e.hp<=0){
            if (Math.random()<0.35) addItem("slime_goo",1);
            if (Math.random()<0.25) gold += 3;
          }
        }
      }
    }

    function interact(){
      // сбор под ногами
      const {i,j} = worldToCell(player.pos.x, player.pos.y);
      const k = keyCell(i,j);
      const t = crops.get(k);
      if (t?.planted && t.planted.stage>=t.planted.maxStage){
        const kind = t.planted.kind;
        addItem(kind==="parsnip"?"parsnip":kind==="potato"?"potato":"wheat", 1);
        t.planted = undefined; t.tilled=true; t.watered=false;
        return;
      }
      // кровать / лавка
      if (nearRect(player.pos, BED, 80)){ sleep(); return; }
      if (nearRect(player.pos, SHOP, 150)){ ui.shop = !ui.shop; return; }
    }

    function talk(){
      const n = npcs
        .map(n=>({n, d:dist(n.pos, player.pos)}))
        .filter(o=>o.d<110)
        .sort((a,b)=>a.d-b.d)[0];
      if (!n) return;

      const npc = n.n;
      const q = quests.find(qq=>qq.giver===npc.id && qq.state!=="done");

      function open(lines:string[], choices?:{label:string,next?:()=>void}[]){
        ui.dialog = { lines, choices };
      }

      if (!q){
        open([`${npc.name}: Хороший денёк для дел на ферме.`], [{label:"1) Угу", next:()=>{ui.dialog=null}}]);
        return;
      }

      const have = inv.get(q.needItem)||0;
      if (npc.questState==="none"){
        npc.questState="asked";
        open([
          `${npc.name}: Привет! Нужна помощь.`,
          q.title+" — "+q.desc,
          `Справишься?`
        ], [
          { label:"1) Да, займусь", next:()=>{ ui.dialog=null; } },
          { label:"2) Потом", next:()=>{ ui.dialog=null; } },
        ]);
      } else if (have>=q.needCount){
        open([
          `${npc.name}: То, что нужно! Спасибо.`,
          `Награда: +${q.rewardG}g`
        ], [
          { label:"1) Передать предметы", next:()=>{
            takeItem(q.needItem, q.needCount);
            gold += q.rewardG;
            npc.friendship += 10;
            npc.questState="done";
            q.state="done";
            toast(`Квест выполнен: ${q.title}`);
            ui.dialog=null;
          } }
        ]);
      } else {
        open([
          `${npc.name}: Пока не хватает.`,
          `Принеси ещё: ${q.needItem} (${have}/${q.needCount}).`
        ], [{label:"1) Ок", next:()=>{ ui.dialog=null; }}]);
      }
    }

    function nearestNode(rad:number){
      let best:Node|null=null, bestD=1e9;
      for (const n of nodes){
        if (n.pos.x<0) continue;
        const d = dist(player.pos, n.pos);
        if (d<rad && d<bestD){ best=n; bestD=d; }
      }
      return best;
    }

    // Сон/новый день: рост растений, респавны, погода, сейв
    function sleep(){
      const raining = weather==="rain";
      for (const [_,t] of crops){
        if (!t.tilled) continue;
        const watered = t.watered || raining;
        if (t.planted && watered){
          if (t.planted.stage < t.planted.maxStage) t.planted.stage++;
        }
        t.watered = false;
      }
      // respawn nodes
      for (const n of nodes){
        if (n.pos.x<0 && day>=n.respawnDay){
          n.pos.x = rand(200,WORLD_W-200);
          n.pos.y = rand(200,WORLD_H-200);
          n.hp = n.maxHp;
        }
      }
      // slimes — лёгкий респавн
      enemies = enemies.filter(e=>e.hp>0);
      while (enemies.length<50){
        const zone = Math.random()<0.5 ? FOREST : MOUNT;
        enemies.push(makeEnemy(rand(zone.x,zone.x+zone.w), rand(zone.y,zone.y+zone.h)));
      }

      day += 1;
      minutes = DAY_START_MIN;
      weather = Math.random()<0.28 ? "rain" : "sunny";
      player.stamina = MAX_ST;
      player.hp = Math.max(player.hp, MAX_HP*0.7);
      save();
      toast(`День ${day}`);
    }

    // ---- Shop
    const shopItems = [
      {label:"Семена пастернака (x1)", buy: (n=1)=>buy("parsnip_seed", CropDefs.parsnip.buy, n), price:CropDefs.parsnip.buy},
      {label:"Семена картофеля (x1)",  buy: (n=1)=>buy("potato_seed",  CropDefs.potato.buy,  n), price:CropDefs.potato.buy},
      {label:"Семена пшеницы (x1)",   buy: (n=1)=>buy("wheat_seed",   CropDefs.wheat.buy,   1), price:CropDefs.wheat.buy},
      {label:"Семена пастернака (x5)",buy: (n=5)=>buy("parsnip_seed", CropDefs.parsnip.buy, 5), price:CropDefs.parsnip.buy*5},
    ];
    function shopBuy(idx:number){ const it = shopItems[idx]; if (it) it.buy(); }

    function buy(seed:Item, price:number, count=1){
      const total = price*count;
      if (gold>=total){ gold-=total; addItem(seed, count); }
      else toast("Недостаточно монет");
    }

    // ---- Save/Load
    function save(){
      try{
        const serialCrops = Array.from(crops.entries());
        const serialNodes = nodes.map(n=>({...n}));
        const serialEnemies = enemies.map(e=>({...e}));
        const serialInv = Array.from(inv.entries());
        const data = { gold, day, minutes, weather, crops:serialCrops, nodes:serialNodes, enemies:serialEnemies, inv:serialInv, npcs, player:{...player, vel:{x:0,y:0}} , quests };
        localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      }catch{}
    }
    function load(){
      try{
        const raw = localStorage.getItem(SAVE_KEY); if (!raw) return;
        const d = JSON.parse(raw);
        gold = d.gold ?? gold; day = d.day ?? day; minutes = d.minutes ?? minutes; weather = d.weather ?? weather;
        crops.clear(); for (const [k,t] of (d.crops??[])) crops.set(k,t);
        nodes = (d.nodes??[]).map((n:any)=>({...n})); nextNodeId = (Math.max(0,...nodes.map((n:any)=>n.id))||0)+1;
        enemies = (d.enemies??[]).map((e:any)=>({...e})); nextEnemyId = (Math.max(0,...enemies.map((e:any)=>e.id))||0)+1;
        inv.clear(); for (const [k,v] of (d.inv??[])) inv.set(k,v);
        if (d.npcs) for (let i=0;i<npcs.length;i++){ Object.assign(npcs[i], d.npcs[i]); }
        if (d.player){ player.pos = d.player.pos; player.tool = d.player.tool||"hoe"; }
        if (d.quests){ for (let i=0;i<quests.length;i++){ const q= (d.quests[i]); if (q) Object.assign(quests[i], q); } }
      }catch{}
    }

    // ---- Render
    let last = performance.now(); let raf = 0;
    function tick(){
      const now = performance.now(); const dt = Math.min(32, now-last); last = now;
      update(dt);
      draw();
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    function draw(){
      const W = window.innerWidth, H = window.innerHeight;

      // небо: день/ночь
      const tDay = clamp((minutes-DAY_START_MIN)/(DAY_END_MIN-DAY_START_MIN),0,1);
      const night = 1 - Math.abs(0.5-tDay)*2;
      const sky = ctx.createLinearGradient(0,0,0,H);
      sky.addColorStop(0, night>0.6 ? "#0f1420" : "#a6d0ff");
      sky.addColorStop(1, night>0.6 ? "#0a1119" : "#d8f0ff");
      ctx.fillStyle = sky; ctx.fillRect(0,0,W,H);

      // дождь
      if (weather==="rain"){
        ctx.save(); ctx.globalAlpha = 0.23; ctx.strokeStyle="#8ec7ff";
        for (let i=0;i<200;i++){
          const rx = (i*71 + (performance.now()*0.25)%W) % W;
          const ry = (i*113 + (performance.now()*0.6)%H) % H;
          ctx.beginPath(); ctx.moveTo(rx,ry); ctx.lineTo(rx-6, ry+18); ctx.stroke();
        }
        ctx.restore();
      }

      ctx.save();
      ctx.translate(-camera.x, -camera.y);

      // земля
      ctx.fillStyle = "#6b8f4e"; ctx.fillRect(0,0,WORLD_W,WORLD_H);
      const patch = 80;
      for (let x=0;x<WORLD_W;x+=patch){
        for (let y=0;y<WORLD_H;y+=patch){
          const n = noise(x*0.02, y*0.02);
          ctx.fillStyle = n>0.5 ? "#678a49" : "#739552";
          ctx.fillRect(x, y, patch, patch);
        }
      }

      // дом/кровать
      drawZone(HOUSE, "#e6d2a6", "#b28a52");
      ctx.fillStyle="#cda88a"; rounded(ctx, BED.x,BED.y,BED.w,BED.h,8); ctx.fill(); ctx.strokeStyle="#a0734e"; ctx.stroke();

      // ферма/озеро
      drawZone(FARM, "rgba(160,120,60,0.10)", "rgba(160,120,60,0.24)");
      drawZone(LAKE, "#7db4e6", "#5687b6");

      // ГОРОД: площадка + стены + ворота
      drawZone(CITY, "rgba(210,196,138,0.10)", "rgba(210,196,138,0.28)");
      ctx.fillStyle="#9a7b4a";
      for (const c of colliders) ctx.fillRect(c.x, c.y, c.w, c.h);
      // ворота визуально
      ctx.fillStyle="#b28a52";
      // верх и низ
      rounded(ctx, CITY.x + CITY.w/2 - GATE_W/2, CITY.y - WALL_T, GATE_W, WALL_T, 6); ctx.fill();
      rounded(ctx, CITY.x + CITY.w/2 - GATE_W/2, CITY.y + CITY.h, GATE_W, WALL_T, 6); ctx.fill();
      // лево и право
      rounded(ctx, CITY.x - WALL_T, CITY.y + CITY.h/2 - GATE_W/2, WALL_T, GATE_W, 6); ctx.fill();
      rounded(ctx, CITY.x + CITY.w, CITY.y + CITY.h/2 - GATE_W/2, WALL_T, GATE_W, 6); ctx.fill();

      // лавка
      drawZone(SHOP, "#d0c48a", "#9a8b54");

      // crops
      for (let i=Math.floor(FARM.x/TILE); i<=Math.floor((FARM.x+FARM.w)/TILE); i++){
        for (let j=Math.floor(FARM.y/TILE); j<=Math.floor((FARM.y+FARM.h)/TILE); j++){
          const k = keyCell(i,j); const c = crops.get(k); if (!c) continue;
          const p = cellToWorld(i,j);
          if (c.tilled){
            ctx.fillStyle = "#a0783c"; rounded(ctx, p.x-TILE/2+2, p.y-TILE/2+2, TILE-4, TILE-4, 6); ctx.fill();
            if (c.watered || weather==="rain"){ ctx.fillStyle="rgba(80,120,200,0.18)"; rounded(ctx, p.x-TILE/2+2, p.y-TILE/2+2, TILE-4, TILE-4, 6); ctx.fill(); }
          }
          if (c.planted){
            const st = c.planted.stage, kind = c.planted.kind;
            ctx.save(); ctx.translate(p.x,p.y);
            if (kind==="parsnip"){ ctx.fillStyle="#3f7f2e"; ctx.beginPath(); ctx.arc(0,0, 6+st*3, 0, Math.PI*2); ctx.fill(); }
            if (kind==="potato"){ ctx.fillStyle="#6b4e2e"; ctx.beginPath(); ctx.arc(0,0, 5+st*3, 0, Math.PI*2); ctx.fill(); ctx.fillStyle="#3f7f2e"; ctx.fillRect(-5,-(8+st*2),10,4+st*2); }
            if (kind==="wheat"){ ctx.fillStyle="#d7b55a"; ctx.fillRect(-2, -(5+st*3), 4, 10+st*6); }
            ctx.restore();
          }
        }
      }

      // ресурсы
      for (const n of nodes){
        if (n.pos.x<0) continue;
        if (n.kind==="tree"){
          ctx.fillStyle = "#3d6c2a"; ctx.beginPath(); ctx.arc(n.pos.x, n.pos.y, 20, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = "#2a4c1b"; ctx.beginPath(); ctx.arc(n.pos.x-8, n.pos.y-6, 10, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = "#6e4a2c"; rounded(ctx, n.pos.x-4, n.pos.y+4, 8, 16, 3); ctx.fill();
        } else if (n.kind==="rock"){
          ctx.fillStyle="#8ca4b1"; rounded(ctx, n.pos.x-16, n.pos.y-12, 32, 24, 6); ctx.fill();
          ctx.fillStyle="#b9c9d1"; rounded(ctx, n.pos.x-10, n.pos.y-8, 14, 8, 3); ctx.fill();
        } else {
          ctx.fillStyle="#6faa3f"; rounded(ctx, n.pos.x-10, n.pos.y-6, 20, 12, 6); ctx.fill();
        }
      }

      // враги
      for (const e of enemies){
        if (e.hp<=0) continue;
        ctx.save();
        ctx.translate(e.pos.x, e.pos.y);
        ctx.fillStyle="#6fd06f";
        ctx.beginPath();
        ctx.ellipse(0,0, ENEMY_R, ENEMY_R*0.8, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle="#0a0e13"; ctx.fillRect(-5,-4,3,3); ctx.fillRect(2,-4,3,3);
        const w=24,h=4,v=clamp(e.hp/40,0,1);
        ctx.fillStyle="rgba(0,0,0,0.25)"; ctx.fillRect(-w/2, -ENEMY_R-12, w, h);
        ctx.fillStyle=hsl( mix(0,120,v), 80, 52 ); ctx.fillRect(-w/2, -ENEMY_R-12, w*v, h);
        ctx.restore();
      }

      // NPC
      for (const n of npcs){
        ctx.fillStyle="#f3d6a6"; rounded(ctx, n.pos.x-12, n.pos.y-16, 24, 32, 8); ctx.fill();
        ctx.fillStyle="#0a0e13"; ctx.fillRect(n.pos.x-6, n.pos.y-4, 12, 3);
        ctx.fillStyle="#2b3940"; ctx.font="700 12px ui-sans-serif"; ctx.textAlign="center";
        ctx.fillText(n.name, n.pos.x, n.pos.y-22);
      }

      // игрок
      ctx.save();
      ctx.translate(player.pos.x, player.pos.y);
      ctx.rotate(player.dir);
      ctx.fillStyle="#e6f3ff";
      ctx.beginPath();
      ctx.moveTo(12,0); ctx.lineTo(-8,8); ctx.lineTo(-4,0); ctx.lineTo(-8,-8); ctx.closePath();
      ctx.fill();
      ctx.restore();

      // дуга удара
      if (player.attackTimer>0){
        const t = 1 - player.attackTimer/ATTACK_SWISH;
        const alpha = 0.35*Math.sin(t*Math.PI);
        ctx.save(); ctx.globalAlpha=alpha; ctx.fillStyle="#ffd9a6";
        const a0 = player.dir-ATTACK_ARC/2, a1 = player.dir+ATTACK_ARC/2;
        ctx.beginPath();
        ctx.arc(player.pos.x, player.pos.y, ATTACK_RANGE, a0, a1);
        ctx.arc(player.pos.x, player.pos.y, 12, a1, a0, true);
        ctx.closePath(); ctx.fill(); ctx.restore();
      }

      // тосты
      for (const t of toasts){
        ctx.globalAlpha = clamp(t.life,0,1);
        ctx.fillStyle="#fff7e6"; ctx.font="700 12px ui-sans-serif";
        ctx.fillText(t.text, t.x- camera.x, t.y- camera.y - (1-t.life)*28);
        ctx.globalAlpha = 1;
      }

      ctx.restore(); // camera

      // HUD/меню
      drawHUD(W,H);
      drawMinimap(W,H);
      if (ui.inventory) drawInventory(W,H);
      if (ui.quests)    drawQuests(W,H);
      if (ui.shop)      drawShop(W,H);
      if (ui.dialog)    drawDialog(W,H, ui.dialog);

      ready || setReady(true);
    }

    function drawZone(r:Rect, fill:string, stroke:string){
      const ctx2 = ctx;
      ctx2.save(); ctx2.fillStyle=fill; rounded(ctx2,r.x,r.y,r.w,r.h,14); ctx2.fill();
      ctx2.strokeStyle=stroke; ctx2.lineWidth=2; ctx2.stroke(); ctx2.restore();
    }

    function fmt(min:number){ const h=Math.floor(min/60)%24, m=Math.floor(min%60); return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`; }

    function drawHUD(W:number,H:number){
      const bw = Math.min(280, W*0.4), bh=14;
      function bar(x:number,y:number,v01:number,label:string, hue0:number,hue1:number){
        ctx.fillStyle="rgba(0,0,0,0.18)"; rounded(ctx,x,y,bw,bh,8); ctx.fill();
        ctx.fillStyle= hsl(mix(hue0,hue1,v01),85,52); rounded(ctx,x,y,Math.max(6,bw*v01),bh,8); ctx.fill();
        ctx.fillStyle="#2b3940"; ctx.font="700 11px ui-sans-serif"; ctx.fillText(label, x+8, y-2);
      }
      bar(12,12, player.stamina/MAX_ST, "СТАМИНА", 0,120);
      bar(12,12+bh+8, player.hp/MAX_HP, "HP", 0,120);

      ctx.textAlign="right"; ctx.fillStyle="#2b3940"; ctx.font="700 13px ui-sans-serif";
      ctx.fillText(`День ${day}  •  ${fmt(minutes)}  •  ${weather==="rain"?"Дождь":"Ясно"}  •  ${gold}g`, W-12, 18);
      ctx.textAlign="left";

      // хотбар
      const hbW = 320, hbH=48, x=W/2-hbW/2, y=H-hbH-12; ctx.fillStyle="rgba(0,0,0,0.18)"; rounded(ctx,x,y,hbW,hbH,12); ctx.fill();
      const slots:Tool[] = ["hoe","can","tool","seeds"];
      const names:Record<Tool,string> = {
        hoe:"ТЯПКА", can:"ЛЕЙКА", tool:"ТОП/КИР/УД.", seeds:`СЕМЕНА (${(inv.get("parsnip_seed")||0)+(inv.get("potato_seed")||0)+(inv.get("wheat_seed")||0)})`
      };
      const sw = hbW/4;
      for (let i=0;i<4;i++){
        const sx=x+i*sw; if (slots[i]===player.tool){ ctx.strokeStyle="#b28a52"; ctx.lineWidth=2; rounded(ctx,sx+4,y+4,sw-8,hbH-8,10); ctx.stroke(); }
        ctx.fillStyle="#3e2f22"; ctx.font="700 12px ui-sans-serif"; ctx.textAlign="center";
        ctx.fillText(names[slots[i]], sx+sw/2, y+hbH/2+3);
      }

      ctx.textAlign="left"; ctx.fillStyle="#3e2f22"; ctx.font="600 12px ui-sans-serif";
      ctx.fillText("WASD — двигаться  •  ЛКМ/Space — действие/удар  •  Tab/1–4 — инструмент  •  F — говорить  •  I — инв.  •  Q — квесты", 12, H-14);
    }

    function drawMinimap(W:number,H:number){
      const mw=240, mh=160, x=W-mw-12, y=28;
      ctx.save(); ctx.fillStyle="rgba(255,255,255,0.35)"; rounded(ctx,x,y,mw,mh,10); ctx.globalAlpha=0.12; ctx.fill(); ctx.globalAlpha=1;
      ctx.strokeStyle="rgba(0,0,0,0.25)"; ctx.lineWidth=2; rounded(ctx,x,y,mw,mh,10); ctx.stroke();
      const sx = mw/WORLD_W, sy = mh/WORLD_H;
      ctx.fillStyle="rgba(160,120,60,0.18)"; ctx.fillRect(x+FARM.x*sx, y+FARM.y*sy, FARM.w*sx, FARM.h*sy);
      ctx.fillStyle="rgba(125,180,230,0.18)"; ctx.fillRect(x+LAKE.x*sx, y+LAKE.y*sy, LAKE.w*sx, LAKE.h*sy);
      ctx.fillStyle="rgba(210,196,138,0.18)"; ctx.fillRect(x+CITY.x*sx, y+CITY.y*sy, CITY.w*sx, CITY.h*sy);
      ctx.fillStyle="#3e2f22"; ctx.beginPath(); ctx.arc(x+player.pos.x*sx, y+player.pos.y*sy, 3, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle="#6fd06f"; for (const e of enemies){ if (e.hp>0) ctx.fillRect(x+e.pos.x*sx-1.5, y+e.pos.y*sy-1.5, 3,3); }
      ctx.fillStyle="#f3d6a6"; for (const n of npcs){ ctx.fillRect(x+n.pos.x*sx-2, y+n.pos.y*sy-2, 4,4); }
      ctx.restore();
    }

    function drawInventory(W:number,H:number){
      const w=Math.min(560,W-40), h=Math.min(360,H-40), x=(W-w)/2, y=(H-h)/2;
      ctx.save(); ctx.fillStyle="#efe3cf"; rounded(ctx,x,y,w,h,14); ctx.fill();
      ctx.strokeStyle="#b28a52"; ctx.lineWidth=2; ctx.stroke();
      ctx.fillStyle="#3e2f22"; ctx.font="800 18px ui-sans-serif"; ctx.textAlign="center"; ctx.fillText("ИНВЕНТАРЬ", x+w/2, y+30);
      ctx.textAlign="left"; ctx.font="600 14px ui-sans-serif";
      let yy=y+60;
      for (const [it,c] of inv){ ctx.fillText(`${label(it)} — ${c}`, x+18, yy); yy+=22; }
      ctx.fillText(`Монеты: ${gold} g`, x+18, y+h-20);
      ctx.restore();
    }

    function drawQuests(W:number,H:number){
      const w=520, h=260, x=24, y=H-h-24;
      ctx.save(); ctx.fillStyle="#efe3cf"; rounded(ctx,x,y,w,h,12); ctx.fill();
      ctx.strokeStyle="#b28a52"; ctx.lineWidth=2; ctx.stroke();
      ctx.fillStyle="#3e2f22"; ctx.font="800 16px ui-sans-serif"; ctx.textAlign="center"; ctx.fillText("КВЕСТЫ", x+w/2, y+28);
      ctx.textAlign="left"; ctx.font="600 13px ui-sans-serif";
      let yy=y+56;
      for (const q of quests){
        const have = inv.get(q.needItem)||0;
        const done = q.state==="done";
        const line = `${done?"✓":"•"} ${q.title} — ${done?"выполнен":`${q.desc} (${have}/${q.needCount})`}`;
        ctx.fillText(line, x+16, yy); yy+=20;
      }
      ctx.restore();
    }

    function drawShop(W:number,H:number){
      const w=560, h=300, x=W/2-w/2, y=H/2-h/2;
      ctx.save(); ctx.fillStyle="#efe3cf"; rounded(ctx,x,y,w,h,14); ctx.fill();
      ctx.strokeStyle="#b28a52"; ctx.lineWidth=2; ctx.stroke();
      ctx.fillStyle="#3e2f22"; ctx.font="800 18px ui-sans-serif"; ctx.textAlign="center"; ctx.fillText("ЛАВКА — Покупки", x+w/2, y+30);
      ctx.textAlign="left"; ctx.font="600 14px ui-sans-serif";
      let yy=y+64;
      for (let i=0;i<shopItems.length;i++){
        const it = shopItems[i];
        ctx.fillText(`${i+1}) ${it.label} — ${it.price} g`, x+18, yy); yy+=26;
      }
      ctx.fillStyle="#6b4e2e"; ctx.fillText("Нажми 1/2/3/4 чтобы купить, B/Esc — закрыть", x+18, y+h-20);
      ctx.restore();
    }

    function drawDialog(W:number,H:number, d:{lines:string[], choices?:{label:string,next?:()=>void}[]}){
      const w=Math.min(700,W-40), h=260, x=(W-w)/2, y=H-h-24;
      ctx.save(); ctx.fillStyle="#efe3cf"; rounded(ctx,x,y,w,h,14); ctx.fill();
      ctx.strokeStyle="#a37945"; ctx.lineWidth=2; ctx.stroke();
      ctx.fillStyle="#3e2f22"; ctx.font="800 16px ui-sans-serif"; ctx.textAlign="left";
      let yy=y+32; for (const line of d.lines){ ctx.fillText(line, x+18, yy); yy+=24; }
      if (d.choices?.length){
        ctx.font="700 14px ui-sans-serif";
        for (const c of d.choices){ ctx.fillText(c.label, x+18, yy); yy+=22; }
        ctx.font="700 13px ui-sans-serif"; ctx.fillText("Выбери цифрой • Esc — закрыть", x+18, y+h-18);
      } else {
        ctx.font="700 13px ui-sans-serif"; ctx.fillText("Esc — закрыть", x+18, y+h-18);
      }
      ctx.restore();
    }

    // cleanup
    setReady(true);
    window.addEventListener("beforeunload", save);
    return ()=>{
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("beforeunload", save);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      // save(); // при желании можно сохранить принудительно
    };
  },[]);

  return (
    <div style={{ position:"fixed", inset:0, background:"#d8f0ff" }}>
      <canvas ref={canvasRef} style={{ display:"block", width:"100%", height:"100%" }} />
    </div>
  );
}
