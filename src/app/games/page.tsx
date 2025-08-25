"use client";
import { useState, useEffect } from "react";

const MOVE_SPEED = 2;       // скорость врагов
const COOLDOWN_TIME = 1000; // перезарядка башен
const TOWER_RANGE = 50;     // радиус атаки в пикселях

interface Enemy { x: number; y: number; hp: number; }
interface Tower { x: number; y: number; level: number; hp: number; cooldown: number; }

export default function Page() {
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [towers, setTowers] = useState<Tower[]>([]);
  const [lives, setLives] = useState(10);
  const [gold, setGold] = useState(100);
  const [screenSize, setScreenSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  const center = { x: screenSize.width / 2, y: screenSize.height / 2 };

  // ===== Обновление размеров экрана =====
  useEffect(() => {
    const handleResize = () => setScreenSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ===== Спавн врагов =====
  useEffect(() => {
    const interval = setInterval(() => {
      const side = Math.floor(Math.random() * 4);
      let x = 0, y = 0;
      if (side === 0) { x = 0; y = Math.random() * screenSize.height; }
      else if (side === 1) { x = screenSize.width; y = Math.random() * screenSize.height; }
      else if (side === 2) { x = Math.random() * screenSize.width; y = 0; }
      else { x = Math.random() * screenSize.width; y = screenSize.height; }
      setEnemies(prev => [...prev, { x, y, hp: 3 }]);
    }, 2000);
    return () => clearInterval(interval);
  }, [screenSize]);

  // ===== Главный игровой тик =====
  useEffect(() => {
    const interval = setInterval(() => {
      setEnemies(prevEnemies => {
        let newEnemies = prevEnemies.map(e => ({ ...e }));
        let newTowers = towers.map(t => ({ ...t }));

        // движение врагов
        newEnemies = newEnemies.map(e => {
          const dx = center.x - e.x;
          const dy = center.y - e.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < 5) { setLives(l => l-1); return null; } // дошел до базы
          return { ...e, x: e.x + (dx/dist)*MOVE_SPEED, y: e.y + (dy/dist)*MOVE_SPEED };
        }).filter((e): e is Enemy => e !== null);

        // башни атакуют
        newTowers = newTowers.map(t => {
          t.cooldown = Math.max(0, t.cooldown - 300);
          const target = t.cooldown <= 0 ? newEnemies.find(e => {
            const dx = e.x - t.x;
            const dy = e.y - t.y;
            return Math.sqrt(dx*dx + dy*dy) <= TOWER_RANGE;
          }) : undefined;
          if(target) { target.hp -= 1; t.cooldown = COOLDOWN_TIME; }
          return t;
        });

        const deadEnemies = newEnemies.filter(e => e.hp <= 0).length;
        if(deadEnemies>0) setGold(g => g + deadEnemies*2);
        newEnemies = newEnemies.filter(e => e.hp > 0);

        setTowers(newTowers);
        return newEnemies;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [towers, center]);

  function placeTower(x: number, y: number) {
    if (gold < 10) return;
    setTowers(prev => [...prev, { x, y, level: 1, hp: 5, cooldown: 0 }]);
    setGold(g => g - 10);
  }

  return (
    <div style={{ width:'100vw', height:'100vh', position:'relative', overflow:'hidden', background:'#eee' }}>
      <h1 style={{ position:'absolute', top:10, left:10, fontSize:18 }}>Crypto Tower Defense</h1>
      <p style={{ position:'absolute', top:30, left:10 }}>💖 Lives: {lives} | 🪙 Gold: {gold}</p>

      {/* центр базы */}
      <div style={{
        position:'absolute',
        width:40,
        height:40,
        background:'green',
        borderRadius:'50%',
        transform:'translate(-50%,-50%)',
        left:center.x,
        top:center.y
      }}>BASE</div>

      {/* враги */}
      {enemies.map((e,i)=>(
        <div key={i} style={{
          position:'absolute',
          width:20,
          height:20,
          background:'red',
          borderRadius:'50%',
          left:e.x-10,
          top:e.y-10,
        }}></div>
      ))}

      {/* башни */}
      {towers.map((t,i)=>(
        <div key={i} style={{
          position:'absolute',
          width:30,
          height:30,
          background: t.cooldown>0 ? 'orange' : 'blue',
          borderRadius:'50%',
          left:t.x-15,
          top:t.y-15,
          cursor:'pointer'
        }} onClick={()=>{ /* апгрейд можно добавить */ }}></div>
      ))}

      {/* клик для установки башни */}
      <div style={{ position:'absolute', width:'100%', height:'100%' }} onClick={e=>{
        const rect = (e.target as HTMLDivElement).getBoundingClientRect();
        const x = e.clientX;
        const y = e.clientY;
        placeTower(x,y);
      }}></div>
    </div>
  );
}
