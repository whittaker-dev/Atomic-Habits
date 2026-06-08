export type MissionCategorySlug =
  | 'english'
  | 'fitness'
  | 'work'
  | 'reading'
  | 'coding'
  | 'meditation'
  | 'wellness';

export interface MissionCategory {
  id: string;
  slug: MissionCategorySlug;
  nameKey: string;
  icon?: string | null;
  defaultXpReward: number;
  sortOrder: number;
}

export interface User {
  id: string;
  email: string;
  timezone: string;
  totalXp: number;
  level: number;
  currentStreak: number;
  bestStreak: number;
}

export interface Mission {
  id: string;
  title: string;
  categoryId: string;
  category: MissionCategory;
  xpReward: number;
  completedToday: boolean;
}

export interface DashboardSummary {
  streak: { current: number; best: number };
  xp: { total: number; level: number; progress: number };
  today: { completed: number; total: number };
  missions: Mission[];
}

export interface AuthUser {
  id: string;
  email: string;
  emailVerifiedAt: string | null;
}

export interface RegisterResponse {
  pending: true;
}

export interface AuthMeResponse {
  user: AuthUser;
}

export interface HealthResponse {
  status: 'ok';
  postgres: boolean;
  redis: boolean;
}
