export default function ProjectsPage() {
  return (
    <main className="min-h-screen bg-[#f5f7fb] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="border-b border-slate-200 pb-4">
          <p className="text-sm font-medium text-slate-500">
            AIJ Project Console
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-950 sm:text-3xl">
            Проекты
          </h1>
        </header>

        <section className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
          <p className="text-base font-semibold text-slate-950">
            Реестр проектов еще не подключен
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            Эта защищенная страница подготовлена для следующего этапа: схемы
            данных и карточек проектов.
          </p>
        </section>
      </section>
    </main>
  );
}
