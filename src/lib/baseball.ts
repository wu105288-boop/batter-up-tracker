export type Bases = [string | null, string | null, string | null];

export type ResultCode =
  | "single"
  | "double"
  | "triple"
  | "homerun"
  | "walk"
  | "hbp"
  | "strikeout"
  | "flyout"
  | "groundout"
  | "double_play"
  | "sac_fly"
  | "sac_bunt"
  | "error"
  | "fielders_choice";

export const RESULTS: {
  code: ResultCode;
  label: string;
  short: string;
  tone: "hit" | "out" | "walk";
}[] = [
  { code: "single", label: "一壘安打", short: "1B", tone: "hit" },
  { code: "double", label: "二壘安打", short: "2B", tone: "hit" },
  { code: "triple", label: "三壘安打", short: "3B", tone: "hit" },
  { code: "homerun", label: "全壘打", short: "HR", tone: "hit" },
  { code: "walk", label: "四壞保送", short: "BB", tone: "walk" },
  { code: "hbp", label: "觸身球", short: "HBP", tone: "walk" },
  { code: "strikeout", label: "三振", short: "K", tone: "out" },
  { code: "flyout", label: "飛球接殺", short: "F", tone: "out" },
  { code: "groundout", label: "滾地出局", short: "G", tone: "out" },
  { code: "double_play", label: "雙殺打", short: "DP", tone: "out" },
  { code: "sac_fly", label: "高飛犧牲打", short: "SF", tone: "out" },
  { code: "sac_bunt", label: "犧牲觸擊", short: "SAC", tone: "out" },
  { code: "error", label: "失誤上壘", short: "E", tone: "hit" },
  { code: "fielders_choice", label: "野手選擇", short: "FC", tone: "out" },
];

export function resultLabel(code: string) {
  return RESULTS.find((r) => r.code === code)?.label ?? code;
}

export function resultShort(code: string) {
  return RESULTS.find((r) => r.code === code)?.short ?? code;
}

export const HIT_CODES: ResultCode[] = ["single", "double", "triple", "homerun"];

export function outsMadeFor(code: ResultCode) {
  if (code === "double_play") return 2;
  if (["strikeout", "flyout", "groundout", "sac_fly", "sac_bunt", "fielders_choice"].includes(code))
    return 1;
  return 0;
}

export type Runner = { playerId: string; pitcherId: string | null };
export type RunnerBases = [Runner | null, Runner | null, Runner | null];

type Slots<T> = [T | null, T | null, T | null];

/** Core runner movement. Returns new bases plus the runners that scored. */
function advanceCore<T>(
  bases: Slots<T>,
  code: ResultCode,
  batter: T,
): { bases: Slots<T>; scored: T[] } {
  const cur: Slots<T> = [bases[0] ?? null, bases[1] ?? null, bases[2] ?? null];
  const next: Slots<T> = [null, null, null];
  const scored: T[] = [];
  const push = (idx: number, r: T | null) => {
    if (!r) return;
    if (idx > 2) {
      scored.push(r);
      return;
    }
    next[idx] = r;
  };

  const shift = (n: number) => {
    for (let i = 2; i >= 0; i--) push(i + n, cur[i] ?? null);
  };

  switch (code) {
    case "single":
    case "error":
      shift(1);
      push(0, batter);
      break;
    case "double":
      shift(2);
      push(1, batter);
      break;
    case "triple":
      shift(3);
      push(2, batter);
      break;
    case "homerun":
      shift(4);
      scored.push(batter);
      break;
    case "walk":
    case "hbp": {
      let carry: T | null = batter;
      for (let i = 0; i < 3; i++) {
        const occupant = cur[i] ?? null;
        if (carry === null) {
          next[i] = occupant;
          continue;
        }
        next[i] = carry;
        carry = occupant;
      }
      if (carry) scored.push(carry);
      break;
    }
    case "sac_fly":
      next[0] = cur[0] ?? null;
      next[1] = cur[1] ?? null;
      if (cur[2]) scored.push(cur[2]);
      break;
    case "sac_bunt":
      shift(1);
      break;
    case "fielders_choice":
      if (cur[2]) {
        next[1] = cur[1] ?? null;
      } else if (cur[1]) {
        next[2] = cur[2] ?? null;
      } else {
        next[1] = cur[1] ?? null;
        next[2] = cur[2] ?? null;
      }
      next[0] = batter;
      break;
    case "double_play":
      next[0] = null;
      next[1] = cur[0] ? null : (cur[1] ?? null);
      next[2] = cur[0] ? (cur[1] ?? null) : (cur[2] ?? null);
      break;
    default:
      next[0] = cur[0] ?? null;
      next[1] = cur[1] ?? null;
      next[2] = cur[2] ?? null;
  }
  return { bases: next, scored };
}

/** Advance runners. Returns new bases plus how many runners scored. */
export function advance(
  bases: Bases,
  code: ResultCode,
  batterId: string,
): { bases: Bases; runs: number } {
  const r = advanceCore<string>(bases, code, batterId);
  return { bases: r.bases as Bases, runs: r.scored.length };
}

/**
 * Advance runners while keeping the pitcher responsible for each runner.
 * `scoredPitchers` lists the responsible pitcher of every runner that scored,
 * so runs are charged to whoever put the runner on base.
 */
