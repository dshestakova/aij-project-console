import type { ProjectDetail } from "@/types/project-registry";

export type ProjectApplicationType =
  | "traditional_ai"
  | "generative_ai"
  | "agentic_ai";

export type ProjectApplicationSection = {
  title: string;
  fields: Array<[string, string]>;
};

export const PROJECT_APPLICATION_REFERENCE_FILE =
  "НТехЛаб_предзаполненная_заявка_Генеративный_ИИ_2026.docx";

const applicationTypeLabels: Record<ProjectApplicationType, string> = {
  traditional_ai: "Традиционный ИИ",
  generative_ai: "Генеративный ИИ",
  agentic_ai: "Агентный ИИ",
};

const generativeMarkers = [
  "генератив",
  "gigachat",
  "llm",
  "большая языковая модель",
  "rag",
  "генерация текст",
  "генерация изображ",
  "суммаризац",
  "синтетические данные",
];

const agentCapabilityGroups = [
  ["цель", "целеполаган"],
  ["планиров", "перепланиров", "replan"],
  ["инструмент", "api", "tool calling", "function calling"],
  ["памят", "состояние", "state"],
  ["автоном", "без участия человека", "human-in-the-loop"],
];

export function getProjectApplicationTypeLabel(type: ProjectApplicationType) {
  return applicationTypeLabels[type];
}

export function classifyProjectApplication(
  project: ProjectDetail,
): ProjectApplicationType {
  const source = getClassificationSource(project);
  const agentCapabilities = agentCapabilityGroups.filter((markers) =>
    markers.some((marker) => source.includes(marker)),
  ).length;

  // Слова «агент» недостаточно: нужны хотя бы три признака автономного цикла.
  if (agentCapabilities >= 3) {
    return "agentic_ai";
  }

  if (generativeMarkers.some((marker) => source.includes(marker))) {
    return "generative_ai";
  }

  return "traditional_ai";
}

export function buildProjectApplicationSections(
  project: ProjectDetail,
  type: ProjectApplicationType,
): ProjectApplicationSection[] {
  return [
    {
      title: "Данные компании и проекта",
      fields: [
        ["Название вашей организации*", need("полное юридическое наименование организации")],
        ["ИНН вашей организации*", need("ИНН организации")],
        ["Ссылка на официальный сайт организации*", need("адрес официального сайта")],
        ["Телефон представителя организации*", need("прямой телефон ответственного за заявку")],
        ["Наименование проекта*", answer(project.project_name)],
        ["Официальный сайт проекта", clarify("публичную страницу, демо или иной доступный жюри ресурс")],
        ["Отрасль применения*", answer(project.industry_unit?.name)],
        ["Сфера применения решения*", answer(project.essence)],
        ["Презентация по официальному шаблону*", need("приложить презентацию проекта")],
      ],
    },
    {
      title: "Задача и решение",
      fields: [
        ["Какая бизнес-проблема решается с помощью технологии*", answer(project.flagship_problem_description ?? project.essence)],
        ["Описание решения*", answer(project.flagship_solution_description)],
        ["Текущий процесс до внедрения*", answer(project.flagship_current_process ?? project.flagship_client_current_state)],
        ["Функциональность ИИ*", answer(project.flagship_ai_functionality)],
        ["Целевые пользователи и охват*", joinAnswers(project.flagship_result_users, project.flagship_scope)],
      ],
    },
    getTypeSpecificSection(project, type),
    {
      title: "Эффект и подтверждение",
      fields: [
        ["Достигнутые типы эффекта*", need("выбрать только фактически достигнутые эффекты и указать источник")],
        ["Показатели эффекта в формате «% — период»*", need("значения до и после, период, выборку и источник каждой метрики")],
        ["Годовой экономический эффект, руб.*", need("эффект по доходам, расходам или трудозатратам, период и источник")],
        ["ROI и период окупаемости*", need("инвестиции, чистый эффект, формулу ROI и срок окупаемости")],
        ["Методика расчёта эффекта*", need("метрику, базу до внедрения, значение после, период, выборку, источник и формулу")],
        ["Независимое подтверждение эффекта", clarify("аудит, отчёт, письмо или оценку партнёра; дату, автора и показатели")],
        ["Потенциальные нефинансовые эффекты*", answer(project.flagship_client_usage)],
      ],
    },
    {
      title: "Внедрение, технологии и масштабирование",
      fields: [
        ["Срок внедрения*", clarify("фактическую дату старта и вывода в промышленную эксплуатацию")],
        ["Контур реализации*", clarify("облачный, локальный или гибридный контур и место размещения")],
        ["Формат реализации*", answer(project.flagship_client_usage)],
        ["Данные и КТС*", joinAnswers(project.flagship_available_data, project.flagship_tech_stack)],
        ["Аналоги в России и/или мире*", answer(project.flagship_competitors)],
        ["Неповторимые особенности решения*", answer(project.flagship_innovation_reason)],
        ["Потенциал масштабируемости*", clarify("сферы, отрасли, регионы и условия тиражирования")],
        ["Стадия проекта*", answer(project.flagship_status?.name ?? project.status?.name)],
        ["Год реализации*", clarify("год фактической реализации")],
      ],
    },
    {
      title: "Партнёры и AI-сообщество",
      fields: [
        ["Партнёры", `РАБОЧИЙ ОТВЕТ: Московский банк, ПАО Сбербанк. | ${clarify("роль, вклад, период участия и подтверждающий документ; затем других партнёров")}`],
        ["Вклад в развитие AI-сообщества", clarify("мероприятия, публикации, методические материалы и подтверждающие ссылки")],
      ],
    },
  ];
}

