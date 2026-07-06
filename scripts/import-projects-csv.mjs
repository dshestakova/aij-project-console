#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import path from "node:path";

const columnAliases = {
  external_id: ["external_id", "id проекта", "id", "project_id", "код", "номер", "№"],
  external_id_fallback: ["№ исходный", "номер исходный", "source_id"],
  client: ["client", "клиент", "компания", "заказчик"],
  project_name: ["project_name", "project", "название проекта", "название", "проект"],
  cluster: ["cluster", "кластер"],
  status: ["status", "статус"],
  is_flagship: ["is_flagship", "flagship", "флагман", "флагманский"],
  flagship_status: ["flagship_status", "статус флагмана", "флагман статус"],
  csm: ["csm", "цсм", "customer success", "customer_success"],
  director: ["director", "директор"],
  industry_unit: ["industry_unit", "отраслевое управление", "оуправление"],
  essence: ["essence", "суть", "суть проекта"],
  progress: ["progress", "прогресс реализации", "прогресс"],
  next_step: ["next_step", "следующий шаг", "next step"],
  funding: ["funding", "финансирование"],
  funding_status: ["funding_status", "финансирование статус", "статус финансирования"],
  funding_comment: ["финансирование комментарий", "funding_comment"],
  comment: ["comment", "комментарий"],
  is_archived: ["is_archived", "archive", "archived", "архив", "архивный"],
  source_updated_at: ["дата последнего обновления", "source_updated_at"],
};

const requiredColumns = ["external_id"];
const projectColumns = [
  "external_id",
  "external_id_fallback",
  "client",
  "project_name",
  "cluster",
  "status",
  "is_flagship",
  "flagship_status",
  "csm",
  "director",
  "industry_unit",
  "essence",
  "progress",
  "next_step",
  "funding",
  "funding_status",
  "funding_comment",
  "comment",
  "is_archived",
  "source_updated_at",
];

function printHelp() {
  console.log(`
CSV import for AIJ Project Console

Usage:
  npm run import:projects -- --file /path/to/projects.csv --dry-run
  npm run import:projects -- --file /path/to/projects.csv --import

Options:
  --file <path>   CSV file to read.
  --dry-run       Validate and print a summary without database writes. Default.
  --import        Write to Supabase after validation.
  --validate-csv-only
                  Check CSV headers and required external_id fallback without
                  reading Supabase or writing to the database.
  --help          Show this help.
`);
}

function parseArgs(argv) {
  const args = {
    file: "",
    mode: "dry-run",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--help") {
      args.help = true;
    } else if (arg === "--dry-run") {
      args.mode = "dry-run";
    } else if (arg === "--import") {
      args.mode = "import";
    } else if (arg === "--validate-csv-only") {
      args.mode = "validate-csv-only";
    } else if (arg === "--file") {
      args.file = argv[index + 1] ?? "";
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return args;
}

async function loadLocalEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");

  try {
    const envText = await readFile(envPath, "utf8");

    for (const line of envText.split(/\r?\n/)) {
      const trimmedLine = line.trim();

      if (!trimmedLine || trimmedLine.startsWith("#")) {
        continue;
      }

      const separatorIndex = trimmedLine.indexOf("=");

      if (separatorIndex === -1) {
        continue;
      }

      const key = trimmedLine.slice(0, separatorIndex).trim();
      const rawValue = trimmedLine.slice(separatorIndex + 1).trim();
      const value = rawValue.replace(/^["']|["']$/g, "");

      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }
}

function normalizeName(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function normalizeValue(value) {
  const normalizedValue = String(value ?? "").trim();
  return normalizedValue || null;
}

function parseBoolean(value) {
  const normalizedValue = normalizeName(value);

  if (!normalizedValue) {
    return false;
  }

  const falseValues = ["0", "false", "no", "n", "нет", "ложь", "-"];
  const trueValues = ["1", "true", "yes", "y", "да", "истина", "x", "+"];

  if (falseValues.includes(normalizedValue)) {
    return false;
  }

  if (trueValues.includes(normalizedValue)) {
    return true;
  }

  return normalizedValue.length > 0;
}

function parseSourceUpdatedAt(value) {
  if (!value) {
    return null;
  }

  const trimmedValue = value.trim();
  const dateOnlyMatch = trimmedValue.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);

  if (dateOnlyMatch) {
    const [, rawDay, rawMonth, rawYear] = dateOnlyMatch;
    const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;
    const parsedDate = new Date(
      Date.UTC(Number(year), Number(rawMonth) - 1, Number(rawDay)),
    );

    if (!Number.isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString();
    }
  }

  const parsedDate = new Date(trimmedValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate.toISOString();
}

function parseCsv(csvText) {
  const rows = [];
  let field = "";
  let row = [];
  let isQuoted = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];
    const nextChar = csvText[index + 1];

    if (char === '"' && isQuoted && nextChar === '"') {
      field += '"';
      index += 1;
    } else if (char === '"') {
      isQuoted = !isQuoted;
    } else if (char === "," && !isQuoted) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !isQuoted) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }

      row.push(field);
      rows.push(row);
      field = "";
      row = [];
    } else {
      field += char;
    }
  }

  if (field || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const [rawHeaders, ...rawRows] = rows.filter((items) =>
    items.some((item) => item.trim()),
  );

  if (!rawHeaders) {
    return [];
  }

  const headers = rawHeaders.map((header) => header.replace(/^\uFEFF/, "").trim());

  return rawRows.map((items, rowIndex) => {
    const record = {
      __rowNumber: rowIndex + 2,
    };

    headers.forEach((header, headerIndex) => {
      record[header] = items[headerIndex] ?? "";
    });

    return record;
  });
}

