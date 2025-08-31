"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export default function LevelSelector() {
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);

  const handleLevelClick = (level: number) => {
    setSelectedLevel(level);
    console.log("Выбран уровень:", level);
    // здесь можно добавить переход на игру с выбранным уровнем
  };

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center relative text-white bg-gray-900"
    >
      <motion.h1
        className="text-4xl font-bold mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        Выберите уровень
      </motion.h1>

      <div className="grid grid-cols-10 gap-2 max-w-5xl px-4">
        {Array.from({ length: 100 }, (_, i) => i + 1).map((level) => (
          <Button
            key={level}
            onClick={() => handleLevelClick(level)}
            className={`w-full py-2 text-sm rounded-md shadow-md 
              ${selectedLevel === level ? "bg-gray-600 text-white" : "bg-gray-800 text-gray-200"}
              hover:bg-gray-700`}
          >
            {level}
          </Button>
        ))}
      </div>

      {selectedLevel && (
        <motion.div
          className="mt-6 text-lg text-gray-300"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          Вы выбрали уровень: {selectedLevel}
        </motion.div>
      )}
    </main>
  );
}
