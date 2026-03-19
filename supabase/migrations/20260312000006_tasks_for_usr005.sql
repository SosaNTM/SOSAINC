-- Assign Denis (usr_005) to existing tasks + add personal tasks for him
-- so the Telegram bot returns meaningful results when linked as usr_005.

-- Re-assign some key tasks to Denis
UPDATE public.tasks SET assigned_to = 'usr_005' WHERE id IN ('GEN-1', 'WEB-5', 'MKT-3');

-- Add Denis-specific tasks
INSERT INTO public.tasks
  (id, title, description, status, priority, assigned_to, creator_id,
   labels, project_id, due_date, estimate, parent_id, created_at, updated_at)
VALUES
  ('DEN-1', 'Configura integrazione Telegram',
   'Completare setup bot Telegram per notifiche e briefing giornaliero.',
   'in_progress', 'high', 'usr_005', 'usr_005',
   ARRAY['Feature'], NULL, now() + interval '1 day', 3, NULL,
   now() - interval '1 day', now()),

  ('DEN-2', 'Review Q1 budget forecast',
   'Revisionare le previsioni di budget del primo trimestre con il team finance.',
   'todo', 'urgent', 'usr_005', 'usr_005',
   ARRAY['Improvement'], NULL, now(), 2, NULL,
   now() - interval '2 days', now() - interval '2 days'),

  ('DEN-3', 'Onboarding nuovo team member',
   'Preparare materiali onboarding e accessi per il nuovo sviluppatore.',
   'todo', 'medium', 'usr_005', 'usr_005',
   ARRAY['Docs'], NULL, now() + interval '3 days', 4, NULL,
   now() - interval '1 day', now() - interval '1 day'),

  ('DEN-4', 'Deploy staging environment',
   'Configurare ambiente di staging su Supabase per test pre-produzione.',
   'in_progress', 'high', 'usr_005', 'usr_005',
   ARRAY['Feature'], 'prj_03', now() + interval '5 days', 6, NULL,
   now() - interval '3 days', now())

ON CONFLICT (id) DO NOTHING;
