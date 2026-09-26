"use client";

import Link from "next/link";
import { useT } from "../_lib/i18n";
import "../preview.css";

export default function GuidePage() {
  const { t, locale, setLocale } = useT();
  const fa = locale === "fa";

  return (
    <div dir={fa ? "rtl" : "ltr"} data-locale={locale} style={{ minHeight: "100vh" }}>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 5,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          padding: "14px 28px",
          borderBottom: "1px solid var(--border)",
          background: "rgba(10,14,23,0.85)",
          backdropFilter: "blur(6px)",
        }}
      >
        <Link href="/preview" style={{ color: "var(--text)", textDecoration: "none", fontWeight: 700 }}>
          {fa ? "← بازگشت به دمو" : "← Back to demo"}
        </Link>
        <button type="button" className="preview-lang-toggle" onClick={() => setLocale(fa ? "en" : "fa")}>
          {t("lang.toggle")}
        </button>
      </header>

      <main className="preview-page" style={{ maxWidth: 880, margin: "0 auto" }}>
        {fa ? <GuideFa /> : <GuideEn />}
      </main>
    </div>
  );
}

function GuideFa() {
  return (
    <>
      <h1 className="preview-page-title" style={{ fontSize: "1.7rem" }}>راهنمای کامل Accorix</h1>
      <p className="preview-page-desc" style={{ maxWidth: "68ch" }}>
        این صفحه توضیح می‌دهد که هر بخش از محصول دقیقاً چطور کار می‌کند — نه فقط اسم صفحه‌ها،
        بلکه جریان واقعی کار از دید یک کارمند دفتر حسابداری و از دید تیم داخلی Accorix.
        <br />
        <strong style={{ color: "var(--accorix-gold)" }}>
          یادآوری مهم: این صفحه یک دموی UI است. داده‌ها نمایشی هستند و بخش زیادی از جریان‌های زیر
          هنوز در بک‌اند واقعی پیاده‌سازی نشده — پایین همین صفحه دقیقاً مشخص شده کدام بخش الان واقعاً
          کار می‌کند و کدام بخش فقط طراحی/برنامه است.
        </strong>
      </p>

      <section className="preview-card">
        <h2 className="preview-card-title" style={{ fontSize: "1.1rem" }}>Accorix دقیقاً چیست؟</h2>
        <p className="preview-page-desc" style={{ maxWidth: "68ch" }}>
          Accorix یک پلتفرم حسابداری است که برای <strong style={{ color: "var(--text)" }}>دفاتر حسابداری</strong>{" "}
          ساخته شده، نه برای یک کسب‌وکار تنها. یک دفتر حسابداری چند مشتری دارد (مثلاً یک کافه، یک شرکت
          ساختمانی، یک فروشگاه گل) و برای هرکدام باید رسیدها و فاکتورها را جمع کند، دسته‌بندی کند، با
          حساب بانکی تطبیق دهد و در نهایت مالیات بر ارزش‌افزوده (VAT) را برای HMRC آماده کند.
          Accorix این کار را با هوش مصنوعی سریع‌تر می‌کند: عکس رسید را آپلود می‌کنید، سیستم متن را
          می‌خواند، فیلدها (فروشنده، مبلغ، تاریخ، مالیات) را استخراج می‌کند و دسته‌بندی پیشنهاد می‌دهد —
          اما تصمیم نهایی همیشه با حسابدار است، نه با هوش مصنوعی.
        </p>
      </section>

      <h2 style={{ marginTop: 34, fontSize: "1.3rem" }}>بخش اول — پنل شرکت (کسانی که در دفتر حسابداری کار می‌کنند)</h2>

      <FlowStep n={1} title="ثبت‌نام / ورود">
        صاحب دفتر حسابداری یک حساب می‌سازد و نام شرکت را وارد می‌کند. همان لحظه یک «شرکت» (Firm) در
        سیستم ساخته می‌شود و او مالک (Owner) آن است.
      </FlowStep>
      <FlowStep n={2} title="راه‌اندازی اولیه (Onboarding)">
        سه قدم کوتاه: اطلاعات شرکت را کامل می‌کند، اعضای تیم را دعوت می‌کند (پایین توضیح کامل «مدیریت
        کارمندان» را ببینید)، و اولین مشتری را اضافه می‌کند.
      </FlowStep>
      <FlowStep n={3} title="افزودن مشتری">
        هر مشتری یک پروفایل جدا دارد: شماره مالیات بر ارزش‌افزوده، شماره ثبت شرکت، پایان سال مالی، نوع
        طرح مالیاتی (VAT Scheme) و حساب‌های بانکی متصل. هیچ مشتری اطلاعات مشتری دیگر را نمی‌بیند —
        این جداسازی در سطح دیتابیس هم رعایت می‌شود.
      </FlowStep>
      <FlowStep n={4} title="ساخت پروژه برای هر مشتری">
        هر کار مشخص (مثلاً «مالیات فصل دوم ۲۰۲۶» یا «حسابداری ماهانه مرداد») یک «پروژه» است، با تاریخ
        سررسید و چک‌لیست مراحل. پروژه در یک مسیر مشخص پیش می‌رود: شروع نشده → در حال انجام → در حال
        بازبینی → مسدود شده → تمام‌شده.
      </FlowStep>
      <FlowStep n={5} title="آپلود سند">
        رسید یا فاکتور را می‌توان با کشیدن-و-رهاکردن آپلود کرد، یا با فوروارد کردن ایمیل به آدرس
        اختصاصی هر مشتری، یا با عکس گرفتن از موبایل. اسناد دست‌نویس و کیفیت پایین هم پشتیبانی می‌شوند.
      </FlowStep>
      <FlowStep n={6} title="استخراج و دسته‌بندی خودکار">
        سیستم متن سند را می‌خواند (OCR)، فیلدهای کلیدی را استخراج می‌کند و یک دسته‌بندی پیشنهاد
        می‌دهد. به هر فیلد یک «درصد اطمینان» تعلق می‌گیرد.
      </FlowStep>
      <FlowStep n={7} title="صف بازبینی انسانی">
        اگر اطمینان یک فیلد پایین باشد، آن سند به‌جای قبول خودکار، در صف بازبینی قرار می‌گیرد تا یک
        عضو تیم سریع آن را چک و تایید کند. این قانون هیچ‌وقت کنار گذاشته نمی‌شود — هوش مصنوعی پیشنهاد
        می‌دهد، انسان تایید می‌کند.
      </FlowStep>
      <FlowStep n={8} title="تطبیق بانکی">
        تراکنش‌های حساب بانکی متصل به‌طور خودکار با اسناد آپلودشده تطبیق داده می‌شوند. فقط مواردی که
        تطبیق پیدا نکردند نیاز به بررسی دستی دارند. اگر مشتری حساب بانکی‌اش را وصل نکند، این مرحله
        ساده حذف می‌شود و همه‌چیز مثل قبل به‌صورت دستی انجام می‌شود.
      </FlowStep>
      <FlowStep n={9} title="گزارش‌گیری" last>
        در پایان، گزارش‌های استاندارد (سود و زیان، ترازنامه، جریان نقدی، پیش‌نویس مالیات بر ارزش‌افزوده)
        به‌صورت Excel، PDF یا CSV آماده خروجی هستند.
      </FlowStep>

      <h2 style={{ marginTop: 34, fontSize: "1.3rem" }}>ویژگی‌ها به تفکیک — با جزئیات</h2>

      <FeatureBlock title="👥 مدیریت کارمندان (Team) — دقیقاً چطور کار می‌کند">
        <p>
          صاحب شرکت (Owner) از صفحه «تیم» یک ایمیل دعوت می‌فرستد. آن فرد ایمیل را باز می‌کند، روی لینک
          کلیک می‌کند، یک رمز عبور می‌سازد و بلافاصله وارد داشبورد <strong>همان شرکت</strong> می‌شود —
          دقیقاً همان مشتری‌ها، پروژه‌ها و اسنادی را می‌بیند که بقیه تیم می‌بینند (نه یک حساب جدا).
        </p>
        <p>هر عضو یکی از این نقش‌ها را دارد:</p>
        <ul style={{ margin: "8px 0", paddingInlineStart: 20 }}>
          <li><strong>Owner (مالک)</strong> — دسترسی کامل، تنها کسی که می‌تواند شرکت را حذف یا صاحب آن را تغییر دهد.</li>
          <li><strong>Manager (مدیر)</strong> — همه‌کاره به‌جز تنظیمات صورتحساب شرکت.</li>
          <li><strong>Accountant (حسابدار)</strong> — کار روی مشتری‌ها، پروژه‌ها و اسناد.</li>
          <li><strong>Bookkeeper (دفتردار)</strong> — عمدتاً آپلود و بازبینی اسناد.</li>
        </ul>
      </FeatureBlock>

      <FeatureBlock title="🏢 مدیریت مشتریان">
        هر مشتریِ دفتر حسابداری یک رکورد جدا با اطلاعات کامل (VAT، شماره ثبت، پایان سال مالی، حساب
        بانکی متصل، تیم مسئول) دارد. مشتری خودش وارد سیستم نمی‌شود و چیزی نمی‌بیند — این فقط رکوردی
        است که کارمندان شرکت مدیریت می‌کنند. (نسخه‌ای که مشتری خودش هم بتواند وارد شود و سند بفرستد،
        در فاز بعدی محصول برنامه‌ریزی شده است.)
      </FeatureBlock>

      <FeatureBlock title="📄 آپلود و استخراج هوشمند اسناد">
        سه راه برای رساندن سند به سیستم: کشیدن-و-رهاکردن، ایمیل اختصاصی هر مشتری، یا عکس موبایل.
        سیستم OCR متن را می‌خواند و مدل هوش مصنوعی فیلدها (فروشنده، تاریخ، مبلغ، مالیات) را استخراج
        می‌کند و یک دسته‌بندی پیشنهاد می‌دهد.
      </FeatureBlock>

      <FeatureBlock title="✅ صف بازبینی انسانی">
        هیچ فیلدی که اطمینان پایینی دارد بدون بررسی قبول نمی‌شود. این دقیقاً همان اصل «انسان همیشه
        تصمیم نهایی را می‌گیرد» است که در کل محصول رعایت می‌شود.
      </FeatureBlock>

      <FeatureBlock title="🏦 تطبیق بانکی">
        اتصال به حساب بانکی (Open Banking) تراکنش‌ها را می‌آورد و به‌طور خودکار با اسناد آپلودشده
        جفت می‌کند. فقط موارد بی‌جفت نیاز به کار دستی دارند. وصل کردن حساب بانکی اختیاری است — اگر
        مشتری‌ای حساب بانکی‌اش را وصل نکند، هیچ اتفاق بدی نمی‌افتد، فقط تطبیق خودکار انجام نمی‌شود و
        تیم مثل روال معمول همه چیز را دستی بررسی می‌کند.
      </FeatureBlock>

      <FeatureBlock title="💬 دستیار هوش مصنوعی">
        یک چت که محدود به یک شرکت، یک مشتری یا یک پروژه خاص است — جواب‌ها به تراکنش یا سند واقعی
        ارجاع می‌دهند، نه یک چت‌بات عمومی.
      </FeatureBlock>

      <FeatureBlock title="📊 گزارش‌ها و خروجی‌ها">
        صورت سود و زیان، ترازنامه، جریان نقدی، پیش‌نویس مالیات بر ارزش‌افزوده، بدهکاران و بستانکاران —
        همه به‌صورت Excel، PDF یا CSV.
      </FeatureBlock>

      <h2 style={{ marginTop: 34, fontSize: "1.3rem" }}>بخش دوم — پنل مدیریت (فقط تیم داخلی Accorix)</h2>
      <p className="preview-page-desc" style={{ maxWidth: "68ch" }}>
        این پنل را هیچ مشتری یا دفتر حسابداری نمی‌بیند — فقط کارکنان خود Accorix برای اداره کل
        پلتفرم از آن استفاده می‌کنند.
      </p>

      <FeatureBlock title="🏢 مدیریت شرکت‌ها">
        فهرست همه دفاتر حسابداری که مشترک Accorix هستند — وضعیت (آزمایشی/فعال/معلق)، میزان مصرف،
        کارکنان، و تاریخچه پرداخت هرکدام. امکان ورود موقت به حساب یک شرکت برای عیب‌یابی (با ثبت کامل
        در لاگ و اطلاع به همان شرکت).
      </FeatureBlock>
      <FeatureBlock title="👤 کاربران کل سیستم">
        جستجوی هر کاربر در کل پلتفرم، صرف‌نظر از اینکه در کدام شرکت است — بازنشانی رمز عبور، خروج
        اجباری، یا مسدود کردن حساب مشکوک.
      </FeatureBlock>
      <FeatureBlock title="🤖 مدیریت هوش مصنوعی (AI Ops)">
        اینجا مشخص می‌شود کدام مدل هوش مصنوعی در حال استفاده است، هزینه و دقت هر مدل چقدر است، و چند
        درصد از پیشنهادهای هوش مصنوعی توسط کاربران واقعی اصلاح می‌شوند — این عدد مهم‌ترین سیگنال برای
        بهتر کردن مدل‌ها در طول زمان است.
      </FeatureBlock>
      <FeatureBlock title="💳 صورتحساب و اشتراک‌ها">
        تعریف پلن‌های قیمت‌گذاری، فاکتورها، پیگیری پرداخت‌های ناموفق، کدهای تخفیف.
      </FeatureBlock>
      <FeatureBlock title="🎫 پشتیبانی">
        صف تیکت پشتیبانی، اولویت‌بندی‌شده بر اساس پلن هر شرکت.
      </FeatureBlock>
      <FeatureBlock title="🔒 لاگ حسابرسی و امنیت" >
        ثبت کامل هر اقدام مدیر — به‌خصوص ورود موقت به حساب یک شرکت، تغییر پلن، و خروجی گرفتن از داده‌ها.
        برای هر تغییر مشخص است چه کسی، از چه IP، چه چیزی را عوض کرده و مقدار قبل و بعدش چه بوده.
      </FeatureBlock>

      <section className="preview-card" style={{ marginTop: 30, borderLeft: "3px solid var(--accent)" }}>
        <h2 className="preview-card-title" style={{ fontSize: "1.05rem" }}>چه چیزی همین الان واقعی است؟</h2>
        <p className="preview-page-desc" style={{ maxWidth: "68ch" }}>
          این دمو (همین صفحاتی که می‌بینید) فقط نمای بصری است، با داده‌ی ساختگی. اما یک نسخه‌ی واقعیِ
          کوچک‌تر هم در پشت صحنه در حال ساخت است: ثبت‌نام، ورود، مدیریت مشتری و پروژه، و آپلود سند که
          واقعاً با OCR و هوش مصنوعی رایگان کار می‌کند (نه هنوز با Azure) — روی یک دیتابیس واقعی.
        </p>
      </section>
    </>
  );
}

