import type { ReactNode } from 'react';

// Biểu tượng của Cờ tỷ phú: nét 1.8 bo tròn, như nét vẽ vàng trên đồ sơn mài.

function Icon({ children, className = 'h-5 w-5' }: { children: ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  );
}

type P = { className?: string };

export const BackIcon = (p: P) => (
  <Icon {...p}>
    <path d="M14 6l-6 6 6 6" />
  </Icon>
);

/** Một điện thoại chuyền tay. */
export const PassIcon = (p: P) => (
  <Icon {...p}>
    <rect x="7" y="3" width="10" height="18" rx="1.5" />
    <path d="M11 17.5h2" />
    <path d="M2 9l2.5-2.5L7 9M20 15l-2.5 2.5L15 15" />
  </Icon>
);

/** Máy chơi: một con chip. */
export const BotIcon = (p: P) => (
  <Icon {...p}>
    <rect x="6" y="6" width="12" height="12" />
    <path d="M10 10h4v4h-4zM9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3" />
  </Icon>
);

/** Phòng online: hai máy nối nhau. */
export const LinkIcon = (p: P) => (
  <Icon {...p}>
    <rect x="2.5" y="7" width="7" height="12" rx="1" />
    <rect x="14.5" y="5" width="7" height="12" rx="1" />
    <path d="M9.5 12h5" strokeDasharray="1.5 2" />
  </Icon>
);

export const DoorIcon = (p: P) => (
  <Icon {...p}>
    <path d="M5 21V3h11v18M3 21h18M12 12h1" />
  </Icon>
);

export const CopyIcon = (p: P) => (
  <Icon {...p}>
    <rect x="8" y="8" width="12" height="12" />
    <path d="M4 16V4h12" />
  </Icon>
);

export const CheckIcon = (p: P) => (
  <Icon {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Icon>
);

export const SoundIcon = (p: P) => (
  <Icon {...p}>
    <path d="M4 9h4l5-4v14l-5-4H4zM16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />
  </Icon>
);

/** Loa đã tắt. */
export const MuteIcon = (p: P) => (
  <Icon {...p}>
    <path d="M4 9h4l5-4v14l-5-4H4zM17 9l5 6M22 9l-5 6" />
  </Icon>
);

/** Đổi đất: hai mũi tên ngược chiều. */
export const SwapIcon = (p: P) => (
  <Icon {...p}>
    <path d="M4 8h14l-3-3M20 16H6l3 3" />
  </Icon>
);

/** Tài sản: chồng giấy tờ đất. */
export const DeedIcon = (p: P) => (
  <Icon {...p}>
    <path d="M6 3h9l4 4v14H6zM15 3v4h4M9 12h7M9 16h7" />
  </Icon>
);
