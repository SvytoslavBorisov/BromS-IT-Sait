"use client";

import { useState, useRef, useEffect } from "react";

// Простейшая база известных цветов
interface ColorDef {
  name: string;
  hex: string;
  hsl: { h: number; s: number; l: number };
  rgb: { r: number; g: number; b: number };
  description: string;
}

export const KNOWN_COLORS: ColorDef[] = [
  { name: "Красный", hex: "#FF0000", hsl: { h: 0, s: 100, l: 50 }, rgb: { r: 255, g: 0, b: 0 }, description: "Цвет огня и крови" },
  { name: "Зелёный", hex: "#00FF00", hsl: { h: 120, s: 100, l: 50 }, rgb: { r: 0, g: 255, b: 0 }, description: "Цвет природы и свежести" },
  { name: "Синий", hex: "#0000FF", hsl: { h: 240, s: 100, l: 50 }, rgb: { r: 0, g: 0, b: 255 }, description: "Цвет неба и моря" },
  { name: "Жёлтый", hex: "#FFFF00", hsl: { h: 60, s: 100, l: 50 }, rgb: { r: 255, g: 255, b: 0 }, description: "Цвет солнца и радости" },
  { name: "Белый", hex: "#FFFFFF", hsl: { h: 0, s: 0, l: 100 }, rgb: { r: 255, g: 255, b: 255 }, description: "Нейтральный белый цвет" },
  { name: "Черный", hex: "#000000", hsl: { h: 0, s: 0, l: 0 }, rgb: { r: 0, g: 0, b: 0 }, description: "Нейтральный черный цвет" },
  { name: "Оранжевый", hex: "#FFA500", hsl: { h: 39, s: 100, l: 50 }, rgb: { r: 255, g: 165, b: 0 }, description: "Цвет заката и энергии" },
  { name: "Фиолетовый", hex: "#800080", hsl: { h: 300, s: 100, l: 25 }, rgb: { r: 128, g: 0, b: 128 }, description: "Цвет магии и мистики" },
  { name: "Розовый", hex: "#FFC0CB", hsl: { h: 350, s: 100, l: 88 }, rgb: { r: 255, g: 192, b: 203 }, description: "Цвет нежности и любви" },
  { name: "Бирюзовый", hex: "#40E0D0", hsl: { h: 174, s: 72, l: 56 }, rgb: { r: 64, g: 224, b: 208 }, description: "Цвет моря и спокойствия" },
  { name: "Коричневый", hex: "#A52A2A", hsl: { h: 0, s: 59, l: 41 }, rgb: { r: 165, g: 42, b: 42 }, description: "Цвет земли и стабильности" },
  { name: "Серый", hex: "#808080", hsl: { h: 0, s: 0, l: 50 }, rgb: { r: 128, g: 128, b: 128 }, description: "Нейтральный серый цвет" },
  { name: "Лаймовый", hex: "#32CD32", hsl: { h: 120, s: 61, l: 50 }, rgb: { r: 50, g: 205, b: 50 }, description: "Яркий свежий зеленый" },
  { name: "Индиго", hex: "#4B0082", hsl: { h: 275, s: 100, l: 25 }, rgb: { r: 75, g: 0, b: 130 }, description: "Глубокий синий с фиолетовым оттенком" },
  { name: "Золотой", hex: "#FFD700", hsl: { h: 51, s: 100, l: 50 }, rgb: { r: 255, g: 215, b: 0 }, description: "Цвет богатства и солнечного света" },
  { name: "Аметист", hex: "#9966CC", hsl: { h: 270, s: 50, l: 60 }, rgb: { r: 153, g: 102, b: 204 }, description: "Мягкий фиолетовый оттенок" },
  { name: "Коралловый", hex: "#FF7F50", hsl: { h: 16, s: 100, l: 66 }, rgb: { r: 255, g: 127, b: 80 }, description: "Тёплый коралловый" },
  { name: "Оливковый", hex: "#808000", hsl: { h: 60, s: 100, l: 25 }, rgb: { r: 128, g: 128, b: 0 }, description: "Цвет оливы и земли" },
  { name: "Лавандовый", hex: "#E6E6FA", hsl: { h: 240, s: 67, l: 94 }, rgb: { r: 230, g: 230, b: 250 }, description: "Мягкий светло-фиолетовый" },
  { name: "Шоколадный", hex: "#D2691E", hsl: { h: 25, s: 75, l: 47 }, rgb: { r: 210, g: 105, b: 30 }, description: "Тёплый коричнево-оранжевый" },
  { name: "Серо-голубой", hex: "#6B7B8C", hsl: { h: 210, s: 12, l: 42 }, rgb: { r: 107, g: 123, b: 140 }, description: "Холодный серо-голубой" },
  { name: "Песочный", hex: "#F4A460", hsl: { h: 28, s: 87, l: 67 }, rgb: { r: 244, g: 164, b: 96 }, description: "Тёплый песочный оттенок" },
  { name: "Тёмно-синий", hex: "#00008B", hsl: { h: 240, s: 100, l: 27 }, rgb: { r: 0, g: 0, b: 139 }, description: "Глубокий насыщенный синий" },
  { name: "Тёмно-зелёный", hex: "#006400", hsl: { h: 120, s: 100, l: 20 }, rgb: { r: 0, g: 100, b: 0 }, description: "Глубокий зелёный лесной" },
  { name: "Светло-серый", hex: "#D3D3D3", hsl: { h: 0, s: 0, l: 83 }, rgb: { r: 211, g: 211, b: 211 }, description: "Нейтральный светло-серый" },
  { name: "Кремовый", hex: "#FFFDD0", hsl: { h: 60, s: 100, l: 93 }, rgb: { r: 255, g: 253, b: 208 }, description: "Мягкий кремовый оттенок" },
  { name: "Мятный", hex: "#98FF98", hsl: { h: 120, s: 100, l: 79 }, rgb: { r: 152, g: 255, b: 152 }, description: "Светлый мятный оттенок" },
  { name: "Лососевый", hex: "#FA8072", hsl: { h: 6, s: 93, l: 71 }, rgb: { r: 250, g: 128, b: 114 }, description: "Тёплый розово-оранжевый" },
  { name: "Голубой", hex: "#ADD8E6", hsl: { h: 195, s: 53, l: 79 }, rgb: { r: 173, g: 216, b: 230 }, description: "Светлый голубой цвет" },
  { name: "Пурпурный", hex: "#800080", hsl: { h: 300, s: 100, l: 25 }, rgb: { r: 128, g: 0, b: 128 }, description: "Темный пурпурный" },
  { name: "Малинный", hex: "#DC143C", hsl: { h: 348, s: 83, l: 47 }, rgb: { r: 220, g: 20, b: 60 }, description: "Яркий красный с оттенком розового" },
  { name: "Аквамарин", hex: "#7FFFD4", hsl: { h: 160, s: 100, l: 75 }, rgb: { r: 127, g: 255, b: 212 }, description: "Яркий морской оттенок" },
  { name: "Бежевый", hex: "#F5F5DC", hsl: { h: 60, s: 56, l: 91 }, rgb: { r: 245, g: 245, b: 220 }, description: "Мягкий бежевый цвет" },
  { name: "Серебряный", hex: "#C0C0C0", hsl: { h: 0, s: 0, l: 75 }, rgb: { r: 192, g: 192, b: 192 }, description: "Металлический серебристый" },
  { name: "Бордовый", hex: "#800000", hsl: { h: 0, s: 100, l: 25 }, rgb: { r: 128, g: 0, b: 0 }, description: "Глубокий красный цвет" }
];

