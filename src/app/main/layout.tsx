"use client"; 

import type { ReactNode } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HeroSection from "@/components/HeroSection";
import AboutSection from "@/components/AboutSection";
import ProjectsSection from "@/components/ProjectSection";
import { Poppins } from "next/font/google";
import ContactSection from "@/components/ContactSection";

const poppins = Poppins({
  weight: ["400","600","700"],
  subsets: ["latin-ext"],   
  variable: "--font-poppins",
  display: "swap",
});

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className={poppins.variable + " font-sans"}>
      <Header />
      <HeroSection />
      <AboutSection />
      <ProjectsSection />
      <ContactSection />
      <main>
        {children}
      </main>
      <Footer />
    </div>
  );
}