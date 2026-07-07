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

export type UserRole = "admin" | "editor" | "viewer";

export type ProfileReference = {
  id: string;
  email: string | null;
  display_name: string | null;
  role: UserRole;
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
  cluster_id: string | null;
  status_id: string | null;
  flagship_status_id: string | null;
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
  flagship_problem_description: string | null;
  flagship_solution_description: string | null;
  flagship_ai_functionality: string | null;
  flagship_description_uploaded: boolean;
  flagship_passport_uploaded: boolean;
  flagship_innovation_level: "высокий" | "средний" | "низкий" | null;
  flagship_uploaded_to_prbr: boolean;
  flagship_approved_by_ca: boolean;
  csm_id: string | null;
  director_id: string | null;
  industry_unit_id: string | null;
  csm: PersonReference | null;
  director: PersonReference | null;
  industry_unit: Pick<ReferenceItem, "id" | "name"> | null;
};

export type ProjectEditReferences = {
  statuses: ReferenceItem[];
  clusters: ReferenceItem[];
  flagshipStatuses: ReferenceItem[];
  csms: PersonReference[];
  directors: PersonReference[];
  industryUnits: Array<Pick<ReferenceItem, "id" | "name">>;
};

export type ProjectChangeItem = {
  id: string;
  changed_at: string;
  changed_by: string | null;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  source: string | null;
  profile: ProfileReference | null;
};

export type ProjectRegistryData = {
  projects: ProjectListItem[];
  statuses: ReferenceItem[];
  clusters: ReferenceItem[];
  errorMessage: string | null;
};
