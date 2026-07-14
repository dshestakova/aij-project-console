"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  createProjectAction,
  type ProjectEditInput,
} from "@/app/projects/[id]/actions";
import type {
  PersonReference,
  ProjectEditReferences,
  ReferenceItem,
} from "@/types/project-registry";

type ProjectCreateFormProps = {
  references: ProjectEditReferences;
};

type FlagshipPassportField = {
  name: keyof Pick<
    ProjectEditInput,
    | "flagship_client_current_state"
    | "flagship_current_process"
    | "flagship_scope"
    | "flagship_client_usage"
    | "flagship_result_users"
    | "flagship_tech_stack"
    | "flagship_available_data"
    | "flagship_uncertain_data"
    | "flagship_out_of_scope"
    | "flagship_competitors"
  >;
  label: string;
  placeholder: string;
};

const flagshipPassportFields: FlagshipPassportField[] = [
  {
    name: "flagship_client_current_state",
    label: "Что сейчас есть у клиента",
    placeholder:
      "Опишите текущую ситуацию у клиента: какие системы, процессы, команды или решения уже есть, что работает сейчас.",
  },
  {
    name: "flagship_current_process",
    label: "Как выглядит текущий процесс",
    placeholder:
      "Опишите текущий процесс: кто участвует, какие шаги проходят, сколько это занимает времени, людей или ресурсов.",
  },
  {
    name: "flagship_scope",
    label: "Что именно дорабатываем / создаем",
    placeholder:
      "Опишите, что именно будет создано или доработано в рамках проекта: модуль, агент, сервис, интеграция, аналитика, интерфейс.",
  },
  {
    name: "flagship_client_usage",
    label: "Как и для чего клиент это использует",
    placeholder:
      "Опишите пользовательский сценарий: как клиент будет применять результат в работе и какую задачу это помогает решать.",
  },
  {
    name: "flagship_result_users",
    label: "Кто будет пользоваться результатом",
    placeholder:
      "Укажите пользователей результата: роли, команды, подразделения, внутренние или внешние пользователи.",
  },
  {
    name: "flagship_tech_stack",
    label: "Технический стек",
    placeholder:
      "Укажите технологии и компоненты: LLM/GigaChat, RAG, агенты, API, базы данных, интеграции, frontend/backend, облако, BI и другие инструменты.",
  },
  {
    name: "flagship_available_data",
    label: "Какие данные доступны",
    placeholder:
      "Перечислите данные, которые уже есть или точно будут доступны: документы, таблицы, CRM, транзакции, логи, базы знаний, исторические данные.",
  },
  {
    name: "flagship_uncertain_data",
    label: "Какие данные пока под вопросом",
    placeholder:
      "Опишите данные, доступность или качество которых нужно уточнить: владельцы, доступы, формат, полнота, регулярность обновления.",
  },
  {
    name: "flagship_out_of_scope",
    label: "Что точно не делаем",
    placeholder:
      "Зафиксируйте границы проекта: какие функции, интеграции, процессы или ожидания не входят в текущий объем.",
  },
  {
    name: "flagship_competitors",
    label: "Конкуренты",
    placeholder:
      "По желанию: укажите похожие решения, внутренние альтернативы, внешних конкурентов или бенчмарки.",
  },
];

const initialForm: ProjectEditInput = {
  external_id: "",
  client: "",
  project_name: "",
  status_id: "",
  csm_id: "",
  director_id: "",
  industry_unit_id: "",
  essence: "",
  progress: "",
  next_step: "",
  funding_status: "",
  funding: "",
  is_social: false,
  comment: "",
  is_archived: false,
  is_flagship: false,
  flagship_status_id: "",
  flagship_client_current_state: "",
  flagship_current_process: "",
  flagship_scope: "",
  flagship_client_usage: "",
  flagship_result_users: "",
  flagship_tech_stack: "",
  flagship_available_data: "",
  flagship_uncertain_data: "",
  flagship_out_of_scope: "",
  flagship_competitors: "",
  flagship_passport_uploaded: false,
  flagship_innovation_level: "",
  flagship_uploaded_to_prbr: false,
  flagship_approved_by_ca: false,
};

