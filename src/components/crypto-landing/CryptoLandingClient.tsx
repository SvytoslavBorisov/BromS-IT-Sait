"use client";

import Hero from "./sections/Hero";
import Features from "./sections/Features";
import Articles from "./sections/Articles";
import Tools from "./sections/Tools";
import Games from "./sections/Games";
import CTA from "./sections/CTA";
import Footer from "./sections/Footer";

export default function CryptoLandingClient() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <Hero />
      <Features />
      <Articles />
      <Tools />
      <Games />
      <CTA />
      <Footer />
    </div>
  );
}
