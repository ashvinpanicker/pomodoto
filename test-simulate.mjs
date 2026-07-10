/**
 * test-simulate.mjs
 *
 * Simulation test for pomo-dota:
 *   1. Attempts to register a test account twice to probe duplicate-email handling
 *   2. Signs in and simulates 10 completed 1-minute Pomodoro sessions
 *   3. Logs each session result and the final game balance
 *
 * Run from the project root:
 *   node test-simulate.mjs
 *
 * Requirements:
 *   - NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local
 *   - @supabase/supabase-js installed (already in node_modules)
 *   - Supabase email confirmation DISABLED (Auth → Settings → "Confirm email" OFF)
 *     OR a SUPABASE_SERVICE_ROLE_KEY for admin signup bypass.
 *     Without one of these the sign-in step will fail — the script will tell you exactly why.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { randomUUID } from "crypto";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  try {
    const raw = readFileSync(join(__dirname, ".env.local"), "utf8");
    const env = {};
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      env[key] = val;
    }
    return env;
  } catch {
    return {};
  }
}

const env = loadEnv();
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const TEST_EMAIL = "pomo-test-sim@example.com";
const TEST_PASSWORD = "SimTest123!";
const SESSION_LABEL = "Work";
const SESSION_DURATION_MINUTES = 1;
const NUM_SESSIONS = 10;
const XP_PER_POMODORO = 50;
const POMODOROS_PER_GAME = 2;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hr(char = "─", width = 60) {
  console.log(char.repeat(width));
}

function log(msg) {
  console.log(msg);
}

function getDayKey(date = new Date()) {
  return date.toISOString().split("T")[0];
}

function calculateDotaGamesEarned(pomosCompleted) {
  return Math.floor(pomosCompleted / POMODOROS_PER_GAME);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  hr("═");
  log("  pomo-dota Simulation Test");
  hr("═");

  // ── Credential check ──────────────────────────────────────────────────────
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    log("\n❌  Missing credentials in .env.local");
    log("   Expected keys:");
    log("     NEXT_PUBLIC_SUPABASE_URL");
    log("     NEXT_PUBLIC_SUPABASE_ANON_KEY");
    log("\n   The script cannot connect to Supabase without these.");
    log("   Find them in: Supabase Dashboard → Settings → API");
    process.exit(1);
  }

  log(`\n✅  Credentials loaded`);
  log(`   URL : ${SUPABASE_URL}`);
  log(`   Key : ${SUPABASE_ANON_KEY.slice(0, 20)}...`);

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // ── STEP 1: Duplicate email test ──────────────────────────────────────────
  hr();
  log("\nSTEP 1 — Duplicate Email Registration Test");
  log(`  Email under test: ${TEST_EMAIL}\n`);

  const { data: s1Data, error: s1Error } = await supabase.auth.signUp({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });

  if (s1Error) {
    log(`  1st signup → ERROR: ${s1Error.message} (code: ${s1Error.status ?? "n/a"})`);
  } else {
    const u = s1Data?.user;
    if (u?.identities?.length === 0) {
      // Supabase stealth-duplicate: returns a fake user with no identities
      log(`  1st signup → ⚠️  Returned user object with NO identities — email may already exist`);
      log(`  (This is Supabase's privacy-safe response when email confirmation is ON)`);
    } else {
      log(`  1st signup → ✅  User created (id: ${u?.id ?? "unknown"})`);
      if (u?.email_confirmed_at) {
        log(`               Email already confirmed — confirmation is likely disabled ✓`);
      } else {
        log(`               Email NOT yet confirmed — confirmation may be required`);
        log(`               ℹ️  To disable: Supabase Dashboard → Auth → Settings → uncheck "Confirm email"`);
      }
    }
  }

  const { data: s2Data, error: s2Error } = await supabase.auth.signUp({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });

  if (s2Error) {
    log(`  2nd signup → ERROR: ${s2Error.message} (code: ${s2Error.status ?? "n/a"})`);
    log(`  → Supabase returned an explicit error on duplicate signup.`);
  } else {
    const u2 = s2Data?.user;
    if (u2?.identities?.length === 0) {
      log(`\n  2nd signup → ⚠️  Duplicate email detected (Supabase privacy mode)`);
      log(`  Analysis: Supabase does NOT expose duplicate-email errors client-side when`);
      log(`  email confirmation is ON. It silently returns a fake user with no identities.`);
      log(`  This prevents email enumeration attacks — but the app cannot distinguish`);
      log(`  between "new user created" and "email already taken" from the response alone.`);
      log(`  Recommendation: Check for identities.length === 0 after signUp to detect this.`);
    } else {
      log(`  2nd signup → returned user id: ${u2?.id ?? "unknown"} (same as first? ${u2?.id === s1Data?.user?.id})`);
    }
  }

  // ── STEP 2: Sign in ───────────────────────────────────────────────────────
  hr();
  log("\nSTEP 2 — Sign In");

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });

  if (authError) {
    log(`\n❌  Sign in failed: ${authError.message}`);
    log("\n   Likely causes:");
    log("   a) Email confirmation is required and the address hasn't been confirmed.");
    log("      Fix: Supabase Dashboard → Auth → Settings → disable 'Confirm email'");
    log("   b) The user doesn't exist yet (signup was blocked by RLS or email confirmation).");
    log("   c) Wrong password.");
    log("\n   The session simulation (Steps 3–4) cannot run without an authenticated user.");
    log("   Please resolve the above and re-run the script.");
    process.exit(1);
  }

  const userId = authData.user.id;
  log(`\n✅  Signed in as: ${userId}`);
  log(`   Email: ${authData.user.email}`);

  // ── STEP 3: Ensure profile exists ─────────────────────────────────────────
  hr();
  log("\nSTEP 3 — Profile Setup");

  const { data: existingProfile, error: profileFetchError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (profileFetchError && profileFetchError.code !== "PGRST116") {
    log(`\n❌  Could not fetch profile: ${profileFetchError.message}`);
    log("   This usually means the database schema hasn't been applied yet.");
    log("   Run the SQL from your Supabase schema file in the Dashboard → SQL Editor.");
    process.exit(1);
  }

  let profile = existingProfile;

  if (!profile) {
    log("   No profile found — creating one...");
    const now = new Date().toISOString();
    const { data: newProfile, error: createErr } = await supabase
      .from("profiles")
      .insert({
        id: userId,
        username: "sim-tester",
        total_xp: 0,
        level: 1,
        current_streak: 0,
        longest_streak: 0,
        pomodoros_completed: 0,
        dota_games_earned: 0,
        dota_games_played: 0,
        dota_games_redeemed: 0,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (createErr) {
      log(`\n❌  Profile creation failed: ${createErr.message}`);
      process.exit(1);
    }
    profile = newProfile;
    log(`   ✅  Profile created`);
  } else {
    log(`   ✅  Profile found`);
  }

  log(`   Starting state:`);
  log(`     pomodoros_completed : ${profile.pomodoros_completed}`);
  log(`     total_xp            : ${profile.total_xp}`);
  log(`     level               : ${profile.level}`);
  log(`     dota_games_earned   : ${profile.dota_games_earned}`);
  log(`     dota_games_played   : ${profile.dota_games_played}`);
  log(`     balance             : ${profile.dota_games_earned - profile.dota_games_played}`);

  // ── STEP 4: Simulate 10 sessions ─────────────────────────────────────────
  hr();
  log(`\nSTEP 4 — Simulating ${NUM_SESSIONS} × ${SESSION_DURATION_MINUTES}-minute Pomodoro sessions\n`);

  const results = [];
  let currentProfile = { ...profile };

  for (let i = 1; i <= NUM_SESSIONS; i++) {
    const sessionId = randomUUID();
    const now = new Date();
    const startedAt = new Date(now.getTime() - SESSION_DURATION_MINUTES * 60 * 1000).toISOString();
    const completedAt = now.toISOString();

    // Calculate XP (streak bonus skipped for simplicity — streak logic requires cross-day history)
    const xpEarned = XP_PER_POMODORO;

    // Insert completed session row
    const { error: sessionErr } = await supabase.from("sessions").insert({
      id: sessionId,
      user_id: userId,
      label: SESSION_LABEL,
      notes: `Simulated session #${i}`,
      duration: SESSION_DURATION_MINUTES,
      completed: true,
      started_at: startedAt,
      completed_at: completedAt,
      xp_earned: xpEarned,
    });

    if (sessionErr) {
      log(`  Session ${i.toString().padStart(2, " ")} ❌  Insert failed: ${sessionErr.message}`);
      results.push({ session: i, ok: false, error: sessionErr.message });
      continue;
    }

    // Compute new profile stats
    const newPomodoros = currentProfile.pomodoros_completed + 1;
    const newXP = currentProfile.total_xp + xpEarned;
    const newLevel = Math.floor(newXP / 500) + 1;
    const newGamesEarned = calculateDotaGamesEarned(newPomodoros);
    const now2 = new Date().toISOString();

    const { error: profileErr } = await supabase.from("profiles").upsert({
      id: userId,
      username: currentProfile.username,
      avatar_url: currentProfile.avatar_url ?? null,
      total_xp: newXP,
      level: newLevel,
      current_streak: currentProfile.current_streak,
      longest_streak: currentProfile.longest_streak,
      last_active_date: getDayKey(),
      pomodoros_completed: newPomodoros,
      dota_games_earned: newGamesEarned,
      dota_games_played: currentProfile.dota_games_played ?? 0,
      updated_at: now2,
    });

    if (profileErr) {
      log(`  Session ${i.toString().padStart(2, " ")} ⚠️  Session saved but profile update failed: ${profileErr.message}`);
      results.push({ session: i, ok: false, error: profileErr.message });
      continue;
    }

    // Update local state for next iteration
    currentProfile = {
      ...currentProfile,
      total_xp: newXP,
      level: newLevel,
      pomodoros_completed: newPomodoros,
      dota_games_earned: newGamesEarned,
      last_active_date: getDayKey(),
    };

    const balance = newGamesEarned - (currentProfile.dota_games_played ?? 0);
    const gameNote = newPomodoros % POMODOROS_PER_GAME === 0
      ? ` 🎮 Game unlocked! (total earned: ${newGamesEarned})`
      : "";

    log(
      `  Session ${i.toString().padStart(2, " ")} ✅  ` +
      `pomos=${newPomodoros}  xp=${newXP}  lvl=${newLevel}  games_earned=${newGamesEarned}  balance=${balance}` +
      gameNote
    );

    results.push({ session: i, ok: true, pomodoros: newPomodoros, xp: newXP, level: newLevel, gamesEarned: newGamesEarned, balance });
  }

  // ── STEP 5: Final verification — read from DB ─────────────────────────────
  hr();
  log("\nSTEP 5 — Final State (read from Supabase)\n");

  const { data: finalProfile, error: finalErr } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (finalErr) {
    log(`  ❌  Could not read final profile: ${finalErr.message}`);
  } else {
    const balance = finalProfile.dota_games_earned - finalProfile.dota_games_played;
    log(`  pomodoros_completed : ${finalProfile.pomodoros_completed}`);
    log(`  total_xp            : ${finalProfile.total_xp}`);
    log(`  level               : ${finalProfile.level}`);
    log(`  dota_games_earned   : ${finalProfile.dota_games_earned}`);
    log(`  dota_games_played   : ${finalProfile.dota_games_played}`);
    log(`  balance (available) : ${balance}  ${balance > 0 ? "🎮".repeat(Math.min(balance, 10)) : "(none yet)"}`);
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  hr();
  log("\nSummary\n");

  const successes = results.filter((r) => r.ok).length;
  const failures = results.filter((r) => !r.ok).length;
  log(`  Sessions attempted : ${NUM_SESSIONS}`);
  log(`  Succeeded          : ${successes}`);
  log(`  Failed             : ${failures}`);

  if (failures > 0) {
    log("\n  Failed sessions:");
    for (const r of results.filter((r) => !r.ok)) {
      log(`    #${r.session}: ${r.error}`);
    }
  }

  hr("═");
  log("");
}

main().catch((err) => {
  console.error("\nUnhandled error:", err);
  process.exit(1);
});
