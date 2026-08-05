"use client";

import "./vision.css";
import { Hero } from "./sections/Hero";
import { Problem } from "./sections/Problem";
import { VisionSection } from "./sections/VisionSection";
import { Roadmap } from "./sections/Roadmap";
import { FirmFeatures } from "./sections/FirmFeatures";
import { AdminPanel } from "./sections/AdminPanel";
import { Pipeline } from "./sections/Pipeline";
import { Comparison } from "./sections/Comparison";
import { DemoStatus } from "./sections/DemoStatus";

// Section 10 (Footer) isn't rendered here — app/layout.tsx's shared <footer> already appears on
// every route, including this one, so nothing extra is needed on the page itself.
export default function VisionPageClient() {
  return (
    <div className="vision-page">
      <Hero />
      <Problem />
      <VisionSection />
      <Roadmap />
      <FirmFeatures />
      <AdminPanel />
      <Pipeline />
      <Comparison />
      <DemoStatus />
    </div>
  );
}
