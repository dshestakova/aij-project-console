type SourcePayload = Record<string, unknown>;

export type ProjectRegistryExportRow = {
  external_id: string | null;
  client: string | null;
  project_name: string | null;
  essence: string | null;
  progress: string | null;
  next_step: string | null;
  funding: string | null;
  funding_status: string | null;
  comment: string | null;
  is_flagship: boolean | null;
  is_archived: boolean | null;
  flagship_problem_description: string | null;
  flagship_solution_description: string | null;
  flagship_ai_functionality: string | null;
  flagship_description_uploaded: boolean | null;
  flagship_passport_uploaded: boolean | null;
  flagship_innovation_level: string | null;
  flagship_uploaded_to_prbr: boolean | null;
  flagship_approved_by_ca: boolean | null;
  source_payload: SourcePayload | null;
  cluster: { name: string | null } | Array<{ name: string | null }> | null;
  status: { name: string | null } | Array<{ name: string | null }> | null;
  flagship_status:
    | { name: string | null }
    | Array<{ name: string | null }>
    | null;
  csm:
    | { full_name: string | null }
    | Array<{ full_name: string | null }>
    | null;
  director:
    | { full_name: string | null }
    | Array<{ full_name: string | null }>
    | null;
  industry_unit:
    | { name: string | null }
    | Array<{ name: string | null }>
    | null;
};

const CSV_HEADERS = [
  "ID проекта",
  "Кластер",
  "№ в кластере",
  "№ исходный",
  "Клиент",
  "Название проекта",
  "Суть проекта",
  "Срок реализации",
  "Тип срока",
  "Прогресс реализации",
  "Статус",
  "Риск",
  "Причина риска",
  "Следующий шаг",
  "Финансирование",
  "Финансирование комментарий",
  "Спонсор проекта",
  "Партнер",
  "Статья/мероприятие",
  "CSM",
  "Директор",
  "Отраслевое управление",
  "Флагман",
  "Статус флагмана",
  "Описание проблемы",
  "Описание решения",
  "Ключевой функционал ИИ",
  "Инновационность",
  "Описание загружено",
  "Паспорт загружен",
  "Загружен на ПРБР",
  "Одобрен ЦА",
  "AIJ метка исходная",
  "Дата последнего обновления",
  "Обновил",
  "Архив",
  "Комментарий",
] as const;

export function buildProjectRegistryCsv(rows: ProjectRegistryExportRow[]) {
  const csvRows = [
    CSV_HEADERS,
    ...rows.map((project) => [
      cell(project.external_id),
      cell(getRelationName(project.cluster)),
      sourceCell(project.source_payload, ["№ в кластере"]),
      sourceCell(project.source_payload, ["№ исходный", "source_id"]),
      cell(project.client),
      cell(project.project_name),
      cell(project.essence),
      sourceCell(project.source_payload, ["Срок реализации"]),
      sourceCell(project.source_payload, ["Тип срока"]),
      cell(project.progress),
      cell(getRelationName(project.status)),
      sourceCell(project.source_payload, ["Риск"]),
      sourceCell(project.source_payload, ["Причина риска"]),
      cell(project.next_step),
      cell(project.funding_status),
      cell(project.funding),
      sourceCell(project.source_payload, ["Спонсор проекта"]),
      sourceCell(project.source_payload, ["Партнер"]),
      sourceCell(project.source_payload, ["Статья/мероприятие"]),
      cell(getPersonName(project.csm)),
      cell(getPersonName(project.director)),
      cell(getRelationName(project.industry_unit)),
      booleanCell(project.is_flagship),
      cell(getRelationName(project.flagship_status)),
      cell(project.flagship_problem_description),
      cell(project.flagship_solution_description),
      cell(project.flagship_ai_functionality),
      cell(project.flagship_innovation_level),
      booleanCell(project.flagship_description_uploaded),
      booleanCell(project.flagship_passport_uploaded),
      booleanCell(project.flagship_uploaded_to_prbr),
      booleanCell(project.flagship_approved_by_ca),
      sourceCell(project.source_payload, ["AIJ метка исходная"]),
      sourceCell(project.source_payload, [
        "Дата последнего обновления",
        "source_updated_at",
      ]),
      sourceCell(project.source_payload, ["Обновил"]),
      booleanCell(project.is_archived),
      cell(project.comment),
    ]),
  ];

  return `\uFEFF${csvRows.map(formatCsvRow).join("\r\n")}`;
}

export function getProjectRegistryExportFilename(date = new Date()) {
  return `aij-project-registry-${date.toISOString().slice(0, 10)}.csv`;
}

function sourceCell(payload: SourcePayload | null, keys: string[]) {
  if (!payload) {
    return "";
  }

  for (const key of keys) {
    const value = findSourceValue(payload, key);

    if (value !== "") {
      return value;
    }
  }

  return "";
}

function findSourceValue(payload: SourcePayload, key: string) {
  const directValue = payload[key];

  if (directValue !== undefined) {
    return cell(directValue);
  }

  const normalizedKey = normalizeKey(key);
  const matchedEntry = Object.entries(payload).find(
    ([payloadKey]) => normalizeKey(payloadKey) === normalizedKey,
  );

  return matchedEntry ? cell(matchedEntry[1]) : "";
}

function getRelationName(
  relation: { name: string | null } | Array<{ name: string | null }> | null,
) {
  return Array.isArray(relation) ? relation[0]?.name : relation?.name;
}

function getPersonName(
  relation:
    | { full_name: string | null }
    | Array<{ full_name: string | null }>
    | null,
) {
  return Array.isArray(relation) ? relation[0]?.full_name : relation?.full_name;
}

function booleanCell(value: boolean | null | undefined) {
  if (value === null || value === undefined) {
    return "";
  }

  return value ? "да" : "нет";
}

function cell(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function normalizeKey(value: string) {
  return value.trim().toLowerCase().replaceAll("ё", "е");
}

function formatCsvRow(row: readonly string[]) {
  return row.map(escapeCsvCell).join(",");
}

function escapeCsvCell(value: string) {
  if (!/[",\r\n]/.test(value)) {
    return value;
  }

  return `"${value.replaceAll('"', '""')}"`;
}
