import { NextResponse } from "next/server";

import {
  buildProjectDocumentDocx,
  getProjectDocumentFilename,
} from "@/lib/document/project-document-docx";
import { getProjectDetailPageData } from "@/lib/supabase/project-registry";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ProjectDocumentRouteProps = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: ProjectDocumentRouteProps) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { message: "Нужно войти в систему, чтобы скачать документ проекта." },
      { status: 401 },
    );
  }

  const { currentPassport, errorMessage, project } =
    await getProjectDetailPageData(id);

  if (errorMessage) {
    return NextResponse.json(
      {
        message:
          "Не удалось скачать документ проекта. Попробуйте позже.",
      },
      { status: 500 },
    );
  }

  if (!project) {
    return NextResponse.json(
      { message: "Проект не найден." },
      { status: 404 },
    );
  }

  const document = buildProjectDocumentDocx({
    currentPassport,
    project,
  });
  const filename = getProjectDocumentFilename(project);
  const encodedFilename = encodeURIComponent(filename);

  return new NextResponse(document, {
    headers: {
      "Content-Disposition": `attachment; filename=\"project-document.docx\"; filename*=UTF-8''${encodedFilename}`,
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Length": String(document.length),
    },
  });
}
