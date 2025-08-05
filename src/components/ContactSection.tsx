"use client";

import React from "react";
import ContactForm from "@/components/ContactForm";

export default function ContactSection() {
  return (
    <section id="contact" className="relative w-full bg-white min-h-screen md:min-h-[500px] md:h-auto flex items-center justify-center md:py-16">

      <div className="absolute inset-0 bg-gradient-to-b from-transparent from-99% to-[rgb(5,5,5)]" />

      <div className="w-full px-4 sm:px-6 lg:px-8">
        {/* flex-col on mobile, flex-row on md+ */}
        <div className="flex flex-col md:flex-row w-full items-center justify-center">
          {/* Mobile: full width header on top */}
          <div className="w-full md:w-1/3 flex items-center justify-center mb-6 md:mb-0">
            <h2 className="text-4xl font-bold text-gray-900 text-center">
              Свяжитесь с нами
            </h2>
          </div>

          {/* Form section: full width under header on mobile */}
          <div className="w-full md:w-2/3 flex items-center justify-center">
            <div className="w-full max-w-lg">
              <ContactForm />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}