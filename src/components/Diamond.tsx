import { useRef } from "react";
import type { Bases } from "@/lib/baseball";

type Player = { id: string; name: string };

export function Diamond({
  bases,
  players,
  outs,
  onTapBase,
  onTapHome,
  onLongPressBase,
}: {
  bases: Bases;
  players: Player[];
  outs: number;
  onTapBase: (index: 0 | 1 | 2) => void;
  onTapHome?: () => void;
  onLongPressBase?: (index: 0 | 1 | 2) => void;
}) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longFired = useRef(false);
  const startPress = (idx: 0 | 1 | 2) => {
    if (!onLongPressBase) return;
    longFired.current = false;
    timer.current = setTimeout(() => {
      longFired.current = true;
      onLongPressBase(idx);
    }, 450);
  };
  const endPress = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  const nameOf = (id: string | null) =>
    id ? (players.find((p) => p.id === id)?.name ?? "跑者") : null;

  const spots: { idx: 0 | 1 | 2; pos: string; label: string }[] = [
    { idx: 0, pos: "right-[4%] top-1/2 -translate-y-1/2", label: "1" },
    { idx: 1, pos: "left-1/2 top-[4%] -translate-x-1/2", label: "2" },
    { idx: 2, pos: "left-[4%] top-1/2 -translate-y-1/2", label: "3" },
  ];

  return (
    <div>
      <div className="relative mx-auto aspect-square w-[248px]">
        <div className="absolute top-1/2 left-1/2 size-[68%] -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[14px] bg-base/60 ring-1 ring-line" />
        <div className="absolute top-1/2 left-1/2 size-[34%] -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-lg bg-panel ring-1 ring-line/60" />
        <div className="absolute top-1/2 left-1/2 size-8 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[10px] bg-line/40 ring-1 ring-line" />
        <button
          onClick={() => onTapHome?.()}
          aria-label="本壘"
          className="absolute bottom-[4%] left-1/2 grid size-11 -translate-x-1/2 translate-y-2 place-items-center rounded-full"
        >
          <span className="absolute size-6 rotate-45 rounded-[6px] bg-line/40 ring-1 ring-line" />
          <span className="absolute -bottom-3 text-[10px] text-mute">本壘</span>
        </button>

        {spots.map((s) => {
          const runner = nameOf(bases[s.idx] ?? null);
          return (
            <button
              key={s.idx}
              onClick={() => {
                if (longFired.current) {
                  longFired.current = false;
                  return;
                }
                onTapBase(s.idx);
              }}
              onPointerDown={() => startPress(s.idx)}
              onPointerUp={endPress}
              onPointerLeave={endPress}
              onPointerCancel={endPress}
              onContextMenu={(e) => e.preventDefault()}
              className={`absolute ${s.pos} grid size-11 touch-none place-items-center rounded-full select-none`}
              aria-label={`${s.label}壘`}
            >
              <span className="absolute size-6 rotate-45 rounded-[6px] bg-line/40 ring-1 ring-line" />
              {runner && (
                <span className="runner-chip relative grid size-8 place-items-center rounded-full bg-amber font-display text-[10px] font-semibold text-base shadow-[0_0_12px] shadow-amber/50 ring-2 ring-base">
                  {runner.slice(0, 2)}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-1 flex items-center justify-center gap-3 text-[11px] text-mute">
        <span>
          出局{" "}
          <span className="font-display text-text">
            {outs}
            <span className="text-mute">/3</span>
          </span>
        </span>
        <span className="size-1 rounded-full bg-line" />
        <span>輕點壘包調整跑者 · 長按改責任投手 · 點本壘加減得分</span>
      </div>
    </div>
  );
}
