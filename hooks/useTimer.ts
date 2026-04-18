"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TimerState, SessionLabel } from "@/types";
import { generateId, playCompletionSound } from "@/lib/utils";

const STORAGE_KEY = "pomo-dota-timer";
const DEFAULT_TITLE = "PomoDoto — Focus. Earn. Play.";

const DEFAULT_STATE: TimerState = {
  status: "idle",
  durationMinutes: 25,
  remainingSeconds: 25 * 60,
  label: "Work",
  notes: "",
  startedAt: null,
  sessionId: null,
};

function loadTimerState(): TimerState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw);
    if (parsed.startedAt) {
      parsed.startedAt = new Date(parsed.startedAt);
    }
    // Recalculate remaining based on wall clock — handles closed tab / throttling
    if (parsed.status === "running" && parsed.startedAt) {
      const elapsed = Math.floor((Date.now() - new Date(parsed.startedAt).getTime()) / 1000);
      const total = parsed.durationMinutes * 60;
      const remaining = Math.max(0, total - elapsed);
      if (remaining === 0) {
        // Completed while tab was closed — treat as idle (session already lost)
        return { ...DEFAULT_STATE, durationMinutes: parsed.durationMinutes, label: parsed.label };
      }
      return { ...parsed, remainingSeconds: remaining };
    }
    return { ...DEFAULT_STATE, ...parsed };
  } catch {
    return DEFAULT_STATE;
  }
}