function GuideEn() {
  return (
    <>
      <h1 className="preview-page-title" style={{ fontSize: "1.7rem" }}>The complete Accorix guide</h1>
      <p className="preview-page-desc" style={{ maxWidth: "68ch" }}>
        This page explains exactly how each part of the product works — not just page names, but
        the real flow of work from the point of view of an accounting firm's staff, and from the
        point of view of Accorix's own internal team.
        <br />
        <strong style={{ color: "var(--accorix-gold)" }}>
          Important: this is a UI demo. The data is fake, and a lot of the flows below aren't built
          in the real backend yet — the bottom of this page states plainly what's actually working
          today versus what's design-only.
        </strong>
      </p>

      <section className="preview-card">
        <h2 className="preview-card-title" style={{ fontSize: "1.1rem" }}>What exactly is Accorix?</h2>
        <p className="preview-page-desc" style={{ maxWidth: "68ch" }}>
          Accorix is an accounting platform built for <strong style={{ color: "var(--text)" }}>accounting
          firms</strong>, not a single business. A firm has many clients (a cafe, a construction
          company, a flower shop) and for each one needs to collect receipts, categorise them,
          reconcile them against the bank, and eventually prepare a VAT return for HMRC. Accorix
          speeds this up with AI: upload a photo of a receipt, the system reads the text, extracts
          fields (vendor, amount, date, tax) and suggests a category — but the final call is always
          the accountant's, never the AI's.
        </p>
      </section>

      <h2 style={{ marginTop: 34, fontSize: "1.3rem" }}>Part 1 — Firm panel (people who work at the accounting practice)</h2>

      <FlowStep n={1} title="Sign up / log in">
        The firm owner creates an account and enters the firm's name. At that moment a "Firm" is
        created in the system, and they're its Owner.
      </FlowStep>
      <FlowStep n={2} title="Onboarding">
        Three short steps: fill in firm details, invite team members (see the full "Team
        management" explanation below), and add the first client.
      </FlowStep>
      <FlowStep n={3} title="Add a client">
        Every client gets its own profile: VAT number, company registration, financial year end,
        VAT scheme, and connected bank accounts. No client ever sees another client's data — this
        separation is enforced at the database level too.
      </FlowStep>
      <FlowStep n={4} title="Create a project per client">
        Each specific piece of work (e.g. "VAT Q2 2026" or "August bookkeeping") is a "Project",
        with a due date and a checklist. A project moves through a fixed pipeline: not started → in
        progress → in review → blocked → done.
      </FlowStep>
      <FlowStep n={5} title="Upload a document">
        A receipt or invoice can be dropped in directly, forwarded from a client's dedicated email
        address, or photographed on a phone. Handwritten and low-quality scans are supported.
      </FlowStep>
      <FlowStep n={6} title="Automatic extraction & categorisation">
        The system reads the document's text (OCR), extracts key fields, and suggests a category.
        Every field carries a confidence percentage.
      </FlowStep>
      <FlowStep n={7} title="Human review queue">
        If a field's confidence is low, that document goes to a review queue instead of being
        silently accepted — a team member checks and approves it quickly. This rule never gets
        skipped: AI suggests, a human confirms.
      </FlowStep>
      <FlowStep n={8} title="Bank reconciliation">
        Transactions from a connected bank account are automatically matched against uploaded
        documents. Only the leftovers need a manual look. If a client doesn't connect a bank
        account, this step is simply skipped and everything is done manually as usual.
      </FlowStep>
      <FlowStep n={9} title="Reporting" last>
        At the end, standard reports (P&L, balance sheet, cash flow, VAT draft) are ready to export
        as Excel, PDF, or CSV.
      </FlowStep>

      <h2 style={{ marginTop: 34, fontSize: "1.3rem" }}>Features, one by one — in detail</h2>

      <FeatureBlock title="👥 Team management — exactly how it works">
        <p>
          The firm Owner sends an invite email from the "Team" page. That person opens the email,
          clicks the link, sets a password, and lands straight in <strong>the same firm's</strong>{" "}
          dashboard — the exact same clients, projects, and documents the rest of the team sees
          (not a separate account).
        </p>
        <p>Each member has one of these roles:</p>
        <ul style={{ margin: "8px 0", paddingInlineStart: 20 }}>
          <li><strong>Owner</strong> — full access, the only one who can delete the firm or change its owner.</li>
          <li><strong>Manager</strong> — everything except the firm's billing settings.</li>
          <li><strong>Accountant</strong> — works on clients, projects, and documents.</li>
          <li><strong>Bookkeeper</strong> — mainly uploads and reviews documents.</li>
        </ul>
      </FeatureBlock>

      <FeatureBlock title="🏢 Client management">
        Every one of a firm's clients gets its own record with full details (VAT, company
        registration, financial year end, connected bank account, assigned team). The client
        themselves never logs in or sees anything — it's purely a record firm staff maintain. (A
        version where the client can log in and send documents themselves is planned for a later
        phase.)
      </FeatureBlock>

      <FeatureBlock title="📄 Document upload & smart extraction">
        Three ways to get a document into the system: drag-and-drop, a client's dedicated email
        address, or a phone photo. OCR reads the text and an AI model extracts fields (vendor,
        date, amount, tax) and suggests a category.
      </FeatureBlock>

      <FeatureBlock title="✅ Human review queue">
        No low-confidence field is ever accepted without a check. This is the exact "a human always
        makes the final call" principle that runs through the whole product.
      </FeatureBlock>

      <FeatureBlock title="🏦 Bank reconciliation">
        A bank connection (Open Banking) brings in transactions and automatically pairs them with
        uploaded documents. Only unmatched items need manual work. Connecting a bank account is
        optional — if a client doesn't connect one, nothing breaks, automatic matching just
        doesn't happen and the team reviews everything manually as usual.
      </FeatureBlock>

      <FeatureBlock title="💬 AI assistant">
        A chat scoped to a firm, a client, or a specific project — answers cite the real
        transaction or document, not a generic chatbot.
      </FeatureBlock>

      <FeatureBlock title="📊 Reports & exports">
        P&L, balance sheet, cash flow, VAT drafts, aged debtors/creditors — all as Excel, PDF, or
        CSV.
      </FeatureBlock>

      <h2 style={{ marginTop: 34, fontSize: "1.3rem" }}>Part 2 — Admin panel (Accorix's own internal team only)</h2>
      <p className="preview-page-desc" style={{ maxWidth: "68ch" }}>
        No client or accounting firm ever sees this panel — only Accorix's own staff use it to run
        the whole platform.
      </p>

      <FeatureBlock title="🏢 Firms management">
        A list of every accounting firm subscribed to Accorix — status (trial/active/suspended),
        usage, staff, and each one's payment history. Includes temporary impersonation of a firm's
        account for troubleshooting (fully logged, and that firm is notified).
      </FeatureBlock>
      <FeatureBlock title="👤 Global users">
        Search any user across the whole platform regardless of which firm they belong to — reset a
        password, force logout, or block a suspicious account.
      </FeatureBlock>
      <FeatureBlock title="🤖 AI Ops">
        Which AI model is currently in use, each model's cost and accuracy, and what percentage of
        AI suggestions get corrected by real users — that number is the single most important
        signal for improving the models over time.
      </FeatureBlock>
      <FeatureBlock title="💳 Billing & subscriptions">
        Defining pricing plans, invoices, tracking failed payments, discount codes.
      </FeatureBlock>
      <FeatureBlock title="🎫 Helpdesk">
        A support ticket queue, prioritised by each firm's plan.
      </FeatureBlock>
      <FeatureBlock title="🔒 Audit log & security">
        Complete logging of every admin action — especially impersonating a firm's account, plan
        changes, and data exports. Every change records who made it, from which IP, and the exact
        before-and-after values.
      </FeatureBlock>

      <section className="preview-card" style={{ marginTop: 30, borderLeft: "3px solid var(--accent)" }}>
        <h2 className="preview-card-title" style={{ fontSize: "1.05rem" }}>What's actually real right now?</h2>
        <p className="preview-page-desc" style={{ maxWidth: "68ch" }}>
          This demo (the pages you're clicking through) is a visual-only mock with fake data. But a
          smaller, real version is also being built behind the scenes: real sign-up, login, client
          and project management, and document upload that genuinely runs through OCR and a free
          AI model (not Azure yet) — against a real database.
        </p>
      </section>
    </>
  );
}

function FlowStep({ n, title, children, last }: { n: number; title: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div style={{ display: "flex", gap: 14, marginBottom: last ? 0 : 4 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <span
          style={{
            width: 30,
            height: 30,
            borderRadius: "50%",
            background: "var(--accent-gradient)",
            color: "#06111a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: "0.85rem",
            flexShrink: 0,
          }}
        >
          {n}
        </span>
        {!last && <span style={{ flex: 1, width: 2, background: "var(--border-strong)", margin: "4px 0" }} />}
      </div>
      <div style={{ paddingBottom: 22 }}>
        <h3 style={{ margin: "3px 0 6px", fontSize: "0.98rem" }}>{title}</h3>
        <p className="preview-page-desc" style={{ maxWidth: "62ch", margin: 0 }}>{children}</p>
      </div>
    </div>
  );
}

function FeatureBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="preview-card">
      <h3 style={{ margin: "0 0 8px", fontSize: "1rem" }}>{title}</h3>
      <div className="preview-page-desc" style={{ maxWidth: "68ch" }}>{children}</div>
    </section>
  );
}
