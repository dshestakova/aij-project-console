import { publicEnvStatus } from "@/lib/env";

const summaryCards = [
  { label: "Всего проектов", value: "0", detail: "Реестр ожидает импорт" },
  { label: "Флагманские", value: "0", detail: "Паспортный трекинг пуст" },
  { label: "В разработке", value: "0", detail: "Статусы не загружены" },
];

const statusItems = [
  { label: "идея/КП", value: "0", tone: "bg-amber-100 text-amber-800" },
  { label: "факт оплаты", value: "0", tone: "bg-emerald-100 text-emerald-800" },
  { label: "уточнение ТЗ", value: "0", tone: "bg-sky-100 text-sky-800" },
  { label: "в разработке", value: "0", tone: "bg-indigo-100 text-indigo-800" },
  { label: "на паузе", value: "0", tone: "bg-slate-200 text-slate-700" },
];

const filterLabels = ["Флагман", "CSM", "Директор", "Кластер", "Статус"];

const navigationItems = [
  "Дашборд",
  "Проекты",
  "История",
  "Файлы",
  "Экспорт",
];

export default function DashboardPage() {
  const supabaseStatus = publicEnvStatus.isSupabaseConfigured
    ? {
        label: "Supabase env настроены",
        tone: "border-emerald-200 bg-emerald-50 text-emerald-800",
      }
    : {
        label: "Supabase env не настроены",
        tone: "border-amber-200 bg-amber-50 text-amber-800",
      };

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-950">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-slate-200 pb-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">AIJ Project Console</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-950 sm:text-3xl">
              Реестр AIJ-проектов
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-slate-800">Dariya</p>
              <p className="text-xs text-slate-500">admin</p>
            </div>
            <div className="grid size-10 place-items-center rounded-full bg-slate-900 text-sm font-semibold text-white">
              DS
            </div>
          </div>
        </header>

        <div className="grid min-w-0 flex-1 gap-6 py-6 lg:grid-cols-[220px_1fr]">
          <aside className="min-w-0 lg:border-r lg:border-slate-200 lg:pr-6">
            <nav className="flex max-w-full gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
              {navigationItems.map((item, index) => (
                <button
                  className={`h-10 shrink-0 rounded-md px-3 text-left text-sm font-medium transition ${
                    index === 0
                      ? "bg-slate-950 text-white"
                      : "text-slate-600 hover:bg-white hover:text-slate-950"
                  }`}
                  key={item}
                  type="button"
                >
                  {item}
                </button>
              ))}
            </nav>
          </aside>

          <section className="flex min-w-0 flex-col gap-6">
            <div className="grid gap-3 sm:grid-cols-3">
              {summaryCards.map((card) => (
                <article
                  className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                  key={card.label}
                >
                  <p className="text-sm font-medium text-slate-500">{card.label}</p>
                  <p className="mt-3 text-3xl font-semibold text-slate-950">{card.value}</p>
                  <p className="mt-2 text-sm text-slate-500">{card.detail}</p>
                </article>
              ))}
            </div>

            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-slate-950">
                    Распределение по статусам
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Данные появятся после импорта текущего реестра.
                  </p>
                </div>
                <div className="flex min-w-0 flex-wrap gap-2">
                  {statusItems.map((status) => (
                    <span
                      className={`inline-flex min-h-8 items-center gap-2 rounded-md px-3 text-sm font-medium ${status.tone}`}
                      key={status.label}
                    >
                      <span>{status.label}</span>
                      <span>{status.value}</span>
                    </span>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">
                    Подключения
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Проверяется только наличие публичных переменных окружения.
                  </p>
                </div>
                <span
                  className={`inline-flex min-h-8 w-fit items-center rounded-md border px-3 text-sm font-medium ${supabaseStatus.tone}`}
                >
                  {supabaseStatus.label}
                </span>
              </div>
            </section>

            <section className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-950">Проекты</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Основной реестр скрывает архивные проекты по умолчанию.
                  </p>
                </div>
                <button
                  className="h-10 rounded-md bg-slate-950 px-4 text-sm font-medium text-white shadow-sm"
                  type="button"
                >
                  Экспорт CSV
                </button>
              </div>

              <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                <label className="block">
                  <span className="sr-only">Поиск проектов</span>
                  <input
                    className="h-11 w-full rounded-md border border-slate-200 bg-white px-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                    placeholder="ID, клиент, название или описание"
                    type="search"
                  />
                </label>
                <div className="flex max-w-full gap-2 overflow-x-auto pb-1 lg:pb-0">
                  {filterLabels.map((label) => (
                    <button
                      className="h-11 shrink-0 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600"
                      key={label}
                      type="button"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
                <p className="text-base font-semibold text-slate-950">Проекты не загружены</p>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                  Следующий этап подготовит подключение к Supabase и структуру данных для
                  импорта CSV/XLSX.
                </p>
              </div>
            </section>
          </section>
        </div>
      </div>
    </main>
  );
}
