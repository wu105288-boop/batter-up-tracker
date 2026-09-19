import { createServerFn } from "@tanstack/react-start";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { z } from "zod";

import { createLovableAiGatewayRunIdFetch } from "./ai-gateway.server";

const Input = z.object({
  playerName: z.string().min(1),
  mode: z.enum(["pitcher", "batter"]),
  rangeLabel: z.string(),
  paCount: z.number(),
  stats: z.array(z.object({ label: z.string(), value: z.string() })),
});

export const analyzePlayer = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const runIdFetch = createLovableAiGatewayRunIdFetch();
    const lovable = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey: key,
      headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
      fetch: runIdFetch.fetch,
    });

    const table = data.stats.map((s) => `${s.label}: ${s.value}`).join("\n");
    const role = data.mode === "pitcher" ? "投手" : "打者";

    const result = streamText({
      model: lovable.responses("openai/gpt-6-astra"),
      system:
        "你是一位資深棒球數據分析教練，使用繁體中文（台灣用語）回答。" +
        "請依據提供的數據給出務實、具體、可執行的分析，不要編造未提供的數據。" +
        "格式固定為三段，每段開頭為標題行：\n" +
        "【能力評估】3-4 句話說明整體表現水準。\n" +
        "【優勢與弱點】各列 2-3 個要點，用「・」開頭。\n" +
        "【練習建議】2-3 條具體建議，用「・」開頭。\n" +
        "若樣本數過少（打席少於 10），請在開頭提醒數據樣本不足，僅供參考。",
      prompt:
        `球員：${data.playerName}（${role}）\n統計區間：${data.rangeLabel}\n樣本打席數：${data.paCount}\n\n數據：\n${table}\n\n` +
        `備註：投球局數以出局數計算（1 出局 = 0.1 局）；責任失分歸屬讓跑者上壘的投手。請給出分析與評語。`,
      providerOptions: {
        openai: {
          forceReasoning: true,
          reasoningEffort: "low",
          reasoningSummary: "auto",
          store: false,
          include: ["reasoning.encrypted_content"],
        },
      },
    });

    const text = await result.text;
    return { text: text.trim() };
  });
