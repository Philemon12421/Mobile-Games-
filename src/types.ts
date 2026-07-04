export interface Game {
  id: string;
  name: string;
  phase: number;
  meta: string;
  desc: string;
  playable: boolean;
  costToUnlock?: number;
}

export interface UserProgress {
  nickname: string;
  avatar: string;
  themeColor: string;
  coins: number;
  gamesUnlocked: string[];
  highScores: Record<string, number>;
  onboarded: boolean;
  soundEnabled: boolean;
  hapticEnabled: boolean;
  streak: number;
}
