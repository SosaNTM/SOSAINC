-- ============================================================
-- ICONOFF — Project Progress Triggers
-- Auto-update project.progress_percentage when tasks change
-- One function + trigger per portal
-- ============================================================

-- Sosa Inc
CREATE OR REPLACE FUNCTION sosa_update_project_progress()
RETURNS TRIGGER AS $$
DECLARE
  total_tasks INT;
  done_tasks INT;
  new_progress NUMERIC(5,2);
BEGIN
  SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'done')
  INTO total_tasks, done_tasks
  FROM sosa_tasks
  WHERE project_id = COALESCE(NEW.project_id, OLD.project_id)
    AND deleted_at IS NULL;

  IF total_tasks > 0 THEN
    new_progress := ROUND((done_tasks::NUMERIC / total_tasks) * 100, 2);
  ELSE
    new_progress := 0;
  END IF;

  UPDATE sosa_projects
  SET progress_percentage = new_progress, updated_at = now()
  WHERE id = COALESCE(NEW.project_id, OLD.project_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sosa_task_progress_trigger
  AFTER INSERT OR UPDATE OF status OR DELETE ON sosa_tasks
  FOR EACH ROW EXECUTE FUNCTION sosa_update_project_progress();

-- KEYLO
CREATE OR REPLACE FUNCTION keylo_update_project_progress()
RETURNS TRIGGER AS $$
DECLARE
  total_tasks INT;
  done_tasks INT;
  new_progress NUMERIC(5,2);
BEGIN
  SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'done')
  INTO total_tasks, done_tasks
  FROM keylo_tasks
  WHERE project_id = COALESCE(NEW.project_id, OLD.project_id)
    AND deleted_at IS NULL;

  IF total_tasks > 0 THEN
    new_progress := ROUND((done_tasks::NUMERIC / total_tasks) * 100, 2);
  ELSE
    new_progress := 0;
  END IF;

  UPDATE keylo_projects
  SET progress_percentage = new_progress, updated_at = now()
  WHERE id = COALESCE(NEW.project_id, OLD.project_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER keylo_task_progress_trigger
  AFTER INSERT OR UPDATE OF status OR DELETE ON keylo_tasks
  FOR EACH ROW EXECUTE FUNCTION keylo_update_project_progress();

-- REDX
CREATE OR REPLACE FUNCTION redx_update_project_progress()
RETURNS TRIGGER AS $$
DECLARE
  total_tasks INT;
  done_tasks INT;
  new_progress NUMERIC(5,2);
BEGIN
  SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'done')
  INTO total_tasks, done_tasks
  FROM redx_tasks
  WHERE project_id = COALESCE(NEW.project_id, OLD.project_id)
    AND deleted_at IS NULL;

  IF total_tasks > 0 THEN
    new_progress := ROUND((done_tasks::NUMERIC / total_tasks) * 100, 2);
  ELSE
    new_progress := 0;
  END IF;

  UPDATE redx_projects
  SET progress_percentage = new_progress, updated_at = now()
  WHERE id = COALESCE(NEW.project_id, OLD.project_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER redx_task_progress_trigger
  AFTER INSERT OR UPDATE OF status OR DELETE ON redx_tasks
  FOR EACH ROW EXECUTE FUNCTION redx_update_project_progress();

-- Trust Me
CREATE OR REPLACE FUNCTION trustme_update_project_progress()
RETURNS TRIGGER AS $$
DECLARE
  total_tasks INT;
  done_tasks INT;
  new_progress NUMERIC(5,2);
BEGIN
  SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'done')
  INTO total_tasks, done_tasks
  FROM trustme_tasks
  WHERE project_id = COALESCE(NEW.project_id, OLD.project_id)
    AND deleted_at IS NULL;

  IF total_tasks > 0 THEN
    new_progress := ROUND((done_tasks::NUMERIC / total_tasks) * 100, 2);
  ELSE
    new_progress := 0;
  END IF;

  UPDATE trustme_projects
  SET progress_percentage = new_progress, updated_at = now()
  WHERE id = COALESCE(NEW.project_id, OLD.project_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trustme_task_progress_trigger
  AFTER INSERT OR UPDATE OF status OR DELETE ON trustme_tasks
  FOR EACH ROW EXECUTE FUNCTION trustme_update_project_progress();
