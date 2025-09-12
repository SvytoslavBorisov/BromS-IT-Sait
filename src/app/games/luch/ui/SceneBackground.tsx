// luch/ui/SceneBackground.tsx
"use client";

export default function SceneBackground() {
  return (
    <>
      <style jsx>{`
        :root {
          --bg-0: #0b0f16;
          --bg-1: #0e1421;
          --bg-2: #0a0f18;

          --glow-cyan: 124, 214, 255;  /* #7cd6ff */
          --glow-pink: 255, 106, 160;  /* #ff6aa0 */
          --glow-mint:  88, 255, 200;  /* #58ffc8 */

          --stroke: 255,255,255;
        }

        /* Основной контейнер сцены */
        .scene {
          /* Многослойный фон без анимаций/фильтров: дешево и красиво */
          background:
            /* крупные мягкие «авроры» */
            radial-gradient(1200px 680px at 12% -8%, rgba(var(--glow-cyan), .10), transparent 60%),
            radial-gradient(1100px 620px at 92% -6%, rgba(var(--glow-pink), .10), transparent 60%),
            /* лёгкая диагональная растяжка для глубины */
            linear-gradient(135deg, rgba(255,255,255,.03) 0%, rgba(255,255,255,0) 30%),
            /* базовый вертикальный градиент неба */
            linear-gradient(180deg, var(--bg-0) 0%, var(--bg-1) 45%, var(--bg-2) 100%);

          color: #000;
          font-family: Inter, system-ui, Segoe UI, Roboto, Arial, sans-serif;
          min-height: 100svh;
          display: grid;
          grid-template-rows: auto auto auto;
          gap: 18px;

          /* Виньетка (без blur), добавляет фокус на центре */
          mask-image:
            radial-gradient(120% 100% at 50% 45%, rgba(0,0,0,1) 60%, rgba(0,0,0,.82) 75%, rgba(0,0,0,.6) 100%);
          -webkit-mask-image:
            radial-gradient(120% 100% at 50% 45%, rgba(0,0,0,1) 60%, rgba(0,0,0,.82) 75%, rgba(0,0,0,.6) 100%);
        }

        /* Карта сцены (канвас) */
        .card {
          border-radius: 18px;
          border: 1px solid rgba(var(--stroke), 0.08);
          box-shadow:
            0 16px 40px rgba(0,0,0,0.45),
            inset 0 0 0 1px rgba(var(--stroke), 0.03);
          background:
            /* мягкие подсветки у краёв контейнера */
            radial-gradient(1200px 520px at 10% 100%, rgba(64,112,255,0.06) 0, transparent 60%),
            radial-gradient(1200px 520px at 90% 0%,   rgba(var(--glow-mint),0.05) 0, transparent 60%),
            /* лёгкая полоса света сверху */
            linear-gradient(180deg, rgba(255,255,255,.035), rgba(255,255,255,0) 28%),
            /* база */
            #0c1120;
          transition: box-shadow .25s ease, border-color .25s ease;
        }

        /* Боковые панели */
        .panel {
          border-radius: 16px;
          border: 1px solid rgba(var(--stroke), 0.08);
          background:
            linear-gradient(180deg, rgba(255,255,255,.045), rgba(255,255,255,.02)),
            rgba(12,17,32,.4);
          box-shadow:
            0 10px 28px rgba(0,0,0,.35),
            inset 0 0 0 1px rgba(var(--stroke), .03);
        }

        /* Мобилка: снизим интенсивность свечения и плотность точек */
        @media (max-width: 860px) {
          .scene {
            background:
              radial-gradient(900px 520px at 12% -8%, rgba(var(--glow-cyan), .08), transparent 60%),
              radial-gradient(850px 500px at 92% -6%, rgba(var(--glow-pink), .08), transparent 60%),
              linear-gradient(135deg, rgba(255,255,255,.02) 0%, rgba(255,255,255,0) 30%),
              linear-gradient(180deg, var(--bg-0) 0%, var(--bg-1) 45%, var(--bg-2) 100%);
          }
        }

        /* Режим экономии движения (на будущее, хоть анимаций и нет) */
        @media (prefers-reduced-motion: reduce) {
          .scene { scroll-behavior: auto; }
        }
      `}</style>

      {/* Точечная сетка: векторная, дешевая, адаптивная */}
      <svg
        aria-hidden
        style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", opacity: 0.09 }}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <defs>
          {/* На десктопе — чуть плотнее, на мобилке — реже */}
          <pattern id="dots" x="0" y="0" width="3" height="3" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r=".42" fill="#df6808ff" opacity="0.9" />
          </pattern>
          <pattern id="dots-mobile" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
            <circle cx="1.3" cy="1.3" r=".45" fill="#cfd8ff" opacity="0.85" />
          </pattern>

        </defs>

        {/* Desktop слой */}
        <rect className="dots-desktop" x="0" y="0" width="100" height="100" fill="url(#dots)" />
        {/* Mobile слой (переключим через media CSS ниже) */}
        <rect className="dots-mobile" x="0" y="0" width="100" height="100" fill="url(#dots-mobile)" style={{ display: "none" }} />
        {/* Едва заметная виньетка по краям сетки */}
        <rect x="0" y="0" width="100" height="100" fill="url(#vignette)" />

        <style>{`
          @media (max-width: 860px) {
            .dots-desktop { display: none; }
            .dots-mobile { display: block !important; }
          }
        `}</style>
      </svg>
    </>
  );
}
