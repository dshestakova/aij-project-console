import "server-only";

import {
  buildProjectApplicationSections,
  classifyProjectApplication,
  formatProjectApplicationAnswer,
  getProjectApplicationTemplate,
  serializeProjectForApplication,
  type ProjectApplicationAnswerStatus,
  type ProjectApplicationSection,
  type ProjectApplicationType,
} from "@/lib/application/project-application";
import type { ProjectDetail } from "@/types/project-registry";

export type ProjectApplicationGenerationMode = "llm" | "rules_fallback";

export type GeneratedProjectApplication = {
  type: ProjectApplicationType;
  templateName: string;
  sections: ProjectApplicationSection[];
  mode: ProjectApplicationGenerationMode;
  warning?: string;
};

type ChatMessage = { role: "system" | "user"; content: string };

type LlmAnswer = {
  status?: ProjectApplicationAnswerStatus;
  text?: string;
};

const validTypes = new Set<ProjectApplicationType>([
  "traditional_ai",
  "generative_ai",
  "agentic_ai",
]);

const validStatuses = new Set<ProjectApplicationAnswerStatus>([
  "confirmed",
  "working",
  "clarify",
  "required",
]);

export async function generateProjectApplicationContent(
  project: ProjectDetail,
): Promise<GeneratedProjectApplication> {
  const config = getApplicationLlmConfig();

  if (!config) {
    return buildFallback(project, "LLM для заявок не настроена; применена классификация по правилам.");
  }

  try {
    const type = await classifyWithLlm(project, config);
    const template = getProjectApplicationTemplate(type);
    const fallbackSections = buildProjectApplicationSections(project, type);
    const answers = await fillWithLlm(project, template, config);
    const fallbackByQuestion = new Map(
      fallbackSections.flatMap((section) => section.fields),
    );

    return {
      type,
      templateName: template.name,
      mode: "llm",
      sections: template.sections.map((section) => ({
        title: section.title,
        fields: section.fields.map((definition) => {
          const generated = answers[definition.id];
          const fallback =
            fallbackByQuestion.get(definition.question) ??
            formatProjectApplicationAnswer(
              definition.required ? "required" : "clarify",
              "сведения в карточке проекта отсутствуют",
            );

          if (
            !generated ||
            !generated.text?.trim() ||
            !generated.status ||
            !validStatuses.has(generated.status)
          ) {
            return [definition.question, fallback];
          }

          return [
            definition.question,
            formatProjectApplicationAnswer(generated.status, generated.text),
          ];
        }),
      })),
    };
  } catch (error) {
    return buildFallback(
      project,
      `LLM недоступна: ${getErrorMessage(error)}. Применена классификация по правилам.`,
    );
  }
}

function buildFallback(project: ProjectDetail, warning: string): GeneratedProjectApplication {
  const type = classifyProjectApplication(project);
  const template = getProjectApplicationTemplate(type);
  return {
    type,
    templateName: template.name,
    sections: buildProjectApplicationSections(project, type),
    mode: "rules_fallback",
    warning,
  };
}

async function classifyWithLlm(
  project: ProjectDetail,
  config: ApplicationLlmConfig,
) {
  const response = await chat(config, [
    {
      role: "system",
      content:
        "Ты классификатор конкурсных заявок. Отвечай только JSON. Агентный ИИ выбирай лишь при наличии цели, планирования, инструментов/API, состояния или памяти и автономного цикла. Генеративный ИИ выбирай, если модель создает новый текст, изображение, код, аудио или иной контент. Иначе выбирай традиционный ИИ.",
    },
    {
      role: "user",
      content: `Определи тип проекта. Допустимые значения: traditional_ai, generative_ai, agentic_ai. Верни {"type":"...","reason":"кратко"}.\n\nДанные проекта:\n${serializeProjectForApplication(project)}`,
    },
  ]);
  const parsed = parseJsonObject(response) as { type?: unknown };

  if (typeof parsed.type !== "string" || !validTypes.has(parsed.type as ProjectApplicationType)) {
    throw new Error("модель вернула неизвестный тип заявки");
  }

  return parsed.type as ProjectApplicationType;
}

