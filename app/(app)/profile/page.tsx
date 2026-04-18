"use client";

import { LogOut } from "lucide-react";
import { XPBar } from "@/components/gamification/XPBar";
import { StreakBadge } from "@/components/gamification/StreakBadge";
import { Button } from "@/components/ui/Button";
import { useUser } from "@/hooks/useUser";
import { useGameState } from "@/hooks/useGameState";
import { getLevelTitle } from "@/lib/gamification";
import { calculateLevel } from "@/types";

export default function ProfilePage() {
  const { user, signOut } = useUser();
  const { gameState, loading } = useGameState(user?.id ?? null);
  const { profile, achievements } = gameState;
  const { level } = calculateLevel(profile?.total_xp ?? 0);

  if (loading) {
    return (
      <div className="px-4 pt-6 pb-4 max-w-lg mx-auto space-y-5">
        <div className="h-7 w-24 bg-zinc-800 rounded-xl animate-pulse" />
        <div className="h-28 bg-zinc-800/40 rounded-2xl animate-pulse" />
        <div className="h-10 bg-zinc-800/40 rounded-2xl animate-pulse" />
        <div className="h-20 bg-zinc-800/40 rounded-2xl animate-pulse" />
        <div className="h-48 bg-zinc-800/40 rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-4 max-w-lg mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Profile</h1>
        <Button variant="ghost" size="sm" onClick={signOut}>
          <LogOut size={16} />
          Sign out
        </Button>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center gap-4">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="avatar" className="w-16 h-16 rounded-2xl" />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-dota/20 flex items-center justify-center text-2xl font-bold text-dota">
              {profile?.username?.[0]?.toUpperCase() ?? "?"}
            </div>
          )}
          <div>
            <div className="text-lg font-bold text-text-primary">
              {profile?.username ?? user?.email ?? "Adventurer"}
            </div>
            <div className="text-sm text-dota font-semibold">
              Level {level} · {getLevelTitle(level)}
            </div>
            <div className="text-xs text-text-secondary mt-0.5">{user?.email}</div>
          </div>
        </div>
      </div>

      {profile && <XPBar totalXp={profile.total_xp} />}

      {profile && (
        <StreakBadge streak={profile.current_streak} longestStreak={profile.longest_streak} />
      )}

      {profile && (
        <div className="bg-card border border-border rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">
            Lifetime Stats
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: "🍅", label: "Pomodoros", value: profile.pomodoros_completed },
              { icon: "🎮", label: "Games Earned", value: profile.dota_games_earned },
              { icon: "⚡", label: "Total XP", value: profile.total_xp.toLocaleString() },
              { icon: "🏆", label: "Achievements", value: achievements.length },
            ].map((stat) => (
              <div key={stat.label} className="bg-background rounded-xl p-3">
                <div className="text-xl mb-1">{stat.icon}</div>
                <div className="text-xl font-bold text-text-primary">{stat.value}</div>
                <div className="text-xs text-text-secondary">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-center text-xs text-text-secondary space-y-1 pb-4">
        <div className="font-semibold text-text-primary">PomoDoto</div>
        <div>Focus hard. Earn games. Stay consistent.</div>
        <div>v0.1.0</div>
      </div>
    </div>
  );
}
