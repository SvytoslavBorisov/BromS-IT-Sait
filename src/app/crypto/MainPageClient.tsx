// app/MainPageClient.tsx
"use client";

import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/landing/Footer";
import HeroSection from "@/components/HeroSection";
import AboutSection from "@/components/landing/AboutSection";
import ProjectsSection from "@/components/landing/ProjectsSection";
import ContactSection from "@/components/landing/ContactSection";
import SectionDivider from "@/components/SectionDivider";
import SectionDividerBW from "@/components/SectionDividerBW";
import GlobalLightAbstractBg from "./GlobalLightAbstractBg";

export default function MainPageClient() {
  return (
    <div className="relative bg-white text-neutral-900">
      {/* hairline под шапкой */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 z-30 h-px
                   bg-gradient-to-r from-transparent via-neutral-200 to-transparent"
      />

      {/* Фикс-хедер + СПЕЙСЕР, чтобы не было CLS при инициализации навигации */}
      <Header />

      <main>
        <HeroSection />
        <SectionDivider />       {/* волна вниз (светлая) */}
        <AboutSection />
        <SectionDivider flip />  {/* волна вверх */}
        <ProjectsSection />
        <SectionDivider flip />
        <ContactSection />
      </main>

      <Footer />
    </div>
  );
}
