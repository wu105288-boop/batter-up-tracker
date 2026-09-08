import { Link, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const tabs = [
  { to: "/log", label: "打席記錄" },
  { to: "/players", label: "球員名單" },
  { to: "/stats", label: "資料統計" },
] as const;

export function AppShell({
  children,
  subtitle,
  right,
}: {
  children: ReactNode;
  subtitle?: string;
  right?: ReactNode;
}) {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-base text-text">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="aurora-a absolute -top-24 -left-16 h-72 w-72 rounded-full bg-aurora/20 blur-3xl" />
        <div className="aurora-b absolute top-24 -right-20 h-72 w-72 rounded-full bg-sky/15 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 h-56 w-56 rounded-full bg-ball/10 blur-3xl" />
      </div>

      <div className="relative mx-auto w-full max-w-[430px] pb-10">
        <header className="flex items-center justify-between px-4 pt-4">
          <div className="flex items-center gap-2">
            <div className="grid size-8 place-items-center rounded-xl bg-panel ring-1 ring-white/10">
              <span className="font-display text-sm font-semibold text-sky">壘</span>
            </div>
            <div className="leading-tight">
              <p className="font-display text-sm font-semibold tracking-tight">壘界筆記</p>
              <p className="text-[11px] text-mute">{subtitle ?? "棒球數據記錄"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {right}
            <button
              aria-label="登出"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/" });
              }}
              className="grid size-8 place-items-center rounded-lg bg-panel/70 text-mute ring-1 ring-white/10"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </header>

        <nav className="mt-3 flex gap-1 px-3">
          {tabs.map((t) => (
            <Link
              key={t.to}
              to={t.to}
              className="flex-1 rounded-lg py-2 text-center text-[13px] text-mute"
              activeProps={{ className: "bg-panel text-text font-medium ring-1 ring-white/10" }}
            >
              {t.label}
            </Link>
          ))}
        </nav>

        <main className="px-3 pt-4">{children}</main>
      </div>
    </div>
  );
}

export function Panel({
  title,
  action,
  children,
  className = "",
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`mt-3 rounded-2xl bg-panel/80 p-4 ring-1 ring-white/10 ${className}`}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="font-display text-sm font-semibold">{title}</p>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({
  label,
  value,
  tone = "text",
}: {
  label: string;
  value: string;
  tone?: "text" | "sky" | "ball" | "amber";
}) {
  const toneClass =
    tone === "sky"
      ? "text-sky"
      : tone === "ball"
        ? "text-ball"
        : tone === "amber"
          ? "text-amber"
          : "text-text";
  return (
    <div className="rounded-xl bg-base/50 p-2.5 ring-1 ring-white/5">
      <p className="text-[11px] text-mute">{label}</p>
      <p className={`font-display text-lg font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}
