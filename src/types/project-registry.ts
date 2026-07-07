export type ColorKey =
  | "amber"
  | "blue"
  | "blue-gray"
  | "blue-violet"
  | "cyan"
  | "gray"
  | "green"
  | "indigo"
  | "navy"
  | "orange"
  | "rose"
  | "slate"
  | "teal"
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
  flagship_description_uploaded: boolean;
  flagship_passport_uploaded: boolean;
  flagship_innovation_level: "высокий" | "средний" | "низкий" | null;
  flagship_uploaded_to_prbr: boolean;
  flagship_approved_by_ca: boolean;
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
