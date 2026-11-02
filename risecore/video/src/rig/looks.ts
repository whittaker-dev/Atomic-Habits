export type Look = {
  name: 'coach' | 'ti';
  skin: string;
  skinShade: string;
  top: string;
  topShade: string;
  shorts: string;
  hair: string;
  band?: string;
  shoe: string;
  // side-view proportions
  torso: number;
  torsoW: number;
  upper: number;
  fore: number;
  armW: number;
  foreW: number;
  thigh: number;
  shin: number;
  legW: number;
  headR: number;
};

export const COACH: Look = {
  name: 'coach',
  skin: '#D99A6C',
  skinShade: '#A9714A',
  top: '#FF4D4D',
  topShade: '#B83030',
  shorts: '#20253D',
  hair: '#18181C',
  band: '#FFD23F',
  shoe: '#F4F4F4',
  torso: 150,
  torsoW: 76,
  upper: 88,
  fore: 82,
  armW: 34,
  foreW: 29,
  thigh: 104,
  shin: 112,
  legW: 42,
  headR: 36,
};

export const TI: Look = {
  name: 'ti',
  skin: '#F2C29B',
  skinShade: '#C99772',
  top: '#3DA5FF',
  topShade: '#2673B8',
  shorts: '#3A3560',
  hair: '#3B2A20',
  shoe: '#FF8A3D',
  torso: 145,
  torsoW: 60,
  upper: 86,
  fore: 80,
  armW: 26,
  foreW: 22,
  thigh: 102,
  shin: 110,
  legW: 34,
  headR: 37,
};
