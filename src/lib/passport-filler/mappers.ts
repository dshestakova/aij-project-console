import type { ProjectDetail } from "@/types/project-registry";
import type { PassportFillerProjectInput } from "@/types/passport-filler";

export function mapProjectToPassportFillerInput(
  project: ProjectDetail,
): PassportFillerProjectInput {
  const problem = normalizeText(project.flagship_problem_description);
  const solution = normalizeText(project.flagship_solution_description);
  const functionality = normalizeText(project.flagship_ai_functionality);
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
    functionality ? `Ключевой функционал ИИ: ${functionality}` : "",
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
    analogs: "",
    client_effect: fundingStatus,
    sber_effect: funding,
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

function normalizeText(value: string | null | undefined) {
  return value?.trim() ?? "";
}
