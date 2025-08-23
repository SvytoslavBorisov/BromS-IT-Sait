"use client";
import { Button } from "@/components/ui/button";
export function PdfButton({ slug }:{ slug:string }) {
  const onClick = () => window.open(`/api/blog-pdf?slug=${encodeURIComponent(slug)}`, "_blank");
  return <Button variant="outline" onClick={onClick}>Скачать PDF</Button>;
}
