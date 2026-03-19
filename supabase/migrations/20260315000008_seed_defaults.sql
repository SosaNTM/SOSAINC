-- Seed default data for a newly created portal
-- Called by trigger after portal is created, or manually for existing portals.

CREATE OR REPLACE FUNCTION public.seed_portal_defaults(p_portal_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- ── portal_profiles ────────────────────────────────────────────────
  INSERT INTO public.portal_profiles (portal_id)
  VALUES (p_portal_id)
  ON CONFLICT (portal_id) DO NOTHING;

  -- ── appearance_settings ────────────────────────────────────────────
  INSERT INTO public.appearance_settings (portal_id)
  VALUES (p_portal_id)
  ON CONFLICT (portal_id) DO NOTHING;

  -- ── currency_settings ──────────────────────────────────────────────
  INSERT INTO public.currency_settings (portal_id)
  VALUES (p_portal_id)
  ON CONFLICT (portal_id) DO NOTHING;

  -- ── social_publishing_rules ────────────────────────────────────────
  INSERT INTO public.social_publishing_rules (portal_id)
  VALUES (p_portal_id)
  ON CONFLICT (portal_id) DO NOTHING;

  -- ── income_categories ──────────────────────────────────────────────
  INSERT INTO public.income_categories (portal_id, name, icon, color, sort_order) VALUES
    (p_portal_id, 'Stipendio',         'Briefcase',    '#22C55E', 0),
    (p_portal_id, 'Freelance',         'Laptop',       '#3B82F6', 1),
    (p_portal_id, 'Investimenti',      'TrendingUp',   '#8B5CF6', 2),
    (p_portal_id, 'Affitti',           'Home',         '#F59E0B', 3),
    (p_portal_id, 'Rimborsi',          'RefreshCw',    '#06B6D4', 4),
    (p_portal_id, 'Altro',             'Plus',         '#6B7280', 5)
  ON CONFLICT DO NOTHING;

  -- ── expense_categories ─────────────────────────────────────────────
  INSERT INTO public.expense_categories (portal_id, name, icon, color, sort_order) VALUES
    (p_portal_id, 'Affitto/Mutuo',     'Home',         '#EF4444', 0),
    (p_portal_id, 'Alimentari',        'ShoppingCart', '#F97316', 1),
    (p_portal_id, 'Trasporti',         'Car',          '#EAB308', 2),
    (p_portal_id, 'Salute',            'Heart',        '#EC4899', 3),
    (p_portal_id, 'Intrattenimento',   'Music',        '#8B5CF6', 4),
    (p_portal_id, 'Abbigliamento',     'Shirt',        '#06B6D4', 5),
    (p_portal_id, 'Formazione',        'BookOpen',     '#3B82F6', 6),
    (p_portal_id, 'Utenze',            'Zap',          '#F59E0B', 7),
    (p_portal_id, 'Assicurazioni',     'Shield',       '#6B7280', 8),
    (p_portal_id, 'Viaggi',            'Plane',        '#10B981', 9),
    (p_portal_id, 'Altro',             'Plus',         '#6B7280', 10)
  ON CONFLICT DO NOTHING;

  -- ── subscription_categories ────────────────────────────────────────
  INSERT INTO public.subscription_categories (portal_id, name, icon, color, billing_cycle, sort_order) VALUES
    (p_portal_id, 'Streaming',         'Play',         '#EF4444', 'monthly',  0),
    (p_portal_id, 'Software',          'Monitor',      '#3B82F6', 'monthly',  1),
    (p_portal_id, 'Cloud Storage',     'Cloud',        '#06B6D4', 'annual',   2),
    (p_portal_id, 'Notizie & Media',   'Newspaper',    '#F59E0B', 'monthly',  3),
    (p_portal_id, 'Fitness',           'Activity',     '#22C55E', 'monthly',  4),
    (p_portal_id, 'Gaming',            'Gamepad2',     '#8B5CF6', 'monthly',  5),
    (p_portal_id, 'Produttività',      'Zap',          '#EC4899', 'annual',   6),
    (p_portal_id, 'Sicurezza',         'Shield',       '#6B7280', 'annual',   7),
    (p_portal_id, 'Altro',             'Plus',         '#9CA3AF', 'monthly',  8)
  ON CONFLICT DO NOTHING;

  -- ── payment_methods ────────────────────────────────────────────────
  INSERT INTO public.payment_methods (portal_id, name, type, is_default, sort_order) VALUES
    (p_portal_id, 'Carta di Credito',  'card',    true,  0),
    (p_portal_id, 'Conto Corrente',    'bank',    false, 1),
    (p_portal_id, 'Contanti',          'cash',    false, 2)
  ON CONFLICT DO NOTHING;

  -- ── project_statuses ──────────────────────────────────────────────
  INSERT INTO public.project_statuses (portal_id, name, color, icon, is_default, is_final, sort_order) VALUES
    (p_portal_id, 'Backlog',      '#6B7280', 'Circle',       true,  false, 0),
    (p_portal_id, 'In Progress',  '#3B82F6', 'PlayCircle',   false, false, 1),
    (p_portal_id, 'In Review',    '#F59E0B', 'Eye',          false, false, 2),
    (p_portal_id, 'Done',         '#22C55E', 'CheckCircle2', false, true,  3),
    (p_portal_id, 'Cancelled',    '#EF4444', 'XCircle',      false, true,  4)
  ON CONFLICT DO NOTHING;

  -- ── task_priorities ────────────────────────────────────────────────
  INSERT INTO public.task_priorities (portal_id, name, color, icon, level, is_default, sort_order) VALUES
    (p_portal_id, 'Urgente',    '#EF4444', 'AlertOctagon', 4, false, 0),
    (p_portal_id, 'Alta',       '#F97316', 'Flag',         3, false, 1),
    (p_portal_id, 'Media',      '#F59E0B', 'Flag',         2, true,  2),
    (p_portal_id, 'Bassa',      '#3B82F6', 'Flag',         1, false, 3),
    (p_portal_id, 'Minima',     '#6B7280', 'Minus',        0, false, 4)
  ON CONFLICT DO NOTHING;

  -- ── task_labels ────────────────────────────────────────────────────
  INSERT INTO public.task_labels (portal_id, name, color) VALUES
    (p_portal_id, 'Bug',        '#EF4444'),
    (p_portal_id, 'Feature',    '#3B82F6'),
    (p_portal_id, 'Design',     '#8B5CF6'),
    (p_portal_id, 'Backend',    '#22C55E'),
    (p_portal_id, 'Frontend',   '#F59E0B'),
    (p_portal_id, 'Docs',       '#06B6D4'),
    (p_portal_id, 'Marketing',  '#EC4899')
  ON CONFLICT DO NOTHING;

  -- ── notification_channels ──────────────────────────────────────────
  INSERT INTO public.notification_channels (portal_id, channel_type, is_enabled) VALUES
    (p_portal_id, 'in_app',         true),
    (p_portal_id, 'email',          true),
    (p_portal_id, 'telegram',       false),
    (p_portal_id, 'browser_push',   false)
  ON CONFLICT (portal_id, channel_type) DO NOTHING;

  -- ── content_categories ────────────────────────────────────────────
  INSERT INTO public.content_categories (portal_id, name, color, sort_order) VALUES
    (p_portal_id, 'Educational',    '#3B82F6', 0),
    (p_portal_id, 'Promotional',    '#EF4444', 1),
    (p_portal_id, 'Behind Scenes',  '#8B5CF6', 2),
    (p_portal_id, 'User Generated', '#22C55E', 3),
    (p_portal_id, 'Trending',       '#F59E0B', 4),
    (p_portal_id, 'News',           '#06B6D4', 5),
    (p_portal_id, 'Tutorials',      '#EC4899', 6),
    (p_portal_id, 'Altro',          '#6B7280', 7)
  ON CONFLICT DO NOTHING;

  -- ── tax_rates ──────────────────────────────────────────────────────
  INSERT INTO public.tax_rates (portal_id, name, rate, is_default, applies_to) VALUES
    (p_portal_id, 'IVA 22%',   22.00, true,  'both'),
    (p_portal_id, 'IVA 10%',   10.00, false, 'both'),
    (p_portal_id, 'IVA 4%',     4.00, false, 'both'),
    (p_portal_id, 'Esente',     0.00, false, 'both')
  ON CONFLICT DO NOTHING;

  -- ── departments ────────────────────────────────────────────────────
  INSERT INTO public.departments (portal_id, name, color, sort_order) VALUES
    (p_portal_id, 'Management',   '#C6A961', 0),
    (p_portal_id, 'Finance',      '#22C55E', 1),
    (p_portal_id, 'Marketing',    '#3B82F6', 2),
    (p_portal_id, 'Operations',   '#F59E0B', 3),
    (p_portal_id, 'Technology',   '#8B5CF6', 4)
  ON CONFLICT DO NOTHING;
END;
$$;

-- ── Auto-seed when portal is created ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_portal_seed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM public.seed_portal_defaults(NEW.id);
  RETURN NEW;
END;
$$;

-- Drop and recreate to avoid duplicate trigger errors
DROP TRIGGER IF EXISTS trg_seed_portal_defaults ON public.portals;
CREATE TRIGGER trg_seed_portal_defaults
  AFTER INSERT ON public.portals
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_portal_seed();

-- ── Update handle_new_user trigger to create a default portal ─────────
CREATE OR REPLACE FUNCTION public.handle_new_user_portals()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_portal_id uuid;
  v_name text;
BEGIN
  v_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1), 'My Portal');

  INSERT INTO public.portals (name, slug, owner_id)
  VALUES (
    v_name || '''s Portal',
    regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g') || '-' || substr(NEW.id::text, 1, 8),
    NEW.id
  )
  RETURNING id INTO v_portal_id;

  RETURN NEW;
END;
$$;

-- Replace the old trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created_portals ON auth.users;
CREATE TRIGGER on_auth_user_created_portals
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_portals();
