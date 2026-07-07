"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  type ProjectEditInput,
  updateProjectAction,
} from "@/app/projects/[id]/actions";
import { Badge } from "@/components/projects/badge";
import { formatDateTime, getDisplayValue } from "@/lib/project-registry/format";
import type {
  PersonReference,
  ProjectChangeItem,
  ProjectDetail,
  ProjectEditReferences,
  ReferenceItem,
} from "@/types/project-registry";

type ProjectDetailEditorProps = {
  canEdit: boolean;
  changes: ProjectChangeItem[];
  project: ProjectDetail;
  references: ProjectEditReferences;
};

const fieldLabels: Record<string, string> = {
  external_id: "Внешний ID",
  client: "Клиент",
  project_name: "Название проекта",
  status_id: "Статус",
  cluster_id: "Кластер",
  csm_id: "CSM",
  director_id: "Директор",
  industry_unit_id: "Отраслевое управление",
  essence: "Суть проекта",
  progress: "Прогресс",
  next_step: "Следующий шаг",
  funding_status: "Статус финансирования",
  funding: "Комментарий по финансированию",
  comment: "Комментарий",
  is_archived: "Архив",
  is_flagship: "Флагман",
  flagship_status_id: "Статус флагмана",
  flagship_problem_description: "Описание проблемы",
  flagship_solution_description: "Описание решения",
  flagship_ai_functionality: "Ключевой функционал ИИ",
  flagship_description_uploaded: "Описание загружено",
  flagship_passport_uploaded: "Паспорт загружен",
  flagship_innovation_level: "Инновационность",
  flagship_uploaded_to_prbr: "Загружен на ПРБР",
  flagship_approved_by_ca: "Одобрен ЦА",
};

