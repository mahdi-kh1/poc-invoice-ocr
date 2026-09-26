"use client";

// Lightweight i18n for the /preview demo — no library, just a dictionary + context, since this
// only needs to cover chrome (nav, page headers, common labels) and the new /preview/guide page,
// not every cell of mock data in 27 pages of tables. Client did not understand the English-only
// demo — see plan-accorix.md's status notes (2026-09-26) — this exists to fix that directly.

import { createContext, useContext, useEffect, useState } from "react";

export type Locale = "en" | "fa";

const STORAGE_KEY = "accorix_preview_locale";

const DICT: Record<string, { en: string; fa: string }> = {
  // --- Shell chrome ---
  "shell.mockBanner": { en: "Mock data — nothing saved", fa: "داده نمایشی — چیزی ذخیره نمی‌شود" },
  "shell.firmPanel": { en: "Firm panel", fa: "پنل شرکت" },
  "shell.adminPanel": { en: "Admin panel", fa: "پنل مدیریت" },
  "shell.switchToAdmin": { en: "Switch to Admin panel", fa: "رفتن به پنل مدیریت" },
  "shell.switchToFirm": { en: "Switch to Firm panel", fa: "رفتن به پنل شرکت" },
  "shell.demoHub": { en: "← Demo hub", fa: "← صفحه اصلی دمو" },
  "shell.guide": { en: "📖 Guide — how everything works", fa: "📖 راهنما — همه چیز چطور کار می‌کند" },
  "lang.toggle": { en: "فارسی", fa: "English" },

  // --- nav groups ---
  "nav.overview": { en: "Overview", fa: "نمای کلی" },
  "nav.clients": { en: "Clients", fa: "مشتریان" },
  "nav.documents": { en: "Documents", fa: "اسناد" },
  "nav.money": { en: "Money", fa: "مالی" },
  "nav.firm": { en: "Firm", fa: "شرکت" },
  "nav.platform": { en: "Platform", fa: "پلتفرم" },
  "nav.product": { en: "Product", fa: "محصول" },
  "nav.business": { en: "Business", fa: "کسب‌وکار" },
  "nav.security": { en: "Security", fa: "امنیت" },

  // --- nav items (firm) ---
  "nav.dashboard": { en: "Dashboard", fa: "داشبورد" },
  "nav.clientsList": { en: "Clients", fa: "لیست مشتریان" },
  "nav.uploadDocs": { en: "Upload documents", fa: "بارگذاری اسناد" },
  "nav.reviewQueue": { en: "Review queue", fa: "صف بازبینی" },
  "nav.categories": { en: "Categories", fa: "دسته‌بندی‌ها" },
  "nav.reconciliation": { en: "Bank reconciliation", fa: "تطبیق بانکی" },
  "nav.taxGuidance": { en: "Tax guidance", fa: "راهنمایی مالیاتی" },
  "nav.reports": { en: "Reports & exports", fa: "گزارش‌ها و خروجی‌ها" },
  "nav.assistant": { en: "AI assistant", fa: "دستیار هوش مصنوعی" },
  "nav.team": { en: "Team", fa: "تیم" },
  "nav.settings": { en: "Settings", fa: "تنظیمات" },

  // --- nav items (admin) ---
  "nav.firms": { en: "Firms", fa: "شرکت‌ها" },
  "nav.users": { en: "Global users", fa: "کاربران کل سیستم" },
  "nav.aiOps": { en: "AI Ops", fa: "مدیریت هوش مصنوعی" },
  "nav.systemSettings": { en: "System settings", fa: "تنظیمات سیستم" },
  "nav.billing": { en: "Billing & subscriptions", fa: "صورتحساب و اشتراک‌ها" },
  "nav.analytics": { en: "Reports & analytics", fa: "گزارش‌ها و تحلیل" },
  "nav.helpdesk": { en: "Helpdesk", fa: "پشتیبانی" },
  "nav.auditLog": { en: "Audit log", fa: "لاگ حسابرسی" },
  "nav.roles": { en: "Internal roles", fa: "نقش‌های داخلی" },

  // --- common page chrome ---
  "action.addClient": { en: "+ Add client", fa: "+ افزودن مشتری" },
  "action.newProject": { en: "+ New project", fa: "+ پروژه جدید" },
  "action.inviteTeamMember": { en: "+ Invite team member", fa: "+ دعوت عضو تیم" },
  "action.newDiscount": { en: "+ New discount code", fa: "+ کد تخفیف جدید" },
  "action.newRole": { en: "+ New role", fa: "+ نقش جدید" },
  "action.newCategory": { en: "+ New category", fa: "+ دسته‌بندی جدید" },
  "common.overview": { en: "Overview", fa: "نمای کلی" },
  "common.projects": { en: "Projects", fa: "پروژه‌ها" },
  "common.approve": { en: "Approve", fa: "تایید" },
  "common.save": { en: "Save corrections", fa: "ذخیره اصلاحات" },
  "common.allStatuses": { en: "All statuses", fa: "همه وضعیت‌ها" },
  "common.search": { en: "Search…", fa: "جستجو…" },

  // --- page: dashboard (firm) ---
  "page.fdash.title": { en: "Good morning, Elena", fa: "صبح بخیر، النا" },
  "page.fdash.desc": { en: "Here's what's moving across Whitfield & Co this week.", fa: "خلاصه‌ای از فعالیت‌های این هفته شرکت Whitfield & Co." },

  // --- clients ---
  "page.clients.title": { en: "Clients", fa: "مشتریان" },
  "page.clients.desc": {
    en: "Every client your firm manages. Each one has its own profile, team assignment, and project history — no client ever sees another client's data.",
    fa: "همه مشتریانی که شرکت شما مدیریت می‌کند. هر مشتری پروفایل، تیم مسئول و تاریخچه پروژه‌های مخصوص خودش را دارد — هیچ مشتری اطلاعات مشتری دیگر را نمی‌بیند.",
  },
  "page.clientDetail.desc": { en: "Client profile", fa: "پروفایل مشتری" },
  "page.clientProjects.desc": {
    en: "Every VAT quarter, year-end, and bookkeeping cycle tracked for this client, each moving through its own pipeline.",
    fa: "هر دوره مالیات بر ارزش‌افزوده (VAT)، پایان سال مالی و دوره حسابداری این مشتری، هرکدام در مسیر پیشرفت خودشان.",
  },

  // --- project detail ---
  "page.project.desc": { en: "Project", fa: "پروژه" },

  // --- documents upload ---
  "page.upload.title": { en: "Upload documents", fa: "بارگذاری اسناد" },
  "page.upload.desc": {
    en: "Drag and drop, or use a client's dedicated forwarding email, or snap a photo on mobile. Handwritten and low-quality scans are a first-class case here, not an edge case.",
    fa: "کشیدن و رها کردن فایل، استفاده از ایمیل اختصاصی هر مشتری، یا گرفتن عکس با موبایل. اسناد دست‌نویس و کیفیت پایین هم به‌طور کامل پشتیبانی می‌شوند، نه یک استثنا.",
  },

  // --- review queue ---
  "page.review.title": { en: "Review queue", fa: "صف بازبینی" },
  "page.review.desc": {
    en: "Every extracted field carries a confidence score. Low-confidence fields are queued here for a quick human check instead of being silently accepted.",
    fa: "هر فیلد استخراج‌شده یک امتیاز اطمینان دارد. فیلدهایی که اطمینان پایینی دارند اینجا در صف قرار می‌گیرند تا یک نفر سریع آن‌ها را چک کند، نه اینکه بدون بررسی قبول شوند.",
  },
  "page.review.needsReview": { en: "Needs review", fa: "نیاز به بازبینی" },
  "page.review.all": { en: "All documents", fa: "همه اسناد" },

  // --- categories (firm) ---
  "page.categories.title": { en: "Categories", fa: "دسته‌بندی‌ها" },
  "page.categories.desc": {
    en: "Your firm's category list, seeded from the standard UK chart-of-accounts and mapped to VAT codes. Every correction your team makes sharpens this over time — corrections are never thrown away.",
    fa: "لیست دسته‌بندی‌های شرکت شما، بر پایه جدول حساب‌های استاندارد بریتانیا و متصل به کدهای مالیات بر ارزش‌افزوده. هر اصلاحی که تیم شما انجام می‌دهد این لیست را دقیق‌تر می‌کند — هیچ اصلاحی دور ریخته نمی‌شود.",
  },

  // --- reconciliation ---
  "page.recon.title": { en: "Bank reconciliation", fa: "تطبیق بانکی" },
  "page.recon.desc": {
    en: "Connected bank feeds are matched against uploaded documents automatically — what's left over here is what actually needs a human look.",
    fa: "تراکنش‌های بانکی متصل، به‌طور خودکار با اسناد بارگذاری‌شده تطبیق داده می‌شوند — آنچه اینجا باقی می‌ماند همان چیزی است که واقعاً نیاز به بررسی انسانی دارد.",
  },
  "page.recon.onlyUnmatched": { en: "Only show unmatched", fa: "فقط موارد تطبیق‌نشده" },

  // --- tax guidance ---
  "page.tax.title": { en: "Tax guidance", fa: "راهنمایی مالیاتی" },
  "page.tax.desc": {
    en: "VAT-threshold monitoring, scheme-eligibility checks, deadline reminders, and tax-saving suggestions — all clearly labelled as suggestions an accountant reviews, never as decisions already made.",
    fa: "پایش آستانه ثبت‌نام مالیات بر ارزش‌افزوده، بررسی صلاحیت طرح‌های مالیاتی، یادآوری مهلت‌ها و پیشنهادهای صرفه‌جویی مالیاتی — همه به‌عنوان پیشنهاد برای بررسی حسابدار، نه تصمیمی که از قبل گرفته شده.",
  },
  "page.tax.humanLoop": {
    en: "Human-in-the-loop, always.",
    fa: "همیشه با نظارت انسان.",
  },
  "page.tax.humanLoopBody": {
    en: "Nothing on this page files or finalises anything automatically — every item below is a draft suggestion for your team to review with the client.",
    fa: "هیچ‌چیز در این صفحه به‌طور خودکار ثبت یا نهایی نمی‌شود — هر مورد در زیر فقط یک پیشنهاد اولیه است تا تیم شما با مشتری بررسی کند.",
  },

  // --- AI assistant ---
  "page.assistant.title": { en: "AI assistant", fa: "دستیار هوش مصنوعی" },
  "page.assistant.desc": {
    en: "Chat scoped to a firm, a client, or a single project — answers cite the underlying transaction or document, not a generic chatbot bolted on the side.",
    fa: "گفتگویی محدود به یک شرکت، یک مشتری یا یک پروژه خاص — پاسخ‌ها به تراکنش یا سند مرتبط اشاره می‌کنند، نه یک چت‌بات عمومی و بی‌ربط.",
  },

  // --- reports ---
  "page.reports.title": { en: "Reports & exports", fa: "گزارش‌ها و خروجی‌ها" },
  "page.reports.desc": {
    en: "P&L, balance sheet, cash flow, VAT drafts, aged debtors/creditors — as Excel, PDF, or CSV, or scheduled straight to an inbox.",
    fa: "صورت سود و زیان، ترازنامه، جریان نقدی، پیش‌نویس مالیات بر ارزش‌افزوده، بدهکاران و بستانکاران — به‌صورت Excel، PDF یا CSV، یا ارسال زمان‌بندی‌شده به ایمیل.",
  },

  // --- team ---
  "page.team.title": { en: "Team", fa: "تیم" },
  "page.team.desc": {
    en: "Everyone at your firm who works in Accorix, and how many clients they're assigned to.",
    fa: "همه افرادی که در شرکت شما از Accorix استفاده می‌کنند و تعداد مشتریانی که به هرکدام اختصاص داده شده.",
  },

  // --- settings ---
  "page.settings.title": { en: "Settings", fa: "تنظیمات" },
  "page.settings.desc": { en: "Firm profile, billing plan, and connected integrations.", fa: "پروفایل شرکت، پلن پرداخت و سرویس‌های متصل." },

  // --- admin dashboard ---
  "page.adash.title": { en: "Platform dashboard", fa: "داشبورد پلتفرم" },
  "page.adash.desc": { en: "Live KPIs across every firm on Accorix.", fa: "شاخص‌های کلیدی زنده برای همه شرکت‌های روی Accorix." },

  // --- admin firms ---
  "page.afirms.title": { en: "Firms", fa: "شرکت‌ها" },
  "page.afirms.desc": {
    en: "Every firm on the platform — search/filter by status, drill into a firm for usage, staff, and billing history.",
    fa: "همه شرکت‌های روی پلتفرم — جستجو و فیلتر بر اساس وضعیت، و مشاهده جزئیات مصرف، کارکنان و تاریخچه پرداخت هر شرکت.",
  },

  // --- admin users ---
  "page.ausers.title": { en: "Global user management", fa: "مدیریت کاربران کل سیستم" },
  "page.ausers.desc": {
    en: "Search any user across the whole platform regardless of firm — view role and MFA status, force logout, reset password, or block a suspicious account.",
    fa: "جستجوی هر کاربر در کل پلتفرم صرف‌نظر از شرکت — مشاهده نقش و وضعیت احراز هویت دو مرحله‌ای، خروج اجباری، بازنشانی رمز عبور یا مسدود کردن حساب مشکوک.",
  },

  // --- admin categories ---
  "page.acats.title": { en: "Category management", fa: "مدیریت دسته‌بندی‌ها" },
  "page.acats.desc": {
    en: "Standard UK default categories mapped to VAT codes, plus industry-specific templates. Versioned, with rollback if a change goes wrong.",
    fa: "دسته‌بندی‌های پیش‌فرض استاندارد بریتانیا متصل به کدهای مالیاتی، به‌همراه قالب‌های مخصوص هر صنف. دارای نسخه‌بندی، با امکان بازگشت در صورت بروز مشکل.",
  },

  // --- AI Ops ---
  "page.aiops.title": { en: "AI Ops", fa: "مدیریت هوش مصنوعی" },
  "page.aiops.desc": {
    en: "Model registry, prompt versioning, per-model cost/accuracy, and the manual-correction-rate signal that drives model improvement.",
    fa: "فهرست مدل‌های هوش مصنوعی، نسخه‌بندی پرامپت‌ها، هزینه و دقت هر مدل، و نرخ اصلاح دستی که نشان‌دهنده نیاز به بهبود مدل است.",
  },

  // --- billing ---
  "page.billing.title": { en: "Billing & subscriptions", fa: "صورتحساب و اشتراک‌ها" },
  "page.billing.desc": {
    en: "Define plans and caps without a redeploy. Invoices, payment status, dunning, discount codes.",
    fa: "تعریف پلن‌ها و سقف‌های استفاده بدون نیاز به بروزرسانی سیستم. فاکتورها، وضعیت پرداخت، پیگیری بدهی و کدهای تخفیف.",
  },

  // --- analytics ---
  "page.analytics.title": { en: "Business reports & analytics", fa: "گزارش‌ها و تحلیل کسب‌وکار" },
  "page.analytics.desc": {
    en: "Revenue, cohort retention, and the signup → activation → payment funnel.",
    fa: "درآمد، نرخ ماندگاری مشتریان، و مسیر ثبت‌نام تا فعال‌سازی تا پرداخت.",
  },

  // --- helpdesk ---
  "page.helpdesk.title": { en: "Helpdesk", fa: "پشتیبانی" },
  "page.helpdesk.desc": {
    en: "Ticket queue prioritised by plan — higher SLA for higher plans, connected directly to that firm's data and errors for faster diagnosis.",
    fa: "صف تیکت‌ها بر اساس پلن اولویت‌بندی می‌شود — پلن‌های بالاتر سرویس سریع‌تری دارند، و مستقیماً به داده‌ها و خطاهای همان شرکت وصل است تا تشخیص سریع‌تر انجام شود.",
  },

  // --- system settings ---
  "page.sysset.title": { en: "System settings & integrations", fa: "تنظیمات سیستم و یکپارچه‌سازی‌ها" },
  "page.sysset.desc": {
    en: "Editable tax rules engine, Open Banking API keys, and third-party/HMRC integration management.",
    fa: "موتور قابل‌ویرایش قوانین مالیاتی، کلیدهای API بانکداری باز، و مدیریت اتصال به سرویس‌های ثالث و اداره مالیات بریتانیا (HMRC).",
  },

  // --- audit log ---
  "page.audit.title": { en: "Audit log & security", fa: "لاگ حسابرسی و امنیت" },
  "page.audit.desc": {
    en: "Full logging of every admin action, especially impersonation, plan/access changes, and data exports. Automatic alerts for unusual patterns.",
    fa: "ثبت کامل هر اقدام مدیر، به‌خصوص ورود به‌جای کاربر، تغییر پلن/دسترسی و خروجی گرفتن از داده‌ها. هشدار خودکار برای الگوهای غیرعادی.",
  },
  "page.audit.onlyFlagged": { en: "Only flagged events", fa: "فقط رویدادهای علامت‌گذاری‌شده" },

  // --- roles ---
  "page.roles.title": { en: "Internal roles (RBAC)", fa: "نقش‌های داخلی" },
  "page.roles.desc": {
    en: "Custom internal roles with precise, per-role permission assignment, independent of firm-side roles.",
    fa: "نقش‌های داخلی سفارشی با دسترسی دقیق برای هر نقش، مستقل از نقش‌های سمت شرکت‌ها.",
  },
};

export function useDictionary() {
  return DICT;
}

interface LocaleContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "fa" || stored === "en") setLocaleState(stored);
    } catch {
      // localStorage unavailable — stay on default "en"
    }
  }, []);

  function setLocale(l: Locale) {
    setLocaleState(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {
      // ignore — per-viewer convenience only
    }
  }

  function t(key: string): string {
    const entry = DICT[key];
    if (!entry) return key;
    return entry[locale];
  }

  return <LocaleContext.Provider value={{ locale, setLocale, t }}>{children}</LocaleContext.Provider>;
}

export function useT() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useT must be used within LocaleProvider");
  return ctx;
}
