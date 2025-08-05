import fs from "fs/promises";
import path from "path";
import styles from "./page.module.css";
export const dynamic = "force-dynamic";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HeroSection from "@/components/HeroSection";
import AboutSection from "@/components/AboutSection";
import ProjectsSection from "@/components/ProjectSection";

import ContactSection from "@/components/ContactSection";


export default async function MainPage() {

  return (
    <div className={styles.wrapper}>
        <Header />
        <HeroSection />
        <AboutSection />
        <ProjectsSection />
        <ContactSection />
        <Footer />
    </div>
  );
}
