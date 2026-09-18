/** Draws a shareable stat card on a canvas and downloads it as a PNG. */
export type CardRow = { label: string; value: string };

export function exportStatCard(opts: {
  title: string;
  subtitle: string;
  badge: string;
  rows: CardRow[];
  note?: string | undefined;
  fileName: string;
}) {
  const scale = 2;
  const W = 720;
  const cols = 3;
  const rowsCount = Math.ceil(opts.rows.length / cols);
  const cellH = 92;
  const gridTop = 210;
  const noteH = opts.note ? 74 : 24;
  const H = gridTop + rowsCount * cellH + noteH + 56;

  const canvas = document.createElement("canvas");
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(scale, scale);

  const base = "#0b1220";
  const panel = "#141d2e";
  const line = "#243149";
  const text = "#e8eefc";
  const mute = "#8798b5";
  const sky = "#5ec8f8";
  const amber = "#f9c357";

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, base);
  bg.addColorStop(1, "#111a2b");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const glow = ctx.createRadialGradient(W - 90, 60, 10, W - 90, 60, 260);
  glow.addColorStop(0, "rgba(94,200,248,0.20)");
  glow.addColorStop(1, "rgba(94,200,248,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  const round = (x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };

  // Header
  ctx.fillStyle = mute;
  ctx.font = "500 15px system-ui, -apple-system, 'PingFang TC', sans-serif";
  ctx.fillText("壘界筆記 · 棒球數據記錄", 40, 52);

  ctx.fillStyle = text;
  ctx.font = "700 42px system-ui, -apple-system, 'PingFang TC', sans-serif";
  ctx.fillText(opts.title, 40, 108);

  ctx.fillStyle = mute;
  ctx.font = "400 17px system-ui, -apple-system, 'PingFang TC', sans-serif";
  ctx.fillText(opts.subtitle, 40, 140);

  // Badge
  ctx.font = "600 15px system-ui, -apple-system, 'PingFang TC', sans-serif";
  const bw = ctx.measureText(opts.badge).width + 30;
  round(W - 40 - bw, 34, bw, 34, 17);
  ctx.fillStyle = "rgba(94,200,248,0.16)";
  ctx.fill();
  ctx.strokeStyle = "rgba(94,200,248,0.45)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = sky;
  ctx.fillText(opts.badge, W - 40 - bw + 15, 56);

  ctx.strokeStyle = line;
  ctx.beginPath();
  ctx.moveTo(40, 170);
  ctx.lineTo(W - 40, 170);
  ctx.stroke();

  // Grid
  const gap = 12;
  const cellW = (W - 80 - gap * (cols - 1)) / cols;
  opts.rows.forEach((r, i) => {
    const cx = 40 + (i % cols) * (cellW + gap);
    const cy = gridTop + Math.floor(i / cols) * cellH;
    round(cx, cy, cellW, cellH - gap, 16);
    ctx.fillStyle = panel;
    ctx.fill();
    ctx.strokeStyle = line;
    ctx.stroke();

    ctx.fillStyle = mute;
    ctx.font = "400 14px system-ui, -apple-system, 'PingFang TC', sans-serif";
    ctx.fillText(r.label, cx + 16, cy + 30);

    ctx.fillStyle = i % 3 === 0 ? sky : i % 3 === 1 ? text : amber;
    ctx.font = "700 28px system-ui, -apple-system, 'PingFang TC', sans-serif";
    ctx.fillText(r.value, cx + 16, cy + 62);
  });

  if (opts.note) {
    const y = gridTop + rowsCount * cellH + 16;
    ctx.fillStyle = mute;
    ctx.font = "400 14px system-ui, -apple-system, 'PingFang TC', sans-serif";
    const words = opts.note.split("");
    let lineText = "";
    let ly = y;
    for (const ch of words) {
      if (ctx.measureText(lineText + ch).width > W - 80) {
        ctx.fillText(lineText, 40, ly);
        lineText = ch;
        ly += 22;
      } else lineText += ch;
    }
    ctx.fillText(lineText, 40, ly);
  }

  const url = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;
  a.download = opts.fileName;
  a.click();
}
