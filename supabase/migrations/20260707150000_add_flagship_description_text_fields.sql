alter table public.projects
  add column if not exists flagship_problem_description text,
  add column if not exists flagship_solution_description text,
  add column if not exists flagship_ai_functionality text;
