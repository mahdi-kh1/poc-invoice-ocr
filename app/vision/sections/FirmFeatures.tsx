import { Reveal } from "../Reveal";
import {
  IconRocket,
  IconUsers,
  IconClipboard,
  IconUpload,
  IconShieldCheck,
  IconSparkles,
  IconLandmark,
  IconBell,
  IconChat,
  IconChart,
} from "../icons";

const FEATURES = [
  {
    icon: IconRocket,
    title: "Onboard in minutes",
    body: "Sign up as a firm, invite the team, add the first client.",
  },
  {
    icon: IconUsers,
    title: "Manage many clients from one place",
    body: "Each client gets its own profile and team assignment — no client sees another's data, ever.",
  },
  {
    icon: IconClipboard,
    title: "Define projects per client",
    body: "A VAT quarter, a year-end account, a month of bookkeeping — with a due date, checklist, and status.",
  },
  {
    icon: IconUpload,
    title: "Upload documents any way that's convenient",
    body: "Drag-and-drop, a per-client forwarding email, or a phone photo. Handwritten and low-quality scans are a first-class case.",
  },
  {
    icon: IconShieldCheck,
    title: "Trust but verify",
    body: "Every extracted field carries a confidence score; low-confidence fields queue for a quick human check.",
  },
  {
    icon: IconSparkles,
    title: "Categorise faster over time",
    body: "The hybrid engine starts from solid general rules and gets sharper the more a firm corrects it.",
  },
  {
    icon: IconLandmark,
    title: "Reconcile automatically",
    body: "Connected bank feeds are matched against uploaded documents — what's left is what needs a human look.",
  },
  {
    icon: IconBell,
    title: "Get proactive tax guidance, not surprises",
    body: "VAT-threshold monitoring, scheme-eligibility checks, and deadline reminders — always labelled as suggestions.",
  },
  {
    icon: IconChat,
    title: "Ask an AI assistant that knows the account",
    body: "Chat scoped to a firm, client, or project, with answers that cite the underlying transaction or document.",
  },
  {
    icon: IconChart,
    title: "Report and export",
    body: "P&L, balance sheet, cash flow, VAT drafts, aged debtors/creditors — as Excel, PDF, or CSV.",
  },
];

export function FirmFeatures() {
  return (
    <section className="vision-section" aria-labelledby="firm-features-title">
      <Reveal className="vision-section-inner">
        <h2 id="firm-features-title" className="vision-section-title">
          What a firm can do
        </h2>
        <p className="vision-section-lede">The customer-facing product, from a firm's point of view.</p>
      </Reveal>
      <div className="vision-card-grid">
        {FEATURES.map(({ icon: Icon, title, body }, i) => (
          <Reveal key={title} delayMs={(i % 3) * 80} className="vision-card">
            <div className="vision-card-icon">
              <Icon />
            </div>
            <h3 className="vision-card-title">{title}</h3>
            <p className="vision-card-body">{body}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
