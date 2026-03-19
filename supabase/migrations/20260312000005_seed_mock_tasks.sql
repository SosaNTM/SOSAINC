-- Seed mock projects and tasks mirroring INITIAL_PROJECTS / INITIAL_ISSUES
-- from src/lib/linearStore.ts so the Telegram bot can query them.
-- Dates are expressed relative to now() so they stay meaningful over time.

-- ── Projects ───────────────────────────────────────────────────────────────
INSERT INTO public.projects (id, user_id, name, description, status, created_at, updated_at)
VALUES
  ('prj_01', 'usr_001', 'Website Redesign',
   'Complete overhaul of the company website with new branding and improved UX.',
   'in_progress', now() - interval '30 days', now() - interval '1 day'),

  ('prj_02', 'usr_001', 'Q1 Marketing Push',
   'Execute the Q1 marketing campaign across all channels.',
   'in_progress', now() - interval '20 days', now() - interval '1 day'),

  ('prj_03', 'usr_001', 'Infrastructure Upgrade',
   'Migrate core infrastructure to improve performance and reliability.',
   'planning', now() - interval '10 days', now() - interval '2 days')
ON CONFLICT (id) DO NOTHING;

-- ── Tasks ──────────────────────────────────────────────────────────────────
INSERT INTO public.tasks
  (id, title, description, status, priority, assigned_to, creator_id,
   labels, project_id, due_date, estimate, parent_id, created_at, updated_at)
VALUES

  -- Website Redesign
  ('WEB-1', 'Create wireframes for homepage',
   'Design low-fi wireframes for the new homepage layout including hero, features, and CTA sections.',
   'done', 'high', 'usr_004', 'usr_001',
   ARRAY['Design'], 'prj_01', now() - interval '2 days', 5, NULL,
   now() - interval '14 days', now() - interval '2 days'),

  ('WEB-4', 'Design new color system',
   'Create a cohesive color palette with semantic tokens for the new brand.',
   'in_progress', 'high', 'usr_004', 'usr_001',
   ARRAY['Design'], 'prj_01', now() + interval '3 days', 5, NULL,
   now() - interval '7 days', now() - interval '1 day'),

  ('WEB-5', 'Implement responsive navigation',
   'Build the main nav component with mobile hamburger menu.',
   'todo', 'medium', 'usr_002', 'usr_001',
   ARRAY['Feature'], 'prj_01', now() + interval '10 days', 8, NULL,
   now() - interval '5 days', now() - interval '5 days'),

  ('WEB-6', 'Fix header z-index issue',
   'Header overlaps with modal on mobile Safari.',
   'backlog', 'low', NULL, 'usr_002',
   ARRAY['Bug'], 'prj_01', NULL, 1, NULL,
   now() - interval '3 days', now() - interval '3 days'),

  -- Marketing
  ('MKT-1', 'Write blog post series',
   'Create 4-part blog series on industry trends for Q1.',
   'in_progress', 'high', 'usr_003', 'usr_001',
   ARRAY['Feature','Docs'], 'prj_02', now() + interval '5 days', 8, NULL,
   now() - interval '10 days', now() - interval '1 day'),

  ('MKT-2', 'SEO optimization for blog posts',
   'Research keywords and optimize meta tags.',
   'todo', 'medium', 'usr_003', 'usr_003',
   ARRAY['Improvement'], 'prj_02', now() + interval '7 days', 3, 'MKT-1',
   now() - interval '8 days', now() - interval '8 days'),

  ('MKT-3', 'Launch social media campaign',
   'Schedule and launch posts across Instagram, LinkedIn, YouTube.',
   'in_review', 'urgent', 'usr_003', 'usr_001',
   ARRAY['Feature'], 'prj_02', now() + interval '1 day', 5, NULL,
   now() - interval '6 days', now()),

  -- Infrastructure
  ('INF-1', 'Audit current database performance',
   'Run benchmarks and identify bottlenecks in the current setup.',
   'todo', 'high', 'usr_002', 'usr_001',
   ARRAY['Improvement'], 'prj_03', now() + interval '7 days', 5, NULL,
   now() - interval '4 days', now() - interval '4 days'),

  ('INF-3', 'Set up staging environment',
   'Create a staging env that mirrors production for testing migrations.',
   'backlog', 'medium', 'usr_002', 'usr_002',
   ARRAY['Feature'], 'prj_03', now() + interval '30 days', 8, NULL,
   now() - interval '3 days', now() - interval '3 days'),

  -- General (assigned to usr_001 — the owner/you)
  ('GEN-1', 'Update company-wide password policy',
   'Review and strengthen password requirements across all systems.',
   'todo', 'medium', 'usr_001', 'usr_001',
   ARRAY['Improvement'], NULL, now() + interval '14 days', 2, NULL,
   now() - interval '2 days', now() - interval '2 days')

ON CONFLICT (id) DO NOTHING;