function saveTimerState(state: TimerState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export interface ActiveSession {
  sessionId: string;
  startedAt: Date;
  durationMinutes: number;
  label: SessionLabel;
  notes: string;
}

interface UseTimerOptions {
  onStart?: (sessionId: string, label: SessionLabel, duration: number, notes: string) => void;
  onComplete?: (sessionId: string, label: SessionLabel, duration: number, notes: string) => void;
  onCancel?: (sessionId: string) => void;
  /** Restore an in-progress session from DB (cross-device sync) */
  activeSession?: ActiveSession | null;
  /** Whether game state is still being fetched — defer init until false */
  gameStateLoading?: boolean;
}

export function useTimer({ onStart, onComplete, onCancel, activeSession, gameStateLoading }: UseTimerOptions = {}) {
  const [state, setState] = useState<TimerState>(DEFAULT_STATE);
  const stateRef = useRef(state);
  stateRef.current = state;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const initializedRef = useRef(false);
  const onStartRef = useRef(onStart);
  const onCompleteRef = useRef(onComplete);
  const onCancelRef = useRef(onCancel);
  onStartRef.current = onStart;
  onCompleteRef.current = onComplete;
  onCancelRef.current = onCancel;

  // Helper that fires completion — callable from both interval and visibility handler
  const triggerComplete = useCallback((prev: TimerState): TimerState => {
    clearInterval(intervalRef.current!);
    intervalRef.current = null;
    playCompletionSound();
    const sessionId = prev.sessionId ?? generateId();
    onCompleteRef.current?.(sessionId, prev.label, prev.durationMinutes, prev.notes);
    document.title = DEFAULT_TITLE;
    return {
      ...DEFAULT_STATE,
      durationMinutes: prev.durationMinutes,
      label: prev.label,
      status: "completed",
    };
  }, []);

  // Wait for game state to load, then initialize once — DB wins over localStorage
  useEffect(() => {
    if (initializedRef.current) return; // already initialized
    if (gameStateLoading) return;        // still fetching from DB, wait

    initializedRef.current = true;

    if (activeSession) {
      // Restore timer from Supabase (cross-device sync)
      const elapsed = Math.floor((Date.now() - activeSession.startedAt.getTime()) / 1000);
      const remaining = Math.max(0, activeSession.durationMinutes * 60 - elapsed);
      if (remaining > 0) {
        setState({
          status: "running",
          durationMinutes: activeSession.durationMinutes,
          remainingSeconds: remaining,
          label: activeSession.label,
          notes: activeSession.notes,
          startedAt: activeSession.startedAt,
          sessionId: activeSession.sessionId,
        });
        return;
      }
      // Session completed while the user was away — nothing to restore
    }

    // Fall back to localStorage (same device, e.g. page refresh)
    const loaded = loadTimerState();
    setState(loaded);
  }, [gameStateLoading, activeSession]);

  // Persist state changes
  useEffect(() => {
    saveTimerState(state);
  }, [state]);

  // Update tab title when timer is active
  useEffect(() => {
    if (state.status === "running") {
      document.title = `🍅 ${formatTime(state.remainingSeconds)} — PomoDoto`;
    } else if (state.status === "paused") {
      document.title = `⏸ ${formatTime(state.remainingSeconds)} — PomoDoto`;
    } else if (state.status === "completed") {
      document.title = `✅ Done! — PomoDoto`;
    } else {
      document.title = DEFAULT_TITLE;
    }
  }, [state.status, state.remainingSeconds]);

  // Countdown interval — calculates from startedAt so background throttling is irrelevant
  useEffect(() => {
    if (state.status !== "running") {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const tick = () => {
      setState((prev) => {
        if (prev.status !== "running" || !prev.startedAt) return prev;
        const elapsed = Math.floor((Date.now() - new Date(prev.startedAt).getTime()) / 1000);
        const remaining = Math.max(0, prev.durationMinutes * 60 - elapsed);
        if (remaining === 0) return triggerComplete(prev);
        return { ...prev, remainingSeconds: remaining };
      });
    };

    intervalRef.current = setInterval(tick, 500); // 500ms for snappier display

    // When tab becomes visible again, immediately recalculate
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [state.status, triggerComplete]);

  const start = useCallback(() => {
    const sessionId = generateId();
    const { label, durationMinutes, notes } = stateRef.current;
    // Fire DB write outside setState so React Strict Mode double-invocations don't double-insert
    onStartRef.current?.(sessionId, label, durationMinutes, notes);
    setState({
      status: "running",
      durationMinutes,
      remainingSeconds: durationMinutes * 60,
      label,
      notes,
      startedAt: new Date(),
      sessionId,
    });
  }, []);

  const pause = useCallback(() => {
    setState((prev) => (prev.status === "running" ? { ...prev, status: "paused" } : prev));
  }, []);

  const resume = useCallback(() => {
    setState((prev) => {
      if (prev.status !== "paused") return prev;
      // Shift startedAt forward so elapsed time excludes the pause duration
      const elapsed = prev.durationMinutes * 60 - prev.remainingSeconds;
      return {
        ...prev,
        status: "running",
        startedAt: new Date(Date.now() - elapsed * 1000),
      };
    });
  }, []);

  const cancel = useCallback(() => {
    setState((prev) => {
      if (prev.sessionId) onCancelRef.current?.(prev.sessionId);
      return {
        ...DEFAULT_STATE,
        durationMinutes: prev.durationMinutes,
        label: prev.label,
        notes: prev.notes,
      };
    });
  }, []);

  const setDuration = useCallback((minutes: number) => {
    setState((prev) => {
      if (prev.status !== "idle") return prev;
      return { ...prev, durationMinutes: minutes, remainingSeconds: minutes * 60 };
    });
  }, []);

  const setLabel = useCallback((label: SessionLabel) => {
    setState((prev) => ({ ...prev, label }));
  }, []);

  const setNotes = useCallback((notes: string) => {
    setState((prev) => ({ ...prev, notes }));
  }, []);

  const dismissCompleted = useCallback(() => {
    setState((prev) =>
      prev.status === "completed"
        ? { ...DEFAULT_STATE, durationMinutes: prev.durationMinutes, label: prev.label }
        : prev
    );
  }, []);

  const progress =
    state.status === "idle" || state.status === "completed"
      ? 0
      : 1 - state.remainingSeconds / (state.durationMinutes * 60);

  return {
    state,
    progress,
    start,
    pause,
    resume,
    cancel,
    setDuration,
    setLabel,
    setNotes,
    dismissCompleted,
  };
}
