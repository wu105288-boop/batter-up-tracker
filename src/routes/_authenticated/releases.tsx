import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, Check } from "lucide-react";
import { AppShell, Panel } from "@/components/AppShell";
import { RELEASES } from "@/lib/changelog";

export const Route = createFileRoute("/_authenticated/releases")({
  head: () => ({
    meta: [
      { title: "版本紀錄 — 壘界筆記" },
      { name: "description", content: "查看壘界筆記各版本的功能更新與修正內容。" },
      { property: "og:title", content: "版本紀錄 — 壘界筆記" },
      { property: "og:description", content: "查看壘界筆記各版本的功能更新與修正內容。" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReleasesPage,
});

function ReleasesPage() {
  return (
    <AppShell subtitle={`目前版本 v${RELEASES[0]?.version ?? "—"}`}>
      <header className="px-1 pb-1 pt-2">
        <p className="text-[11px] font-medium text-sky">CHANGELOG</p>
        <h1 className="mt-1 font-display text-2xl font-semibold">版本紀錄</h1>
        <p className="mt-1 text-[13px] leading-6 text-mute">每次功能更新與修正都會記錄在這裡。</p>
      </header>

      {RELEASES.map((release, index) => (
        <Panel
          key={release.version}
          title={`v${release.version}`}
          action={
            index === 0 ? (
              <span className="rounded-md bg-sky/15 px-2 py-1 text-[11px] font-medium text-sky ring-1 ring-sky/30">
                最新版本
              </span>
            ) : null
          }
        >
          <div className="mb-4 flex items-center gap-2 text-[11px] text-mute">
            <CalendarDays className="size-3.5" aria-hidden="true" />
            <time dateTime={release.date}>{release.date.replaceAll("-", ".")}</time>
          </div>
          <h2 className="font-display text-base font-semibold">{release.title}</h2>
          <ul className="mt-3 space-y-3">
            {release.changes.map((change) => (
              <li key={change} className="flex items-start gap-2.5 text-[13px] leading-5 text-mute">
                <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-ball/15 text-ball">
                  <Check className="size-3" aria-hidden="true" />
                </span>
                <span>{change}</span>
              </li>
            ))}
          </ul>
        </Panel>
      ))}
    </AppShell>
  );
}