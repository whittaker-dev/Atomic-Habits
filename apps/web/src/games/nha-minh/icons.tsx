import type { SVGProps } from 'react';

// Bộ biểu tượng của Nhà Mình: nét 1.8, đầu tròn, cùng một khung 24×24.

type P = SVGProps<SVGSVGElement>;

function Svg(props: P) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    />
  );
}

export const IconBack = (p: P) => (
  <Svg {...p}>
    <path d="M15 5l-7 7 7 7" />
  </Svg>
);
export const IconPlus = (p: P) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);
export const IconMinus = (p: P) => (
  <Svg {...p}>
    <path d="M5 12h14" />
  </Svg>
);
export const IconRecenter = (p: P) => (
  <Svg {...p}>
    <path d="M4 12a8 8 0 1 0 2.3-5.7" />
    <path d="M4 4v4h4" />
    <circle cx="12" cy="12" r="2" />
  </Svg>
);
export const IconShare = (p: P) => (
  <Svg {...p}>
    <rect x="4" y="4" width="6" height="6" rx="1" />
    <rect x="14" y="4" width="6" height="6" rx="1" />
    <rect x="4" y="14" width="6" height="6" rx="1" />
    <path d="M14 14h2v2M20 14v6h-6v-2M17 17h0" />
  </Svg>
);
export const IconWall = (p: P) => (
  <Svg {...p}>
    <path d="M3 6h18v12H3zM3 12h18M9 6v6M15 12v6" />
  </Svg>
);
export const IconTile = (p: P) => (
  <Svg {...p}>
    <rect x="4" y="4" width="16" height="16" rx="1" />
    <path d="M12 4l8 8-8 8-8-8z" />
  </Svg>
);
export const IconSofa = (p: P) => (
  <Svg {...p}>
    <path d="M5 11V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3" />
    <path d="M3 13a2 2 0 0 1 4 0v2h10v-2a2 2 0 0 1 4 0v5H3z" />
    <path d="M6 18v2M18 18v2" />
  </Svg>
);
export const IconGoal = (p: P) => (
  <Svg {...p}>
    <path d="M4 11l8-7 8 7" />
    <path d="M6 10v10h12V10" />
    <path d="M9.5 15l2 2 3.5-4" />
  </Svg>
);
export const IconCheck = (p: P) => (
  <Svg {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Svg>
);
export const IconDoor = (p: P) => (
  <Svg {...p}>
    <path d="M6 21V4h12v17M3 21h18" />
    <circle cx="14.5" cy="12.5" r=".8" fill="currentColor" />
  </Svg>
);
export const IconWindow = (p: P) => (
  <Svg {...p}>
    <rect x="4" y="5" width="16" height="14" rx="1" />
    <path d="M12 5v14M4 12h16" />
  </Svg>
);
export const IconErase = (p: P) => (
  <Svg {...p}>
    <path d="M8 20h12M5 15l9-9 5 5-9 9H8z" />
  </Svg>
);
export const IconRotate = (p: P) => (
  <Svg {...p}>
    <path d="M20 12a8 8 0 1 1-2.3-5.7" />
    <path d="M20 4v4h-4" />
  </Svg>
);
export const IconKey = (p: P) => (
  <Svg {...p}>
    <circle cx="8" cy="12" r="3.5" />
    <path d="M11.5 12H21M17 12v3M20 12v2" />
  </Svg>
);
