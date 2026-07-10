"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Swords, Trophy } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";
import { getPomodorosUntilNextGame } from "@/lib/gamification";
import { POMODOROS_PER_GAME } from "@/types";
import type { Profile } from "@/types";

interface RewardWalletProps {
  profile: Profile;
  onRedeem: () => void;
}

export function RewardWallet({ profile, onRedeem }: RewardWalletProps) {
  const [redeeming, setRedeeming] = useState(false);
  const [justRedeemed, setJustRedeemed] = useState(false);

  const available = profile.dota_games_earned - profile.dota_games_played;
  const pomosUntilNext = getPomodorosUntilNextGame(profile.pomodoros_completed);
  const progressToNext = (POMODOROS_PER_GAME - pomosUntilNext) / POMODOROS_PER_GAME;

  const handleRedeem = async () => {
    if (available <= 0 || redeeming) return;
    setRedeeming(true);
    await onRedeem();
    setJustRedeemed(true);
    setRedeeming(false);
    setTimeout(() => setJustRedeemed(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Main wallet card */}
      <div className="bg-gradient-to-br from-dota/20 to-gold/10 border border-dota/30 rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-dota/30 flex items-center justify-center">
            <Swords size={24} className="text-dota" />
          </div>
          <div>
            <div className="text-sm text-text-secondary font-medium">Dota Games</div>
            <div className="text-3xl font-bold text-text-primary">
              {available}
              <span className="text-base font-normal text-text-secondary ml-2">available</span>
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {available > 0 ? (
            <motion.div
              key="redeem"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Button
                variant="gold"
                size="lg"
                className="w-full"
                onClick={handleRedeem}
                disabled={redeeming}
              >
                {justRedeemed ? (
                  <>🎮 Game On! Good luck!</>
                ) : (
                  <>
                    <Trophy size={18} />
                    {redeeming ? "Redeeming..." : "Redeem Game"}
                  </>
                )}
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="locked"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-2"
            >
              <p className="text-text-secondary text-sm">
                Complete {pomosUntilNext} more Pomodoro{pomosUntilNext !== 1 ? "s" : ""} to unlock
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Progress to next game */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-text-secondary">Next game progress</span>
          <span className="text-xs font-mono text-gold">
            {POMODOROS_PER_GAME - pomosUntilNext}/{POMODOROS_PER_GAME}
          </span>
        </div>
        <Progress value={progressToNext} color="gold" size="md" />
        <div className="flex justify-between mt-2">
          {Array.from({ length: POMODOROS_PER_GAME }).map((_, i) => (
            <div
              key={i}
              className={`text-lg ${i < POMODOROS_PER_GAME - pomosUntilNext ? "grayscale-0" : "grayscale opacity-30"}`}
            >
              🍅
            </div>
          ))}
          <div className={`text-lg ${available > 0 ? "" : "grayscale opacity-30"}`}>🎮</div>
        </div>
      </div>

      {/* Lifetime stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <div className="text-xl font-bold text-dota">{profile.dota_games_earned}</div>
          <div className="text-[10px] text-text-secondary uppercase tracking-wide mt-0.5">Earned</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <div className="text-xl font-bold text-text-secondary">{profile.dota_games_played}</div>
          <div className="text-[10px] text-text-secondary uppercase tracking-wide mt-0.5">Played</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <div className="text-xl font-bold text-gold">{available}</div>
          <div className="text-[10px] text-text-secondary uppercase tracking-wide mt-0.5">Left</div>
        </div>
      </div>
    </div>
  );
}
