"use client";

import React from "react";
import BookFlip from "./BookFlip"; // компонент с переворотом страницы
import ScrollProgress from "@/components/ScrollProgress";

export default function Page() {
  return (
    <div>
      <ScrollProgress />
      <BookFlip />
    </div>
  );
}
