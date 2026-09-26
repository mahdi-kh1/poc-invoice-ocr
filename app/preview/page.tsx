import type { Metadata } from "next";
import "./preview.css";
import { HubContent } from "./HubContent";

export const metadata: Metadata = {
  title: "Accorix — Full Product Demo",
  description: "UI-only walkthrough of all 27 pages of the Accorix product, ahead of Phase 1.",
};

export default function PreviewHubPage() {
  return <HubContent />;
}
