"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  checkNewAchievements,
  calculateStreak,
  ACHIEVEMENTS,
} from "@/lib/gamification";
import type {
  Profile,
  Session,
  Achievement,
  GameState,
  SessionLabel,
} from "@/types";
import {
  XP_PER_POMODORO,
  STREAK_BONUS_XP,
  calculateDotaGamesEarned,
} from "@/types";
import { getDayKey } from "@/lib/utils";

export function useGameState(userId: string | null) {
  const [gameState, setGameState] = useState<GameState>({
    profile: null,
    sessions: [],
    achievements: [],
    todaySessions: [],
    weeklyStats: [],
    dotaSessions: [],
    activeSession: null,
  });
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [newAchievements, setNewAchievements] = useState<
    (typeof ACHIEVEMENTS)[number][]
  >([]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const supabase = useMemo(() => createClient(), []);

  const fetchAll = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const [profileRes, sessionsRes, achievementsRes, dotaRes, activeRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).single(),
        supabase
          .from("sessions")
          .select("*")
          .eq("user_id", userId)
          .eq("completed", true)
          .order("started_at", { ascending: false })
          .limit(500),
        supabase
          .from("achievements")
          .select("*")
          .eq("user_id", userId),
        supabase
          .from("dota_sessions")
          .select("*")
          .eq("user_id", userId)
          .order("started_at", { ascending: false })
          .limit(50),
        supabase
          .from("sessions")
          .select("*")
          .eq("user_id", userId)
          .eq("completed", false)
          .order("started_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      const profile = profileRes.data as Profile | null;
      const sessions = (sessionsRes.data ?? []) as Session[];
      const achievements = (achievementsRes.data ?? []) as Achievement[];
      const dotaSessions = (dotaRes.data ?? []) as import("@/types").DotaSession[];
      const activeSession = (activeRes.data ?? null) as Session | null;

      const today = getDayKey();
      const todaySessions = sessions.filter(
        (s) => s.started_at.split("T")[0] === today
      );

      const weeklyStats = buildWeeklyStats(sessions);

      setGameState({ profile, sessions, achievements, todaySessions, weeklyStats, dotaSessions, activeSession });
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Stable ref so the Realtime subscription doesn't need fetchAll in its deps.
  // If fetchAll is in deps, it re-runs whenever gameState changes (because completeSession
  // captures gameState), which causes Supabase to throw "cannot add callbacks after subscribe".
  const fetchAllRef = useRef(fetchAll);
  fetchAllRef.current = fetchAll;

  // Realtime: re-fetch whenever sessions change (another device start/pause/cancel/complete)
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`sessions-sync:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sessions", filter: `user_id=eq.${userId}` },
        () => { fetchAllRef.current(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, supabase]);

  const completeSession = useCallback(
    async (sessionId: string, label: SessionLabel, durationMinutes: number, notes: string = "") => {
      if (!userId) return;

      const now = new Date().toISOString();
      const startedAt = new Date(Date.now() - durationMinutes * 60 * 1000).toISOString();

      // Calculate XP
      const streakBonus =
        (gameState.profile?.current_streak ?? 0) > 0 ? STREAK_BONUS_XP : 0;
      const xpEarned = XP_PER_POMODORO + streakBonus;

      setSaveError(null);

      // Upsert session — updates the existing incomplete row (from startSession) or inserts fresh
      const { error: sessionError } = await supabase.from("sessions").upsert({
        id: sessionId,
        user_id: userId,
        label,
        notes: notes.trim() || null,
        duration: durationMinutes,
        completed: true,
        started_at: startedAt,
        completed_at: now,
        xp_earned: xpEarned,
      });

      if (sessionError) {
        console.error("Session insert error:", sessionError);
        setSaveError(`Failed to save session: ${sessionError.message}. Have you run the database schema in Supabase?`);
        return;
      }

      // Refresh state
      await fetchAll();

      const updatedSessions = [...gameState.sessions];
      const newSession: Session = {
        id: sessionId,
        user_id: userId,
        label,
        duration: durationMinutes,
        notes: notes.trim() || null,
        completed: true,
        started_at: startedAt,
        completed_at: now,
        xp_earned: xpEarned,
        paused_remaining_seconds: null,
        created_at: now,
      };
      updatedSessions.unshift(newSession);

      // Recalculate profile stats
      const prevPomodoros = gameState.profile?.pomodoros_completed ?? 0;
      const newPomodoros = prevPomodoros + 1;
      const prevXP = gameState.profile?.total_xp ?? 0;
      const newXP = prevXP + xpEarned;
      const newLevel = Math.floor(newXP / 500) + 1;
      const newDotaGames = calculateDotaGamesEarned(newPomodoros);
      const newStreak = calculateStreak(updatedSessions);

      const updatedProfile: Profile = {
        ...(gameState.profile ?? createEmptyProfile(userId)),
        total_xp: newXP,
        level: newLevel,
        pomodoros_completed: newPomodoros,
        dota_games_earned: newDotaGames,
        current_streak: newStreak,
        longest_streak: Math.max(
          gameState.profile?.longest_streak ?? 0,
          newStreak
        ),
        last_active_date: getDayKey(),
        updated_at: now,
      };

      // Update profile in DB — only send columns that exist in the schema
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: updatedProfile.id,
        username: updatedProfile.username,
        avatar_url: updatedProfile.avatar_url,
        total_xp: updatedProfile.total_xp,
        level: updatedProfile.level,
        current_streak: updatedProfile.current_streak,
        longest_streak: updatedProfile.longest_streak,
        last_active_date: updatedProfile.last_active_date,
        pomodoros_completed: updatedProfile.pomodoros_completed,
        dota_games_earned: updatedProfile.dota_games_earned,
        dota_games_played: updatedProfile.dota_games_played ?? 0,
        updated_at: updatedProfile.updated_at,
      });

      if (profileError) {
        console.error("Profile update error:", profileError);
        setSaveError(`Failed to update profile: ${profileError.message}`);
      }

      // Check achievements
      const earnedKeys = gameState.achievements.map((a) => a.achievement_key);
      const newAchs = checkNewAchievements(updatedProfile, updatedSessions, earnedKeys);

      if (newAchs.length > 0) {
        const achievementRows = newAchs.map((ach) => ({
          user_id: userId,
          achievement_key: ach.key,
        }));
        await supabase.from("achievements").insert(achievementRows);

        // Add XP from achievements
        const bonusXP = newAchs.reduce((sum, a) => sum + a.xpReward, 0);
        if (bonusXP > 0) {
          await supabase
            .from("profiles")
            .update({ total_xp: updatedProfile.total_xp + bonusXP })
            .eq("id", userId);
        }

        setNewAchievements(newAchs);
      }

      // Full refresh
      await fetchAll();
    },
    [userId, gameState, fetchAll]
  );

  const startSession = useCallback(
    async (sessionId: string, label: SessionLabel, durationMinutes: number, notes: string = "") => {
      if (!userId) return;
      await supabase.from("sessions").insert({
        id: sessionId,
        user_id: userId,
        label,
        notes: notes.trim() || null,
        duration: durationMinutes,
        completed: false,
        started_at: new Date().toISOString(),
        xp_earned: 0,
      });
    },
    [userId, supabase]
  );

  const pauseSession = useCallback(
    async (sessionId: string, remainingSeconds: number) => {
      if (!userId) return;
      await supabase
        .from("sessions")
        .update({ paused_remaining_seconds: remainingSeconds })
        .eq("id", sessionId)
        .eq("user_id", userId)
        .eq("completed", false);
    },
    [userId, supabase]
  );

  const resumeSession = useCallback(
    async (sessionId: string, newStartedAt: Date) => {
      if (!userId) return;
      await supabase
        .from("sessions")
        .update({
          paused_remaining_seconds: null,
          started_at: newStartedAt.toISOString(),
        })
        .eq("id", sessionId)
        .eq("user_id", userId)
        .eq("completed", false);
    },
    [userId, supabase]
  );

  const cancelSession = useCallback(
    async (sessionId: string) => {
      if (!userId) return;
      await supabase
        .from("sessions")
        .delete()
        .eq("id", sessionId)
        .eq("user_id", userId)
        .eq("completed", false);
    },
    [userId, supabase]
  );

  const redeemGame = useCallback(async () => {
    if (!userId || !gameState.profile) return;
    // Manual redeem — increments played count (can go negative/into debt)
    await supabase
      .from("profiles")
      .update({
        dota_games_played: (gameState.profile.dota_games_played ?? 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    await fetchAll();
  }, [userId, gameState.profile, fetchAll]);

  const dismissAchievements = useCallback(() => {
    setNewAchievements([]);
  }, []);

  return {
    gameState,
    loading,
    saveError,
    newAchievements,
    startSession,
    pauseSession,
    resumeSession,
    cancelSession,
    completeSession,
    redeemGame,
    dismissAchievements,
    refresh: fetchAll,
  };
}

function createEmptyProfile(userId: string): Profile {
  const now = new Date().toISOString();
  return {
    id: userId,
    username: null,
    avatar_url: null,
    total_xp: 0,
    level: 1,
    current_streak: 0,
    longest_streak: 0,
    last_active_date: null,
    pomodoros_completed: 0,
    dota_games_earned: 0,
    dota_games_redeemed: 0,
    dota_games_played: 0,
    gsi_token: null,
    created_at: now,
    updated_at: now,
  };
}

function buildWeeklyStats(sessions: Session[]) {
  const days: Record<string, { count: number; xp: number; labels: Record<string, number> }> = {};

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = getDayKey(d);
    days[key] = { count: 0, xp: 0, labels: {} };
  }

  sessions
    .filter((s) => s.completed)
    .forEach((s) => {
      const key = s.started_at.split("T")[0];
      if (days[key]) {
        days[key].count++;
        days[key].xp += s.xp_earned;
        days[key].labels[s.label] = (days[key].labels[s.label] ?? 0) + 1;
      }
    });

  return Object.entries(days).map(([date, stats]) => ({ date, ...stats }));
}
