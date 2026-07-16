import type { ColorKey } from "@/types/project-registry";

const badgeToneByColor: Record<string, string> = {
  amber: "border-amber-200 bg-amber-50 text-amber-800",
  blue: "border-sky-200 bg-sky-50 text-sky-800",
  "blue-gray": "border-slate-300 bg-slate-100 text-slate-800",
  "blue-violet": "border-indigo-200 bg-indigo-50 text-indigo-800",
  cyan: "border-cyan-200 bg-cyan-50 text-cyan-800",
  gray: "border-slate-200 bg-slate-100 text-slate-700",
  green: "border-emerald-200 bg-emerald-50 text-emerald-800",
  indigo: "border-indigo-200 bg-indigo-50 text-indigo-800",
  navy: "border-slate-400 bg-slate-100 text-slate-950",
  orange: "border-orange-200 bg-orange-50 text-orange-800",
  rose: "border-rose-200 bg-rose-50 text-rose-800",
  slate: "border-slate-200 bg-slate-50 text-slate-800",
  teal: "border-teal-200 bg-teal-50 text-teal-800",
  violet: "border-violet-200 bg-violet-50 text-violet-800",
};

const accentByColor: Record<string, string> = {
  amber: "border-l-amber-300",
  blue: "border-l-sky-300",
  "blue-gray": "border-l-slate-400",
  "blue-violet": "border-l-indigo-400",
  cyan: "border-l-cyan-300",
  gray: "border-l-slate-300",
  green: "border-l-emerald-300",
  indigo: "border-l-indigo-300",
  navy: "border-l-slate-700",
  orange: "border-l-orange-300",
  rose: "border-l-rose-300",
  slate: "border-l-slate-400",
  teal: "border-l-teal-300",
  violet: "border-l-violet-300",
};

const chartToneByColor: Record<string, string> = {
  amber: "bg-amber-400",
  blue: "bg-sky-400",
  "blue-gray": "bg-slate-500",
  "blue-violet": "bg-indigo-500",
  cyan: "bg-cyan-400",
  gray: "bg-slate-300",
  green: "bg-emerald-400",
  indigo: "bg-indigo-400",
  navy: "bg-slate-800",
  orange: "bg-orange-400",
  rose: "bg-rose-400",
  slate: "bg-slate-400",
  teal: "bg-teal-400",
  violet: "bg-violet-400",
};

const chartColorByKey: Record<string, string> = {
  amber: "#f59e0b",
  blue: "#0284c7",
  "blue-gray": "#475569",
  "blue-violet": "#4f46e5",
  cyan: "#0891b2",
  gray: "#94a3b8",
  green: "#059669",
  indigo: "#4f46e5",
  navy: "#1e293b",
  orange: "#ea580c",
  rose: "#e11d48",
  slate: "#64748b",
  teal: "#0d9488",
  violet: "#7c3aed",
};

const statusColorByName: Record<string, string> = {
  "идея/кп": chartColorByKey.amber,
  "уточнение тз": chartColorByKey.blue,
  "в разработке": chartColorByKey.violet,
  "внедрен в прод": chartColorByKey.green,
  "внедрен в промышленную эксплуатацию": chartColorByKey.green,
  "факт оплаты": chartColorByKey.teal,
  "на паузе": chartColorByKey.slate,
  опасно: "#dc2626",
};

const industryUnitColorByName: Record<string, ColorKey> = {
  "сфера услуг": "cyan",
  торговля: "green",
  промышленность: "violet",
  недвижимость: "orange",
  производство: "indigo",
  инфраструктура: "teal",
  социальный: "rose",
  скм: "blue-violet",
  транспорт: "blue-gray",
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

export function getChartColor(colorKey: ColorKey | null | undefined) {
  return chartColorByKey[colorKey ?? ""] ?? chartColorByKey.gray;
}

export function getStatusChartColor(
  name: string | null | undefined,
  colorKey: ColorKey | null | undefined,
) {
  const normalizedName = normalizeColorName(name);

  if (normalizedName === "опасно") {
    return statusColorByName[normalizedName];
  }

  return colorKey
    ? getChartColor(colorKey)
    : statusColorByName[normalizedName] ?? chartColorByKey.gray;
}

export function getIndustryUnitColorKey(
  name: string | null | undefined,
  colorKey: ColorKey | null | undefined,
) {
  return industryUnitColorByName[name?.trim().toLowerCase() ?? ""] ?? colorKey;
}

function normalizeColorName(value: string | null | undefined) {
  return value?.trim().toLowerCase().replaceAll("ё", "е") ?? "";
}
