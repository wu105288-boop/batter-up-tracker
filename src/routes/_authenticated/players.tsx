import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, Panel } from "@/components/AppShell";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/players")({
  head: () => ({
    meta: [
      { title: "球員名單 — 壘界筆記" },
      { name: "description", content: "建立與管理球隊的投手與打者名單。" },
      { property: "og:title", content: "球員名單 — 壘界筆記" },
      { property: "og:description", content: "建立與管理球隊的投手與打者名單。" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PlayersPage,
});

function PlayersPage() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [isPitcher, setIsPitcher] = useState(true);
  const [isBatter, setIsBatter] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);

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

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("players").insert({
        name: name.trim(),
        number: number.trim() || null,
        is_pitcher: isPitcher,
        is_batter: isBatter,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setName("");
      setNumber("");
      qc.invalidateQueries({ queryKey: ["players"] });
      toast.success("已加入名單");
    },
    onError: () => toast.error("新增失敗"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("players").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["players"] });
      toast.success("已刪除球員");
    },
    onError: () => toast.error("刪除失敗"),
  });

  return (
    <AppShell subtitle={`共 ${players.length} 位球員`}>
      <Panel title="新增球員">
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="球員姓名"
              className="flex-1 rounded-xl bg-base/60 px-3 py-3 text-sm outline-none ring-1 ring-white/10 placeholder:text-mute focus:ring-sky/60"
            />
            <input
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="背號"
              className="w-20 rounded-xl bg-base/60 px-3 py-3 text-center text-sm outline-none ring-1 ring-white/10 placeholder:text-mute focus:ring-sky/60"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsPitcher((v) => !v)}
              className={`flex-1 rounded-xl py-2.5 text-[13px] ring-1 ${isPitcher ? "bg-sky/20 text-sky ring-sky/40" : "bg-base/60 text-mute ring-white/10"}`}
            >
              可當投手
            </button>
            <button
              onClick={() => setIsBatter((v) => !v)}
              className={`flex-1 rounded-xl py-2.5 text-[13px] ring-1 ${isBatter ? "bg-amber/20 text-amber ring-amber/40" : "bg-base/60 text-mute ring-white/10"}`}
            >
              可當打者
            </button>
          </div>
          <button
            disabled={!name.trim() || add.isPending}
            onClick={() => add.mutate()}
            className="w-full rounded-xl bg-sky py-3 text-sm font-semibold text-base disabled:opacity-50"
          >
            加入名單
          </button>
        </div>
      </Panel>

      <Panel title="名單">
        {players.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-mute">還沒有球員，先新增一位吧</p>
        ) : (
          <ul className="divide-y divide-line/50">
            {players.map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-2.5">
                <span className="grid size-8 place-items-center rounded-full bg-base/60 font-display text-[11px] text-mute ring-1 ring-white/10">
                  {p.number || "–"}
                </span>
                <span className="flex-1 text-[14px] font-medium">{p.name}</span>
                <span className="flex gap-1 text-[10px]">
                  {p.is_pitcher && (
                    <span className="rounded-md bg-sky/15 px-1.5 py-0.5 text-sky">投</span>
                  )}
                  {p.is_batter && (
                    <span className="rounded-md bg-amber/15 px-1.5 py-0.5 text-amber">打</span>
                  )}
                </span>
                <button
                  onClick={() => setPendingDelete({ id: p.id, name: p.name })}
                  aria-label={`刪除 ${p.name}`}
                  className="text-mute"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent className="max-w-[340px] rounded-2xl border-line bg-panel text-text">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[15px]">
              確定要刪除「{pendingDelete?.name}」嗎？
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[13px] text-mute">
              刪除後這位球員會從名單移除，無法復原。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row justify-end gap-2">
            <AlertDialogCancel className="mt-0 rounded-xl bg-base/60 text-[13px] text-mute ring-1 ring-white/10">
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDelete) remove.mutate(pendingDelete.id);
                setPendingDelete(null);
              }}
              className="rounded-xl bg-strike/20 text-[13px] font-semibold text-strike ring-1 ring-strike/50 hover:bg-strike/30"
            >
              確定刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