export function ProjectDetailEditor({
  canEdit,
  changes,
  project,
  references,
}: ProjectDetailEditorProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState(() => getInitialForm(project));
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateField<K extends keyof ProjectEditInput>(
    field: K,
    value: ProjectEditInput[K],
  ) {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
  }

  function handleCancel() {
    setForm(getInitialForm(project));
    setError(null);
    setMessage(null);
    setIsEditing(false);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    startTransition(async () => {
      const result = await updateProjectAction(project.id, form);

      if (!result.ok) {
        setError(result.message);
        return;
      }

      setMessage(result.message);
      setIsEditing(false);
      router.refresh();
    });
  }

  return (
    <>
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-500">
              {project.external_id}
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">
              {getDisplayValue(project.project_name)}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {getDisplayValue(project.client)}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <p className="text-sm text-slate-500">
              Обновлено {formatDateTime(project.updated_at)}
            </p>
            {canEdit && !isEditing ? (
              <button
                className="h-10 rounded-md bg-slate-950 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
                onClick={() => {
                  setError(null);
                  setMessage(null);
                  setForm(getInitialForm(project));
                  setIsEditing(true);
                }}
                type="button"
              >
                Редактировать проект
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {project.cluster ? (
            <Badge colorKey={project.cluster.color_key}>
              {project.cluster.name}
            </Badge>
          ) : (
            <Badge>Без кластера</Badge>
          )}
          {project.status ? (
            <Badge colorKey={project.status.color_key}>
              {project.status.name}
            </Badge>
          ) : (
            <Badge>Без статуса</Badge>
          )}
          {project.is_flagship ? <Badge colorKey="indigo">Флагман</Badge> : null}
          {project.flagship_status ? (
            <Badge colorKey={project.flagship_status.color_key}>
              {project.flagship_status.name}
            </Badge>
          ) : null}
          {project.is_archived ? <Badge colorKey="gray">Архив</Badge> : null}
        </div>
      </section>

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

      {isEditing ? (
        <ProjectEditForm
          form={form}
          isPending={isPending}
          onCancel={handleCancel}
          onChange={updateField}
          onSubmit={handleSubmit}
          references={references}
        />
      ) : (
        <ProjectReadOnlyView project={project} />
      )}

      <ProjectChangeHistory changes={changes} />
    </>
  );
}

function ProjectReadOnlyView({ project }: { project: ProjectDetail }) {
  return (
    <section className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-4">
        <DetailBlock label="Суть проекта" value={project.essence} />
        <DetailBlock label="Прогресс" value={project.progress} />
        <DetailBlock label="Следующий шаг" value={project.next_step} />
        <DetailBlock label="Комментарий" value={project.comment} />
      </div>

      <aside className="flex flex-col gap-4">
        <InfoCard
          rows={[
            ["Внешний ID", project.external_id],
            ["Клиент", project.client],
            ["Название проекта", project.project_name],
            ["Основной статус", project.status?.name ?? "Без статуса"],
            ["Кластер", project.cluster?.name ?? "Без кластера"],
            ["Обновлено", formatDateTime(project.updated_at)],
          ]}
          title="Паспорт проекта"
        />
        <FlagshipCard
          approvedByCa={project.flagship_approved_by_ca}
          descriptionUploaded={getProjectDescriptionUploaded(project)}
          innovationLevel={project.flagship_innovation_level}
          isFlagship={project.is_flagship}
          status={project.flagship_status?.name}
          uploadedToPrbr={project.flagship_uploaded_to_prbr}
        />
        <PassportProjectBlock
          passportUploaded={project.flagship_passport_uploaded}
          variant="readonly"
        />
        <InfoCard
          rows={[
            ["Финансирование", project.funding],
            ["Статус финансирования", project.funding_status],
            ["CSM", project.csm?.full_name],
            ["Директор", project.director?.full_name],
            ["Отраслевое управление", project.industry_unit?.name],
          ]}
          title="Ответственные и финансы"
        />
      </aside>
    </section>
  );
}

function ProjectEditForm({
  form,
  isPending,
  onCancel,
  onChange,
  onSubmit,
  references,
}: {
  form: ProjectEditInput;
  isPending: boolean;
  onCancel: () => void;
  onChange: <K extends keyof ProjectEditInput>(
    field: K,
    value: ProjectEditInput[K],
  ) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  references: ProjectEditReferences;
}) {
  const isDescriptionUploaded = getIsDescriptionUploaded(form);

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <CollapsibleSection defaultOpen title="Основная информация">
        <div className="grid gap-4 lg:grid-cols-3">
          <TextField
            label="Внешний ID"
            onChange={(value) => onChange("external_id", value)}
            required
            value={form.external_id}
          />
          <TextField
            label="Клиент"
            onChange={(value) => onChange("client", value)}
            value={form.client}
          />
          <TextField
            label="Название проекта"
            onChange={(value) => onChange("project_name", value)}
            value={form.project_name}
          />
          <ReferenceSelect
            emptyLabel="Без статуса"
            label="Статус"
            onChange={(value) => onChange("status_id", value)}
            options={references.statuses}
            value={form.status_id}
          />
          <ReferenceSelect
            emptyLabel="Без кластера"
            label="Кластер"
            onChange={(value) => onChange("cluster_id", value)}
            options={references.clusters}
            value={form.cluster_id}
          />
          <ReferenceSelect
            emptyLabel="Не указано"
            label="Отраслевое управление"
            onChange={(value) => onChange("industry_unit_id", value)}
            options={references.industryUnits}
            value={form.industry_unit_id}
          />
          <PersonSelect
            emptyLabel="Не указан"
            label="CSM"
            onChange={(value) => onChange("csm_id", value)}
            options={references.csms}
            value={form.csm_id}
          />
          <PersonSelect
            emptyLabel="Не указан"
            label="Директор"
            onChange={(value) => onChange("director_id", value)}
            options={references.directors}
            value={form.director_id}
          />
          <CheckboxField
            checked={form.is_archived}
            label="Проект в архиве"
            onChange={(value) => onChange("is_archived", value)}
          />
        </div>
      </CollapsibleSection>

      <CollapsibleSection defaultOpen title="Описание и ход проекта">
        <div className="grid gap-4 lg:grid-cols-2">
        <TextareaField
          label="Суть проекта"
          onChange={(value) => onChange("essence", value)}
          value={form.essence}
        />
        <TextareaField
          label="Прогресс"
          onChange={(value) => onChange("progress", value)}
          value={form.progress}
        />
        <TextareaField
          label="Следующий шаг"
          onChange={(value) => onChange("next_step", value)}
          value={form.next_step}
        />
        <TextareaField
          label="Комментарий"
          onChange={(value) => onChange("comment", value)}
          value={form.comment}
        />
        </div>
      </CollapsibleSection>

      <CollapsibleSection defaultOpen title="Финансирование">
        <div className="grid gap-4 lg:grid-cols-2">
        <TextareaField
          label="Статус"
          onChange={(value) => onChange("funding_status", value)}
          value={form.funding_status}
        />
        <TextareaField
          label="Комментарий"
          onChange={(value) => onChange("funding", value)}
          value={form.funding}
        />
        </div>
      </CollapsibleSection>

      <CollapsibleSection defaultOpen title="Флагманский проект">
        <div className="grid gap-4 lg:grid-cols-3">
          <CheckboxField
            checked={form.is_flagship}
            label="Флагман"
            onChange={(value) => onChange("is_flagship", value)}
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
            onChange={(value) => onChange("flagship_status_id", value)}
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
                onChange("flagship_innovation_level", event.target.value)
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
            checked={form.flagship_uploaded_to_prbr}
            label="Загружен на ПРБР"
            onChange={(value) => onChange("flagship_uploaded_to_prbr", value)}
          />
          <CheckboxField
            checked={form.flagship_approved_by_ca}
            label="Одобрен ЦА"
            onChange={(value) => onChange("flagship_approved_by_ca", value)}
          />
            </div>

            <PassportProjectBlock
              onPassportUploadedChange={(value) =>
                onChange("flagship_passport_uploaded", value)
              }
              passportUploaded={form.flagship_passport_uploaded}
              variant="edit"
            />

            <div className="grid gap-4 lg:grid-cols-3">
              <TextareaField
                label="Описание проблемы"
                onChange={(value) =>
                  onChange("flagship_problem_description", value)
                }
                placeholder="Какую бизнес-проблему решает проект?"
                value={form.flagship_problem_description}
              />
              <TextareaField
                label="Описание решения"
                onChange={(value) =>
                  onChange("flagship_solution_description", value)
                }
                placeholder="Как именно проблема решается с помощью AI?"
                value={form.flagship_solution_description}
              />
              <TextareaField
                label="Ключевой функционал ИИ"
                onChange={(value) =>
                  onChange("flagship_ai_functionality", value)
                }
                placeholder="Какие ИИ-функции используются: предсказание, классификация, генерация и т.д."
                value={form.flagship_ai_functionality}
              />
            </div>
          </div>
        ) : (
          <p className="mt-4 rounded-md bg-slate-50 p-3 text-sm text-slate-500">
            Флагманские поля скрыты. Чтобы заполнить описание, статус и
            дополнительные признаки, включите флагманский режим.
          </p>
        )}
      </CollapsibleSection>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          className="h-10 rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-950 disabled:cursor-not-allowed disabled:text-slate-400"
          disabled={isPending}
          onClick={onCancel}
          type="button"
        >
          Отмена
        </button>
        <button
          className="h-10 rounded-md bg-slate-950 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          disabled={isPending}
          type="submit"
        >
          {isPending ? "Сохраняем..." : "Сохранить"}
        </button>
      </div>
    </form>
  );
}

