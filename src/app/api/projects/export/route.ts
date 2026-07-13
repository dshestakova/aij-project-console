import { NextResponse } from "next/server";

import {
  buildProjectRegistryCsv,
  getProjectRegistryExportFilename,
  type ProjectRegistryExportRow,
} from "@/lib/export/project-registry-csv";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { message: "Нужно войти в систему, чтобы скачать реестр." },
      { status: 401 },
    );
  }

  const { data, error } = await supabase
    .from("projects")
    .select(
      `
        external_id,
        client,
        project_name,
        essence,
        progress,
        next_step,
        funding,
        funding_status,
        is_social,
        comment,
        is_flagship,
        is_archived,
        flagship_client_current_state,
        flagship_current_process,
        flagship_scope,
        flagship_client_usage,
        flagship_result_users,
        flagship_tech_stack,
        flagship_available_data,
        flagship_uncertain_data,
        flagship_out_of_scope,
        flagship_competitors,
        flagship_description_uploaded,
        flagship_passport_uploaded,
        flagship_innovation_level,
        flagship_uploaded_to_prbr,
        flagship_approved_by_ca,
        source_payload,
        status:project_statuses(name),
        flagship_status:flagship_statuses(name),
        csm:people!projects_csm_id_fkey(full_name),
        director:people!projects_director_id_fkey(full_name),
        industry_unit:industry_units(name)
      `,
    )
    .order("external_id", { ascending: true });

  if (error) {
    return NextResponse.json(
      {
        message:
          "Не удалось подготовить экспорт. Проверьте доступ к реестру и попробуйте еще раз.",
      },
      { status: 500 },
    );
  }

  const csv = buildProjectRegistryCsv(
    (data ?? []) as unknown as ProjectRegistryExportRow[],
  );
  const filename = getProjectRegistryExportFilename();

  return new NextResponse(csv, {
    headers: {
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
}
