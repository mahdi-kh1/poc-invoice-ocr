// Monoline/outline icon set for the /vision landing page — inline SVG, no icon library, matching
// this repo's dependency-light instinct. Every icon shares the same 24x24 viewBox, stroke width,
// and currentColor fill-less style so they read as one consistent family regardless of section.

function IconBase({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function IconLedger({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M5 4h11a2 2 0 0 1 2 2v13a1 1 0 0 1-1.45.9L14 18.5l-2.55 1.4a1 1 0 0 1-1 0L8 18.5l-2.55 1.4A1 1 0 0 1 4 19V6a2 2 0 0 1 1-1.73" />
      <path d="M8 9h6M8 12.5h6" />
    </IconBase>
  );
}

export function IconCamera({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1-2h7l1 2h2A1.5 1.5 0 0 1 20 8.5v9A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5z" />
      <circle cx="12" cy="12.5" r="3.4" />
    </IconBase>
  );
}

export function IconCalendar({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <rect x="4" y="5.5" width="16" height="14.5" rx="2" />
      <path d="M4 10h16M8 3.5v3M16 3.5v3" />
      <path d="M8.5 14h1M12 14h1M15.5 14h1" />
    </IconBase>
  );
}

export function IconRocket({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M12 3c2.8 1.4 4.5 4.2 4.5 8 0 2.3-.8 4.3-2 5.8l-2.5 2.7-2.5-2.7c-1.2-1.5-2-3.5-2-5.8 0-3.8 1.7-6.6 4.5-8z" />
      <circle cx="12" cy="10.2" r="1.7" />
      <path d="M8.3 15.5 5.5 17l.6-3.3M15.7 15.5l2.8 1.5-.6-3.3" />
    </IconBase>
  );
}

export function IconUsers({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <circle cx="9" cy="8.5" r="3" />
      <path d="M3.5 19.5c.7-3 2.7-4.7 5.5-4.7s4.8 1.7 5.5 4.7" />
      <circle cx="17" cy="9" r="2.3" />
      <path d="M15.3 15c2.4.2 4 1.7 4.6 4.5" />
    </IconBase>
  );
}

export function IconClipboard({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <rect x="5.5" y="4.5" width="13" height="16" rx="2" />
      <path d="M9 4.5V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v.5" />
      <path d="M8.5 11.5l2 2 4-4.4M8.5 16h5" />
    </IconBase>
  );
}

export function IconUpload({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M12 15V4M8 8l4-4 4 4" />
      <path d="M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" />
    </IconBase>
  );
}

export function IconShieldCheck({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M12 3 5 5.5V11c0 4.8 3 8 7 9.5 4-1.5 7-4.7 7-9.5V5.5z" />
      <path d="M9 11.7l2 2 4-4.4" />
    </IconBase>
  );
}

export function IconSparkles({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M11 3l1.2 3.6L16 8l-3.8 1.4L11 13l-1.2-3.6L6 8l3.8-1.4z" />
      <path d="M17.5 13.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" />
    </IconBase>
  );
}

export function IconLandmark({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M4 9.5 12 4l8 5.5" />
      <path d="M4.5 9.5h15" />
      <path d="M6 9.5V18M10 9.5V18M14 9.5V18M18 9.5V18" />
      <path d="M4 20.5h16" />
    </IconBase>
  );
}

export function IconBell({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M7 9.5a5 5 0 0 1 10 0c0 4 1.5 5.5 1.5 5.5h-13S7 13.5 7 9.5z" />
      <path d="M10.3 18a1.8 1.8 0 0 0 3.4 0" />
    </IconBase>
  );
}

export function IconChat({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7A2.5 2.5 0 0 1 17.5 16H10l-4.2 3.4A.6.6 0 0 1 5 19v-3H6.5A2.5 2.5 0 0 1 4 13.5z" />
      <path d="M8 8.5h8M8 11.5h5" />
    </IconBase>
  );
}

export function IconChart({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M4 20V4M4 20h16" />
      <path d="M8 20v-6M12.5 20V9M17 20v-9.5" />
    </IconBase>
  );
}

export function IconBuilding({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <rect x="5" y="3.5" width="9" height="17" rx="1" />
      <path d="M14 9.5h5v11h-5" />
      <path d="M8 7.5h2M8 11h2M8 14.5h2" />
    </IconBase>
  );
}

export function IconTag({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M11.5 4H6a2 2 0 0 0-2 2v5.5a2 2 0 0 0 .6 1.4l7.5 7.5a2 2 0 0 0 2.8 0l5-5a2 2 0 0 0 0-2.8l-7.5-7.5a2 2 0 0 0-.9-.5z" />
      <circle cx="8.2" cy="8.2" r="1.3" />
    </IconBase>
  );
}

export function IconCpu({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <rect x="7" y="7" width="10" height="10" rx="1.5" />
      <rect x="10" y="10" width="4" height="4" />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2" />
    </IconBase>
  );
}

export function IconCreditCard({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <rect x="3.5" y="6" width="17" height="12" rx="2" />
      <path d="M3.5 10h17" />
      <path d="M6.5 14.2h4" />
    </IconBase>
  );
}

export function IconHeadset({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M4 13v-1a8 8 0 0 1 16 0v1" />
      <rect x="3" y="13" width="4" height="6" rx="1.5" />
      <rect x="17" y="13" width="4" height="6" rx="1.5" />
      <path d="M19 19v.5a3 3 0 0 1-3 3h-2.5" />
    </IconBase>
  );
}

export function IconFileCheck({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M7 3.5h7l4 4v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1z" />
      <path d="M14 3.5V8h4" />
      <path d="M9 14l2 2 4-4.4" />
    </IconBase>
  );
}

export function IconScan({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M4 8V6a2 2 0 0 1 2-2h2M4 16v2a2 2 0 0 0 2 2h2M20 8V6a2 2 0 0 0-2-2h-2M20 16v2a2 2 0 0 1-2 2h-2" />
      <path d="M4 12h16" />
    </IconBase>
  );
}

export function IconEye({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="2.6" />
    </IconBase>
  );
}

export function IconLink({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M9.5 14.5 14.5 9.5" />
      <path d="M11 6.5l1.4-1.4a3.6 3.6 0 0 1 5 5L16 11.5M13 17.5l-1.4 1.4a3.6 3.6 0 0 1-5-5L8 12.5" />
    </IconBase>
  );
}

export function IconCheckCircle({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.3 12.2l2.4 2.4 5-5.4" />
    </IconBase>
  );
}

export function IconPuzzle({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M9 4.5h4v2a1.5 1.5 0 0 0 3 0v-2h2A1.5 1.5 0 0 1 19.5 6v2h-2a1.5 1.5 0 0 0 0 3h2v2a1.5 1.5 0 0 1-1.5 1.5h-2v-2a1.5 1.5 0 0 0-3 0v2H9v-2a1.5 1.5 0 0 0-3 0v2H4.5A1.5 1.5 0 0 1 3 12.5v-2h2a1.5 1.5 0 0 0 0-3H3v-2A1.5 1.5 0 0 1 4.5 4.5h2v2a1.5 1.5 0 0 0 3 0z" />
    </IconBase>
  );
}

export function IconLayers({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M12 3.5 3.5 8 12 12.5 20.5 8z" />
      <path d="M3.5 12l8.5 4.5 8.5-4.5" />
      <path d="M3.5 16l8.5 4.5 8.5-4.5" />
    </IconBase>
  );
}

export function IconArrowRight({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M4 12h16M13 6l6 6-6 6" />
    </IconBase>
  );
}
