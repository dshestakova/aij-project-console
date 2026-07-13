"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import {
  saveAssignmentAction,
  saveFlagshipStatusAction,
  saveIndustryUnitAction,
  savePersonAction,
  saveProjectStatusAction,
  type AssignmentInput,
  type PersonInput,
  type ReferenceInput,
} from "@/app/admin/references/actions";
import type { ColorKey } from "@/types/project-registry";

export type AdminPersonReference = {
  id: string;
  full_name: string;
  person_type: "csm" | "director";
  email: string | null;
  is_active: boolean;
  project_count: number;
};

export type AdminNamedReference = {
  id: string;
  name: string;
  color_key: ColorKey | null;
  sort_order: number | null;
  is_active: boolean;
  project_count: number;
};

export type AdminAssignmentReference = {
  id: string;
  external_id: string;
  director_id: string;
  director_name: string;
  industry_unit_id: string;
  industry_unit_name: string;
  csm_id: string;
  csm_name: string;
  is_active: boolean;
  comment: string | null;
  sort_order: number | null;
  project_count: number;
};

type AdminReferencesPanelProps = {
  people: AdminPersonReference[];
  industryUnits: AdminNamedReference[];
  projectStatuses: AdminNamedReference[];
  flagshipStatuses: AdminNamedReference[];
  assignments: AdminAssignmentReference[];
};

type TabId =
  | "people"
  | "industry"
  | "projectStatuses"
  | "flagshipStatuses"
  | "assignments";

const tabs: Array<{ id: TabId; label: string }> = [
  { id: "people", label: "Люди" },
  { id: "industry", label: "Отраслевые управления" },
  { id: "projectStatuses", label: "Статусы проектов" },
  { id: "flagshipStatuses", label: "Статусы флагманов" },
  { id: "assignments", label: "Закрепления" },
];

const colorOptions: ColorKey[] = [
  "gray",
  "slate",
  "blue",
  "green",
  "amber",
  "orange",
  "rose",
  "cyan",
  "teal",
  "indigo",
  "violet",
  "blue-gray",
  "blue-violet",
  "navy",
];

const emptyPerson: PersonInput = {
  full_name: "",
  person_type: "csm",
  email: "",
  is_active: true,
};

const emptyReference: ReferenceInput = {
  name: "",
  color_key: "gray",
  sort_order: "",
  is_active: true,
};

const emptyAssignment: AssignmentInput = {
  director_id: "",
  industry_unit_id: "",
  csm_id: "",
  comment: "",
  sort_order: "",
  is_active: true,
};

