"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import MainPageClient from "./MainPageClient";
import CryptoLandingClient from "./CryptoLandingClient";

export default function BookFlip() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialFlipped = searchParams!.get("page") === "black";

  const [flipped, setFlipped] = useState(initialFlipped);
  const firstRender = useRef(true);

  useEffect(() => {
    if (!firstRender.current) {
      const url = flipped ? "?page=black" : "?page=white";
      router.replace(url);
    } else {
      firstRender.current = false;
    }
  }, [flipped, router]);

  return (
    <div className="fixed inset-0 perspective-[2000px]">
      <motion.div
        className="w-full h-full relative"
        animate={flipped ? { rotateY: 180 } : { rotateY: 0 }}
        initial={flipped ? { rotateY: 180 } : { rotateY: 0 }}
        transition={firstRender.current ? { duration: 0 } : { duration: 1, ease: "easeInOut" }}
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Белая страница */}
        <div
          className={`absolute inset-0 w-full h-full bg-white text-black ${
            flipped ? "z-0 pointer-events-none" : "z-10 pointer-events-auto"
          }`}
          style={{ backfaceVisibility: "hidden" }}
        >
          <MainPageClient />
          <button
            onClick={() => setFlipped(true)}
            className="absolute top-4 right-4 w-16 h-16 bg-gradient-to-bl from-gray-200 to-white text-xs text-black flex items-start justify-end p-1"
            style={{ clipPath: "polygon(100% 0, 0 0, 100% 100%)" }}
          >
            ↻
          </button>
        </div>

        {/* Чёрная страница */}
        <div
          className={`absolute inset-0 w-full bg-background text-white rotate-y-180 ${
            flipped ? "z-10 pointer-events-auto" : "z-0 pointer-events-none"
          }`}
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <CryptoLandingClient />
          <button
            onClick={() => setFlipped(false)}
            className="absolute top-4 left-4 w-16 h-16 bg-gradient-to-br from-gray-800 to-black text-xs text-white flex items-start justify-start p-1"
            style={{ clipPath: "polygon(0 0, 100% 0, 0 100%)" }}
          >
            ↻
          </button>
        </div>
      </motion.div>
    </div>
  );
}
