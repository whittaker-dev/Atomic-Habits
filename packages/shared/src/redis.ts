export const REDIS_KEYS = {
  dashboardCache: (userId: string) => `cache:dashboard:${userId}`,
  streakCurrent: (userId: string) => `streak:current:${userId}`,
  streakBest: (userId: string) => `streak:best:${userId}`,
  dailyActive: (userId: string, date: string) => `active:${userId}:${date}`,
  streakAtRisk: (userId: string) => `streak:at-risk:${userId}`,
  leaderboardWeekly: 'leaderboard:weekly',
  activityChannel: 'channel:activity',
} as const;

export const REDIS_TTL = {
  dashboardCacheSeconds: 60,
  dailyActiveSeconds: 86_400,
  streakAtRiskSeconds: 14_400,
} as const;

export type ActivityEventType = 'mission_completed';

export interface ActivityEvent {
  type: ActivityEventType;
  userId: string;
  missionId: string;
  xpAwarded: number;
  completedAt: string;
}
