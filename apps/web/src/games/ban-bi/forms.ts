// Sáu dạng nạp khí của võ sĩ (nhân vật nguyên bản của game này). Cảnh 3D (fighter.ts) và giao diện
// đọc chung bảng này: tên dạng, màu khí, màu tóc và những gì xuất hiện ở từng cấp.

export type Form = {
  name: string;
  /** Màu hào quang chính và màu lõi sáng. */
  aura: string;
  core: string;
  hair: string;
  /** Độ mạnh hào quang 0..1. */
  power: number;
  smoke: number;
  lightning: boolean;
  /** Áo rách tay, cơ bắp nở. */
  torn: boolean;
  glowEyes: boolean;
  rocks: boolean;
  /** Cột khí xuyên trời, vầng sáng sau đầu, hào quang đổi sắc cầu vồng. */
  ascended: boolean;
};

export const FORMS: Form[] = [
  {
    name: 'Tĩnh khí',
    aura: '#cfe9ff',
    core: '#ffffff',
    hair: '#1b1626',
    power: 0.1,
    smoke: 0,
    lightning: false,
    torn: false,
    glowEyes: false,
    rocks: false,
    ascended: false,
  },
  {
    name: 'Phong khí',
    aura: '#38e8ff',
    core: '#d9fbff',
    hair: '#1d2a3f',
    power: 0.42,
    smoke: 0.3,
    lightning: false,
    torn: false,
    glowEyes: false,
    rocks: false,
    ascended: false,
  },
  {
    name: 'Lôi khí',
    aura: '#a46bff',
    core: '#efe3ff',
    hair: '#3a2466',
    power: 0.6,
    smoke: 0.45,
    lightning: true,
    torn: false,
    glowEyes: false,
    rocks: false,
    ascended: false,
  },
  {
    name: 'Hoả khí',
    aura: '#ff3b5c',
    core: '#ffd6a8',
    hair: '#6e1022',
    power: 0.78,
    smoke: 0.75,
    lightning: true,
    torn: true,
    glowEyes: true,
    rocks: false,
    ascended: false,
  },
  {
    name: 'Băng ngân',
    aura: '#9fd8ff',
    core: '#ffffff',
    hair: '#dfe9f5',
    power: 0.9,
    smoke: 0.85,
    lightning: true,
    torn: true,
    glowEyes: true,
    rocks: true,
    ascended: false,
  },
  {
    name: 'Thiên khí',
    aura: '#ff7ad9',
    core: '#ffffff',
    hair: '#f6f0ff',
    power: 1,
    smoke: 1,
    lightning: true,
    torn: true,
    glowEyes: true,
    rocks: true,
    ascended: true,
  },
];
