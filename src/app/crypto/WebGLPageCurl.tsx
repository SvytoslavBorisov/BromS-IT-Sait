"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

type Props = {
  width: number;              // в px
  height: number;             // в px
  side?: "right" | "left";    // от какого угла скручиваем
  radiusMax?: number;         // «жёсткость» страницы (радиус цилиндра при s=1)
  /** Верхняя страница: лицевая текстура (DOM‑скриншот белой или чёрной) */
  frontCanvas: HTMLCanvasElement;
  /** Текстура нижней страницы (второй экран) */
  underCanvas: HTMLCanvasElement;
  /** Цвет оборота бумаги (когда видим заднюю сторону верхней страницы) */
  paperBack?: string;
  /** Начальный прогресс [0..1] */
  initialProgress?: number;
  /** Колбэк, когда снапнулись в 0 или 1 */
  onSnap?: (to: 0 | 1) => void;
  className?: string;
};

export default function WebGLPageCurl({
  width,
  height,
  side = "right",
  radiusMax = 240,
  frontCanvas,
  underCanvas,
  paperBack = "#f2f2f2",
  initialProgress = 0,
  onSnap,
  className,
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!hostRef.current) return;

    // --- сцена/камера/рендерер ---
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(
      -width / 2, width / 2, height / 2, -height / 2, -2000, 2000
    );
    camera.position.set(0, 0, 500);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    hostRef.current.appendChild(renderer.domElement);

    // --- текстуры ---
    const texFront = new THREE.CanvasTexture(frontCanvas);
    const texUnder = new THREE.CanvasTexture(underCanvas);
    texFront.colorSpace = texUnder.colorSpace = THREE.SRGBColorSpace;
    texFront.anisotropy = texUnder.anisotropy = 8;

    const texBack = new THREE.CanvasTexture((() => {
      const c = document.createElement("canvas");
      c.width = c.height = 64;
      const g = c.getContext("2d")!;
      g.fillStyle = paperBack; g.fillRect(0, 0, 64, 64);
      return c;
    })());
    texBack.colorSpace = THREE.SRGBColorSpace;

    // нижняя страница — плоская подложка
    const under = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      new THREE.MeshBasicMaterial({ map: texUnder, transparent: false })
    );
    under.position.set(0, 0, -1);
    scene.add(under);

    // верхняя — деформируемая
    const segX = 64, segY = 64;
    const geom = new THREE.PlaneGeometry(width, height, segX, segY);

    const uniforms = {
      uProgress:   new THREE.Uniform(initialProgress),
      uRadiusMax:  new THREE.Uniform(radiusMax),
      uWidth:      new THREE.Uniform(width),
      uHeight:     new THREE.Uniform(height),
      uSide:       new THREE.Uniform(side === "right" ? 1.0 : -1.0),
      uTexFront:   new THREE.Uniform(texFront),
      uTexBack:    new THREE.Uniform(texBack),
      uLightDir:   new THREE.Uniform(new THREE.Vector3(-0.2, 0.45, 1.0).normalize()),
      uAmbient:    new THREE.Uniform(new THREE.Vector3(0.55, 0.55, 0.55)),
    };

    const vert = /* glsl */`
      uniform float uProgress, uRadiusMax, uWidth, uHeight, uSide;
      varying vec2 vUv;
      varying vec3 vNormalW;
      const float PI = 3.141592653589793;

      void main() {
        vec3 pos = position;
        float x = pos.x + uWidth * 0.5;
        float xLocal = (uSide > 0.0) ? x : (uWidth - x);
        float R = max(uRadiusMax * uProgress, 0.0001);
        float cutoff = uWidth - uProgress * (uWidth - R * PI);

        float t = 0.0, newX, newZ;
        if (xLocal > cutoff) {
          t = min((xLocal - cutoff) / R, PI);
          newX = cutoff + R * sin(t);
          newZ = R * (1.0 - cos(t));
        } else { newX = xLocal; newZ = 0.0; }

        float xBack = (uSide > 0.0) ? newX : (uWidth - newX);
        pos.x = xBack - uWidth * 0.5;
        pos.z = newZ;

        // нормаль (поворачиваем вокруг Y)
        vec3 n = vec3(0.0, 0.0, 1.0);
        if (xLocal > cutoff) {
          n = vec3(sin(t) * (uSide > 0.0 ? 1.0 : -1.0), 0.0, cos(t));
        }
        vNormalW = normalize(mat3(modelMatrix) * n);

        vUv = uv;
        gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(pos, 1.0);
      }
    `;

    const frag = /* glsl */`
      uniform sampler2D uTexFront, uTexBack;
      uniform vec3 uLightDir, uAmbient;
      varying vec2 vUv;
      varying vec3 vNormalW;

      void main() {
        vec4 colFront = texture2D(uTexFront, vUv);
        vec4 colBack  = texture2D(uTexBack,  vec2(1.0 - vUv.x, vUv.y));

        float facing = step(0.0, vNormalW.z); // 1 — лицом к камере
        vec4 base = mix(colBack, colFront, facing);

        float diff = max(0.0, dot(normalize(vNormalW), normalize(uLightDir)));
        float shade = clamp(uAmbient.x + diff * 0.7, 0.0, 1.2);

        gl_FragColor = vec4(base.rgb * shade, base.a);
      }
    `;

    const mat = new THREE.ShaderMaterial({
      uniforms, vertexShader: vert, fragmentShader: frag, side: THREE.DoubleSide,
    });
    const page = new THREE.Mesh(geom, mat);
    scene.add(page);

    // лёгкая фейк‑тень возле сгиба
    const shadowTex = new THREE.CanvasTexture((() => {
      const c = document.createElement("canvas"); c.width = 1024; c.height = 256;
      const g = c.getContext("2d")!;
      const grd = g.createLinearGradient(0, 0, 0, c.height);
      grd.addColorStop(0, "rgba(0,0,0,0.18)"); grd.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = grd; g.fillRect(0, 0, c.width, c.height); return c;
    })());
    shadowTex.colorSpace = THREE.SRGBColorSpace;
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(width * 0.9, height * 0.25),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true })
    );
    shadow.position.set(0, -height * 0.4, 1);
    scene.add(shadow);

    // --- render loop ---
    let raf = 0;
    const loop = () => { raf = requestAnimationFrame(loop); renderer.render(scene, camera); };
    loop();

    // --- interaction (drag + snap) ---
    let dragging = false;
    let prog = THREE.MathUtils.clamp(initialProgress, 0, 1);
    const setProgress = (p: number) => {
      prog = THREE.MathUtils.clamp(p, 0, 1);
      uniforms.uProgress.value = prog;
      shadow.position.y = -height * 0.4 + prog * (height * 0.12);
      (shadow.material as THREE.MeshBasicMaterial).opacity = 0.6 * prog;
    };

    const rect = () => renderer.domElement.getBoundingClientRect();
    const toProgress = (clientX: number) => {
      const r = rect();
      const x = THREE.MathUtils.clamp(clientX - r.left, 0, r.width);
      const p = side === "right" ? 1 - x / r.width : x / r.width;
      return THREE.MathUtils.clamp(p, 0, 1);
    };

    const onDown = (e: PointerEvent) => {
      dragging = true;
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      setProgress(toProgress(e.clientX));
    };
    const onMove = (e: PointerEvent) => { if (dragging) setProgress(toProgress(e.clientX)); };
    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      const target: 0 | 1 = prog > 0.5 ? 1 : 0;
      let v = prog;
      const animateSnap = () => {
        v = THREE.MathUtils.damp(v, target, 8, 1/60);
        setProgress(v);
        if (Math.abs(v - target) > 1e-3) requestAnimationFrame(animateSnap);
        else { setProgress(target); onSnap?.(target); }
      };
      animateSnap();
    };

    renderer.domElement.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);

    // обновляем текстуры, если канвасы поменялись
    const tickTextures = () => {
      texFront.needsUpdate = true;
      texUnder.needsUpdate = true;
      shadowTex.needsUpdate = true;
    };
    const texInt = setInterval(tickTextures, 200); // дёшево освежать (можно убрать, если не надо)

    // старт
    setProgress(initialProgress);

    return () => {
      clearInterval(texInt);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      renderer.domElement.removeEventListener("pointerdown", onDown);
      cancelAnimationFrame(raf);
      [geom, under.geometry, shadow.geometry].forEach(g => g.dispose());
      [mat, (under.material as any), (shadow.material as any)].forEach(m => m.dispose?.());
      [texFront, texUnder, texBack, shadowTex].forEach(t => t.dispose());
      renderer.dispose();
      hostRef.current?.removeChild(renderer.domElement);
    };
  }, [width, height, side, radiusMax, frontCanvas, underCanvas, paperBack, initialProgress, onSnap]);

  return <div ref={hostRef} className={className} style={{ width, height, touchAction: "none" }} />;
}
