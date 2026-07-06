export type ColorKey =
  | "amber"
  | "blue"
  | "cyan"
  | "gray"
  | "green"
  | "indigo"
  | "rose"
  | "slate"
  | "violet"
  | string;

export type ReferenceItem = {
  id: string;
  name: string;
  color_key?: ColorKey | null;
  sort_order?: number | null;
};

export type PersonReference = {
  id: string;
  full_name: string;
  person_type: "csm" | "director";
  email?: string | null;
};

export type ProjectListItem = {
  id: string;
  external_id: string;
  client: string | null;
  project_name: string | null;
  is_flagship: boolean;
  is_archived: boolean;
  next_step: string | null;
  updated_at: string;
  cluster: ReferenceItem | null;
  status: ReferenceItem | null;
  flagship_status: ReferenceItem | null;
};

export type ProjectDetail = ProjectListItem & {
  essence: string | null;
  progress: string | null;
  funding: string | null;
  funding_status: string | null;
  comment: string | null;
  csm: PersonReference | null;
  director: PersonReference | null;
  industry_unit: Pick<ReferenceItem, "id" | "name"> | null;
};

export type ProjectRegistryData = {
  projects: ProjectListItem[];
  statuses: ReferenceItem[];
  clusters: ReferenceItem[];
  errorMessage: string | null;
};