export function AdminReferencesPanel({
  assignments,
  flagshipStatuses,
  industryUnits,
  people,
  projectStatuses,
}: AdminReferencesPanelProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("people");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [newPerson, setNewPerson] = useState<PersonInput>(emptyPerson);
  const [newIndustryUnit, setNewIndustryUnit] =
    useState<ReferenceInput>(emptyReference);
  const [newProjectStatus, setNewProjectStatus] =
    useState<ReferenceInput>(emptyReference);
  const [newFlagshipStatus, setNewFlagshipStatus] =
    useState<ReferenceInput>(emptyReference);
  const [newAssignment, setNewAssignment] =
    useState<AssignmentInput>(emptyAssignment);

  const [personDrafts, setPersonDrafts] = useState<Record<string, PersonInput>>(
    () =>
      Object.fromEntries(
        people.map((person) => [
          person.id,
          {
            id: person.id,
            full_name: person.full_name,
            person_type: person.person_type,
            email: person.email ?? "",
            is_active: person.is_active,
          },
        ]),
      ),
  );
  const [industryDrafts, setIndustryDrafts] = useState<
    Record<string, ReferenceInput>
  >(() => mapNamedDrafts(industryUnits));
  const [projectStatusDrafts, setProjectStatusDrafts] = useState<
    Record<string, ReferenceInput>
  >(() => mapNamedDrafts(projectStatuses));
  const [flagshipStatusDrafts, setFlagshipStatusDrafts] = useState<
    Record<string, ReferenceInput>
  >(() => mapNamedDrafts(flagshipStatuses));
  const [assignmentDrafts, setAssignmentDrafts] = useState<
    Record<string, AssignmentInput>
  >(() =>
    Object.fromEntries(
      assignments.map((assignment) => [
        assignment.id,
        {
          id: assignment.id,
          director_id: assignment.director_id,
          industry_unit_id: assignment.industry_unit_id,
          csm_id: assignment.csm_id,
          comment: assignment.comment ?? "",
          sort_order: assignment.sort_order ?? "",
          is_active: assignment.is_active,
        },
      ]),
    ),
  );

  const directors = useMemo(
    () => people.filter((person) => person.person_type === "director"),
    [people],
  );
  const csms = useMemo(
    () => people.filter((person) => person.person_type === "csm"),
    [people],
  );

  function runAction<T>(
    action: (input: T) => Promise<{ ok: boolean; message: string }>,
    input: T,
    onSuccess?: () => void,
  ) {
    setMessage(null);
    startTransition(async () => {
      const result = await action(input);
      setMessage(result.message);

      if (result.ok) {
        onSuccess?.();
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <nav className="flex gap-2 overflow-x-auto rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
        {tabs.map((tab) => (
          <button
            className={`h-10 shrink-0 rounded-md px-3 text-sm font-medium transition ${
              activeTab === tab.id
                ? "bg-slate-950 text-white"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
            }`}
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {message ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm font-medium text-slate-700 shadow-sm">
          {message}
        </div>
      ) : null}

      {activeTab === "people" ? (
        <Section
          description="CSM и директора используются в карточках проектов, фильтрах и закреплениях."
          title="Люди"
        >
          <CreateGrid>
            <TextField
              label="ФИО"
              onChange={(full_name) =>
                setNewPerson((draft) => ({ ...draft, full_name }))
              }
              value={newPerson.full_name}
            />
            <SelectField
              label="Роль"
              onChange={(person_type) =>
                setNewPerson((draft) => ({
                  ...draft,
                  person_type: person_type as PersonInput["person_type"],
                }))
              }
              options={[
                { value: "csm", label: "CSM" },
                { value: "director", label: "Директор" },
              ]}
              value={newPerson.person_type}
            />
            <TextField
              label="Email"
              onChange={(email) => setNewPerson((draft) => ({ ...draft, email }))}
              value={newPerson.email ?? ""}
            />
            <ActiveField
              checked={newPerson.is_active}
              onChange={(is_active) =>
                setNewPerson((draft) => ({ ...draft, is_active }))
              }
            />
            <SaveButton
              disabled={isPending}
              label="Добавить"
              onClick={() =>
                runAction(savePersonAction, newPerson, () =>
                  setNewPerson(emptyPerson),
                )
              }
            />
          </CreateGrid>

          <div className="grid gap-3">
            {people.map((person) => {
              const draft = personDrafts[person.id] ?? {
                id: person.id,
                full_name: person.full_name,
                person_type: person.person_type,
                email: person.email ?? "",
                is_active: person.is_active,
              };

              return (
                <ReferenceCard key={person.id}>
                  <TextField
                    label="ФИО"
                    onChange={(full_name) =>
                      setPersonDrafts((drafts) => ({
                        ...drafts,
                        [person.id]: { ...draft, full_name },
                      }))
                    }
                    value={draft.full_name}
                  />
                  <SelectField
                    label="Роль"
                    onChange={(person_type) =>
                      setPersonDrafts((drafts) => ({
                        ...drafts,
                        [person.id]: {
                          ...draft,
                          person_type:
                            person_type as PersonInput["person_type"],
                        },
                      }))
                    }
                    options={[
                      { value: "csm", label: "CSM" },
                      { value: "director", label: "Директор" },
                    ]}
                    value={draft.person_type}
                  />
                  <TextField
                    label="Email"
                    onChange={(email) =>
                      setPersonDrafts((drafts) => ({
                        ...drafts,
                        [person.id]: { ...draft, email },
                      }))
                    }
                    value={draft.email ?? ""}
                  />
                  <Metric label="Активных проектов" value={person.project_count} />
                  <ActiveField
                    checked={draft.is_active}
                    onChange={(is_active) =>
                      setPersonDrafts((drafts) => ({
                        ...drafts,
                        [person.id]: { ...draft, is_active },
                      }))
                    }
                  />
                  <SaveButton
                    disabled={isPending}
                    label="Сохранить"
                    onClick={() => runAction(savePersonAction, draft)}
                  />
                </ReferenceCard>
              );
            })}
          </div>
        </Section>
      ) : null}

      {activeTab === "industry" ? (
        <NamedReferenceSection
          drafts={industryDrafts}
          items={industryUnits}
          newItem={newIndustryUnit}
          onCreate={(input) =>
            runAction(saveIndustryUnitAction, input, () =>
              setNewIndustryUnit(emptyReference),
            )
          }
          onDraftChange={setIndustryDrafts}
          onNewChange={setNewIndustryUnit}
          onSave={(input) => runAction(saveIndustryUnitAction, input)}
          title="Отраслевые управления"
        />
      ) : null}

      {activeTab === "projectStatuses" ? (
        <NamedReferenceSection
          drafts={projectStatusDrafts}
          items={projectStatuses}
          newItem={newProjectStatus}
          onCreate={(input) =>
            runAction(saveProjectStatusAction, input, () =>
              setNewProjectStatus(emptyReference),
            )
          }
          onDraftChange={setProjectStatusDrafts}
          onNewChange={setNewProjectStatus}
          onSave={(input) => runAction(saveProjectStatusAction, input)}
          title="Статусы проектов"
        />
      ) : null}

      {activeTab === "flagshipStatuses" ? (
        <NamedReferenceSection
          drafts={flagshipStatusDrafts}
          items={flagshipStatuses}
          newItem={newFlagshipStatus}
          onCreate={(input) =>
            runAction(saveFlagshipStatusAction, input, () =>
              setNewFlagshipStatus(emptyReference),
            )
          }
          onDraftChange={setFlagshipStatusDrafts}
          onNewChange={setNewFlagshipStatus}
          onSave={(input) => runAction(saveFlagshipStatusAction, input)}
          title="Статусы флагманов"
        />
      ) : null}

      {activeTab === "assignments" ? (
        <Section
          description="Закрепления связывают директора, отраслевое управление и CSM. Старые строки можно выключать без удаления."
          title="Закрепления"
        >
          <CreateGrid>
            <SelectField
              label="Директор"
              onChange={(director_id) =>
                setNewAssignment((draft) => ({ ...draft, director_id }))
              }
              options={directors.map((director) => ({
                value: director.id,
                label: withInactiveSuffix(director.full_name, director.is_active),
              }))}
              placeholder="Выберите директора"
              value={newAssignment.director_id}
            />
            <SelectField
              label="Отраслевое управление"
              onChange={(industry_unit_id) =>
                setNewAssignment((draft) => ({ ...draft, industry_unit_id }))
              }
              options={industryUnits.map((unit) => ({
                value: unit.id,
                label: withInactiveSuffix(unit.name, unit.is_active),
              }))}
              placeholder="Выберите управление"
              value={newAssignment.industry_unit_id}
            />
            <SelectField
              label="CSM"
              onChange={(csm_id) =>
                setNewAssignment((draft) => ({ ...draft, csm_id }))
              }
              options={csms.map((csm) => ({
                value: csm.id,
                label: withInactiveSuffix(csm.full_name, csm.is_active),
              }))}
              placeholder="Выберите CSM"
              value={newAssignment.csm_id}
            />
            <TextField
              label="Комментарий"
              onChange={(comment) =>
                setNewAssignment((draft) => ({ ...draft, comment }))
              }
              value={newAssignment.comment ?? ""}
            />
            <NumberField
              label="Порядок"
              onChange={(sort_order) =>
                setNewAssignment((draft) => ({ ...draft, sort_order }))
              }
              value={newAssignment.sort_order}
            />
            <ActiveField
              checked={newAssignment.is_active}
              onChange={(is_active) =>
                setNewAssignment((draft) => ({ ...draft, is_active }))
              }
            />
            <SaveButton
              disabled={isPending}
              label="Добавить"
              onClick={() =>
                runAction(saveAssignmentAction, newAssignment, () =>
                  setNewAssignment(emptyAssignment),
                )
              }
            />
          </CreateGrid>

          <div className="grid gap-3">
            {assignments.map((assignment) => {
              const draft = assignmentDrafts[assignment.id] ?? {
                id: assignment.id,
                director_id: assignment.director_id,
                industry_unit_id: assignment.industry_unit_id,
                csm_id: assignment.csm_id,
                comment: assignment.comment ?? "",
                sort_order: assignment.sort_order ?? "",
                is_active: assignment.is_active,
              };

              return (
                <ReferenceCard key={assignment.id}>
                  <SelectField
                    label="Директор"
                    onChange={(director_id) =>
                      setAssignmentDrafts((drafts) => ({
                        ...drafts,
                        [assignment.id]: { ...draft, director_id },
                      }))
                    }
                    options={directors.map((director) => ({
                      value: director.id,
                      label: withInactiveSuffix(
                        director.full_name,
                        director.is_active,
                      ),
                    }))}
                    value={draft.director_id}
                  />
                  <SelectField
                    label="Отраслевое управление"
                    onChange={(industry_unit_id) =>
                      setAssignmentDrafts((drafts) => ({
                        ...drafts,
                        [assignment.id]: { ...draft, industry_unit_id },
                      }))
                    }
                    options={industryUnits.map((unit) => ({
                      value: unit.id,
                      label: withInactiveSuffix(unit.name, unit.is_active),
                    }))}
                    value={draft.industry_unit_id}
                  />
                  <SelectField
                    label="CSM"
                    onChange={(csm_id) =>
                      setAssignmentDrafts((drafts) => ({
                        ...drafts,
                        [assignment.id]: { ...draft, csm_id },
                      }))
                    }
                    options={csms.map((csm) => ({
                      value: csm.id,
                      label: withInactiveSuffix(csm.full_name, csm.is_active),
                    }))}
                    value={draft.csm_id}
                  />
                  <TextField
                    label="Комментарий"
                    onChange={(comment) =>
                      setAssignmentDrafts((drafts) => ({
                        ...drafts,
                        [assignment.id]: { ...draft, comment },
                      }))
                    }
                    value={draft.comment ?? ""}
                  />
                  <NumberField
                    label="Порядок"
                    onChange={(sort_order) =>
                      setAssignmentDrafts((drafts) => ({
                        ...drafts,
                        [assignment.id]: { ...draft, sort_order },
                      }))
                    }
                    value={draft.sort_order}
                  />
                  <Metric
                    label="Активных проектов"
                    value={assignment.project_count}
                  />
                  <ActiveField
                    checked={draft.is_active}
                    onChange={(is_active) =>
                      setAssignmentDrafts((drafts) => ({
                        ...drafts,
                        [assignment.id]: { ...draft, is_active },
                      }))
                    }
                  />
                  <SaveButton
                    disabled={isPending}
                    label="Сохранить"
                    onClick={() => runAction(saveAssignmentAction, draft)}
                  />
                </ReferenceCard>
              );
            })}
          </div>
        </Section>
      ) : null}
    </div>
  );
}

function NamedReferenceSection({
  drafts,
  items,
  newItem,
  onCreate,
  onDraftChange,
  onNewChange,
  onSave,
  title,
}: {
  drafts: Record<string, ReferenceInput>;
  items: AdminNamedReference[];
  newItem: ReferenceInput;
  onCreate: (input: ReferenceInput) => void;
  onDraftChange: (drafts: Record<string, ReferenceInput>) => void;
  onNewChange: (input: ReferenceInput) => void;
  onSave: (input: ReferenceInput) => void;
  title: string;
}) {
  return (
    <Section
      description="Неактивные значения остаются в истории и старых проектах, но не попадают в обычные выпадающие списки."
      title={title}
    >
      <CreateGrid>
        <TextField
          label="Название"
          onChange={(name) => onNewChange({ ...newItem, name })}
          value={newItem.name}
        />
        <SelectField
          label="Цвет"
          onChange={(color_key) =>
            onNewChange({ ...newItem, color_key: color_key as ColorKey })
          }
          options={colorOptions.map((color) => ({ value: color, label: color }))}
          value={newItem.color_key ?? "gray"}
        />
        <NumberField
          label="Порядок"
          onChange={(sort_order) => onNewChange({ ...newItem, sort_order })}
          value={newItem.sort_order}
        />
        <ActiveField
          checked={newItem.is_active}
          onChange={(is_active) => onNewChange({ ...newItem, is_active })}
        />
        <SaveButton label="Добавить" onClick={() => onCreate(newItem)} />
      </CreateGrid>

      <div className="grid gap-3">
        {items.map((item) => {
          const draft = drafts[item.id] ?? {
            id: item.id,
            name: item.name,
            color_key: item.color_key ?? "gray",
            sort_order: item.sort_order ?? "",
            is_active: item.is_active,
          };

          return (
            <ReferenceCard key={item.id}>
              <TextField
                label="Название"
                onChange={(name) =>
                  onDraftChange({
                    ...drafts,
                    [item.id]: { ...draft, name },
                  })
                }
                value={draft.name}
              />
              <SelectField
                label="Цвет"
                onChange={(color_key) =>
                  onDraftChange({
                    ...drafts,
                    [item.id]: { ...draft, color_key: color_key as ColorKey },
                  })
                }
                options={colorOptions.map((color) => ({
                  value: color,
                  label: color,
                }))}
                value={draft.color_key ?? "gray"}
              />
              <NumberField
                label="Порядок"
                onChange={(sort_order) =>
                  onDraftChange({
                    ...drafts,
                    [item.id]: { ...draft, sort_order },
                  })
                }
                value={draft.sort_order}
              />
              <Metric label="Активных проектов" value={item.project_count} />
              <ActiveField
                checked={draft.is_active}
                onChange={(is_active) =>
                  onDraftChange({
                    ...drafts,
                    [item.id]: { ...draft, is_active },
                  })
                }
              />
              <SaveButton label="Сохранить" onClick={() => onSave(draft)} />
            </ReferenceCard>
          );
        })}
      </div>
    </Section>
  );
}

function Section({
  children,
  description,
  title,
}: {
  children: React.ReactNode;
  description: string;
  title: string;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-5">
        <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
          {description}
        </p>
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

function CreateGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2 lg:grid-cols-4">
      {children}
    </div>
  );
}

function ReferenceCard({ children }: { children: React.ReactNode }) {
  return (
    <article className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
      {children}
    </article>
  );
}

function TextField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-sm font-medium text-slate-700">
      {label}
      <input
        className="h-10 min-w-0 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}

function NumberField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string | number | undefined;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-sm font-medium text-slate-700">
      {label}
      <input
        className="h-10 min-w-0 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
        onChange={(event) => onChange(event.target.value)}
        type="number"
        value={value ?? ""}
      />
    </label>
  );
}

function SelectField({
  label,
  onChange,
  options,
  placeholder,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  value: string;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-sm font-medium text-slate-700">
      {label}
      <select
        className="h-10 min-w-0 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ActiveField({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex h-full min-h-16 items-center gap-3 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700">
      <input
        checked={checked}
        className="size-4 rounded border-slate-300"
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <span>{checked ? "Активен" : "Выключен"}</span>
    </label>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex min-h-16 flex-col justify-center rounded-md border border-slate-200 bg-slate-50 px-3">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <span className="text-lg font-semibold text-slate-950">{value}</span>
    </div>
  );
}

function SaveButton({
  disabled,
  label,
  onClick,
}: {
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="h-10 self-end rounded-md bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {disabled ? "Сохраняем..." : label}
    </button>
  );
}

function mapNamedDrafts(items: AdminNamedReference[]) {
  return Object.fromEntries(
    items.map((item) => [
      item.id,
      {
        id: item.id,
        name: item.name,
        color_key: item.color_key ?? "gray",
        sort_order: item.sort_order ?? "",
        is_active: item.is_active,
      },
    ]),
  );
}

function withInactiveSuffix(label: string, isActive: boolean) {
  return isActive ? label : `${label} (выключен)`;
}
