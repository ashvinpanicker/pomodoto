"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Timer, BarChart3, Gift, User, Swords } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Profile } from "@/types";
import { calculateLevel } from "@/types";
import { Progress } from "@/components/ui/Progress";

const NAV_ITEMS = [
  { href: "/dashboard", icon: Timer, label: "Timer" },
  { href: "/analytics", icon: BarChart3, label: "Analytics" },
  { href: "/rewards", icon: Gift, label: "Rewards" },
  { href: "/profile", icon: User, label: "Profile" },
];

interface SidebarProps {
  profile: Profile | null;
}

export function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname();
  const { level, xpInLevel, xpForNext } = calculateLevel(profile?.total_xp ?? 0);

  return (
    <aside className="hidden md:flex flex-col w-64 min-h-screen bg-surface border-r border-border fixed left-0 top-0 bottom-0 z-40">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
        <div className="w-9 h-9 rounded-xl bg-tomato/20 flex items-center justify-center">
          <Swords size={20} className="text-tomato" />
        </div>
        <div>
          <div className="font-bold text-text-primary tracking-tight">Pomo</div>
          <div className="text-xs text-dota font-semibold -mt-0.5">DOTO</div>
        </div>
      </div>

      {/* User mini card */}
      {profile && (
        <div className="px-4 py-4 border-b border-border">
          <div className="flex items-center gap-3 mb-3">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="avatar" className="w-9 h-9 rounded-full" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-dota/20 flex items-center justify-center text-dota font-bold">
                {profile.username?.[0]?.toUpperCase() ?? "?"}
              </div>
            )}
            <div className="min-w-0">
              <div className="text-sm font-semibold text-text-primary truncate">
                {profile.username ?? "Adventurer"}
              </div>
              <div className="text-xs text-dota font-medium">Level {level}</div>
            </div>
          </div>
          <Progress
            value={xpInLevel / xpForNext}
            color="dota"
            size="sm"
            showLabel
            label={`${xpInLevel} / ${xpForNext} XP`}
          />
        </div>
      )}

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group",
                active
                  ? "bg-tomato/10 text-tomato border border-tomato/20"
                  : "text-text-secondary hover:text-text-primary hover:bg-card"
              )}
            >
              <Icon size={18} className={cn(active && "drop-shadow-[0_0_6px_#ef4444]")} />
              <span className="font-medium text-sm">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Stats footer */}
      {profile && (
        <div className="px-4 py-4 border-t border-border">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-card rounded-xl p-3 text-center">
              <div className="text-lg font-bold text-tomato">{profile.pomodoros_completed}</div>
              <div className="text-[10px] text-text-secondary uppercase tracking-wide">Pomodoros</div>
            </div>
            <div className="bg-card rounded-xl p-3 text-center">
              <div className="text-lg font-bold text-gold">
                {profile.dota_games_earned - profile.dota_games_redeemed}
              </div>
              <div className="text-[10px] text-text-secondary uppercase tracking-wide">Games</div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
