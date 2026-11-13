import type { ReactNode } from 'react';

// Bộ biểu tượng vẽ tay của Vẽ Đoán: một nét 2.4, đầu tròn, ô 24 — đồng bộ với nét bút trên bảng.

function Icon({ children, className = 'h-5 w-5' }: { children: ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
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

export const PencilIcon = (p: P) => (
  <Icon {...p}>
    <path d="M4 20l1.2-4.6L15.6 5a2 2 0 0 1 2.8 0l.6.6a2 2 0 0 1 0 2.8L8.6 18.8z" />
    <path d="M13.5 7.2l3.3 3.3" />
  </Icon>
);

export const CheckIcon = (p: P) => (
  <Icon {...p}>
    <path d="M4.5 12.8l4.6 4.4L19.5 6.8" />
  </Icon>
);

export const UndoIcon = (p: P) => (
  <Icon {...p}>
    <path d="M9 7L4.5 11.5 9 16" />
    <path d="M5 11.5h9a5 5 0 0 1 0 10h-2" />
  </Icon>
);

export const TrashIcon = (p: P) => (
  <Icon {...p}>
    <path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13" />
  </Icon>
);

export const EraserIcon = (p: P) => (
  <Icon {...p}>
    <path d="M8.5 20H20M3.8 14.6l9.8-9.8a2 2 0 0 1 2.8 0l3 3a2 2 0 0 1 0 2.8L11 19.1a3 3 0 0 1-4.2 0l-3-3a1 1 0 0 1 0-1.5z" />
    <path d="M9 9.5l5.5 5.5" />
  </Icon>
);

export const CrownIcon = (p: P) => (
  <Icon {...p}>
    <path d="M4 18h16M4.5 15L3.5 7l5 4 3.5-6 3.5 6 5-4-1 8z" />
  </Icon>
);

export const BackIcon = (p: P) => (
  <Icon {...p}>
    <path d="M14.5 5.5L8 12l6.5 6.5" />
  </Icon>
);

export const CopyIcon = (p: P) => (
  <Icon {...p}>
    <rect x="8.5" y="8.5" width="11" height="11" rx="2" />
    <path d="M15.5 8.5V6.5a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2" />
  </Icon>
);

export const SendIcon = (p: P) => (
  <Icon {...p}>
    <path d="M4 12h14M13 6.5l5.5 5.5-5.5 5.5" />
  </Icon>
);

export const BookIcon = (p: P) => (
  <Icon {...p}>
    <path d="M12 6.8C10.2 5.3 7.7 4.6 4.5 4.6v13.2c3.2 0 5.7.7 7.5 2.2 1.8-1.5 4.3-2.2 7.5-2.2V4.6c-3.2 0-5.7.7-7.5 2.2z" />
    <path d="M12 6.8V20" />
  </Icon>
);