function getCanonicalValue(record, canonicalName) {
  const aliases = columnAliases[canonicalName] ?? [canonicalName];
  const entries = Object.entries(record);

  for (const alias of aliases) {
    const normalizedAlias = normalizeName(alias);
    const match = entries.find(
      ([key]) => normalizeName(key) === normalizedAlias,
    );

    if (match) {
      return normalizeValue(match[1]);
    }
  }

  return null;
}

function normalizeCsvRow(record) {
  const normalized = {
    __rowNumber: record.__rowNumber,
    source_payload: Object.fromEntries(
      Object.entries(record).filter(([key]) => key !== "__rowNumber"),
    ),
  };

  for (const column of projectColumns) {
    normalized[column] = getCanonicalValue(record, column);
  }

  normalized.external_id =
    normalized.external_id ?? normalized.external_id_fallback;
  normalized.funding = normalized.funding_comment ?? normalized.funding;
  normalized.is_flagship = parseBoolean(normalized.is_flagship);
  normalized.is_archived = parseBoolean(normalized.is_archived);
  normalized.updated_at = parseSourceUpdatedAt(normalized.source_updated_at);

  return normalized;
}

async function getReferenceRows(supabase, tableName, columns = "id, name") {
  const { data, error } = await supabase.from(tableName).select(columns);

  if (error) {
    throw new Error(`Failed to read ${tableName}: ${error.message}`);
  }

  return data ?? [];
}

function buildNameMap(rows, nameField = "name") {
  return new Map(rows.map((row) => [normalizeName(row[nameField]), row]));
}

function buildPeopleMap(rows) {
  return new Map(
    rows.map((row) => [
      `${row.person_type}:${normalizeName(row.full_name)}`,
      row,
    ]),
  );
}

function addUnique(map, key, value) {
  if (!value) {
    return;
  }

  const normalizedValue = normalizeName(value);

  if (!normalizedValue) {
    return;
  }

  if (!map.has(normalizedValue)) {
    map.set(normalizedValue, {
      key: normalizedValue,
      value,
      rows: [],
    });
  }

  map.get(normalizedValue).rows.push(key);
}

