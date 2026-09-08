import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, Panel, Stat } from "@/components/AppShell";
import { Diamond } from "@/components/Diamond";
import {
  advance,
  fmt2,
  fmt3,
  outsMadeFor,
  pitcherStats,
  RESULTS,
  resultShort,
  type Bases,
  type PA,
  type ResultCode,
} from "@/lib/baseball";

export const Route = createFileRoute("/_authenticated/log")({
  head: () => ({
    meta: [
      { title: "打席記錄 — 壘界筆記" },
      { name: "description", content: "逐球記錄好壞球與打席結果，壘包自動推進。" },
      { property: "og:title", content: "打席記錄 — 壘界筆記" },
      { property: "og:description", content: "逐球記錄好壞球與打席結果，壘包自動推進。" },
    ],
  }),
  component: LogPage,
});

type Count = { balls: number; strikes: number; pitches: number; strikePitches: number };
const EMPTY: Count = { balls: 0, strikes: 0, pitches: 0, strikePitches: 0 };

function LogPage() {
  const qc = useQueryClient();
  const [count, setCount] = useState<Count>(EMPTY);
  const [batterId, setBatterId] = useState<string | null>(null);
  const [editBase, setEditBase] = useState<0 | 1 | 2 | null>(null);

  const { data: players = [] } = useQuery({
    queryKey: ["players"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: game } = useQuery({
    queryKey: ["active-game"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("games")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      if (data && data.length > 0) return data[0]!;
      const { data: created, error: insertError } = await supabase
        .from("games")
        .insert({ name: "練習賽" })
        .select()
        .single();
      if (insertError) throw insertError;
      return created;
    },
  });

  const { data: gamePAs = [] } = useQuery({
    queryKey: ["game-pa", game?.id],
    enabled: !!game?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plate_appearances")
        .select("*")
        .eq("game_id", game!.id)
        .order("occurred_at", { ascending: false });
      if (error) throw error;
      return data as PA[];
    },
  });

  const { data: allPAs = [] } = useQuery({
    queryKey: ["all-pa"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plate_appearances")
        .select("*")
        .order("occurred_at", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return data as PA[];
    },
  });

  const bases: Bases = [game?.base1 ?? null, game?.base2 ?? null, game?.base3 ?? null];
  const pitcherId = game?.current_pitcher ?? null;
  const pitcherName = players.find((p) => p.id === pitcherId)?.name;
  const batterName = players.find((p) => p.id === batterId)?.name;

  const patchGame = useMutation({
    mutationFn: async (patch: Record<string, unknown>) => {
      if (!game) return;
      const { error } = await supabase.from("games").update(patch).eq("id", game.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["active-game"] }),
  });

  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: ["active-game"] });
    qc.invalidateQueries({ queryKey: ["game-pa"] });
    qc.invalidateQueries({ queryKey: ["all-pa"] });
  };

  const record = async (code: ResultCode, override?: Partial<Count>) => {
    if (!game) return;
    if (!pitcherId) return toast.error("請先選擇投手");
    if (!batterId) return toast.error("請先選擇打者");

    const c = { ...count, ...override };
    const adv = advance(bases, code, batterId);
    const outsMade = outsMadeFor(code);
    const newOuts = (game.outs ?? 0) + outsMade;
    const endInning = newOuts >= 3;

    const { error } = await supabase.from("plate_appearances").insert({
      game_id: game.id,
      pitcher_id: pitcherId,
      batter_id: batterId,
      balls: c.balls,
      strikes: c.strikes,
      pitches: c.pitches,
      strike_pitches: c.strikePitches,
      result: code,
      rbi: code === "error" ? 0 : adv.runs,
      outs_made: outsMade,
      runs: adv.runs,
      inning: game.inning ?? 1,
    });
    if (error) return toast.error("記錄失敗");

    await supabase
      .from("games")
      .update({
        outs: endInning ? 0 : newOuts,
        inning: endInning ? (game.inning ?? 1) + 1 : (game.inning ?? 1),
        base1: endInning ? null : adv.bases[0],
        base2: endInning ? null : adv.bases[1],
        base3: endInning ? null : adv.bases[2],
      })
      .eq("id", game.id);

    setCount(EMPTY);
    setBatterId(null);
    refreshAll();
    toast.success(
      `${batterName ?? "打者"}：${RESULTS.find((r) => r.code === code)?.label}${adv.runs ? ` · 得 ${adv.runs} 分` : ""}`,
    );
  };

  const onStrike = () => {
    const next = {
      balls: count.balls,
      strikes: count.strikes + 1,
      pitches: count.pitches + 1,
      strikePitches: count.strikePitches + 1,
    };
    if (next.strikes >= 3) void record("strikeout", next);
    else setCount(next);
  };

  const onBall = () => {
    const next = { ...count, balls: count.balls + 1, pitches: count.pitches + 1 };
    if (next.balls >= 4) void record("walk", next);
    else setCount(next);
  };

  const onFoul = () =>
    setCount((c) => ({
      ...c,
      strikes: Math.min(2, c.strikes + 1),
      pitches: c.pitches + 1,
      strikePitches: c.strikePitches + 1,
    }));

  const onResult = (code: ResultCode) => {
    const inPlay = !["walk", "hbp", "strikeout"].includes(code);
    void record(code, {
      pitches: count.pitches + (inPlay ? 1 : 0),
      strikePitches: count.strikePitches + (inPlay ? 1 : 0),
    });
  };

  const undoLast = async () => {
    const last = gamePAs[0];
    if (!last) return toast.error("這場還沒有紀錄");
    await supabase.from("plate_appearances").delete().eq("id", last.id);
    refreshAll();
    toast.success("已刪除最後一筆打席（壘包請手動調整）");
  };

  const setRunner = (idx: 0 | 1 | 2, playerId: string | null) => {
    const key = (["base1", "base2", "base3"] as const)[idx];
    patchGame.mutate({ [key]: playerId });
    setEditBase(null);
  };

  const livePitcher = pitcherStats(
    gamePAs.filter((p) => p.pitcher_id === pitcherId),
    allPAs.filter((p) => p.pitcher_id === pitcherId),
  );

  const pitchers = players.filter((p) => p.is_pitcher);
  const batters = players.filter((p) => p.is_batter);

  if (players.length === 0) {
    return (
      <AppShell subtitle="尚未建立球員">
        <Panel title="先建立球員">
          <p className="text-[13px] text-mute">要開始記錄打席，先到球員名單新增投手與打者。</p>
          <Link
            to="/players"
            className="mt-3 block rounded-xl bg-sky py-3 text-center text-sm font-semibold text-base"
          >
            前往球員名單
          </Link>
        </Panel>
      </AppShell>
    );
  }

  return (
    <AppShell subtitle={`第 ${game?.inning ?? 1} 局 · ${game?.outs ?? 0} 出局`}>
      <Panel title="本場對決">
        <p className="mb-1.5 text-[11px] text-mute">投手（打席結束後不會更換）</p>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {pitchers.map((p) => (
            <button
              key={p.id}
              onClick={() => patchGame.mutate({ current_pitcher: p.id })}
              className={`shrink-0 rounded-xl px-3 py-2 text-[13px] ring-1 ${
                pitcherId === p.id
                  ? "bg-sky/20 text-sky ring-sky/40"
                  : "bg-base/60 text-mute ring-white/10"
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>

        <p className="mt-3 mb-1.5 text-[11px] text-mute">打者</p>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {batters.map((p) => (
            <button
              key={p.id}
              onClick={() => setBatterId(p.id)}
              className={`shrink-0 rounded-xl px-3 py-2 text-[13px] ring-1 ${
                batterId === p.id
                  ? "bg-amber/20 text-amber ring-amber/40"
                  : "bg-base/60 text-mute ring-white/10"
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </Panel>

      <Panel>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] tracking-[0.15em] text-mute uppercase">對決 matchup</p>
            <p className="truncate font-display text-base font-semibold">
              {pitcherName ?? "選擇投手"} <span className="text-mute">VS</span>{" "}
              {batterName ?? "選擇打者"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-mute">本打席球數</p>
            <p className="font-display text-2xl leading-none font-semibold text-amber">
              {count.pitches}
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex-1">
            <p className="mb-1.5 text-[11px] font-medium tracking-wide text-strike">壞球 BALLS</p>
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className={`h-3 w-5 rounded-full ${i < count.balls ? "bg-strike shadow-[0_0_10px] shadow-strike/60" : "bg-line"}`}
                />
              ))}
            </div>
          </div>
          <div className="font-display text-2xl font-semibold text-mute">
            {count.balls} — {count.strikes}
          </div>
          <div className="flex-1">
            <p className="mb-1.5 text-right text-[11px] font-medium tracking-wide text-ball">
              好球 STRIKES
            </p>
            <div className="flex justify-end gap-1.5">
              {[0, 1].map((i) => (
                <span
                  key={i}
                  className={`h-3 w-5 rounded-full ${i < count.strikes ? "bg-ball shadow-[0_0_10px] shadow-ball/60" : "bg-line"}`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <button
            onClick={onStrike}
            className="rounded-xl bg-ball/20 py-3.5 text-sm font-medium text-ball ring-1 ring-ball/40"
          >
            好球
          </button>
          <button
            onClick={onBall}
            className="rounded-xl bg-strike/20 py-3.5 text-sm font-medium text-strike ring-1 ring-strike/40"
          >
            壞球
          </button>
          <button
            onClick={onFoul}
            className="rounded-xl bg-panel py-3.5 text-sm font-medium ring-1 ring-white/15"
          >
            界外
          </button>
        </div>

        <p className="mt-4 mb-2 text-[11px] text-mute">打席結果</p>
        <div className="grid grid-cols-3 gap-2">
          {RESULTS.map((r) => (
            <button
              key={r.code}
              onClick={() => onResult(r.code)}
              className={`rounded-xl py-3 text-[13px] font-medium ring-1 ${
                r.tone === "hit"
                  ? "bg-amber/15 text-amber ring-amber/30"
                  : r.tone === "walk"
                    ? "bg-sky/15 text-sky ring-sky/30"
                    : "bg-base/60 ring-white/10"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </Panel>

      <Panel
        title="壘包圖"
        action={
          <div className="flex gap-1 text-[11px]">
            <button
              onClick={() => patchGame.mutate({ base1: null, base2: null, base3: null })}
              className="rounded-md bg-base/60 px-2 py-1 text-mute ring-1 ring-white/10"
            >
              清空壘包
            </button>
            <button
              onClick={() =>
                patchGame.mutate({
                  inning: (game?.inning ?? 1) + 1,
                  outs: 0,
                  base1: null,
                  base2: null,
                  base3: null,
                })
              }
              className="rounded-md bg-base/60 px-2 py-1 text-mute ring-1 ring-white/10"
            >
              換局
            </button>
          </div>
        }
      >
        <Diamond
          bases={bases}
          players={players}
          outs={game?.outs ?? 0}
          onTapBase={(i) => setEditBase(i)}
        />
        {editBase !== null && (
          <div className="mt-3 rounded-xl bg-base/60 p-3 ring-1 ring-white/10">
            <p className="mb-2 text-[12px] text-mute">設定 {editBase + 1} 壘跑者</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setRunner(editBase, null)}
                className="rounded-lg bg-panel px-3 py-2 text-[13px] text-mute ring-1 ring-white/10"
              >
                清空
              </button>
              {players.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setRunner(editBase, p.id)}
                  className="rounded-lg bg-panel px-3 py-2 text-[13px] ring-1 ring-white/10"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </Panel>

      <Panel
        title={`本場投手數據${pitcherName ? ` · ${pitcherName}` : ""}`}
        action={
          <button onClick={undoLast} className="text-[11px] text-mute underline">
            刪除最後一筆
          </button>
        }
      >
        <div className="grid grid-cols-3 gap-2">
          <Stat label="防禦率 ERA" value={fmt2(livePitcher.era)} tone="sky" />
          <Stat label="被打擊率 BAA" value={fmt3(livePitcher.baa)} />
          <Stat
            label={`投球局數 IP${livePitcher.ipEstimated ? "（推估）" : ""}`}
            value={livePitcher.ipDisplay}
          />
          <Stat label="面對打席 BF" value={String(livePitcher.bf)} />
          <Stat label="總投球數 NP" value={String(livePitcher.np)} tone="amber" />
          <Stat label="好球率" value={`${Math.round(livePitcher.strikePct * 100)}%`} />
        </div>
      </Panel>

      <Panel title="本場打席紀錄">
        {gamePAs.length === 0 ? (
          <p className="py-4 text-center text-[13px] text-mute">還沒有打席紀錄</p>
        ) : (
          <ul className="divide-y divide-line/50 text-[13px]">
            {gamePAs.slice(0, 12).map((pa) => (
              <li key={pa.id} className="flex items-center gap-2 py-2">
                <span className="w-10 text-[11px] text-mute">{pa.inning} 局</span>
                <span className="flex-1 truncate">
                  {players.find((p) => p.id === pa.batter_id)?.name ?? "打者"}
                </span>
                <span className="font-display text-[12px] text-mute">
                  {pa.balls}-{pa.strikes}
                </span>
                <span className="rounded-md bg-base/60 px-2 py-0.5 font-display text-[11px] ring-1 ring-white/10">
                  {resultShort(pa.result)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </AppShell>
  );
}