async function fillWithLlm(
  project: ProjectDetail,
  template: ReturnType<typeof getProjectApplicationTemplate>,
  config: ApplicationLlmConfig,
) {
  const questions = template.sections.flatMap((section) =>
    section.fields.map((item) => ({
      id: item.id,
      question: item.question,
      required: item.required,
    })),
  );
  const response = await chat(config, [
    {
      role: "system",
      content:
        "Ты готовишь конкурсную заявку «Лидеры ИИ — 2026» на русском языке. Используй только факты из карточки проекта. Не выдумывай цифры, даты, ссылки, названия моделей, внедрения, партнеров и подтверждения. Синтез и редактура разрешены, новые факты запрещены. Для прямого факта используй confirmed, для обоснованного черновика из нескольких полей — working, для необязательного отсутствующего факта — clarify, для обязательного отсутствующего факта — required. Каждый ответ должен соответствовать вопросу. Отвечай только JSON.",
    },
    {
      role: "user",
      content: `Шаблон: ${template.name}. Заполни каждый id. Формат: {"answers":{"field_id":{"status":"confirmed|working|clarify|required","text":"ответ без статусного префикса"}}}.\n\nВопросы:\n${JSON.stringify(questions, null, 2)}\n\nДанные проекта:\n${serializeProjectForApplication(project)}`,
    },
  ]);
  const parsed = parseJsonObject(response) as { answers?: unknown };

  if (!parsed.answers || typeof parsed.answers !== "object" || Array.isArray(parsed.answers)) {
    throw new Error("модель не вернула ответы по шаблону");
  }

  return parsed.answers as Record<string, LlmAnswer>;
}

type ApplicationLlmConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
  timeoutMs: number;
};

function getApplicationLlmConfig(): ApplicationLlmConfig | null {
  const apiKey =
    process.env.APPLICATION_LLM_API_KEY?.trim() ??
    process.env.MWS_API_KEY?.trim();
  const enabledRaw = process.env.APPLICATION_LLM_ENABLED;
  const enabled = enabledRaw
    ? /^(1|true)$/iu.test(enabledRaw)
    : Boolean(apiKey);
  const baseUrl =
    process.env.APPLICATION_LLM_BASE_URL?.trim() ??
    (process.env.MWS_API_KEY ? "https://api.gpt.mws.ru/v1" : undefined);
  const model =
    process.env.APPLICATION_LLM_MODEL?.trim() ??
    (process.env.MWS_API_KEY ? "mts-anya" : undefined);

  if (!enabled || !baseUrl || !apiKey || !model) {
    return null;
  }

  const parsedTimeout = Number.parseInt(
    process.env.APPLICATION_LLM_TIMEOUT_MS ?? "120000",
    10,
  );

  return {
    baseUrl: baseUrl.replace(/\/+$/u, ""),
    apiKey,
    model,
    timeoutMs:
      Number.isFinite(parsedTimeout) && parsedTimeout > 0 ? parsedTimeout : 120000,
  };
}

async function chat(config: ApplicationLlmConfig, messages: ChatMessage[]) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${config.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: 0.1,
        max_tokens: 8000,
      }),
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const body = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = body.choices?.[0]?.message?.content;

    if (!content?.trim()) {
      throw new Error("пустой ответ модели");
    }

    return content;
  } finally {
    clearTimeout(timeout);
  }
}

function parseJsonObject(value: string) {
  const withoutFence = value
    .trim()
    .replace(/^```(?:json)?\s*/iu, "")
    .replace(/\s*```$/u, "");
  const start = withoutFence.indexOf("{");
  const end = withoutFence.lastIndexOf("}");

  if (start < 0 || end <= start) {
    throw new Error("модель вернула ответ не в JSON");
  }

  return JSON.parse(withoutFence.slice(start, end + 1)) as Record<string, unknown>;
}

function getErrorMessage(error: unknown) {
  if (error instanceof DOMException && error.name === "AbortError") {
    return "превышено время ожидания";
  }
  return error instanceof Error ? error.message : "неизвестная ошибка";
}
