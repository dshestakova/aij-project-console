import { UserHeader } from "@/components/auth/user-header";
import { getCurrentProfile } from "@/lib/supabase/profiles";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AiAnalystPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const currentProfile = await getCurrentProfile();

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-950">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <UserHeader
          activePath="/ai-analyst"
          email={user?.email ?? "Пользователь"}
          role={currentProfile?.role}
        />

        <section className="flex flex-col gap-6 py-6">
          <section className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
            <p className="text-base font-semibold text-slate-950">
              AI-аналитик еще не подключен
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Эта защищенная страница подготовлена заранее. GigaChat и серверные
              ключи в этом PR не используются.
            </p>
          </section>
        </section>
      </div>
    </main>
  );
}