// Утилиты
function hslToCss(hsl: { h: number; s: number; l: number }) {
  return `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
}

function hexToHsl(hex: string) {
  const r = parseInt(hex.substr(1,2),16)/255;
  const g = parseInt(hex.substr(3,2),16)/255;
  const b = parseInt(hex.substr(5,2),16)/255;

  const max = Math.max(r,g,b), min = Math.min(r,g,b);
  let h=0,s=0,l=(max+min)/2;

  if(max!==min){
    const d=max-min;
    s=l>0.5?d/(2-max-min):d/(max+min);
    switch(max){
      case r: h=(g-b)/d+(g<b?6:0); break;
      case g: h=(b-r)/d+2; break;
      case b: h=(r-g)/d+4; break;
    }
    h=Math.round(h*60);
  }
  return { h, s: +(s*100).toFixed(1), l: +(l*100).toFixed(1) };
}

function rgbToHex(r:number,g:number,b:number){
  return "#" + [r,g,b].map(x=>x.toString(16).padStart(2,'0')).join('').toUpperCase();
}

export default function EncyclopediaInteractive() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedH, setSelectedH] = useState(0);
  const [selectedS, setSelectedS] = useState(100);
  const [selectedL, setSelectedL] = useState(50);
  const [inputHex, setInputHex] = useState("#FF0000");
  const [inputHsl, setInputHsl] = useState({h:0,s:100,l:50});

  const [currentColor, setCurrentColor] = useState({h:0,s:100,l:50});

  // Рисуем палитру H/S
  useEffect(()=>{
    const canvas = canvasRef.current;
    if(!canvas) return;
    const ctx = canvas.getContext("2d");
    if(!ctx) return;

    const width=canvas.width;
    const height=canvas.height;

    for(let x=0;x<width;x++){
      for(let y=0;y<height;y++){
        const h = Math.round((x/width)*360);
        const s = Math.round((1 - y/height)*100);
        const l = selectedL;
        ctx.fillStyle = hslToCss({h,s,l});
        ctx.fillRect(x,y,1,1);
      }
    }
  }, [selectedL]);

  const handleCanvasClick=(e:React.MouseEvent)=>{
    const canvas = canvasRef.current;
    if(!canvas) return;
    const rect=canvas.getBoundingClientRect();
    const x=e.clientX-rect.left;
    const y=e.clientY-rect.top;
    const h=Math.round((x/canvas.width)*360);
    const s=Math.round((1-y/canvas.height)*100);
    setSelectedH(h);
    setSelectedS(s);
    setCurrentColor({h,s,l:selectedL});
    setInputHsl({h,s,l:selectedL});
    setInputHex(rgbToHex(...hslToRgb(h,s,selectedL)));
  }

  const hslToRgb=(h:number,s:number,l:number): [number,number,number]=>{
    s/=100;l/=100;
    const c=(1-Math.abs(2*l-1))*s;
    const x=c*(1-Math.abs((h/60)%2-1));
    const m=l-c/2;
    let r=0,g=0,b=0;
    if(h<60){r=c;g=x;b=0;}
    else if(h<120){r=x;g=c;b=0;}
    else if(h<180){r=0;g=c;b=x;}
    else if(h<240){r=0;g=x;b=c;}
    else if(h<300){r=x;g=0;b=c;}
    else{r=c;g=0;b=x;}
    return [Math.round((r+m)*255),Math.round((g+m)*255),Math.round((b+m)*255)];
  }

  const handleInputHexChange=(e:React.ChangeEvent<HTMLInputElement>)=>{
    let val=e.target.value;
    setInputHex(val);
    if(/^#[0-9A-Fa-f]{6}$/.test(val)){
      const hsl=hexToHsl(val);
      setCurrentColor(hsl);
      setSelectedH(hsl.h);
      setSelectedS(hsl.s);
      setSelectedL(hsl.l);
      setInputHsl(hsl);
    }
  }

  const handleInputHslChange=(e:React.ChangeEvent<HTMLInputElement>,field:'h'|'s'|'l')=>{
    const val=Number(e.target.value);
    const newHsl={...inputHsl,[field]:val};
    setInputHsl(newHsl);
    setCurrentColor(newHsl);
    setSelectedH(newHsl.h);
    setSelectedS(newHsl.s);
    setSelectedL(newHsl.l);
    setInputHex(rgbToHex(...hslToRgb(newHsl.h,newHsl.s,newHsl.l)));
  }

  // Находим цвет в базе
  const foundColor = KNOWN_COLORS.find(c => c.hex.toUpperCase() === inputHex.toUpperCase());

  return (
    <main className="min-h-screen p-6 flex flex-col md:flex-row gap-6 bg-gray-100">
      {/* Палитра */}
      <div className="flex flex-col items-center">
        <canvas ref={canvasRef} width={360} height={200} className="border border-gray-500 cursor-crosshair" onClick={handleCanvasClick}/>
        <label className="mt-2">Светлота (L)</label>
        <input type="range" min={0} max={100} value={selectedL} onChange={e=>{const l=Number(e.target.value); setSelectedL(l); setCurrentColor({...currentColor,l})}}/>
        <div className="mt-2 p-2 rounded-lg border w-32 text-center" style={{backgroundColor:inputHex}}>{inputHex}</div>
      </div>

      {/* Справка */}
      <div className="flex-1 p-4 rounded-xl bg-white shadow-lg">
        <h2 className="text-2xl font-bold mb-2">{foundColor ? foundColor.name : "Неизвестно"}</h2>
        <div className="flex gap-4 mb-4">
          <div className="w-24 h-24 rounded-lg border" style={{backgroundColor:inputHex}}/>
          <div className="flex-1 text-sm">
            <p>{foundColor ? foundColor.description : "Этот цвет отсутствует в базе."}</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div><b>HEX:</b> {inputHex}</div>
              <div><b>HSL:</b> {currentColor.h}°, {currentColor.s}%, {currentColor.l}%</div>
            </div>
          </div>
        </div>

        {/* Ввод значений вручную */}
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label>HEX:</label>
            <input type="text" className="border p-1 w-full" value={inputHex} onChange={handleInputHexChange}/>
          </div>
          <div>
            <label>H:</label>
            <input type="number" className="border p-1 w-full" value={inputHsl.h} min={0} max={360} onChange={e=>handleInputHslChange(e,'h')}/>
          </div>
          <div>
            <label>S:</label>
            <input type="number" className="border p-1 w-full" value={inputHsl.s} min={0} max={100} onChange={e=>handleInputHslChange(e,'s')}/>
          </div>
          <div>
            <label>L:</label>
            <input type="number" className="border p-1 w-full" value={inputHsl.l} min={0} max={100} onChange={e=>handleInputHslChange(e,'l')}/>
          </div>
        </div>
      </div>
    </main>
  );
}
