import { useEffect, useRef, useState } from 'react';

/**
 * Home page of the Telegram mini‑app.
 *
 * This component implements a simple top‑down driving game designed to
 * illustrate basic traffic rules. The car travels continuously up the
 * road and the player can change lanes or perform turns using the
 * controls at the bottom of the screen. A handful of preset colours
 * allow the player to customise their vehicle.
 */
export default function Home() {
  // References to mutable game state. These refs allow the draw
  // function to read the latest values without re‑creating the
  // animation loop whenever state changes.
  const canvasRef = useRef(null);
  const carLaneRef = useRef(1); // start in middle lane (0,1,2 for 3 lanes)
  const carColorRef = useRef('#ff3b30'); // default red
  const orientationRef = useRef(0); // 0 deg pointing up; -90 left; 90 right; 180 down
  const speedRef = useRef(4); // pixels per frame for road movement

  // React state is used for rendering buttons and UI. Updates here
  // propagate to the refs via useEffect below.
  const [carLane, setCarLane] = useState(1);
  const [carColor, setCarColor] = useState('#ff3b30');
  const [orientation, setOrientation] = useState(0);
  const [showColours, setShowColours] = useState(false);

  // Update refs whenever state changes so the draw loop sees
  // up‑to‑date values.
  useEffect(() => {
    carLaneRef.current = carLane;
  }, [carLane]);
  useEffect(() => {
    carColorRef.current = carColor;
  }, [carColor]);
  useEffect(() => {
    orientationRef.current = orientation;
  }, [orientation]);

  // Initialise Telegram WebApp on mount. When the app is run inside
  // Telegram this call lets Telegram know that the mini‑app is ready
  // to be displayed. We also read any theme parameters from Telegram
  // and apply them as CSS variables so that the UI adapts to dark
  // mode automatically.
  useEffect(() => {
    const tg = window.Telegram && window.Telegram.WebApp;
    if (tg) {
      tg.ready();
      const params = tg.themeParams || {};
      // Set CSS variables based on Telegram theme parameters. We
      // prefix our variables with --tg‑ so they can be referenced in
      // the global stylesheet.
      const root = document.documentElement;
      Object.entries(params).forEach(([key, value]) => {
        root.style.setProperty(`--tg-${key}`, value);
      });
      // Provide reasonable fallbacks if theme parameters are missing.
      root.style.setProperty(
        '--button-bg',
        params.button_color || '#007bff'
      );
      root.style.setProperty(
        '--button-fg',
        params.button_text_color || '#ffffff'
      );
      root.style.setProperty(
        '--button-bg-active',
        params.button_color ? darken(params.button_color, 0.2) : '#0056b3'
      );
    }
  }, []);

  /**
   * Darken a hex colour by a given amount (0–1). Simple helper used to
   * generate an active state for buttons when Telegram provides
   * custom colours. If the input is not a valid hex code the
   * function returns it unchanged.
   *
   * @param {string} colour The hex colour string (e.g. #ff0000).
   * @param {number} amount Amount to darken (0–1).
   * @returns {string} The darkened colour.
   */
  function darken(colour, amount) {
    if (!/^#([A-Fa-f0-9]{6})$/.test(colour)) return colour;
    const r = parseInt(colour.substr(1, 2), 16);
    const g = parseInt(colour.substr(3, 2), 16);
    const b = parseInt(colour.substr(5, 2), 16);
    const nr = Math.max(0, Math.min(255, Math.floor(r * (1 - amount))));
    const ng = Math.max(0, Math.min(255, Math.floor(g * (1 - amount))));
    const nb = Math.max(0, Math.min(255, Math.floor(b * (1 - amount))));
    return `#${nr.toString(16).padStart(2, '0')}${ng
      .toString(16)
      .padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`;
  }

  // Start the animation loop once on mount. The draw function
  // continuously scrolls the road, draws lane markings and renders
  // the car according to the current refs. When the component
  // unmounts we cancel the animation frame.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Dimensions for drawing the car. These values work well for the
    // default canvas size (width 450, height 600). If you adjust the
    // canvas size you may need to tweak these numbers or compute
    // proportions relative to the canvas dimensions.
    const carWidth = 40;
    const carHeight = 70;

    // Precompute lane x positions based on the canvas width. We
    // divide the road into three equal lanes. If you wish to
    // increase the number of lanes simply update laneCount. Lanes are
    // centred such that the car appears centred within each lane.
    const laneCount = 3;
    const lanePositions = new Array(laneCount).fill(0).map((_, i) => {
      return (width / laneCount) * i + (width / laneCount - carWidth) / 2;
    });

    // Road line spacing controls how often dashed lines appear. The
    // number of lines is determined by dividing the canvas height by
    // the spacing. If speed increases the lines scroll faster.
    const lineSpacing = 80;
    let linePositions = [];
    const lineCount = Math.ceil(height / lineSpacing) + 1;
    for (let i = 0; i < lineCount; i++) {
      linePositions.push(i * lineSpacing);
    }

    let frameId;
    function draw() {
      // Clear the canvas
      ctx.clearRect(0, 0, width, height);

      // Draw road background
      ctx.fillStyle = '#3b3b3b';
      ctx.fillRect(0, 0, width, height);

      // Draw lane separators (dashed white lines)
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.setLineDash([20, 20]);
      for (let i = 1; i < laneCount; i++) {
        const x = (width / laneCount) * i;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // Animate dashed centre lines downwards to simulate movement
      for (let i = 0; i < linePositions.length; i++) {
        linePositions[i] += speedRef.current;
        if (linePositions[i] > height) {
          linePositions[i] = linePositions[i] - lineCount * lineSpacing;
        }
        const lineY = linePositions[i];
        ctx.fillStyle = '#ffffff';
        // Draw small rectangle in each lane centre to represent road markings
        const laneCentre = width / laneCount / 2;
        ctx.fillRect(laneCentre - 2, lineY, 4, 30);
      }

      // Draw car with rotation. Save context state before rotation
      const laneIndex = carLaneRef.current;
      const cx = lanePositions[laneIndex] + carWidth / 2;
      const cy = height - carHeight / 2 - 20;
      ctx.save();
      ctx.translate(cx, cy);
      const angle = (orientationRef.current * Math.PI) / 180;
      ctx.rotate(angle);
      ctx.fillStyle = carColorRef.current;
      ctx.fillRect(-carWidth / 2, -carHeight / 2, carWidth, carHeight);
      // Draw simple headlights or taillights depending on orientation
      ctx.fillStyle = '#ffffcc';
      if (orientationRef.current === 0) {
        // front lights at top when pointing up
        ctx.fillRect(-carWidth / 4, -carHeight / 2, carWidth / 2, 5);
      } else if (Math.abs(orientationRef.current) === 90) {
        // side lights
        ctx.fillRect(carWidth / 2 - 5, -carHeight / 4, 5, carHeight / 2);
      } else if (orientationRef.current === 180 || orientationRef.current === -180) {
        // back lights when pointing down
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(-carWidth / 4, carHeight / 2 - 5, carWidth / 2, 5);
      }
      ctx.restore();

      frameId = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(frameId);
  }, []);

  /**
   * Move the car one lane to the left, ensuring we do not leave the
   * road. Lanes are indexed from 0 on the left to 2 on the right.
   */
  function moveLeft() {
    setCarLane((prev) => Math.max(0, prev - 1));
  }

  /**
   * Move the car one lane to the right.
   */
  function moveRight() {
    setCarLane((prev) => Math.min(2, prev + 1));
  }

  /**
   * Perform a U‑turn. This rotates the car 180°. In a more complete
   * game you could also reverse the direction of the road movement
   * after a U‑turn but here we keep the illusion of motion simple.
   */
  function uTurn() {
    setOrientation((prev) => {
      const newOrientation = prev === 180 || prev === -180 ? 0 : 180;
      return newOrientation;
    });
  }

  /**
   * Turn left. We map left turns to a −90° rotation. If the car was
   * facing downwards (180°) then a left turn becomes 90°; if facing
   * right (90°) then left returns to 0°, etc.
   */
  function turnLeft() {
    setOrientation((prev) => {
      const orientationOptions = [0, 90, 180, -90];
      const idx = orientationOptions.indexOf(prev);
      // A left turn cycles backwards through the orientation array
      const newIdx = (idx - 1 + orientationOptions.length) % orientationOptions.length;
      return orientationOptions[newIdx];
    });
  }

  /**
   * Turn right. Similar to turnLeft but cycles forwards through the
   * orientation array.
   */
  function turnRight() {
    setOrientation((prev) => {
      const orientationOptions = [0, 90, 180, -90];
      const idx = orientationOptions.indexOf(prev);
      const newIdx = (idx + 1) % orientationOptions.length;
      return orientationOptions[newIdx];
    });
  }

  /**
   * Toggle the customisation panel. When active, it displays a set
   * of colour swatches that the user can choose from.
   */
  function toggleColours() {
    setShowColours((prev) => !prev);
  }

  /**
   * Change the car’s colour to the selected value.
   *
   * @param {string} colour The new colour in hex format.
   */
  function selectColour(colour) {
    setCarColor(colour);
    setShowColours(false);
  }

  // Define a handful of preset colours for users to choose from. In
  // a fully fledged game you might allow custom RGB values or a
  // wider palette. These selections provide a good variety while
  // keeping the UI simple.
  const colourOptions = ['#ff3b30', '#007aff', '#34c759', '#ffa600', '#8e8e93'];

  return (
    <div className="game-container">
      {/* The canvas provides our drawing surface. We set a fixed
          width/height here to maintain a consistent aspect ratio
          inside Telegram. */}
      <canvas
        ref={canvasRef}
        width={450}
        height={600}
        aria-label="Driving game canvas"
      ></canvas>
      {/* Control buttons. These are arranged horizontally and wrap
          on smaller screens. */}
      <div className="controls">
        <button onClick={moveLeft} aria-label="Move left">
          ⬅️ Полоса
        </button>
        <button onClick={moveRight} aria-label="Move right">
          ➡️ Полоса
        </button>
        <button onClick={turnLeft} aria-label="Turn left">
          ↩️ Поворот
        </button>
        <button onClick={turnRight} aria-label="Turn right">
          ↪️ Поворот
        </button>
        <button onClick={uTurn} aria-label="U-turn">
          🔄 Разворот
        </button>
        <button onClick={toggleColours} aria-label="Customise colour">
          🎨 Цвет
        </button>
      </div>
      {/* Colour picker */}
      {showColours && (
        <div className="color-picker">
          {colourOptions.map((c) => (
            <div
              key={c}
              className="color-swatch"
              style={{ backgroundColor: c, borderColor: c === carColor ? '#000' : '#ddd' }}
              onClick={() => selectColour(c)}
              role="button"
              aria-label={`Select colour ${c}`}
            ></div>
          ))}
        </div>
      )}
    </div>
  );
}