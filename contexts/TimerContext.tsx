"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useTimer, type ActiveSession } from "@/hooks/useTimer";
import type { SessionLabel } from "@/types";

type TimerContextValue = ReturnType<typeof useTimer>;

const TimerContext = createContext<TimerContextValue | null>(null);

interface TimerProviderProps {
  children: ReactNode;
  activeSession?: ActiveSession | null;
  onStart?: (sessionId: string, label: SessionLabel, duration: number, notes: string) => void;
  onComplete?: (sessionId: string, label: SessionLabel, duration: number, notes: string) => void;
  onCancel?: (sessionId: string) => void;
}

export function TimerProvider({ children, activeSession, onStart, onComplete, onCancel }: TimerProviderProps) {
  const timer = useTimer({ activeSession, onStart, onComplete, onCancel });
  return <TimerContext.Provider value={timer}>{children}</TimerContext.Provider>;
}

export function useTimerContext(): TimerContextValue {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error("useTimerContext must be used inside TimerProvider");
  return ctx;
}
