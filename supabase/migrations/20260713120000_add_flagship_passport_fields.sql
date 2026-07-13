alter table public.projects
  add column if not exists flagship_client_current_state text,
  add column if not exists flagship_current_process text,
  add column if not exists flagship_scope text,
  add column if not exists flagship_client_usage text,
  add column if not exists flagship_result_users text,
  add column if not exists flagship_tech_stack text,
  add column if not exists flagship_available_data text,
  add column if not exists flagship_uncertain_data text,
  add column if not exists flagship_out_of_scope text,
  add column if not exists flagship_competitors text;
