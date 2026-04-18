import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Lazy-initialised so missing env vars only fail at request time, not at build time
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase admin env vars not set");
  return createClient(url, key);
}

type GameState =
  | "DOTA_GAMERULES_STATE_INIT"
  | "DOTA_GAMERULES_STATE_WAIT_FOR_PLAYERS_TO_LOAD"
  | "DOTA_GAMERULES_STATE_HERO_SELECTION"
  | "DOTA_GAMERULES_STATE_STRATEGY_TIME"
  | "DOTA_GAMERULES_STATE_PRE_GAME"
  | "DOTA_GAMERULES_STATE_GAME_IN_PROGRESS"
  | "DOTA_GAMERULES_STATE_POST_GAME"
  | string;

interface DotaGsiPayload {
  provider?: { timestamp?: number };
  map?: {
    matchid?: string | number;
    game_state?: GameState;
    game_time?: number;
    clock_time?: number;
    win_team?: string;
  };
}

export async function POST(request: NextRequest) {
  // Validate GSI token from query string
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 401 });
  }

  const supabaseAdmin = getSupabaseAdmin();

  // Find user by their GSI token
  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .select("id, dota_games_played")
    .eq("gsi_token", token)
    .single();

  if (error || !profile) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  let body: DotaGsiPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: true }); // Dota sometimes sends malformed heartbeats
  }

  const map = body.map;
  if (!map) return NextResponse.json({ ok: true }); // In main menu

  const matchId = String(map.matchid ?? "0");
  const gameState = map.game_state;

  // Ignore invalid match IDs (lobby/tutorial)
  if (!matchId || matchId === "0" || matchId === "undefined") {
    return NextResponse.json({ ok: true });
  }

  if (gameState === "DOTA_GAMERULES_STATE_GAME_IN_PROGRESS") {
    // Check if we already opened a session for this match
    const { data: existing } = await supabaseAdmin
      .from("dota_sessions")
      .select("id")
      .eq("user_id", profile.id)
      .eq("match_id", matchId)
      .maybeSingle();

    if (!existing) {
      await supabaseAdmin.from("dota_sessions").insert({
        user_id: profile.id,
        match_id: matchId,
        started_at: new Date().toISOString(),
      });
    }
  } else if (gameState === "DOTA_GAMERULES_STATE_POST_GAME") {
    // Find the open session for this match
    const { data: session } = await supabaseAdmin
      .from("dota_sessions")
      .select("id, started_at, ended_at")
      .eq("user_id", profile.id)
      .eq("match_id", matchId)
      .is("ended_at", null)
      .maybeSingle();

    if (session) {
      const startedAt = new Date(session.started_at);
      const endedAt = new Date();
      const durationMinutes = Math.max(
        1,
        Math.round((endedAt.getTime() - startedAt.getTime()) / 60_000)
      );

      // Close the session
      await supabaseAdmin
        .from("dota_sessions")
        .update({ ended_at: endedAt.toISOString(), duration_minutes: durationMinutes })
        .eq("id", session.id);

      // Deduct one game from balance (increment played count)
      await supabaseAdmin
        .from("profiles")
        .update({
          dota_games_played: (profile.dota_games_played ?? 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id);

      console.log(`[GSI] User ${profile.id} completed match ${matchId} (${durationMinutes}min)`);
    }
  }

  return NextResponse.json({ ok: true });
}

// Dota 2 also sends GET requests as heartbeats
export async function GET() {
  return NextResponse.json({ ok: true, service: "pomo-doto-gsi" });
}
