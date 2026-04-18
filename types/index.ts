export type SessionLabel =
  | "Work"
  | "Gym"
  | "Thinking"
  | "Learning"
  | "Deep Work"
  | "Creative"
  | string;

export const PRESET_LABELS: SessionLabel[] = [
  "Work",
  "Gym",
  "Thinking",
  "Learning",
  "Deep Work",
  "Creative",
];

export const LABEL_COLORS: Record<string, string> = {
  Work: "#ef4444",
  Gym: "#f97316",
  Thinking: "#8b5cf6",
  Learning: "#3b82f6",
  "Deep Work": "#06b6d4",
  Creative: "#ec4899",
};

export const LABEL_EMOJIS: Record<string, string> = {
  Work: "💼",
  Gym: "🏋️",
  Thinking: "🧘",
  Learning: "📚",
  "Deep Work": "🎯",
  Creative: "🎨",
};

export type TimerStatus = "idle" | "running" | "paused" | "completed" | "cancelled";

export interface TimerState {
  status: TimerStatus;
  durationMinutes: number;
  remainingSeconds: number;
  label: SessionLabel;
  notes: string;
  startedAt: Date | null;
  sessionId: string | null;
}

export interface Session {
  id: string;
  user_id: string;
  label: SessionLabel;
  duration: number; // minutes
  notes: string | null;
  completed: boolean;
  started_at: string;
  completed_at: string | null;
  xp_earned: number;
  created_at: string;
}

export interface Profile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  total_xp: number;
  level: number;
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null;
  pomodoros_completed: number;
  dota_games_earned: number;
  dota_games_redeemed: number; // kept for backward compat
  dota_games_played: number;   // auto-tracked via GSI + manual redeems
  gsi_token: string | null;
  created_at: string;
  updated_at: string;
}

export interface DotaSession {
  id: string;
  user_id: string;
  match_id: string | null;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  created_at: string;
}

// Balance = earned - played (can be negative = debt)
export function dotaBalance(profile: Profile): number {
  return profile.dota_games_earned - profile.dota_games_played;
}

export function pomodorosToClearDebt(profile: Profile): number {
  const balance = dotaBalance(profile);
  if (balance >= 0) return 0;
  return Math.abs(balance) * POMODOROS_PER_GAME;
}

export interface Achievement {
  id: string;
  user_id: string;
  achievement_key: string;
  earned_at: string;
}

export interface AchievementDef {
  key: string;
  title: string;
  description: string;
  icon: string;
  xpReward: number;
  condition: (profile: Profile, sessions: Session[]) => boolean;
}

export interface DailyStats {
  date: string;
  count: number;
  xp: number;
  labels: Record<string, number>;
}

export interface GameState {
  profile: Profile | null;
  sessions: Session[];
  achievements: Achievement[];
  todaySessions: Session[];
  weeklyStats: DailyStats[];
  dotaSessions: DotaSession[];
  activeSession: Session | null; // incomplete session = timer in progress
}

export const XP_PER_POMODORO = 50;
export const XP_PER_LEVEL = 500;
export const POMODOROS_PER_GAME = 2;
export const STREAK_BONUS_XP = 10;

export function calculateLevel(totalXp: number): { level: number; xpInLevel: number; xpForNext: number } {
  const level = Math.floor(totalXp / XP_PER_LEVEL) + 1;
  const xpInLevel = totalXp % XP_PER_LEVEL;
  const xpForNext = XP_PER_LEVEL;
  return { level, xpInLevel, xpForNext };
}

export function calculateDotaGamesEarned(pomodorosCompleted: number): number {
  return Math.floor(pomodorosCompleted / POMODOROS_PER_GAME);
}