function validateRows(rows, references) {
  const issues = [];
  const missingClusters = new Map();
  const missingStatuses = new Map();
  const missingFlagshipStatuses = new Map();
  const missingPeople = new Map();
  const missingIndustryUnits = new Map();
  const externalIds = new Map();

  for (const row of rows) {
    for (const column of requiredColumns) {
      if (!row[column]) {
        issues.push(`Row ${row.__rowNumber}: missing required field ${column}`);
      }
    }

    if (row.external_id) {
      const normalizedExternalId = normalizeName(row.external_id);

      if (externalIds.has(normalizedExternalId)) {
        issues.push(
          `Row ${row.__rowNumber}: duplicate external_id "${row.external_id}" also appears in row ${externalIds.get(
            normalizedExternalId,
          )}`,
        );
      } else {
        externalIds.set(normalizedExternalId, row.__rowNumber);
      }
    }

    if (row.cluster && !references.clusters.has(normalizeName(row.cluster))) {
      addUnique(missingClusters, row.__rowNumber, row.cluster);
    }

    if (row.status && !references.statuses.has(normalizeName(row.status))) {
      addUnique(missingStatuses, row.__rowNumber, row.status);
    }

    if (
      row.flagship_status &&
      !references.flagshipStatuses.has(normalizeName(row.flagship_status))
    ) {
      addUnique(missingFlagshipStatuses, row.__rowNumber, row.flagship_status);
    }

    if (row.flagship_status && !row.is_flagship) {
      issues.push(
        `Row ${row.__rowNumber}: flagship_status is set but is_flagship is not true`,
      );
    }

    if (
      row.csm &&
      !references.people.has(`csm:${normalizeName(row.csm)}`)
    ) {
      addUnique(missingPeople, row.__rowNumber, `csm:${row.csm}`);
    }

    if (
      row.director &&
      !references.people.has(`director:${normalizeName(row.director)}`)
    ) {
      addUnique(missingPeople, row.__rowNumber, `director:${row.director}`);
    }

    if (
      row.industry_unit &&
      !references.industryUnits.has(normalizeName(row.industry_unit))
    ) {
      addUnique(missingIndustryUnits, row.__rowNumber, row.industry_unit);
    }
  }

  return {
    issues,
    missingClusters: [...missingClusters.values()],
    missingStatuses: [...missingStatuses.values()],
    missingFlagshipStatuses: [...missingFlagshipStatuses.values()],
    missingPeople: [...missingPeople.values()],
    missingIndustryUnits: [...missingIndustryUnits.values()],
  };
}

function printValidationSummary(rows, validation, mode) {
  console.log(`Mode: ${mode}`);
  console.log(`Rows found: ${rows.length}`);
  console.log(`Rows with external_id: ${rows.filter((row) => row.external_id).length}`);
  console.log("");

  if (validation.issues.length > 0) {
    console.log("Blocking validation issues:");
    validation.issues.forEach((issue) => console.log(`- ${issue}`));
    console.log("");
  }

  printMissing("Unmatched clusters", validation.missingClusters);
  printMissing("Unmatched project statuses", validation.missingStatuses);
  printMissing("Unmatched flagship statuses", validation.missingFlagshipStatuses);
  printMissing("People to create in import mode", validation.missingPeople);
  printMissing("Industry units to create in import mode", validation.missingIndustryUnits);
}

function validateCsvOnly(rows) {
  const issues = [];
  const externalIds = new Map();

  for (const row of rows) {
    if (!row.external_id) {
      issues.push(
        `Row ${row.__rowNumber}: missing required field external_id; expected "ID проекта" or fallback "№ исходный"`,
      );
      continue;
    }

    const normalizedExternalId = normalizeName(row.external_id);

    if (externalIds.has(normalizedExternalId)) {
      issues.push(
        `Row ${row.__rowNumber}: duplicate external_id "${row.external_id}" also appears in row ${externalIds.get(
          normalizedExternalId,
        )}`,
      );
    } else {
      externalIds.set(normalizedExternalId, row.__rowNumber);
    }
  }

  return {
    issues,
    missingClusters: [],
    missingStatuses: [],
    missingFlagshipStatuses: [],
    missingPeople: [],
    missingIndustryUnits: [],
  };
}

function printMissing(title, items) {
  if (items.length === 0) {
    return;
  }

  console.log(`${title}:`);

  for (const item of items) {
    console.log(`- ${item.value} (rows: ${item.rows.join(", ")})`);
  }

  console.log("");
}

function hasBlockingIssues(validation) {
  return (
    validation.issues.length > 0 ||
    validation.missingClusters.length > 0 ||
    validation.missingStatuses.length > 0 ||
    validation.missingFlagshipStatuses.length > 0
  );
}

async function createMissingPeople(supabase, missingPeople) {
  if (missingPeople.length === 0) {
    return [];
  }

  const rowsToInsert = missingPeople.map((item) => {
    const [personType, ...nameParts] = item.value.split(":");
    return {
      full_name: nameParts.join(":").trim(),
      person_type: personType,
      is_active: true,
    };
  });

  const { data, error } = await supabase
    .from("people")
    .insert(rowsToInsert)
    .select("id, full_name, person_type");

  if (error) {
    throw new Error(`Failed to create people: ${error.message}`);
  }

  return data ?? [];
}

async function createMissingIndustryUnits(supabase, missingIndustryUnits) {
  if (missingIndustryUnits.length === 0) {
    return [];
  }

  const rowsToInsert = missingIndustryUnits.map((item) => ({
    name: item.value,
    is_active: true,
  }));

  const { data, error } = await supabase
    .from("industry_units")
    .upsert(rowsToInsert, { onConflict: "name" })
    .select("id, name");

  if (error) {
    throw new Error(`Failed to create industry units: ${error.message}`);
  }

  return data ?? [];
}