export function ProjectCreateForm({ references }: ProjectCreateFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<ProjectEditInput>(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isDescriptionUploaded = getIsDescriptionUploaded(form);

  function updateField<K extends keyof ProjectEditInput>(
    field: K,
    value: ProjectEditInput[K],
  ) {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    startTransition(async () => {
      const result = await createProjectAction(form);

      if (!result.ok || !result.projectId) {
        setError(result.message);
        return;
      }

      setMessage(result.message);
      router.push(`/projects/${result.projectId}`);
      router.refresh();
    });
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      {message ? (
        <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          {message}
        </section>
      ) : null}

      {error ? (
        <section className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {error}
        </section>
      ) : null}

      <Section title="Основная информация">
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 lg:col-span-3">
            ID проекта будет присвоен автоматически после сохранения.
          </div>
          <TextField
            label="Клиент"
            onChange={(value) => updateField("client", value)}
            value={form.client}
          />
          <TextField
            label="Название проекта"
            onChange={(value) => updateField("project_name", value)}
            value={form.project_name}
          />
          <ReferenceSelect
            emptyLabel="Без статуса"
            label="Статус"
            onChange={(value) => updateField("status_id", value)}
            options={references.statuses}
            value={form.status_id}
          />
          <ReferenceSelect
            emptyLabel="Не указано"
            label="Отраслевое управление"
            onChange={(value) => updateField("industry_unit_id", value)}
            options={references.industryUnits}
            value={form.industry_unit_id}
          />
          <PersonSelect
            emptyLabel="Не указан"
            label="CSM"
            onChange={(value) => updateField("csm_id", value)}
            options={references.csms}
            value={form.csm_id}
          />
          <PersonSelect
            emptyLabel="Не указан"
            label="Директор"
            onChange={(value) => updateField("director_id", value)}
            options={references.directors}
            value={form.director_id}
          />
          <CheckboxField
            checked={form.is_archived}
            label="Проект в архиве"
            onChange={(value) => updateField("is_archived", value)}
          />
        </div>
      </Section>

      <Section title="Описание и ход проекта">
        <div className="grid gap-4 lg:grid-cols-2">
          <TextareaField
            label="Суть проекта"
            onChange={(value) => updateField("essence", value)}
            value={form.essence}
          />
          <TextareaField
            label="Прогресс реализации"
            onChange={(value) => updateField("progress", value)}
            value={form.progress}
          />
          <TextareaField
            label="Следующий шаг"
            onChange={(value) => updateField("next_step", value)}
            value={form.next_step}
          />
          <TextareaField
            label="Комментарий"
            onChange={(value) => updateField("comment", value)}
            value={form.comment}
          />
        </div>
      </Section>

      <Section title="Финансирование">
        <div className="grid gap-4 lg:grid-cols-2">
          <TextareaField
            label="Статус финансирования"
            onChange={(value) => updateField("funding_status", value)}
            value={form.funding_status}
          />
          <TextareaField
            label="Финансирование"
            onChange={(value) => updateField("funding", value)}
            value={form.funding}
          />
          <CheckboxField
            checked={form.is_social}
            label="Социальный"
            onChange={(value) => updateField("is_social", value)}
          />
        </div>
      </Section>

      <Section title="Флагманский проект">
        <div className="grid gap-4 lg:grid-cols-3">
          <CheckboxField
            checked={form.is_flagship}
            label="Флагман"
            onChange={(value) => updateField("is_flagship", value)}
          />
          <StatusIndicator
            active={isDescriptionUploaded}
            activeLabel="Описание загружено"
            inactiveLabel="Описание не загружено"
          />
        </div>

        {form.is_flagship ? (
          <div className="mt-4 flex flex-col gap-4">
            <div className="grid gap-4 lg:grid-cols-3">
              <ReferenceSelect
                emptyLabel="Не указано"
                label="Статус флагмана"
                onChange={(value) => updateField("flagship_status_id", value)}
                options={references.flagshipStatuses}
                value={form.flagship_status_id}
              />
              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  Инновационность
                </span>
                <select
                  className="mt-2 h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
                  onChange={(event) =>
                    updateField("flagship_innovation_level", event.target.value)
                  }
                  value={form.flagship_innovation_level}
                >
                  <option value="">не указано</option>
                  <option value="высокий">высокий</option>
                  <option value="средний">средний</option>
                  <option value="низкий">низкий</option>
                </select>
              </label>
              <CheckboxField
                checked={form.flagship_passport_uploaded}
                label="Паспорт есть"
                onChange={(value) =>
                  updateField("flagship_passport_uploaded", value)
                }
              />
              <CheckboxField
                checked={form.flagship_uploaded_to_prbr}
                label="Загружен на ПРБР"
                onChange={(value) =>
                  updateField("flagship_uploaded_to_prbr", value)
                }
              />
              <CheckboxField
                checked={form.flagship_approved_by_ca}
                label="Одобрен ЦА"
                onChange={(value) =>
                  updateField("flagship_approved_by_ca", value)
                }
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {flagshipPassportFields.map((field) => (
                <TextareaField
                  key={field.name}
                  label={field.label}
                  onChange={(value) => updateField(field.name, value)}
                  placeholder={field.placeholder}
                  value={form[field.name]}
                />
              ))}
            </div>
          </div>
        ) : (
          <p className="mt-4 rounded-md bg-slate-50 p-3 text-sm text-slate-500">
            Флагманские поля скрыты. Включите флагманский режим, чтобы заполнить
            статус, паспортные признаки и подробное описание.
          </p>
        )}
      </Section>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          className="h-10 rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-950 disabled:cursor-not-allowed disabled:text-slate-400"
          disabled={isPending}
          onClick={() => router.push("/projects")}
          type="button"
        >
          Отмена
        </button>
        <button
          className="h-10 rounded-md bg-slate-950 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          disabled={isPending}
          type="submit"
        >
          {isPending ? "Создаем..." : "Создать проект"}
        </button>
      </div>
    </form>
  );
}

function Section({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="min-w-0 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function TextField({
  label,
  onChange,
  required,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  required?: boolean;
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        className="mt-2 h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
        onChange={(event) => onChange(event.target.value)}
        required={required}
        value={value}
      />
    </label>
  );
}

function TextareaField({
  label,
  onChange,
  placeholder,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  return (
    <label className="block min-w-0 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <textarea
        className="mt-3 min-h-32 w-full resize-y rounded-md border border-slate-200 bg-white px-3 py-2 text-sm leading-6 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </label>
  );
}

function ReferenceSelect({
  emptyLabel,
  label,
  onChange,
  options,
  value,
}: {
  emptyLabel: string;
  label: string;
  onChange: (value: string) => void;
  options: Array<Pick<ReferenceItem, "id" | "name">>;
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <select
        className="mt-2 h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        <option value="">{emptyLabel}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function PersonSelect({
  emptyLabel,
  label,
  onChange,
  options,
  value,
}: {
  emptyLabel: string;
  label: string;
  onChange: (value: string) => void;
  options: PersonReference[];
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <select
        className="mt-2 h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        <option value="">{emptyLabel}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.full_name}
          </option>
        ))}
      </select>
    </label>
  );
}

function CheckboxField({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-11 items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">
      <input
        checked={checked}
        className="h-4 w-4 rounded border-slate-300"
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <span>{label}</span>
    </label>
  );
}

function StatusIndicator({
  active,
  activeLabel,
  inactiveLabel,
}: {
  active: boolean;
  activeLabel: string;
  inactiveLabel: string;
}) {
  return (
    <div
      className={`flex min-h-11 items-center rounded-md border px-3 py-2 text-sm font-medium ${
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-slate-200 bg-slate-50 text-slate-600"
      }`}
    >
      {active ? activeLabel : inactiveLabel}
    </div>
  );
}

function getIsDescriptionUploaded(form: ProjectEditInput) {
  return (
    form.flagship_client_current_state.trim().length > 0 &&
    form.flagship_current_process.trim().length > 0 &&
    form.flagship_scope.trim().length > 0 &&
    form.flagship_client_usage.trim().length > 0 &&
    form.flagship_result_users.trim().length > 0 &&
    form.flagship_tech_stack.trim().length > 0 &&
    form.flagship_available_data.trim().length > 0 &&
    form.flagship_out_of_scope.trim().length > 0
  );
}