function ProjectChangeHistory({ changes }: { changes: ProjectChangeItem[] }) {
  const groups = groupChanges(changes);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-950">
        История изменений
      </h3>
      {groups.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">
          История изменений пока пустая.
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {groups.map((group) => (
            <article
              className="rounded-md border border-slate-100 bg-slate-50 p-3"
              key={group.key}
            >
              <p className="text-sm leading-6 text-slate-700">
                <span className="font-medium text-slate-950">
                  {formatDateTime(group.changedAt)}, {group.userLabel}
                </span>{" "}
                — изменены поля: {group.fieldLabels.join(", ")}
              </p>
              <details className="mt-2">
                <summary className="cursor-pointer text-xs font-medium text-slate-500">
                  Показать детали
                </summary>
                <dl className="mt-2 flex flex-col gap-2">
                  {group.items.map((item) => (
                    <div className="text-xs text-slate-600" key={item.id}>
                      <dt className="font-medium text-slate-700">
                        {getFieldLabel(item.field_name)}
                      </dt>
                      <dd className="mt-1 whitespace-pre-wrap">
                        {getDisplayValue(item.old_value)} -&gt;{" "}
                        {getDisplayValue(item.new_value)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </details>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function DetailBlock({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold uppercase text-slate-400">{label}</h3>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
        {getDisplayValue(value)}
      </p>
    </section>
  );
}

function FlagshipCard({
  approvedByCa,
  descriptionUploaded,
  innovationLevel,
  isFlagship,
  status,
  uploadedToPrbr,
}: {
  approvedByCa: boolean;
  descriptionUploaded: boolean;
  innovationLevel: string | null;
  isFlagship: boolean;
  status: string | null | undefined;
  uploadedToPrbr: boolean;
}) {
  const rows: Array<[string, string]> = [
    ["Флагман", isFlagship ? "да" : "нет"],
    ["Описание", descriptionUploaded ? "загружено" : "не загружено"],
    ["Инновационность", innovationLevel ?? "не указано"],
    ["Загружен на ПРБР", uploadedToPrbr ? "да" : "нет"],
    ["Одобрен ЦА", approvedByCa ? "да" : "нет"],
  ];

  if (status) {
    rows.splice(4, 0, ["Статус", status]);
  }

  return <InfoCard rows={rows} title="Флагманский проект" />;
}

function PassportProjectBlock({
  onPassportUploadedChange,
  passportUploaded,
  variant,
}: {
  onPassportUploadedChange?: (value: boolean) => void;
  passportUploaded: boolean;
  variant: "edit" | "readonly";
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-950">
            Паспорт проекта
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Позже здесь можно будет скачать паспорт, отредактировать его и
            загрузить обновленную версию.
          </p>
        </div>
        <StatusIndicator
          active={passportUploaded}
          activeLabel="Паспорт загружен"
          inactiveLabel="Паспорт не загружен"
        />
      </div>

      {variant === "edit" ? (
        <div className="mt-4">
          <CheckboxField
            checked={passportUploaded}
            label="Паспорт есть"
            onChange={(value) => onPassportUploadedChange?.(value)}
          />
        </div>
      ) : null}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          className="h-10 rounded-md border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-400"
          disabled
          type="button"
        >
          Скачать паспорт — скоро
        </button>
        <button
          className="h-10 rounded-md border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-400"
          disabled
          type="button"
        >
          Загрузить обновленный паспорт — скоро
        </button>
      </div>

      {/* Future implementation should connect this block to project_files and Supabase Storage: list passport file attached to project, download existing passport, upload updated passport version, update flagship_passport_uploaded automatically when passport file exists, and preserve manual fallback if needed. */}
    </section>
  );
}

function InfoCard({
  rows,
  title,
}: {
  rows: Array<[string, string | null | undefined]>;
  title: string;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
      <dl className="mt-4 flex flex-col gap-3">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs font-medium uppercase text-slate-400">
              {label}
            </dt>
            <dd className="mt-1 text-sm text-slate-700">
              {getDisplayValue(value)}
            </dd>
          </div>
        ))}
      </dl>
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
    <label className="block rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <textarea
        className="mt-3 min-h-32 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm leading-6 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </label>
  );
}

function ReferenceSelect({
  disabled,
  emptyLabel,
  label,
  onChange,
  options,
  value,
}: {
  disabled?: boolean;
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
        className="mt-2 h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-slate-400 disabled:bg-slate-50 disabled:text-slate-400"
        disabled={disabled}
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

function CollapsibleSection({
  children,
  defaultOpen,
  title,
}: {
  children: React.ReactNode;
  defaultOpen?: boolean;
  title: string;
}) {
  return (
    <details
      className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
      open={defaultOpen}
    >
      <summary className="cursor-pointer select-none text-lg font-semibold text-slate-950 marker:text-slate-400">
        {title}
      </summary>
      <div className="mt-4">{children}</div>
    </details>
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

function getInitialForm(project: ProjectDetail): ProjectEditInput {
  return {
    external_id: project.external_id,
    client: project.client ?? "",
    project_name: project.project_name ?? "",
    status_id: project.status_id ?? "",
    cluster_id: project.cluster_id ?? "",
    csm_id: project.csm_id ?? "",
    director_id: project.director_id ?? "",
    industry_unit_id: project.industry_unit_id ?? "",
    essence: project.essence ?? "",
    progress: project.progress ?? "",
    next_step: project.next_step ?? "",
    funding_status: project.funding_status ?? "",
    funding: project.funding ?? "",
    comment: project.comment ?? "",
    is_archived: project.is_archived,
    is_flagship: project.is_flagship,
    flagship_status_id: project.flagship_status_id ?? "",
    flagship_problem_description: project.flagship_problem_description ?? "",
    flagship_solution_description: project.flagship_solution_description ?? "",
    flagship_ai_functionality: project.flagship_ai_functionality ?? "",
    flagship_passport_uploaded: project.flagship_passport_uploaded,
    flagship_innovation_level: project.flagship_innovation_level ?? "",
    flagship_uploaded_to_prbr: project.flagship_uploaded_to_prbr,
    flagship_approved_by_ca: project.flagship_approved_by_ca,
  };
}

function getIsDescriptionUploaded(form: ProjectEditInput) {
  return (
    form.flagship_problem_description.trim().length > 0 &&
    form.flagship_solution_description.trim().length > 0 &&
    form.flagship_ai_functionality.trim().length > 0
  );
}

function getProjectDescriptionUploaded(project: ProjectDetail) {
  return (
    Boolean(project.flagship_problem_description?.trim()) &&
    Boolean(project.flagship_solution_description?.trim()) &&
    Boolean(project.flagship_ai_functionality?.trim())
  );
}

function groupChanges(changes: ProjectChangeItem[]) {
  const groups = new Map<
    string,
    {
      key: string;
      changedAt: string;
      userLabel: string;
      fieldLabels: string[];
      items: ProjectChangeItem[];
    }
  >();

  changes.forEach((change) => {
    const key = `${change.changed_at}-${change.changed_by ?? "unknown"}`;
    const existing = groups.get(key);
    const fieldLabel = getFieldLabel(change.field_name);

    if (existing) {
      if (!existing.fieldLabels.includes(fieldLabel)) {
        existing.fieldLabels.push(fieldLabel);
      }
      existing.items.push(change);
      return;
    }

    groups.set(key, {
      key,
      changedAt: change.changed_at,
      userLabel:
        change.profile?.display_name ??
        change.profile?.email ??
        "Пользователь",
      fieldLabels: [fieldLabel],
      items: [change],
    });
  });

  return [...groups.values()];
}

function getFieldLabel(fieldName: string) {
  return fieldLabels[fieldName] ?? fieldName;
}
