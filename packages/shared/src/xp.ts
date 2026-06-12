/** Total XP required to reach level n (level 1 = 0). */
export function xpForLevel(level: number): number {
  return (100 * level * (level + 1)) / 2;
}

/** Derive level from cumulative XP. */
export function levelFromXp(totalXp: number): number {
  if (totalXp <= 0) {
    return 1;
  }
  const level = Math.floor((Math.sqrt((8 * totalXp) / 100 + 1) - 1) / 2) + 1;
  return Math.max(1, level);
}

/** Progress within the current level as 0–100 integer for UI bars. */
export function progressInLevel(totalXp: number, level: number): number {
  const xpAtLevel = xpForLevel(level);
  const xpAtNextLevel = xpForLevel(level + 1);
  const span = xpAtNextLevel - xpAtLevel;
  if (span <= 0) {
    return 0;
  }
  const ratio = (totalXp - xpAtLevel) / span;
  return Math.min(100, Math.max(0, Math.round(ratio * 100)));
}

/** XP earned within the current level and XP needed to reach the next level. */
export function xpInCurrentLevel(
  totalXp: number,
  level: number,
): { current: number; toNext: number } {
  const xpAtLevel = xpForLevel(level);
  const toNext = xpForLevel(level + 1) - xpAtLevel;
  return { current: totalXp - xpAtLevel, toNext };
}
