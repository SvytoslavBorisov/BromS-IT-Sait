"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation"; 

export default function HomePage() {
    const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [showLevels, setShowLevels] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLevelClick = (level: number) => {
    setSelectedLevel(level);
    // Путь ведёт на динамический маршрут [level]/page.tsx
    router.push(`/games/recoloring/game/${level}`);
  };

const DustLayer = () => {
  const [particles, setParticles] = useState<number[]>([]);

  useEffect(() => {
    // генерируем массив частиц только на клиенте
    setParticles(Array.from({ length: 30 }, (_, i) => i));
  }, []);

  return (
    <>
      {particles.map((_, i) => (
        <div
          key={i}
          className="absolute bg-gray-400 rounded-full opacity-20 animate-dust"
          style={{
            width: `${Math.random() * 4 + 2}px`,
            height: `${Math.random() * 4 + 2}px`,
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 10}s`,
          }}
        ></div>
      ))}
    </>
  );
};

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center text-white relative overflow-hidden"
      style={{
        backgroundImage: "url('/back.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* затемняющий слой */}
        <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="w-full h-full animate-fog bg-gradient-to-t from-gray-900/60 via-transparent to-gray-900/20"></div>
        <div className="absolute w-full h-full">
            <DustLayer />
        </div>
        </div>

      {/* слой дымки и пыли */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="w-full h-full animate-fog bg-gradient-to-t from-gray-900/60 via-transparent to-gray-900/20"></div>
        <div className="absolute w-full h-full">
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="absolute bg-gray-400 rounded-full opacity-20 animate-dust"
              style={{
                width: `${Math.random() * 4 + 2}px`,
                height: `${Math.random() * 4 + 2}px`,
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 10}s`,
              }}
            ></div>
          ))}
        </div>
      </div>

      <motion.h1
        className="text-5xl font-bold mb-12 z-10"
        initial={{ opacity: 0, y: -40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{ color: "#e0e0e0" }}
      >
        Алая революция
      </motion.h1>

      <div className="flex flex-col gap-4 w-64 z-10">
        {!showLevels ? (
          <>
            <Button
              onClick={() => setShowLevels(true)}
              className="w-full text-lg py-6 rounded-2xl shadow-lg bg-gray-800 hover:bg-gray-700 text-gray-200"
            >
              Уровни
            </Button>

            <Button
              variant="secondary"
              className="w-full text-lg py-6 rounded-2xl shadow-lg bg-gray-800 hover:bg-gray-700 text-gray-200"
            >
              Энциклопедия
            </Button>

            <Button
              variant="secondary"
              className="w-full text-lg py-6 rounded-2xl shadow-lg bg-gray-800 hover:bg-gray-700 text-gray-200"
            >
              Коллекция
            </Button>

            <Button
              onClick={handleShare}
              variant="secondary"
              className="w-full text-lg py-6 rounded-2xl shadow-lg bg-gray-800 hover:bg-gray-700 text-gray-200"
            >
              {copied ? "Скопировано ✅" : "Поделиться"}
            </Button>
          </>
        ) : (
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((level) => (
              <Button
                key={level}
                onClick={() => handleLevelClick(level)}
                className={`w-full py-2 text-sm rounded-md shadow-md ${
                  selectedLevel === level
                    ? "bg-gray-600 text-white"
                    : "bg-gray-800 text-gray-200"
                } hover:bg-gray-700`}
              >
                {level}
              </Button>
            ))}
          </div>
        )}
      </div>

      {showLevels && selectedLevel && (
        <motion.div
          className="mt-6 text-lg text-gray-300 z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          Вы выбрали уровень: {selectedLevel}
        </motion.div>
      )}

      <motion.p
        className="mt-10 text-sm text-gray-400 z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        © 2025 БромС АйТи. Все права защищены.
      </motion.p>

      <style jsx>{`
        @keyframes fog {
          0% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
          100% { transform: translateY(0); }
        }
        .animate-fog {
          animation: fog 20s ease-in-out infinite;
        }

        @keyframes dust {
          0% { transform: translateY(0) scale(1); opacity: 0.2; }
          50% { transform: translateY(-50px) scale(1.2); opacity: 0.05; }
          100% { transform: translateY(0) scale(1); opacity: 0.2; }
        }
        .animate-dust {
          animation: dust 15s linear infinite;
        }
      `}</style>
    </main>
  );
}