export function advanceWithResponsibility(
  bases: RunnerBases,
  code: ResultCode,
  batterId: string,
  pitcherId: string | null,
): { bases: RunnerBases; scoredPitchers: (string | null)[] } {
  const r = advanceCore<Runner>(bases, code, { playerId: batterId, pitcherId });
  return {
    bases: r.bases as RunnerBases,
    scoredPitchers: r.scored.map((x) => x.pitcherId),
  };
}

/** A runner stranded when a half inning is cut short counts as this many runs. */
export const STRANDED_RUN_VALUE = 0.33;


export type PA = {
  id: string;
  pitcher_id: string | null;
  batter_id: string | null;
  balls: number;
  strikes: number;
  pitches: number;
  strike_pitches: number;
  result: string;
  rbi: number;
  outs_made: number;
  runs: number;
  inning: number;
  occurred_at: string;
};

export type BatterStats = {
  pa: number;
  ab: number;
  h: number;
  b1: number;
  b2: number;
  b3: number;
  hr: number;
  bb: number;
  hbp: number;
  so: number;
  sf: number;
  rbi: number;
  tb: number;
  avg: number;
  obp: number;
  slg: number;
  ops: number;
};

export function batterStats(rows: PA[]): BatterStats {
  const c = (code: string) => rows.filter((r) => r.result === code).length;
  const b1 = c("single");
  const b2 = c("double");
  const b3 = c("triple");
  const hr = c("homerun");
  const h = b1 + b2 + b3 + hr;
  const bb = c("walk");
  const hbp = c("hbp");
  const so = c("strikeout");
  const sf = c("sac_fly");
  const sac = c("sac_bunt");
  const pa = rows.length;
  const ab = pa - bb - hbp - sf - sac;
  const tb = b1 + 2 * b2 + 3 * b3 + 4 * hr;
  const rbi = rows.reduce((s, r) => s + (r.rbi || 0), 0);
  const avg = ab > 0 ? h / ab : 0;
  const obpDen = ab + bb + hbp + sf;
  const obp = obpDen > 0 ? (h + bb + hbp) / obpDen : 0;
  const slg = ab > 0 ? tb / ab : 0;
  return { pa, ab, h, b1, b2, b3, hr, bb, hbp, so, sf, rbi, tb, avg, obp, slg, ops: obp + slg };
}

export type PitcherStats = {
  bf: number;
  np: number;
  strikePct: number;
  outs: number;
  ipDisplay: string;
  ipValue: number;
  h: number;
  hr: number;
  bb: number;
  so: number;
  runs: number;
  era: number;
  eraDisplay: string;
  baa: number;
  k9: number;
  bb9: number;
  kbb: number;
  whip: number;
};

/** 1 out = .1, 2 outs = .2 */
export function formatIP(outs: number) {
  return `${Math.floor(outs / 3)}.${outs % 3}`;
}

/** Per-9-innings rate. "∞" while no out has been recorded but something happened. */
export function per9(count: number, ip: number) {
  if (ip > 0) return (count * 9) / ip;
  return count > 0 ? Infinity : 0;
}

export function fmtRate(n: number) {
  if (n === Infinity) return "∞";
  if (!isFinite(n)) return "-";
  return n.toFixed(2);
}

/**
 * Pitcher stats. Innings pitched come strictly from recorded outs (no estimate),
 * so a pitcher with runs charged but zero outs has an infinite ERA.
 * `chargedRuns` are the runs this pitcher is responsible for (inherited runners
 * are charged to whoever put them on base), defaulting to the runs on his own
 * plate appearances.
 */
export function pitcherStats(rows: PA[], chargedRuns?: number): PitcherStats {
  const c = (code: string) => rows.filter((r) => r.result === code).length;
  const h = c("single") + c("double") + c("triple") + c("homerun");
  const bb = c("walk");
  const hbp = c("hbp");
  const so = c("strikeout");
  const sf = c("sac_fly");
  const sac = c("sac_bunt");
  const bf = rows.length;
  const np = rows.reduce((s, r) => s + (r.pitches || 0), 0);
  const sp = rows.reduce((s, r) => s + (r.strike_pitches || 0), 0);
  const runs = chargedRuns ?? rows.reduce((s, r) => s + (r.runs || 0), 0);
  const outs = rows.reduce((s, r) => s + (r.outs_made || 0), 0);
  const ip = outs / 3;
  const abAgainst = bf - bb - hbp - sf - sac;
  const era = per9(runs, ip);
  return {
    bf,
    np,
    strikePct: np > 0 ? sp / np : 0,
    outs,
    ipDisplay: formatIP(outs),
    ipValue: ip,
    h,
    hr: c("homerun"),
    bb,
    so,
    runs,
    era,
    eraDisplay: fmtRate(era),
    baa: abAgainst > 0 ? h / abAgainst : 0,
    k9: per9(so, ip),
    bb9: per9(bb, ip),
    kbb: bb > 0 ? so / bb : so,
    whip: ip > 0 ? (h + bb) / ip : h + bb > 0 ? Infinity : 0,
  };
}


export function fmt3(n: number) {
  if (!isFinite(n)) return "-";
  const s = n.toFixed(3);
  return n < 1 ? s.replace(/^0/, "") : s;
}

export function fmt2(n: number) {
  if (!isFinite(n)) return "-";
  return n.toFixed(2);
}
