"use client";
import { use } from "react";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";

const ColorLabPage = dynamic(() => import("./ColorLabPage"), { ssr: false });
const ColorLabyrinth = dynamic(() => import("./ColorLabyrinth"), { ssr: false });
const ColorDomino = dynamic(() => import("./ColorDomino"), { ssr: false });
const ColorMiniPackPage = dynamic(() => import("./ColorPack"), { ssr: false });
const GraffitiTracer = dynamic(() => import("./GraffitiPage"), { ssr: false });
const PaintByNumbers = dynamic(() => import("./PaintByNumbers"), { ssr: false });
const GrayRabkin = dynamic(() => import("./GrayRabkin"), { ssr: false });
 
type PageProps = { params: Promise<{ level: string }> };

export default function Page({ params }: PageProps) {
  const { level } = use(params); // ← распаковка Promise

  if (level === "1") return <ColorLabPage />;
  if (level === "2") return <ColorLabyrinth />;
  if (level === "3") return <ColorDomino />;
  if (level === "4") return <ColorMiniPackPage />;
  if (level === "5") return <GraffitiTracer />;
  if (level === "6") return <PaintByNumbers />;
  if (level === "7") return <GrayRabkin />;

  return notFound();
}
