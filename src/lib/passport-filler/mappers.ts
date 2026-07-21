import type { ProjectDetail } from "@/types/project-registry";
import type {
  PassportFillerProjectInput,
  PassportFillerProjectState,
} from "@/types/passport-filler";

export type FlagshipNarrativeAutofillFields = {
  flagship_problem_description: string | null;
  flagship_solution_description: string | null;
  flagship_ai_functionality: string | null;
};

export function mapProjectToPassportFillerInput(
  project: ProjectDetail,
): PassportFillerProjectInput {
  const problem = normalizeText(project.flagship_problem_description);
  const solution = normalizeText(project.flagship_solution_description);
  const functionality = normalizeText(project.flagship_ai_functionality);
  const currentProcess = normalizeText(project.flagship_current_process);
  const clientUsage = normalizeText(project.flagship_client_usage);
  const techStack = normalizeText(project.flagship_tech_stack);
  const clientCurrentState = normalizeText(project.flagship_client_current_state);
  const scope = normalizeText(project.flagship_scope);
  const resultUsers = normalizeText(project.flagship_result_users);
  const availableData = normalizeText(project.flagship_available_data);
  const uncertainData = normalizeText(project.flagship_uncertain_data);
  const outOfScope = normalizeText(project.flagship_out_of_scope);
  const competitors = normalizeText(project.flagship_competitors);
  const essence = normalizeText(project.essence);
  const progress = normalizeText(project.progress);
  const nextStep = normalizeText(project.next_step);
  const fundingStatus = normalizeText(project.funding_status);
  const funding = normalizeText(project.funding);
  const comment = normalizeText(project.comment);

  const rawSourceParts = [
    `Внешний ID: ${project.external_id}`,
    project.client ? `Клиент: ${project.client}` : "",
    project.project_name ? `Название проекта: ${project.project_name}` : "",
    essence ? `Суть проекта: ${essence}` : "",
    progress ? `Прогресс: ${progress}` : "",
    nextStep ? `Следующий шаг: ${nextStep}` : "",
    fundingStatus ? `Статус финансирования: ${fundingStatus}` : "",
    funding ? `Комментарий по финансированию: ${funding}` : "",
    comment ? `Комментарий: ${comment}` : "",
    problem ? `Описание проблемы: ${problem}` : "",
    solution ? `Описание решения: ${solution}` : "",
    functionality
      ? `Функциональность GenAI / AI (поле UI, не путать со стеком): ${functionality}`
      : "",
    techStack ? `Технический стек: ${techStack}` : "",
    currentProcess ? `Как выглядит текущий процесс: ${currentProcess}` : "",
    clientUsage ? `Как и для чего клиент это использует: ${clientUsage}` : "",
    clientCurrentState ? `Текущее состояние у клиента: ${clientCurrentState}` : "",
    scope ? `Объём проекта: ${scope}` : "",
    resultUsers ? `Кто пользуется результатом: ${resultUsers}` : "",
    availableData ? `Какие данные доступны: ${availableData}` : "",
    uncertainData ? `Какие данные под вопросом: ${uncertainData}` : "",
    outOfScope ? `Что точно не делаем: ${outOfScope}` : "",
    competitors ? `Конкуренты / аналоги: ${competitors}` : "",
  ].filter(Boolean);

  return {
    project_name:
      normalizeText(project.project_name) ||
      normalizeText(project.external_id) ||
      "Проект AIJ",
    client_name: normalizeText(project.client),
    industry: normalizeText(project.industry_unit?.name),
    csm_name: normalizeText(project.csm?.full_name),
    tb_gosb: "",
    segment: "",
    esg_type: "",
    start_period: "",
    end_period: "",
    core_impact: essence || progress,
    problem,
    solution,
    functionality,
    analogs: competitors,
    client_effect: fundingStatus,
    sber_effect: funding,
    current_process: currentProcess,
    client_usage: clientUsage,
    tech_stack: techStack,
    raw_source_text: rawSourceParts.join("\n"),
  };
}

export function mapPassportFillerRatingToInnovationLevel(
  rating: string | null | undefined,
): ProjectDetail["flagship_innovation_level"] {
  if (!rating) {
    return null;
  }

  const normalized = rating.trim().toLowerCase();
  if (normalized.includes("high") || normalized.includes("высок")) {
    return "высокий";
  }
  if (normalized.includes("medium") || normalized.includes("сред")) {
    return "средний";
  }
  if (normalized.includes("low") || normalized.includes("низ")) {
    return "низкий";
  }

  return null;
}

export function formatInnovateAssessmentReason(assessment: {
  rating_reason?: string | null;
  path_to_high?: string[] | null;
} | null | undefined): string | null {
  if (!assessment) {
    return null;
  }

  const reason = normalizeText(assessment.rating_reason);
  const pathItems = (assessment.path_to_high ?? [])
    .map((item) => normalizeText(String(item ?? "")))
    .filter(Boolean);

  const parts: string[] = [];
  if (reason) {
    parts.push(reason);
  }
  if (pathItems.length > 0) {
    parts.push(
      ["Что нужно для высокой оценки:", ...pathItems.map((item) => `• ${item}`)].join(
        "\n",
      ),
    );
  }

  const text = parts.join("\n\n").trim();
  return text || null;
}

function normalizeText(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function pickPassportFillerText(
  state: PassportFillerProjectState,
  key: keyof PassportFillerProjectInput,
): string {
  const passportJson = state.passport_json;
  if (passportJson && typeof passportJson[key] === "string") {
    const fromPassport = passportJson[key]?.trim();
    if (fromPassport) {
      return fromPassport;
    }
  }

  const working = state.working?.[key];
  if (typeof working === "string" && working.trim()) {
    return working.trim();
  }

  const source = state.source?.[key];
  if (typeof source === "string" && source.trim()) {
    return source.trim();
  }

  return "";
}

export function mapPassportFillerStateToFlagshipNarrativeFields(
  state: PassportFillerProjectState,
): FlagshipNarrativeAutofillFields {
  const problem = pickPassportFillerText(state, "problem");
  const solution = pickPassportFillerText(state, "solution");
  const functionality = pickPassportFillerText(state, "functionality");

  return {
    flagship_problem_description: problem || null,
    flagship_solution_description: solution || null,
    flagship_ai_functionality: functionality || null,
  };
}
