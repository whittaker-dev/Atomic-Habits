import type { ReactNode } from 'react';

// Biểu tượng chung của hai game du lịch: vẽ tay bằng SVG, cùng nét 2px bo tròn, ăn màu chữ hiện tại.

function Svg({ children, className = 'h-5 w-5' }: { children: ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  );
}

export const IconSpeaker = ({ className }: { className?: string }) => (
  <Svg className={className}>
    <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
    <path d="M15.5 9a4.2 4.2 0 0 1 0 6M18.3 6.5a8 8 0 0 1 0 11" />
  </Svg>
);

/** Đọc chậm: loa với một nhịp sóng và dấu tạm dừng nhỏ. */
export const IconSlow = ({ className }: { className?: string }) => (
  <Svg className={className}>
    <path d="M3 9.5h3L10 6v12l-4-3.5H3z" />
    <path d="M14 9a4 4 0 0 1 0 6" />
    <path d="M18.5 8.5v7M21.5 8.5v7" />
  </Svg>
);

export const IconClose = ({ className }: { className?: string }) => (
  <Svg className={className}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
);

export const IconCheck = ({ className }: { className?: string }) => (
  <Svg className={className}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Svg>
);

export const IconHeart = ({
  filled,
  className = 'h-5 w-5',
}: {
  filled: boolean;
  className?: string;
}) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden>
    <path
      d="M12 20s-7.5-4.4-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.6-7.5 10-7.5 10Z"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={2}
      strokeLinejoin="round"
      opacity={filled ? 1 : 0.35}
    />
  </svg>
);

export const IconBook = ({ className }: { className?: string }) => (
  <Svg className={className}>
    <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v15H5.5A1.5 1.5 0 0 0 4 20.5z" />
    <path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v15h5.5a1.5 1.5 0 0 1 1.5 1.5z" />
  </Svg>
);

export const IconSound = ({ on, className }: { on: boolean; className?: string }) => (
  <Svg className={className}>
    <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
    {on ? (
      <path d="M15.5 9a4.2 4.2 0 0 1 0 6M18.3 6.5a8 8 0 0 1 0 11" />
    ) : (
      <path d="m16 9.5 5 5M21 9.5l-5 5" />
    )}
  </Svg>
);
