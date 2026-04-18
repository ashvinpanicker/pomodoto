"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, ArrowRight, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useUser } from "@/hooks/useUser";

export default function LandingPage() {
  const { user, loading, signInWithGoogle, signInWithMagicLink } = useUser();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [magicLinkError, setMagicLinkError] = useState<string | null>(null);
  const [sendingMagicLink, setSendingMagicLink] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSendingMagicLink(true);
    setMagicLinkError(null);
    const { error } = await signInWithMagicLink(email.trim());
    setSendingMagicLink(false);
    if (error) {
      setMagicLinkError(error);
    } else {
      setMagicLinkSent(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-tomato border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-12">
      <div className="fixed inset-0 bg-gradient-radial from-tomato/5 via-transparent to-dota/5 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm flex flex-col items-center text-center gap-8 relative"
      >
        {/* Logo */}
        <div className="space-y-3">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", damping: 12, delay: 0.1 }}
            className="w-20 h-20 rounded-3xl bg-tomato/20 border border-tomato/30 flex items-center justify-center mx-auto shadow-2xl shadow-tomato/20"
          >
            <span className="text-4xl">🍅</span>
          </motion.div>
          <div>
            <h1 className="text-3xl font-bold text-text-primary tracking-tight">
              Pomo<span className="text-tomato">Doto</span>
            </h1>
            <p className="text-text-secondary text-sm mt-1">
              Focus hard. Earn games. Stay consistent.
            </p>
          </div>
        </div>

        {/* Feature highlights */}
        <div className="w-full space-y-3">
          {[
            { icon: "🍅", bg: "bg-tomato/10", title: "Pomodoro Timer", desc: "25-min focus sessions with labels" },
            { icon: "🎮", bg: "bg-dota/10", title: "Earn Dota Games", desc: "2 Pomodoros = 1 game unlocked" },
            { icon: "⚡", bg: "bg-gold/10", title: "XP & Streaks", desc: "Level up and build daily habits" },
          ].map((f) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-4 bg-card border border-border rounded-2xl p-4 text-left"
            >
              <div className={`w-10 h-10 rounded-xl ${f.bg} flex items-center justify-center text-xl shrink-0`}>
                {f.icon}
              </div>
              <div>
                <div className="font-semibold text-text-primary text-sm">{f.title}</div>
                <div className="text-text-secondary text-xs">{f.desc}</div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Auth */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="w-full space-y-3"
        >
          {/* Google */}
          <Button variant="primary" size="xl" className="w-full" onClick={signInWithGoogle}>
            <GoogleIcon />
            Continue with Google
          </Button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-text-secondary">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Magic link */}
          <AnimatePresence mode="wait">
            {magicLinkSent ? (
              <motion.div
                key="sent"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-xp/10 border border-xp/30 rounded-2xl p-4 flex items-center gap-3"
              >
                <CheckCircle size={20} className="text-xp shrink-0" />
                <div className="text-left">
                  <div className="text-sm font-semibold text-text-primary">Check your email</div>
                  <div className="text-xs text-text-secondary">Magic link sent to {email}</div>
                </div>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                onSubmit={handleMagicLink}
                className="space-y-2"
              >
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                      className="w-full pl-9 pr-3 py-3 rounded-xl bg-card border border-border text-text-primary placeholder:text-text-secondary text-sm focus:outline-none focus:border-tomato/50 transition-colors"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={sendingMagicLink || !email.trim()}
                    className="px-4 py-3 rounded-xl bg-card border border-border text-text-secondary hover:text-text-primary hover:border-zinc-600 disabled:opacity-40 transition-all active:scale-95"
                  >
                    {sendingMagicLink
                      ? <div className="w-4 h-4 rounded-full border-2 border-text-secondary border-t-transparent animate-spin" />
                      : <ArrowRight size={16} />
                    }
                  </button>
                </div>
                {magicLinkError && (
                  <p className="text-xs text-red-400 text-left px-1">{magicLinkError}</p>
                )}
                <p className="text-xs text-text-secondary">
                  We'll email you a magic link — no password needed.
                </p>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}
