// OrbitRings.tsx (или внутри HeroSection файла, но отдельной функцией)
"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

type Dot = { x: number; y: number; delay: number; dur: number; amp: number };

export default function OrbitRings() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10">
      {/* внешнее кольцо */}
      <div className="absolute inset-0 rounded-full border border-black/5
                      animate-[spin_60s_linear_infinite]" />
      {/* внутреннее кольцо */}
      <div className="absolute inset-12 rounded-full border border-black/5
                      animate-[spin_90s_linear_infinite_reverse]" />
      {/* микрочастицы */}
      <div aria-hidden className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 40 }).map((_, i) => (
          <motion.span
            key={i}
            className="absolute h-[2px] w-[2px] rounded-full bg-black/10"
            initial={{ opacity: 0.2, x: Math.random()*window.innerWidth, y: Math.random()*window.innerHeight }}
            animate={{ opacity: [0.25, 0.65, 0.25], y: ["0%", "-8%", "0%"] }}
            transition={{ duration: 10 + (i%5), repeat: Infinity, ease: [0.4,0,0.2,1], delay: i*0.12 }}
          />
        ))}
      </div>
    </div>
  );
}
