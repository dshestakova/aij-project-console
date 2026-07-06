import type { ReactNode } from "react";

import { getBadgeTone } from "@/lib/project-registry/colors";
import type { ColorKey } from "@/types/project-registry";

type BadgeProps = {
  children: ReactNode;
  colorKey?: ColorKey | null;
};

export function Badge({ children, colorKey }: BadgeProps) {
  return (
    <span
      className={`inline-flex min-h-7 w-fit items-center rounded-md border px-2.5 text-xs font-medium ${getBadgeTone(
        colorKey,
      )}`}
    >
      {children}
    </span>
  );
}
