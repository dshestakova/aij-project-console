export type PassportFillerProjectInput = {
  project_name: string;
  client_name: string;
  industry: string;
  csm_name: string;
  tb_gosb: string;
  segment: string;
  esg_type: string;
  start_period: string;
  end_period: string;
  core_impact: string;
  problem: string;
  solution: string;
  functionality: string;
  analogs: string;
  client_effect: string;
  sber_effect: string;
  current_process: string;
  client_usage: string;
  tech_stack: string;
  raw_source_text: string;
};

export type PassportFillerProjectStatus =
  | "queued"
  | "processing"
  | "improve_loop"
  | "completed"
  | "failed"
  | "revise"
  | "escalated";

export type PassportFillerCreateProjectResponse = {
  id: string;
  project_name?: string;
  queued?: boolean;
};

export type PassportFillerStartResponse = {
  queued: boolean;
};

export type PassportFillerProjectState = {
  id: string;
  status: PassportFillerProjectStatus;
  working?: Partial<PassportFillerProjectInput>;
  source?: Partial<PassportFillerProjectInput>;
  passport_json?: Partial<PassportFillerProjectInput>;
  final_assessment?: {
    rating?: string;
    rating_reason?: string;
    recommendations?: string;
    csm_argument?: string;
    analogues?: Array<Record<string, unknown>>;
    path_to_high?: string[];
  } | null;
  error?: string | null;
  passport_xlsx_path?: string | null;
  updated_at?: string;
};

export type PassportFillerErrorCode =
  | "disabled"
  | "unauthorized"
  | "not_found"
  | "bad_request"
  | "timeout"
  | "network"
  | "upstream"
  | "unknown";

export class PassportFillerError extends Error {
  code: PassportFillerErrorCode;
  status?: number;
  retriable: boolean;

  constructor(
    message: string,
    options: {
      code: PassportFillerErrorCode;
      status?: number;
      retriable?: boolean;
    },
  ) {
    super(message);
    this.name = "PassportFillerError";
    this.code = options.code;
    this.status = options.status;
    this.retriable = options.retriable ?? false;
  }
}
