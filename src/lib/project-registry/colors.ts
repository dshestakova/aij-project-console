import type { ColorKey } from "@/types/project-registry";

const badgeToneByColor: Record<string, string> = {
  amber: "border-amber-200 bg-amber-50 text-amber-800",
  blue: "border-sky-200 bg-sky-50 text-sky-800",
  cyan: "border-cyan-200 bg-cyan-50 text-cyan-800",
  gray: "border-slate-200 bg-slate-100 text-slate-700",
  green: "border-emerald-200 bg-emerald-50 text-emerald-800",
  indigo: "border-indigo-200 bg-indigo-50 text-indigo-800",
  rose: "border-rose-200 bg-rose-50 text-rose-800",
  slate: "border-slate-200 bg-slate-50 text-slate-800",
  violet: "border-violet-200 bg-violet-50 text-violet-800",
};

const accentByColor: Record<string, string> = {
  amber: "border-l-amber-300",
  blue: "border-l-sky-300",
  cyan: "border-l-cyan-300",
  gray: "border-l-slate-300",
  green: "border-l-emerald-300",
  indigo: "border-l-indigo-300",
  rose: "border-l-rose-300",
  slate: "border-l-slate-400",
  violet: "border-l-violet-300",
};

const chartToneByColor: Record<string, string> = {
  amber: "bg-amber-400",
  blue: "bg-sky-400",
  cyan: "bg-cyan-400",
  gray: "bg-slate-300",
  green: "bg-emerald-400",
  indigo: "bg-indigo-400",
  rose: "bg-rose-400",
  slate: "bg-slate-400",
  violet: "bg-violet-400",
};

export function getBadgeTone(colorKey: ColorKey | null | undefined) {
  return badgeToneByColor[colorKey ?? ""] ?? badgeToneByColor.gray;
}

export function getAccentTone(colorKey: ColorKey | null | undefined) {
  return accentByColor[colorKey ?? ""] ?? accentByColor.gray;
}

export function getChartTone(colorKey: ColorKey | null | undefined) {
  return chartToneByColor[colorKey ?? ""] ?? chartToneByColor.gray;
}
