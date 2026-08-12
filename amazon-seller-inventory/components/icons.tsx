// The app's icon set — inline SVG only (no emoji, no icon fonts), stroke
// follows currentColor so icons inherit theme and state colors.
type P = { className?: string };
const S = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  viewBox: "0 0 24 24",
} as const;

export const IconGrid = ({ className }: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" />
  </svg>
);
export const IconBox = ({ className }: P) => (
  <svg {...S} className={className}>
    <path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z" />
    <path d="M3 7.5l9 4.5 9-4.5M12 12v9" />
  </svg>
);
export const IconBag = ({ className }: P) => (
  <svg {...S} className={className}>
    <path d="M6 7h12l1.2 13H4.8L6 7z" />
    <path d="M9 10V6a3 3 0 0 1 6 0v4" />
  </svg>
);
export const IconTag = ({ className }: P) => (
  <svg {...S} className={className}>
    <path d="M3 3h8.6L21 12.4 12.4 21 3 11.6V3z" />
    <circle cx="7.6" cy="7.6" r="1.4" />
  </svg>
);
export const IconSearch = ({ className }: P) => (
  <svg {...S} className={className}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-4-4" />
  </svg>
);
export const IconCamera = ({ className }: P) => (
  <svg {...S} className={className}>
    <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
    <circle cx="12" cy="13" r="3.2" />
  </svg>
);
export const IconBell = ({ className }: P) => (
  <svg {...S} className={className}>
    <path d="M18 9a6 6 0 1 0-12 0c0 6-2 7-2 7h16s-2-1-2-7" />
    <path d="M10.3 20a2 2 0 0 0 3.4 0" />
  </svg>
);
export const IconUsers = ({ className }: P) => (
  <svg {...S} className={className}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
    <path d="M16 5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4.5-6.2" />
  </svg>
);
export const IconStore = ({ className }: P) => (
  <svg {...S} className={className}>
    <path d="M4 7l1.5-4h13L20 7M4 7h16M4 7v13h16V7" />
    <path d="M9 20v-6h6v6" />
  </svg>
);
export const IconClock = ({ className }: P) => (
  <svg {...S} className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3.5 2" />
  </svg>
);
