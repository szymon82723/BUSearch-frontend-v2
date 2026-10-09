import { tramLines } from "./city";

const LINE_COLOR_PALETTE = [
  "#ec4899", "#14b8a6", "#a855f7", "#eab308", "#3b82f6", "#f97316", "#06b6d4",
  "#84cc16", "#f43f5e", "#8b5cf6", "#0ea5e9", "#d946ef", "#65a30d", "#fb7185",
  "#2dd4bf", "#facc15", "#818cf8", "#fb923c", "#4ade80", "#e879f9", "#38bdf8",
  "#c084fc", "#a3e635"
];

export function colorForLine(line: string): string {
  const s = String(line ?? "").trim();
  if (tramLines.has(s)) return "#ef4444";
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  return LINE_COLOR_PALETTE[hash % LINE_COLOR_PALETTE.length];
}

