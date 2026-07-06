export function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "не указано";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function getDisplayValue(value: string | null | undefined) {
  return value?.trim() ? value : "не указано";
}

export function getPreview(value: string | null | undefined, fallback = "Следующий шаг не указан") {
  if (!value?.trim()) {
    return fallback;
  }

  return value.length > 180 ? `${value.slice(0, 177)}...` : value;
}
