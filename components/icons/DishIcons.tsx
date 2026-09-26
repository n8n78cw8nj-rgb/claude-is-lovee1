const common = {
  viewBox: '0 0 48 48',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  className: 'h-full w-full',
};

export function KhinkaliIcon() {
  return (
    <svg {...common}>
      <path d="M24 8v6" />
      <path d="M19 9l2 6M29 9l-2 6M16 13l3 5M32 13l-3 5" />
      <path d="M14 20c0-2 4-4 10-4s10 2 10 4c2 5 1 11-2 15-3 4-6 6-8 6s-5-2-8-6c-3-4-4-10-2-15z" />
      <path d="M19 22c1 6 1 11 0 16M24 21c1 6 1 12 0 17M29 22c-1 6-1 11 0 16" opacity={0.55} />
    </svg>
  );
}

export function KhachapuriIcon() {
  return (
    <svg {...common}>
      <path d="M6 30c2-14 12-20 18-20s16 6 18 20c-6 4-14 6-18 6s-12-2-18-6z" />
      <path d="M12 26c4-8 8-11 12-11s8 3 12 11" opacity={0.5} />
      <ellipse cx="24" cy="25" rx="5" ry="4" opacity={0.7} />
    </svg>
  );
}

export function CheburekIcon() {
  return (
    <svg {...common}>
      <path d="M9 27C9 15 18 8 27 9c3 1 4 4 2 7-3 4-8 5-8 5s7-1 11 3c3 3 3 7 0 9-6 5-16 4-21-1-2-2-3-3-2-5z" />
      <path d="M15 22c5-3 11-3 15 1" opacity={0.6} />
    </svg>
  );
}

export function SoupIcon() {
  return (
    <svg {...common}>
      <path d="M8 23h32c0 9-7 16-16 16S8 32 8 23z" />
      <path d="M8 23c0-2 2-3 4-3h24c2 0 4 1 4 3" />
      <path
        d="M17 9c1 2-1 3-1 5s2 3 1 5M24 8c1 2-1 3-1 5s2 3 1 5M31 9c1 2-1 3-1 5s2 3 1 5"
        opacity={0.55}
      />
    </svg>
  );
}

export function GrillIcon() {
  return (
    <svg {...common}>
      <line x1="6" y1="42" x2="42" y2="6" />
      <rect x="10" y="22" width="10" height="10" rx="2" transform="rotate(45 15 27)" />
      <rect x="20" y="12" width="10" height="10" rx="2" transform="rotate(45 25 17)" />
      <circle cx="36" cy="10" r="3.5" />
    </svg>
  );
}

export function PelmeniIcon() {
  return (
    <svg {...common}>
      <path d="M8 28c0-4 3-7 8-7s8 3 8 7-3 6-8 6-8-2-8-6z" />
      <path d="M24 20c0-4 3-7 8-7s8 3 8 7-3 6-8 6-8-2-8-6z" opacity={0.85} />
      <path d="M16 26c2-2 4-2 6 0M32 18c2-2 4-2 6 0" opacity={0.6} />
    </svg>
  );
}

export const dishIcons = {
  khinkali: KhinkaliIcon,
  khachapuri: KhachapuriIcon,
  cheburek: CheburekIcon,
  soup: SoupIcon,
  grill: GrillIcon,
  pelmeni: PelmeniIcon,
};

export type DishIconKey = keyof typeof dishIcons;

export function IconBadge({ icon, size = 56 }: { icon: DishIconKey; size?: number }) {
  const Icon = dishIcons[icon];
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full border-[1.5px] border-gold/40 bg-cream text-forest"
      style={{ width: size, height: size }}
    >
      <div style={{ width: size * 0.54, height: size * 0.54 }}>
        <Icon />
      </div>
    </div>
  );
}
