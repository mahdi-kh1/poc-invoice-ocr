import { Reveal } from "../Reveal";
import {
  IconChart,
  IconBuilding,
  IconUsers,
  IconTag,
  IconCpu,
  IconCreditCard,
  IconTrendingUp,
  IconHeadset,
  IconSettings,
  IconFileCheck,
  IconKey,
} from "../icons";

// One card per subsection of the internal admin panel — mirrors the PRD's own §4.1-4.11
// structure exactly, rather than a condensed marketing summary, since this section is meant to
// answer "how do the admin pages and controls actually work."
const ADMIN_FEATURES = [
  {
    icon: IconChart,
    title: "Dashboard",
    body: "Live KPIs: ARR/MRR, active firms, churn, trial-to-paid conversion, OCR volume, and system health.",
  },
  {
    icon: IconBuilding,
    title: "Firms management",
    body: "Search and filter firms by status, drill into usage vs. plan cap, and act — suspend, renew, refund, or export/delete data under GDPR. Impersonation for troubleshooting is fully audit-logged and notifies the firm.",
  },
  {
    icon: IconUsers,
    title: "Global user management",
    body: "Search any user across the whole platform, view role and MFA status, force logout, reset a password, or block a suspicious account.",
  },
  {
    icon: IconTag,
    title: "Category management",
    body: "Standard UK categories mapped to VAT codes, plus industry-specific templates — versioned, with rollback if a change goes wrong.",
  },
  {
    icon: IconCpu,
    title: "AI Ops",
    body: "Model and prompt versioning with A/B testing, per-firm cost and accuracy monitoring, and a fallback OCR engine for handwritten or low-quality documents.",
  },
  {
    icon: IconCreditCard,
    title: "Billing & subscriptions",
    body: "Edit plans and caps without a redeploy, manage invoices and failed-payment retries, run discount codes and lifetime offers.",
  },
  {
    icon: IconTrendingUp,
    title: "Business reports & analytics",
    body: "Revenue, cohort, and retention reports, plus a signup → activation → payment funnel.",
  },
  {
    icon: IconHeadset,
    title: "Helpdesk",
    body: "Tickets prioritised by plan tier, linked directly to that firm's live data for faster diagnosis.",
  },
  {
    icon: IconSettings,
    title: "System settings & integrations",
    body: "API keys for Open Banking, tax/accounting software connections, HMRC/MTD credentials, and an editable VAT rules engine.",
  },
  {
    icon: IconFileCheck,
    title: "Audit log & security",
    body: "Every admin action logged — especially impersonation, access changes, and data exports — with automatic alerts on unusual patterns.",
  },
  {
    icon: IconKey,
    title: "Internal RBAC",
    body: "Custom internal roles with precise permissions per role, entirely independent of firm-side roles.",
  },
];

const STAFF_ROLES = [
  { name: "Super Admin", scope: "Full access to every panel section; manages other roles and critical settings." },
  { name: "Product / AI Admin", scope: "Manages AI models, prompts, categorisation, and tax rules." },
  { name: "Billing / Finance Admin", scope: "Manages plans, invoices, discounts, and financial reports." },
  { name: "Support Agent", scope: "Views firm accounts (controlled impersonation) and manages support tickets." },
  { name: "Growth / Sales Admin", scope: "Manages trials, leads, discount codes, and trial extensions." },
  { name: "Compliance Officer", scope: "Audits filing logs and monitors HMRC integrity.", future: true },
];

export function AdminPanel() {
  return (
    <section className="vision-section vision-section-navy" aria-labelledby="admin-panel-title">
      <Reveal className="vision-section-inner">
        <p className="vision-eyebrow vision-eyebrow-onnavy">For Accorix staff, not firms</p>
        <h2 id="admin-panel-title" className="vision-section-title vision-title-onnavy">
          What we run behind the scenes
        </h2>
        <p className="vision-section-lede vision-lede-onnavy">
          The same platform that firms use is managed, for Accorix itself, through an internal
          admin panel — every page and control in it maps to one of these eleven areas.
        </p>
      </Reveal>
      <div className="vision-card-grid">
        {ADMIN_FEATURES.map(({ icon: Icon, title, body }, i) => (
          <Reveal key={title} delayMs={(i % 3) * 80} className="vision-card vision-card-navy">
            <div className="vision-card-icon vision-card-icon-gold">
              <Icon />
            </div>
            <h3 className="vision-card-title vision-title-onnavy">{title}</h3>
            <p className="vision-card-body vision-lede-onnavy">{body}</p>
          </Reveal>
        ))}
      </div>
      <Reveal className="vision-section-inner vision-roles-wrap">
        <h3 className="vision-roles-title vision-title-onnavy">Who has access to what</h3>
        <dl className="vision-roles">
          {STAFF_ROLES.map(({ name, scope, future }) => (
            <div className="vision-roles-item" key={name}>
              <dt className="vision-title-onnavy">
                {name}
                {future && <span className="vision-badge-future">Phase 3</span>}
              </dt>
              <dd className="vision-lede-onnavy">{scope}</dd>
            </div>
          ))}
        </dl>
      </Reveal>
    </section>
  );
}
