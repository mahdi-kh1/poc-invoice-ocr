import type { Metadata } from "next";
import VisionPageClient from "./VisionPageClient";

// Metadata exports require a Server Component, so the interactive parts (parallax scroll
// listener, later the scroll-reveal sections) live in VisionPageClient ("use client") instead.
export const metadata: Metadata = {
  title: "Accorix — The Smarter Accounting Assistant",
  description:
    "The full product vision behind this OCR/classification demo: a cloud accounting platform built for firms who manage many clients at once.",
};

export default function VisionPage() {
  return <VisionPageClient />;
}
