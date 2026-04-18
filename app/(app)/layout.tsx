"use client";

import { useCallback, useMemo } from "react";
import { TimerProvider } from "@/contexts/TimerContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { FloatingTimer } from "@/components/timer/FloatingTimer";
import { AchievementUnlock } from "@/components/gamification/AchievementCard";
import { useUser } from "@/hooks/useUser";
import { useGameState } from "@/hooks/useGameState";
import type { ActiveSession } from "@/hooks/useTimer";
import type { SessionLabel } from "@/types";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const {
    gameState,
    newAchievements,
    saveError,
    startSession,
    cancelSession,
    completeSession,
    dismissAchievements,
  } = useGameState(user?.id ?? null);

  // Convert DB active session → timer format for cross-device restore
  const activeSession = useMemo<ActiveSession | null>(() => {
    const s = gameState.activeSession;
    if (!s) return null;
    return {
      sessionId: s.id,
      startedAt: new Date(s.started_at),
      durationMinutes: s.duration,
      label: s.label as SessionLabel,
      notes: s.notes ?? "",
    };
  }, [gameState.activeSession]);

  const handleStart = useCallback(
    (sessionId: string, label: SessionLabel, duration: number, notes: string) => {
      startSession(sessionId, label, duration, notes);
    },
    [startSession]
  );

  const handleComplete = useCallback(
    (sessionId: string, label: SessionLabel, duration: number, notes: string) => {
      completeSession(sessionId, label, duration, notes);
    },
    [completeSession]
  );

  const handleCancel = useCallback(
    (sessionId: string) => {
      cancelSession(sessionId);
    },
    [cancelSession]
  );

  return (
    <TimerProvider
      activeSession={activeSession}
      onStart={handleStart}
      onComplete={handleComplete}
      onCancel={handleCancel}
    >
      <div className="min-h-screen bg-background text-text-primary">
        <Sidebar profile={gameState.profile} />
        <main className="md:ml-64 min-h-screen pb-20 md:pb-0">
          {saveError && (
            <div className="mx-4 mt-4 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-medium">
              ⚠️ {saveError}
            </div>
          )}
          {children}
        </main>
        <BottomNav />
        <FloatingTimer />
      </div>

      {newAchievements.length > 0 && (
        <AchievementUnlock
          achievements={newAchievements}
          onDismiss={dismissAchievements}
        />
      )}
    </TimerProvider>
  );
}
