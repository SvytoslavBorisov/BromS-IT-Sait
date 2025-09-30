// components/projects/ProjectsBackground.tsx
"use client";

import React from "react";
import BackgroundGridLight from "@/components/landing/BackgroundStatic";

/** Простой враппер под фон проектов (при желании можно переопределять mask/className) */
export default function ProjectsBackground() {
  return <BackgroundGridLight />;
}