function getTypeSpecificSection(
  project: ProjectDetail,
  type: ProjectApplicationType,
): ProjectApplicationSection {
  if (type === "generative_ai") {
    return {
      title: "Вопросы категории «Генеративный ИИ»",
      fields: [
        ["Какие технологии генеративного ИИ применяются?*", answer(project.flagship_tech_stack ?? project.flagship_ai_functionality)],
        ["Что именно создаёт ИИ и как результат используется дальше?*", answer(project.flagship_ai_functionality ?? project.flagship_client_usage)],
        ["Принадлежность решения и название ИИ-модели*", clarify("собственная, отечественная или зарубежная разработка; модель, версию и право использования")],
        ["Сквозной сценарий от постановки цели до результата*", joinAnswers(project.flagship_current_process, project.flagship_client_usage)],
        ["Глубина кастомизации и донастройка модели*", clarify("промпты, RAG, схемы вывода, fine-tuning, валидацию и тесты качества")],
        ["Инновационный результат*", answer(project.flagship_innovation_reason)],
      ],
    };
  }

  if (type === "agentic_ai") {
    return {
      title: "Вопросы категории «Агентный ИИ»",
      fields: [
        ["Агентные технологии и базовая модель*", answer(project.flagship_tech_stack)],
        ["Какие задачи агент выполняет автономно, а какие — с человеком?*", answer(project.flagship_ai_functionality)],
        ["Уровень автономности и контрольные точки*", clarify("решения агента, границы полномочий, human-in-the-loop и эскалации")],
        ["Сквозной сценарий от цели до результата*", joinAnswers(project.flagship_current_process, project.flagship_client_usage)],
        ["Метрики автономности*", need("долю целей без вмешательства, число эскалаций, успешность вызова инструментов, период и выборку")],
        ["Инновационный результат*", answer(project.flagship_innovation_reason)],
      ],
    };
  }

  return {
    title: "Вопросы категории «Традиционный ИИ»",
    fields: [
      ["Функциональность и техническое решение*", joinAnswers(project.flagship_ai_functionality, project.flagship_tech_stack)],
      ["Класс технологии ИИ*", clarify("классификацию, распознавание, прогноз, ранжирование, анализ или иной класс")],
      ["Этапы масштабирования*", clarify("фактические этапы, площадки, охват и критерии перехода")],
      ["Инновационный результат*", answer(project.flagship_innovation_reason)],
    ],
  };
}

function answer(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized
    ? `РАБОЧИЙ ОТВЕТ: ${normalized}`
    : need("заполнить поле по фактам проекта");
}

function joinAnswers(...values: Array<string | null | undefined>) {
  const normalized = values.map((value) => value?.trim()).filter(Boolean);
  return normalized.length > 0
    ? `РАБОЧИЙ ОТВЕТ: ${normalized.join(" ")}`
    : need("заполнить поле по фактам проекта");
}

function need(instruction: string) {
  return `НУЖЕН ВВОД КЛИЕНТА: ${instruction}.`;
}

function clarify(instruction: string) {
  return `ДЛЯ КЛИЕНТА — УТОЧНИТЬ: ${instruction}.`;
}

function getClassificationSource(project: ProjectDetail) {
  return [
    project.project_name,
    project.essence,
    project.flagship_problem_description,
    project.flagship_solution_description,
    project.flagship_ai_functionality,
    project.flagship_client_current_state,
    project.flagship_current_process,
    project.flagship_scope,
    project.flagship_client_usage,
    project.flagship_result_users,
    project.flagship_tech_stack,
    project.flagship_available_data,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replaceAll("ё", "е");
}
