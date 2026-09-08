import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, Panel, Stat } from "@/components/AppShell";
import { batterStats, fmt2, fmt3, pitcherStats, type PA } from "@/lib/baseball";

export const Route = createFileRoute("/_authenticated/stats")({
  head: () => ({
    meta: [
      { title: "資料統計 — 壘界筆記" },
      {
        name: "description",
        content: "投手 ERA、BAA、IP、BF、NP、三振保送比，打者打擊率、上壘率與 OPS 的時間趨勢。",
      },
      { property: "og:title", content: "資料統計 — 壘界筆記" },
      { property: "og:description", content: "投打數據與時間趨勢圖，可自訂統計區間。" },
    ],
  }),
  component: StatsPage,
});

type RangeKey = "7" | "30" | "all" | "custom";

const iso = (d: Date) => d.toISOString().slice(0, 10);

function StatsPage() {
  const [mode, setMode] = useState<"pitcher" | "batter">("pitcher");
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [range, setRange] = useState<RangeKey>("30");
  const [from, setFrom] = useState(iso(new Date(Date.now() - 30 * 864e5)));
  const [to, setTo] = useState(iso(new Date()));
  const [metric, setMetric] = useState<string>("era");

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

  const { data: allPAs = [] } = useQuery({
    queryKey: ["all-pa"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plate_appearances")
        .select("*")
        .order("occurred_at", { ascending: true })
        .limit(5000);
      if (error) throw error;
      return data as PA[];
    },
  });

  const activeId = playerId ?? players[0]?.id ?? null;

  const { start, end } = useMemo(() => {
    if (range === "all") return { start: new Date(0), end: new Date(8.64e15) };
    if (range === "custom")
      return { start: new Date(`${from}T00:00:00`), end: new Date(`${to}T23:59:59`) };
    const days = Number(range);
    return { start: new Date(Date.now() - days * 864e5), end: new Date(8.64e15) };
  }, [range, from, to]);

  const playerAll = useMemo(
    () =>
      allPAs.filter((p) => (mode === "pitcher" ? p.pitcher_id : p.batter_id) === activeId),
    [allPAs, mode, activeId],
  );

  const rows = useMemo(
    () =>
      playerAll.filter((p) => {
        const t = new Date(p.occurred_at).getTime();
        return t >= start.getTime() && t <= end.getTime();
      }),
    [playerAll, start, end],
  );

  const pStats = pitcherStats(rows, playerAll);
  const bStats = batterStats(rows);

  const metrics =
    mode === "pitcher"
      ? [
          { key: "era", label: "ERA 防禦率" },
          { key: "baa", label: "BAA 被打擊率" },
          { key: "kbb", label: "三振保送比" },
          { key: "strike", label: "好球比例" },
          { key: "whip", label: "WHIP" },
        ]
      : [
          { key: "avg", label: "AVG 打擊率" },
          { key: "obp", label: "OBP 上壘率" },
          { key: "slg", label: "SLG 長打率" },
          { key: "ops", label: "OPS" },
        ];

  const activeMetric = metrics.some((m) => m.key === metric) ? metric : metrics[0]!.key;

  // Cumulative value per day, in chronological order.
  const chartData = useMemo(() => {
    const byDay = new Map<string, PA[]>();
    for (const r of rows) {
      const day = r.occurred_at.slice(0, 10);
      byDay.set(day, [...(byDay.get(day) ?? []), r]);
    }
    const days = [...byDay.keys()].sort();
    const acc: PA[] = [];
    return days.map((day) => {
      acc.push(...(byDay.get(day) ?? []));
      const snapshot = [...acc];
      const ps = pitcherStats(snapshot, playerAll);
      const bs = batterStats(snapshot);
      const value =
        activeMetric === "era"
          ? ps.era
          : activeMetric === "baa"
            ? ps.baa
            : activeMetric === "kbb"
              ? ps.kbb
              : activeMetric === "strike"
                ? ps.strikePct
                : activeMetric === "whip"
                  ? ps.whip
                  : activeMetric === "avg"
                    ? bs.avg
                    : activeMetric === "obp"
                      ? bs.obp
                      : activeMetric === "slg"
                        ? bs.slg
                        : bs.ops;
      return { day: day.slice(5), value: Number(value.toFixed(3)) };
    });
  }, [rows, playerAll, activeMetric]);

  return (
    <AppShell subtitle="投打數據與趨勢">
      <Panel>
        <div className="mb-3 flex gap-1 rounded-lg bg-base/60 p-1 text-[13px]">
          {(["pitcher", "batter"] as const).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setMetric(m === "pitcher" ? "era" : "avg");
              }}
              className={`flex-1 rounded-md py-1.5 ${mode === m ? "bg-line/50 font-medium text-text" : "text-mute"}`}
            >
              {m === "pitcher" ? "投手" : "打者"}
            </button>
          ))}
        </div>

        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {players
            .filter((p) => (mode === "pitcher" ? p.is_pitcher : p.is_batter))
            .map((p) => (
              <button
                key={p.id}
                onClick={() => setPlayerId(p.id)}
                className={`shrink-0 rounded-xl px-3 py-2 text-[13px] ring-1 ${
                  activeId === p.id
                    ? "bg-sky/20 text-sky ring-sky/40"
                    : "bg-base/60 text-mute ring-white/10"
                }`}
              >
                {p.name}
              </button>
            ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-1 text-[11px]">
          {(
            [
              ["7", "近 7 天"],
              ["30", "近 30 天"],
              ["all", "全部"],
              ["custom", "自訂"],
            ] as [RangeKey, string][]
          ).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setRange(k)}
              className={`rounded-md px-2 py-1 ring-1 ${range === k ? "bg-line/50 font-medium text-text ring-white/10" : "text-mute ring-transparent"}`}
            >
              {label}
            </button>
          ))}
        </div>
        {range === "custom" && (
          <div className="mt-2 flex items-center gap-2 text-[12px]">
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="flex-1 rounded-lg bg-base/60 px-2 py-2 ring-1 ring-white/10"
            />
            <span className="text-mute">→</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="flex-1 rounded-lg bg-base/60 px-2 py-2 ring-1 ring-white/10"
            />
          </div>
        )}
      </Panel>

      {mode === "pitcher" ? (
        <Panel title="投手資料">
          <div className="grid grid-cols-3 gap-2">
            <Stat label="防禦率 ERA" value={fmt2(pStats.era)} tone="sky" />
            <Stat label="被打擊率 BAA" value={fmt3(pStats.baa)} />
            <Stat
              label={`投球局數 IP${pStats.ipEstimated ? "（推估）" : ""}`}
              value={pStats.ipDisplay}
            />
            <Stat label="面對打席 BF" value={String(pStats.bf)} />
            <Stat label="總投球數 NP" value={String(pStats.np)} tone="amber" />
            <Stat label="好球比例" value={`${Math.round(pStats.strikePct * 100)}%`} />
            <Stat label="三振 K" value={String(pStats.so)} tone="ball" />
            <Stat label="保送 BB" value={String(pStats.bb)} />
            <Stat label="三振保送比" value={fmt2(pStats.kbb)} />
            <Stat label="被安打 H" value={String(pStats.h)} />
            <Stat label="失分 R" value={String(pStats.runs)} />
            <Stat label="WHIP" value={fmt2(pStats.whip)} />
          </div>
          {pStats.ipEstimated && (
            <p className="mt-2 text-[11px] text-mute">
              未投滿一局，局數以歷史每打席製造出局率推估後計算防禦率。
            </p>
          )}
        </Panel>
      ) : (
        <Panel title="打者資料">
          <div className="grid grid-cols-3 gap-2">
            <Stat label="打擊率 AVG" value={fmt3(bStats.avg)} tone="amber" />
            <Stat label="上壘率 OBP" value={fmt3(bStats.obp)} />
            <Stat label="OPS" value={fmt3(bStats.ops)} tone="ball" />
            <Stat label="長打率 SLG" value={fmt3(bStats.slg)} />
            <Stat label="打席 PA" value={String(bStats.pa)} />
            <Stat label="打數 AB" value={String(bStats.ab)} />
            <Stat label="安打 H" value={String(bStats.h)} />
            <Stat label="全壘打 HR" value={String(bStats.hr)} />
            <Stat label="打點 RBI" value={String(bStats.rbi)} />
            <Stat label="保送 BB" value={String(bStats.bb)} />
            <Stat label="三振 K" value={String(bStats.so)} />
            <Stat label="壘打數 TB" value={String(bStats.tb)} />
          </div>
        </Panel>
      )}

      <Panel title="時間趨勢">
        <div className="-mx-1 mb-3 flex gap-1 overflow-x-auto px-1 text-[11px]">
          {metrics.map((m) => (
            <button
              key={m.key}
              onClick={() => setMetric(m.key)}
              className={`shrink-0 rounded-md px-2 py-1 ring-1 ${activeMetric === m.key ? "bg-line/50 font-medium text-text ring-white/10" : "text-mute ring-transparent"}`}
            >
              {m.label}
            </button>
          ))}
        </div>
        {chartData.length === 0 ? (
          <p className="py-8 text-center text-[13px] text-mute">這個區間還沒有資料</p>
        ) : (
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" opacity={0.4} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "var(--mute)" }} />
                <YAxis tick={{ fontSize: 10, fill: "var(--mute)" }} width={44} />
                <Tooltip
                  contentStyle={{
                    background: "var(--panel)",
                    border: "1px solid var(--line)",
                    borderRadius: 12,
                    fontSize: 12,
                    color: "var(--text)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="var(--sky)"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "var(--sky)" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        <p className="mt-2 text-[11px] text-mute">曲線為區間內累積數據，隨每天的打席逐步變化。</p>
      </Panel>
    </AppShell>
  );
}