function buildProjectPayload(row, references) {
  const status = row.status
    ? references.statuses.get(normalizeName(row.status))
    : null;
  const cluster = row.cluster
    ? references.clusters.get(normalizeName(row.cluster))
    : null;
  const flagshipStatus = row.flagship_status
    ? references.flagshipStatuses.get(normalizeName(row.flagship_status))
    : null;
  const csm = row.csm
    ? references.people.get(`csm:${normalizeName(row.csm)}`)
    : null;
  const director = row.director
    ? references.people.get(`director:${normalizeName(row.director)}`)
    : null;
  const industryUnit = row.industry_unit
    ? references.industryUnits.get(normalizeName(row.industry_unit))
    : null;

  return {
    external_id: row.external_id,
    client: row.client,
    project_name: row.project_name,
    cluster_id: cluster?.id ?? null,
    status_id: status?.id ?? null,
    is_flagship: row.is_flagship,
    flagship_status_id: row.is_flagship ? flagshipStatus?.id ?? null : null,
    csm_id: csm?.id ?? null,
    director_id: director?.id ?? null,
    industry_unit_id: industryUnit?.id ?? null,
    essence: row.essence,
    progress: row.progress,
    next_step: row.next_step,
    funding: row.funding,
    funding_status: row.funding_status,
    comment: row.comment,
    is_archived: row.is_archived,
    source_payload: row.source_payload,
    ...(row.updated_at ? { updated_at: row.updated_at } : {}),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return;
  }

  if (!args.file) {
    throw new Error("Missing --file path.");
  }

  const csvPath = path.resolve(process.cwd(), args.file);
  const csvText = await readFile(csvPath, "utf8");
  const rows = parseCsv(csvText).map(normalizeCsvRow);

  if (rows.length === 0) {
    throw new Error("CSV has no data rows to import.");
  }

  if (args.mode === "validate-csv-only") {
    const validation = validateCsvOnly(rows);
    printValidationSummary(rows, validation, args.mode);

    if (validation.issues.length > 0) {
      throw new Error("CSV-only validation failed.");
    }

    console.log("CSV-only validation finished. No database reads or writes were made.");
    return;
  }

  await loadLocalEnv();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseSecretKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local.",
    );
  }

  const supabase = createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      persistSession: false,
    },
  });

  const [clusters, statuses, flagshipStatuses, people, industryUnits] =
    await Promise.all([
      getReferenceRows(supabase, "clusters", "id, name"),
      getReferenceRows(supabase, "project_statuses", "id, name"),
      getReferenceRows(supabase, "flagship_statuses", "id, name"),
      getReferenceRows(supabase, "people", "id, full_name, person_type"),
      getReferenceRows(supabase, "industry_units", "id, name"),
    ]);

  const references = {
    clusters: buildNameMap(clusters),
    statuses: buildNameMap(statuses),
    flagshipStatuses: buildNameMap(flagshipStatuses),
    people: buildPeopleMap(people),
    industryUnits: buildNameMap(industryUnits),
  };

  let validation = validateRows(rows, references);
  printValidationSummary(rows, validation, args.mode);

  if (hasBlockingIssues(validation)) {
    throw new Error("Import stopped because blocking validation issues exist.");
  }

  if (args.mode === "dry-run") {
    console.log("Dry-run finished. No database writes were made.");
    return;
  }

  const createdPeople = await createMissingPeople(
    supabase,
    validation.missingPeople,
  );
  const createdIndustryUnits = await createMissingIndustryUnits(
    supabase,
    validation.missingIndustryUnits,
  );

  for (const row of createdPeople) {
    references.people.set(
      `${row.person_type}:${normalizeName(row.full_name)}`,
      row,
    );
  }

  for (const row of createdIndustryUnits) {
    references.industryUnits.set(normalizeName(row.name), row);
  }

  validation = validateRows(rows, references);

  if (hasBlockingIssues(validation)) {
    printValidationSummary(rows, validation, args.mode);
    throw new Error("Import stopped after creating references.");
  }

  const projectPayload = rows.map((row) => buildProjectPayload(row, references));
  const { error } = await supabase
    .from("projects")
    .upsert(projectPayload, { onConflict: "external_id" });

  if (error) {
    throw new Error(`Failed to upsert projects: ${error.message}`);
  }

  console.log(`Import finished. Projects upserted: ${projectPayload.length}`);
  console.log(`People created: ${createdPeople.length}`);
  console.log(`Industry units created: ${createdIndustryUnits.length}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
