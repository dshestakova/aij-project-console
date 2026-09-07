import type { ProjectDetail } from "@/types/project-registry";

export type ProjectApplicationType =
  | "traditional_ai"
  | "generative_ai"
  | "agentic_ai";

export type ProjectApplicationSection = {
  title: string;
  fields: Array<[string, string]>;
};

export type ProjectApplicationAnswerStatus =
  | "confirmed"
  | "working"
  | "clarify"
  | "required";

export type ProjectApplicationFieldDefinition = {
  id: string;
  question: string;
  required: boolean;
  fallback: (project: ProjectDetail) => string;
};

export type ProjectApplicationTemplate = {
  type: ProjectApplicationType;
  name: string;
  sections: Array<{
    title: string;
    fields: ProjectApplicationFieldDefinition[];
  }>;
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

const field = (
  id: string,
  question: string,
  required: boolean,
  fallback: ProjectApplicationFieldDefinition["fallback"],
): ProjectApplicationFieldDefinition => ({ id, question, required, fallback });

const companyAndProjectFields: ProjectApplicationFieldDefinition[] = [
  field("organization_name", "Название вашей организации*", true, (project) =>
    answer(project.client, "полное юридическое наименование организации"),
  ),
  field("organization_inn", "ИНН вашей организации*", true, (project) =>
    answer(findInn(project), "ИНН организации"),
  ),
  field(
    "organization_website",
    "Ссылка на официальный сайт организации*",
    true,
    (project) => answer(findUrl(project), "адрес официального сайта организации"),
  ),
  field(
    "representative_phone",
    "Телефон представителя организации*",
    true,
    (project) => answer(findPhone(project), "прямой телефон ответственного за заявку"),
  ),
  field("project_name", "Наименование проекта*", true, (project) =>
    answer(project.project_name, "официальное название проекта"),
  ),
  field("project_website", "Официальный сайт проекта", false, () =>
    clarify("публичную страницу, демо или иной доступный жюри ресурс"),
  ),
  field("industry", "В какой отрасли применяется решение*", true, (project) =>
    answer(project.industry_unit?.name, "ключевую отрасль применения"),
  ),
  field(
    "application_scope",
    "К какой сфере применения относится решение?*",
    true,
    (project) => answer(project.essence, "сферу применения решения"),
  ),
  field(
    "presentation",
    "Презентация о проекте по официальному шаблону*",
    true,
    () => need("приложить презентацию проекта в официальном шаблоне"),
  ),
];

const problemFields: ProjectApplicationFieldDefinition[] = [
  field(
    "business_problem",
    "Какая бизнес-проблема решается с помощью технологии*",
    true,
    (project) =>
      answer(
        project.flagship_problem_description ?? project.essence,
        "описать бизнес-проблему, исходный процесс и последствия",
      ),
  ),
];

const generativeFields: ProjectApplicationFieldDefinition[] = [
  field(
    "generative_technologies",
    "Какие технологии генеративного ИИ применяются в проекте?*",
    true,
    (project) =>
      answer(
        project.flagship_tech_stack ?? project.flagship_ai_functionality,
        "модель, RAG, промптинг, дообучение и другие применяемые технологии",
      ),
  ),
  field(
    "generative_role",
    "Опишите, какую роль генеративный ИИ играет в продукте — что именно он создает и как это используется дальше*",
    true,
    (project) =>
      answer(
        project.flagship_ai_functionality ?? project.flagship_client_usage,
        "создаваемый результат и его дальнейшее использование",
      ),
  ),
  field(
    "model_ownership",
    "Укажите принадлежность решения (собственная разработка / отечественное решение / зарубежное решение) и название используемой ИИ-модели*",
    true,
    (project) =>
      answerWithClarification(
        joinAnswers(project.flagship_solution_description, project.flagship_tech_stack),
        "принадлежность прикладного решения, название и версию модели, право использования",
      ),
  ),
  field(
    "generative_scenario",
    "Приведите пример сценария применения технологии в проекте — от постановки цели до результата*",
    true,
    (project) =>
      answerWithClarification(
        joinAnswers(project.flagship_current_process, project.flagship_client_usage),
        "входные данные, шаги системы, проверку человеком и итоговое бизнес-действие",
      ),
  ),
  field(
    "model_customization",
    "Укажите глубину кастомизации модели и опишите процесс донастройки модели под конкретный проект*",
    true,
    (project) =>
      answerWithClarification(
        joinAnswers(project.flagship_ai_functionality, project.flagship_tech_stack),
        "промпты, RAG, схемы вывода, fine-tuning, валидацию и тесты качества",
      ),
  ),
];

const agenticFields: ProjectApplicationFieldDefinition[] = [
  field("agent_technologies", "Агентные технологии и базовая модель*", true, (project) =>
    answer(project.flagship_tech_stack, "агентный стек, базовую модель и инструменты"),
  ),
  field(
    "agent_tasks",
    "Какие задачи агент выполняет автономно, а какие — с участием человека?*",
    true,
    (project) =>
      answerWithClarification(
        answer(project.flagship_ai_functionality, "автономные задачи агента"),
        "задачи человека, границы полномочий и условия эскалации",
      ),
  ),
  field("agent_autonomy", "Уровень автономности и точки человеческого контроля*", true, () =>
    clarify("решения агента, границы полномочий, human-in-the-loop и эскалации"),
  ),
  field("agent_scenario", "Сквозной сценарий от цели до результата*", true, (project) =>
    answerWithClarification(
      joinAnswers(project.flagship_current_process, project.flagship_client_usage),
      "постановку цели, план, инструменты/API, память, перепланирование, результат и контроль человека",
    ),
  ),
  field("agent_metrics", "Приблизительные метрики автономной работы*", true, () =>
    need("долю целей без вмешательства, частоту вмешательств и эскалаций, период и выборку"),
  ),
];

const traditionalFields: ProjectApplicationFieldDefinition[] = [
  field("traditional_functionality", "Функционал и технологическое решение*", true, (project) =>
    joinAnswers(project.flagship_ai_functionality, project.flagship_solution_description),
  ),
  field("traditional_technologies", "Какие технологии ИИ применяются в проекте?*", true, (project) =>
    answer(project.flagship_tech_stack, "применяемые технологии, модели и методы валидации"),
  ),
  field("traditional_class", "Классификация технологии ИИ*", true, () =>
    clarify("классификацию, распознавание, прогноз, ранжирование, анализ или иной класс"),
  ),
  field("traditional_scaling", "Пройденные и запланированные этапы масштабирования*", true, (project) =>
    answerWithClarification(
      joinAnswers(project.progress, project.next_step, project.flagship_scope),
      "этапы, площадки, охват и критерии перехода",
    ),
  ),
];

const effectFields: ProjectApplicationFieldDefinition[] = [
  field("effect_types", "Выберите достигнутые от ИИ тип(ы) эффекта*", true, (project) =>
    answerWithClarification(
      joinAnswers(project.progress, project.funding_status),
      "только фактически достигнутые эффекты и источник каждого результата",
    ),
  ),
  field(
    "effect_metrics",
    "Укажите реальные показатели в формате «%-временной промежуток» по выбранным в прошлом пункте типам эффекта*",
    true,
    () => need("значения до и после, период, выборку и источник каждой метрики"),
  ),
  field(
    "annual_economic_effect",
    "Объем экономического эффекта за год в рублях на операционный доход и/или операционные расходы*",
    true,
    () =>
      need("эффект по доходам, расходам или трудозатратам, период и источник"),
  ),
  field("roi", "Укажите ROI и примерный период окупаемости проекта*", true, () =>
    need("инвестиции, чистый эффект, формулу ROI и срок окупаемости"),
  ),
  field(
    "effect_methodology",
    "Опишите, как был подсчитан эффект? (Методика, источник данных, бенчмарк)*",
    true,
    () =>
      need("метрику, базу до внедрения, значение после, период, выборку, источник и формулу"),
  ),
  field(
    "independent_effect_confirmation",
    "Есть ли независимое подтверждение эффекта (аудит, отчетность, оценка партнера)?",
    false,
    () => clarify("аудит, отчет, письмо или оценку партнера; дату, автора и показатели"),
  ),
  field(
    "current_coverage",
    "Текущий охват решения: количество пользователей / подразделений / процессов / регионов, в которых используется решение*",
    true,
    (project) =>
      answerWithClarification(
        joinAnswers(project.flagship_result_users, project.flagship_scope),
        "фактическое количество пользователей, подразделений, процессов, организаций и регионов, период эксплуатации и долю охваченного процесса",
      ),
  ),
];

const implementationFields: ProjectApplicationFieldDefinition[] = [
  field(
    "implementation_duration",
    "Сколько времени заняло внедрение решения — от старта проекта до вывода в промышленную эксплуатацию?*",
    true,
    () => clarify("фактическую дату старта и вывода в промышленную эксплуатацию"),
  ),
  field("deployment_contour", "Укажите контур реализации*", true, (project) =>
    answerWithClarification(
      answer(project.flagship_tech_stack, "контур реализации"),
      "облачный, локальный или гибридный контур и место размещения",
    ),
  ),
  field("delivery_format", "Укажите формат реализации*", true, (project) =>
    answerWithClarification(
      answer(project.flagship_client_usage, "формат реализации"),
      "формат поставки: сервис, программный модуль, API или программно-аппаратный комплекс",
    ),
  ),
  field(
    "data_and_hardware",
    "Какие данные (таблицы, текст, изображения, видео, аудио) и КТС (CPU / RAM / GPU) используются в решении*",
    true,
    (project) =>
      answerWithClarification(
        joinAnswers(project.flagship_available_data, project.flagship_tech_stack),
        "форматы и объемы данных, CPU, RAM, GPU, хранение, нагрузку и место размещения",
      ),
  ),
  field(
    "media_recognition",
    "Освещался ли проект в СМИ, отраслевых изданиях или получил иное независимое признание? Укажите ссылки",
    false,
    () => clarify("публикации, награды или признание с подтверждающими ссылками"),
  ),
  field("analogs", "Есть ли аналоги решения в России и/или мире?*", true, (project) =>
    answer(project.flagship_competitors, "аналоги и критерии сравнения"),
  ),
  field("differentiators", "Опишите неповторимые особенности решения*", true, (project) =>
    answer(project.flagship_innovation_reason, "отличия от аналогов по сопоставимым критериям"),
  ),
  field(
    "expert_uniqueness_confirmation",
    "Приведите подтверждения об уникальности проекта от профильных экспертов (при наличии)",
    false,
    () =>
      clarify("письмо или заключение эксперта с критериями сравнения, датой, ФИО, должностью и организацией автора"),
  ),
  field("innovation_result", "Приводит ли ваше решение к инновационному результату?*", true, (project) =>
    answer(project.flagship_innovation_reason, "достигнутый инновационный результат и подтверждение"),
  ),
  field("non_financial_effects", "Потенциальные нефинансовые эффекты от внедрения решения*", true, (project) =>
    answerWithClarification(
      joinAnswers(project.flagship_result_users, project.flagship_client_usage),
      "количественные и качественные нефинансовые эффекты, базу сравнения, период, выборку и источник",
    ),
  ),
  field("scalability", "Опишите потенциал масштабируемости проекта*", true, (project) =>
    answerWithClarification(
      answer(project.flagship_scope, "потенциал масштабирования"),
      "сферы, отрасли, регионы и условия тиражирования",
    ),
  ),
  field("project_stage", "Стадия проекта*", true, (project) =>
    answer(project.flagship_status?.name ?? project.status?.name, "фактическую стадию проекта"),
  ),
  field("implementation_year", "Год реализации проекта*", true, (project) =>
    answer(findYear(project), "год фактической реализации"),
  ),
];

const partnerFields: ProjectApplicationFieldDefinition[] = [
  field("partners", "Партнеры", false, () =>
    clarify("организации-партнеры, их роль, вклад, период участия и подтверждающий документ"),
  ),
  field("ai_community", "Вклад в развитие AI сообщества", false, () =>
    clarify("мероприятия, публикации, методические материалы и подтверждающие ссылки"),
  ),
];

const categoryFields: Record<
  ProjectApplicationType,
  { title: string; fields: ProjectApplicationFieldDefinition[] }
> = {
  generative_ai: {
    title: "Вопросы категории «Генеративный ИИ»",
    fields: generativeFields,
  },
  agentic_ai: {
    title: "Вопросы категории «Агентный ИИ»",
    fields: agenticFields,
  },
  traditional_ai: {
    title: "Вопросы категории «Традиционный ИИ»",
    fields: traditionalFields,
  },
};

export function getProjectApplicationTypeLabel(type: ProjectApplicationType) {
  return applicationTypeLabels[type];
}

export function getProjectApplicationTemplate(
  type: ProjectApplicationType,
): ProjectApplicationTemplate {
  const category = categoryFields[type];

  return {
    type,
    name: `Лидеры ИИ — 2026 · ${applicationTypeLabels[type]}`,
    sections: [
      { title: "Данные компании и проекта", fields: companyAndProjectFields },
      { title: "Задача проекта", fields: problemFields },
      category,
      { title: "Эффект и подтверждение", fields: effectFields },
      {
        title: "Внедрение, технологии и масштабирование",
        fields: implementationFields,
      },
      { title: "Партнеры и AI-сообщество", fields: partnerFields },
    ],
  };
}

export function classifyProjectApplication(
  project: ProjectDetail,
): ProjectApplicationType {
  const source = getClassificationSource(project);
  const agentCapabilities = agentCapabilityGroups.filter((markers) =>
    markers.some((marker) => source.includes(marker)),
  ).length;

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
  return getProjectApplicationTemplate(type).sections.map((section) => ({
    title: section.title,
    fields: section.fields.map((definition) => [
      definition.question,
      definition.fallback(project),
    ]),
  }));
}

export function formatProjectApplicationAnswer(
  status: ProjectApplicationAnswerStatus,
  text: string,
) {
  const normalized = text.trim();
  const labels: Record<ProjectApplicationAnswerStatus, string> = {
    confirmed: "ПОДТВЕРЖДЕНО:",
    working: "РАБОЧИЙ ОТВЕТ:",
    clarify: "ДЛЯ КЛИЕНТА — УТОЧНИТЬ:",
    required: "НУЖЕН ВВОД КЛИЕНТА:",
  };

  return `${labels[status]} ${normalized || "сведения в карточке проекта отсутствуют"}`;
}

export function serializeProjectForApplication(project: ProjectDetail) {
  return JSON.stringify(project, null, 2);
}

function answer(value: string | null | undefined, missingInstruction: string) {
  const normalized = value?.trim();
  return normalized
    ? formatProjectApplicationAnswer("working", normalized)
    : need(missingInstruction);
}

function joinAnswers(...values: Array<string | null | undefined>) {
  const normalized = values.map((value) => value?.trim()).filter(Boolean);
  return normalized.length > 0
    ? formatProjectApplicationAnswer("working", normalized.join(" "))
    : need("заполнить поле по фактам проекта");
}

function answerWithClarification(response: string, instruction: string) {
  return `${response} | ${clarify(instruction)}`;
}

function need(instruction: string) {
  return formatProjectApplicationAnswer("required", `${instruction}.`);
}

function clarify(instruction: string) {
  return formatProjectApplicationAnswer("clarify", `${instruction}.`);
}

function getProjectSourceText(project: ProjectDetail) {
  return Object.values(project)
    .flatMap((value) => {
      if (typeof value === "string") return [value];
      if (value && typeof value === "object") return Object.values(value);
      return [];
    })
    .filter((value): value is string => typeof value === "string")
    .join("\n");
}

function findInn(project: ProjectDetail) {
  return getProjectSourceText(project).match(/(?:^|\D)(\d{10}|\d{12})(?:\D|$)/u)?.[1] ?? null;
}

function findPhone(project: ProjectDetail) {
  return (
    getProjectSourceText(project).match(
      /(?:\+7|8)[\s(.-]*\d{3}[\s).-]*\d{3}[\s.-]*\d{2}[\s.-]*\d{2}/u,
    )?.[0] ?? null
  );
}

function findAllUrls(project: ProjectDetail) {
  return Array.from(
    new Set(getProjectSourceText(project).match(/https?:\/\/[^\s<>()]+/giu) ?? []),
  );
}

function findUrl(project: ProjectDetail) {
  return findAllUrls(project)[0] ?? null;
}

function findYear(project: ProjectDetail) {
  const explicit = [
    project.progress,
    project.comment,
    project.flagship_problem_description,
    project.flagship_solution_description,
    project.flagship_current_process,
    project.flagship_scope,
  ]
    .filter(Boolean)
    .join("\n")
    .match(/\b(20(?:2[3-9]|3\d))\b/u)?.[1];
  return explicit ?? null;
}

function getClassificationSource(project: ProjectDetail) {
  return getProjectSourceText(project).toLowerCase().replaceAll("ё", "е");
}
