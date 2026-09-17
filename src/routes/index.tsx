import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "壘界筆記 — 棒球數據記錄" },
      { name: "description", content: "快速記錄棒球打席、壘包推進與投打數據。" },
      { property: "og:title", content: "壘界筆記 — 棒球數據記錄" },
      { property: "og:description", content: "快速記錄棒球打席、壘包推進與投打數據。" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/log" });
  },
  component: () => null,
});
