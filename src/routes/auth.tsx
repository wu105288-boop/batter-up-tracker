import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "登入 — 壘界筆記棒球數據" },
      { name: "description", content: "登入壘界筆記，開始記錄你們球隊的打席與投打數據。" },
      { property: "og:title", content: "登入 — 壘界筆記棒球數據" },
      { property: "og:description", content: "登入後即可記錄打席、壘包推進與投打數據。" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("註冊成功，開始記錄吧！");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/log" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "發生錯誤，請再試一次");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google 登入失敗，請再試一次");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/log" });
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-base px-5 text-text">
      <div className="pointer-events-none absolute inset-0">
        <div className="aurora-a absolute -top-24 -left-16 h-72 w-72 rounded-full bg-aurora/20 blur-3xl" />
        <div className="aurora-b absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-sky/15 blur-3xl" />
      </div>

      <div className="relative w-full max-w-[380px]">
        <div className="mb-5 text-center">
          <div className="mx-auto grid size-10 place-items-center rounded-xl bg-panel ring-1 ring-white/10">
            <span className="font-display text-base font-semibold text-sky">壘</span>
          </div>
          <h1 className="mt-3 font-display text-xl font-semibold">壘界筆記</h1>
          <p className="mt-1 text-[13px] text-mute">記錄每一顆球，累積整季的數據</p>
        </div>

        <div className="rounded-2xl bg-panel/80 p-4 ring-1 ring-white/10">
          <div className="mb-4 flex gap-1 rounded-lg bg-base/60 p-1 text-[13px]">
            <button
              onClick={() => setMode("signin")}
              className={`flex-1 rounded-md py-1.5 ${mode === "signin" ? "bg-line/50 font-medium text-text" : "text-mute"}`}
            >
              登入
            </button>
            <button
              onClick={() => setMode("signup")}
              className={`flex-1 rounded-md py-1.5 ${mode === "signup" ? "bg-line/50 font-medium text-text" : "text-mute"}`}
            >
              註冊
            </button>
          </div>

          <form onSubmit={submit} className="space-y-3">
            {mode === "signup" && (
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="你的名字"
                className="w-full rounded-xl bg-base/60 px-3 py-3 text-sm outline-none ring-1 ring-white/10 placeholder:text-mute focus:ring-sky/60"
              />
            )}
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="電子郵件"
              className="w-full rounded-xl bg-base/60 px-3 py-3 text-sm outline-none ring-1 ring-white/10 placeholder:text-mute focus:ring-sky/60"
            />
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="密碼（至少 6 碼）"
              className="w-full rounded-xl bg-base/60 px-3 py-3 text-sm outline-none ring-1 ring-white/10 placeholder:text-mute focus:ring-sky/60"
            />
            <button
              disabled={busy}
              className="w-full rounded-xl bg-sky py-3 text-sm font-semibold text-base disabled:opacity-60"
            >
              {busy ? "處理中…" : mode === "signin" ? "登入" : "建立帳號"}
            </button>
          </form>

          <div className="my-4 flex items-center gap-3 text-[11px] text-mute">
            <span className="h-px flex-1 bg-line/60" />或<span className="h-px flex-1 bg-line/60" />
          </div>

          <button
            onClick={google}
            className="w-full rounded-xl bg-base/60 py-3 text-sm font-medium ring-1 ring-white/15"
          >
            使用 Google 帳號繼續
          </button>
        </div>
      </div>
    </div>
  );
}
