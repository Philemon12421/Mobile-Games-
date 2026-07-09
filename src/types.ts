export interface Game {
  id: string;
  name: string;
  phase: number;
  meta: string;
  desc: string;
  playable: boolean;
  costToUnlock?: number;
  plays?: number;
  releaseDate?: string;
  category?: 'Classic' | 'Puzzle' | 'Action';
  howToPlay?: string[];
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
  unlockedColors?: string[];
  unlockedAvatars?: string[];
}
