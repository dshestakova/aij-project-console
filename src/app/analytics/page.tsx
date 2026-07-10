import { redirect } from "next/navigation";

import { PortfolioAnalytics } from "@/components/analytics/portfolio-analytics";
import { UserHeader } from "@/components/auth/user-header";
import { getPortfolioAnalyticsData } from "@/lib/analytics/portfolio";
import { getCurrentProfile } from "@/lib/supabase/profiles";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/analytics");
  }

  const [currentProfile, analyticsData] = await Promise.all([
    getCurrentProfile(),
    getPortfolioAnalyticsData(),
  ]);

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-950">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <UserHeader
          activePath="/analytics"
          email={user.email ?? "Пользователь"}
          role={currentProfile?.role}
        />

        <section className="flex flex-col gap-5 py-6">
          <div>
            <h2 className="text-2xl font-semibold text-slate-950">
              Аналитика портфеля
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
              Управленческий обзор активных проектов: статусы, отраслевые управления,
              CSM-матрица, директорская структура, флагманская готовность и
              качество заполнения карточек.
            </p>
          </div>

          <PortfolioAnalytics data={analyticsData} />
        </section>
      </div>
    </main>
  );
}
