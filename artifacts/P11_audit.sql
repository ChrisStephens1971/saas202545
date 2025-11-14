-- ============================================================================
-- Elder-First Church Platform - Audit Triggers for Bulletin Locking
-- Version: 1.0
-- ============================================================================

-- This file contains PostgreSQL triggers to automatically log changes to
-- bulletin_issue and related tables for audit trail and compliance.

-- ============================================================================
-- Audit Trigger Function (Generic)
-- ============================================================================

CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
  tenant_id_value UUID;
  user_id_value UUID;
  old_data JSONB;
  new_data JSONB;
  changed_fields JSONB;
BEGIN
  -- Get tenant_id and user_id from the row
  IF TG_OP = 'DELETE' THEN
    tenant_id_value := OLD.tenant_id;
    old_data := to_jsonb(OLD);
    new_data := NULL;
  ELSE
    tenant_id_value := NEW.tenant_id;
    new_data := to_jsonb(NEW);
    IF TG_OP = 'UPDATE' THEN
      old_data := to_jsonb(OLD);
      -- Calculate changed fields
      changed_fields := jsonb_object_agg(key, value)
        FROM jsonb_each(new_data)
        WHERE new_data->key IS DISTINCT FROM old_data->key;
    ELSE
      old_data := NULL;
      changed_fields := NULL;
    END IF;
  END IF;

  -- Try to get user_id from session variable (set by app)
  BEGIN
    user_id_value := current_setting('app.user_id', true)::UUID;
  EXCEPTION
    WHEN OTHERS THEN
      user_id_value := NULL;
  END;

  -- Insert audit log
  INSERT INTO audit_log (
    tenant_id,
    user_id,
    action,
    resource_type,
    resource_id,
    old_data,
    new_data,
    changed_fields,
    ip_address,
    user_agent,
    created_at
  ) VALUES (
    tenant_id_value,
    user_id_value,
    TG_OP || '.' || TG_TABLE_NAME,
    TG_TABLE_NAME,
    CASE
      WHEN TG_OP = 'DELETE' THEN OLD.id
      ELSE NEW.id
    END,
    old_data,
    new_data,
    changed_fields,
    current_setting('app.ip_address', true), -- Set by app
    current_setting('app.user_agent', true), -- Set by app
    NOW()
  );

  RETURN CASE
    WHEN TG_OP = 'DELETE' THEN OLD
    ELSE NEW
  END;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Bulletin Issue Audit Trigger
-- ============================================================================

CREATE TRIGGER bulletin_issue_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON bulletin_issue
FOR EACH ROW
EXECUTE FUNCTION audit_trigger_function();

-- ============================================================================
-- Bulletin Status Change Trigger (Specialized)
-- ============================================================================

CREATE OR REPLACE FUNCTION bulletin_status_change_trigger()
RETURNS TRIGGER AS $$
DECLARE
  tenant_id_value UUID;
  user_id_value UUID;
BEGIN
  -- Only trigger on status change
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    tenant_id_value := NEW.tenant_id;

    BEGIN
      user_id_value := current_setting('app.user_id', true)::UUID;
    EXCEPTION
      WHEN OTHERS THEN
        user_id_value := NULL;
    END;

    -- Log state transition
    INSERT INTO audit_log (
      tenant_id,
      user_id,
      action,
      resource_type,
      resource_id,
      details,
      created_at
    ) VALUES (
      tenant_id_value,
      user_id_value,
      'bulletin.status_change.' || OLD.status || '_to_' || NEW.status,
      'bulletin_issue',
      NEW.id,
      jsonb_build_object(
        'from', OLD.status,
        'to', NEW.status,
        'locked_at', NEW.locked_at,
        'locked_by', NEW.locked_by,
        'reopened_at', NEW.reopened_at,
        'reopened_by', NEW.reopened_by,
        'reopen_reason', NEW.reopen_reason
      ),
      NOW()
    );

    -- If locking, log content hash
    IF NEW.status = 'locked' AND NEW.content_hash IS NOT NULL THEN
      INSERT INTO audit_log (
        tenant_id,
        user_id,
        action,
        resource_type,
        resource_id,
        details,
        created_at
      ) VALUES (
        tenant_id_value,
        user_id_value,
        'bulletin.content_hash_stored',
        'bulletin_issue',
        NEW.id,
        jsonb_build_object(
          'content_hash', NEW.content_hash,
          'locked_at', NEW.locked_at
        ),
        NOW()
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bulletin_status_change_audit
AFTER UPDATE ON bulletin_issue
FOR EACH ROW
WHEN (NEW.status IS DISTINCT FROM OLD.status)
EXECUTE FUNCTION bulletin_status_change_trigger();

-- ============================================================================
-- Lock Immutability Enforcement (Database Constraint)
-- ============================================================================

CREATE OR REPLACE FUNCTION prevent_locked_bulletin_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow changes if bulletin is not locked OR has been reopened
  IF OLD.status = 'locked' AND OLD.reopened_at IS NULL THEN
    -- Block changes to content-related fields
    IF (
      NEW.brand_pack_id IS DISTINCT FROM OLD.brand_pack_id OR
      NEW.issue_date IS DISTINCT FROM OLD.issue_date
    ) THEN
      RAISE EXCEPTION 'Cannot modify locked bulletin (locked at: %)', OLD.locked_at
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;

    -- Allow status changes (for emergency reopen)
    -- Allow metadata updates (reopened_at, reopened_by, etc.)
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_bulletin_lock_immutability
BEFORE UPDATE ON bulletin_issue
FOR EACH ROW
WHEN (OLD.status = 'locked')
EXECUTE FUNCTION prevent_locked_bulletin_changes();

-- ============================================================================
-- Service Items Change Audit (for locked bulletins)
-- ============================================================================

CREATE OR REPLACE FUNCTION prevent_service_item_changes()
RETURNS TRIGGER AS $$
DECLARE
  bulletin_status bulletin_status;
  bulletin_reopened_at TIMESTAMPTZ;
BEGIN
  -- Get bulletin status
  SELECT status, reopened_at INTO bulletin_status, bulletin_reopened_at
  FROM bulletin_issue
  WHERE id = COALESCE(NEW.bulletin_issue_id, OLD.bulletin_issue_id);

  -- Block changes if bulletin is locked and not reopened
  IF bulletin_status = 'locked' AND bulletin_reopened_at IS NULL THEN
    RAISE EXCEPTION 'Cannot modify service items for locked bulletin'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  RETURN CASE
    WHEN TG_OP = 'DELETE' THEN OLD
    ELSE NEW
  END;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_locked_bulletin_service_item_changes
BEFORE INSERT OR UPDATE OR DELETE ON service_item
FOR EACH ROW
EXECUTE FUNCTION prevent_service_item_changes();

-- ============================================================================
-- Announcement Selection Audit
-- ============================================================================

CREATE TRIGGER bulletin_announcement_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON bulletin_announcement
FOR EACH ROW
EXECUTE FUNCTION audit_trigger_function();

-- ============================================================================
-- CCLI Compliance Logging
-- ============================================================================

CREATE OR REPLACE FUNCTION log_ccli_validation()
RETURNS TRIGGER AS $$
DECLARE
  tenant_id_value UUID;
  user_id_value UUID;
BEGIN
  -- Only log for songs
  IF NEW.type = 'Song' THEN
    tenant_id_value := NEW.tenant_id;

    BEGIN
      user_id_value := current_setting('app.user_id', true)::UUID;
    EXCEPTION
      WHEN OTHERS THEN
        user_id_value := NULL;
    END;

    -- Log if CCLI number changed
    IF TG_OP = 'INSERT' OR (NEW.ccli_number IS DISTINCT FROM OLD.ccli_number) THEN
      INSERT INTO audit_log (
        tenant_id,
        user_id,
        action,
        resource_type,
        resource_id,
        details,
        created_at
      ) VALUES (
        tenant_id_value,
        user_id_value,
        CASE
          WHEN NEW.ccli_number IS NULL OR NEW.ccli_number = '' THEN 'service_item.ccli_missing'
          ELSE 'service_item.ccli_updated'
        END,
        'service_item',
        NEW.id,
        jsonb_build_object(
          'song_title', NEW.title,
          'ccli_number', NEW.ccli_number,
          'old_ccli_number', OLD.ccli_number
        ),
        NOW()
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER service_item_ccli_audit
AFTER INSERT OR UPDATE ON service_item
FOR EACH ROW
WHEN (NEW.type = 'Song')
EXECUTE FUNCTION log_ccli_validation();

-- ============================================================================
-- Emergency Reopen Logging
-- ============================================================================

CREATE OR REPLACE FUNCTION log_emergency_reopen()
RETURNS TRIGGER AS $$
DECLARE
  tenant_id_value UUID;
  user_id_value UUID;
BEGIN
  -- Only trigger when reopened_at changes
  IF NEW.reopened_at IS DISTINCT FROM OLD.reopened_at AND NEW.reopened_at IS NOT NULL THEN
    tenant_id_value := NEW.tenant_id;

    BEGIN
      user_id_value := current_setting('app.user_id', true)::UUID;
    EXCEPTION
      WHEN OTHERS THEN
        user_id_value := NULL;
    END;

    -- Critical audit log for emergency reopen
    INSERT INTO audit_log (
      tenant_id,
      user_id,
      action,
      resource_type,
      resource_id,
      details,
      severity,
      created_at
    ) VALUES (
      tenant_id_value,
      user_id_value,
      'bulletin.emergency_reopen',
      'bulletin_issue',
      NEW.id,
      jsonb_build_object(
        'reopened_by', NEW.reopened_by,
        'reopened_at', NEW.reopened_at,
        'reopen_reason', NEW.reopen_reason,
        'original_locked_at', OLD.locked_at,
        'original_locked_by', OLD.locked_by
      ),
      'critical', -- Severity
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER emergency_reopen_audit
AFTER UPDATE ON bulletin_issue
FOR EACH ROW
WHEN (NEW.reopened_at IS DISTINCT FROM OLD.reopened_at)
EXECUTE FUNCTION log_emergency_reopen();

-- ============================================================================
-- Artifact Upload Logging
-- ============================================================================

CREATE OR REPLACE FUNCTION log_artifact_upload()
RETURNS TRIGGER AS $$
DECLARE
  tenant_id_value UUID;
  user_id_value UUID;
  artifact_type TEXT;
  artifact_url TEXT;
BEGIN
  tenant_id_value := NEW.tenant_id;

  BEGIN
    user_id_value := current_setting('app.user_id', true)::UUID;
  EXCEPTION
    WHEN OTHERS THEN
      user_id_value := NULL;
  END;

  -- Log each artifact type that changed
  IF NEW.pdf_url IS DISTINCT FROM OLD.pdf_url AND NEW.pdf_url IS NOT NULL THEN
    INSERT INTO audit_log (tenant_id, user_id, action, resource_type, resource_id, details, created_at)
    VALUES (tenant_id_value, user_id_value, 'bulletin.artifact_uploaded.pdf', 'bulletin_issue', NEW.id,
            jsonb_build_object('url', NEW.pdf_url), NOW());
  END IF;

  IF NEW.pdf_large_print_url IS DISTINCT FROM OLD.pdf_large_print_url AND NEW.pdf_large_print_url IS NOT NULL THEN
    INSERT INTO audit_log (tenant_id, user_id, action, resource_type, resource_id, details, created_at)
    VALUES (tenant_id_value, user_id_value, 'bulletin.artifact_uploaded.pdf_large_print', 'bulletin_issue', NEW.id,
            jsonb_build_object('url', NEW.pdf_large_print_url), NOW());
  END IF;

  IF NEW.loop_mp4_url IS DISTINCT FROM OLD.loop_mp4_url AND NEW.loop_mp4_url IS NOT NULL THEN
    INSERT INTO audit_log (tenant_id, user_id, action, resource_type, resource_id, details, created_at)
    VALUES (tenant_id_value, user_id_value, 'bulletin.artifact_uploaded.loop_video', 'bulletin_issue', NEW.id,
            jsonb_build_object('url', NEW.loop_mp4_url), NOW());
  END IF;

  IF NEW.propresenter_bundle_url IS DISTINCT FROM OLD.propresenter_bundle_url AND NEW.propresenter_bundle_url IS NOT NULL THEN
    INSERT INTO audit_log (tenant_id, user_id, action, resource_type, resource_id, details, created_at)
    VALUES (tenant_id_value, user_id_value, 'bulletin.artifact_uploaded.propresenter', 'bulletin_issue', NEW.id,
            jsonb_build_object('url', NEW.propresenter_bundle_url), NOW());
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER artifact_upload_audit
AFTER UPDATE ON bulletin_issue
FOR EACH ROW
EXECUTE FUNCTION log_artifact_upload();

-- ============================================================================
-- Audit Log Query Helpers
-- ============================================================================

-- View: Recent bulletin state changes
CREATE OR REPLACE VIEW bulletin_state_changes AS
SELECT
  al.id,
  al.tenant_id,
  al.created_at,
  al.action,
  al.resource_id AS bulletin_id,
  bi.issue_date,
  bi.status AS current_status,
  al.details->>'from' AS from_status,
  al.details->>'to' AS to_status,
  p.first_name || ' ' || p.last_name AS user_name,
  al.details
FROM audit_log al
JOIN bulletin_issue bi ON bi.id = al.resource_id
LEFT JOIN person p ON p.id = al.user_id
WHERE al.resource_type = 'bulletin_issue'
  AND al.action LIKE 'bulletin.status_change%'
ORDER BY al.created_at DESC;

-- View: Emergency reopens
CREATE OR REPLACE VIEW emergency_reopens AS
SELECT
  al.id,
  al.tenant_id,
  al.created_at AS reopened_at,
  al.resource_id AS bulletin_id,
  bi.issue_date,
  p.first_name || ' ' || p.last_name AS reopened_by_name,
  al.details->>'reopen_reason' AS reason,
  al.details->>'original_locked_at' AS original_locked_at
FROM audit_log al
JOIN bulletin_issue bi ON bi.id = al.resource_id
LEFT JOIN person p ON p.id = al.user_id
WHERE al.action = 'bulletin.emergency_reopen'
ORDER BY al.created_at DESC;

-- View: CCLI compliance log
CREATE OR REPLACE VIEW ccli_compliance_log AS
SELECT
  al.id,
  al.tenant_id,
  al.created_at,
  al.resource_id AS service_item_id,
  al.details->>'song_title' AS song_title,
  al.details->>'ccli_number' AS ccli_number,
  al.action,
  p.first_name || ' ' || p.last_name AS user_name
FROM audit_log al
LEFT JOIN person p ON p.id = al.user_id
WHERE al.resource_type = 'service_item'
  AND al.action LIKE 'service_item.ccli%'
ORDER BY al.created_at DESC;

-- ============================================================================
-- Cleanup: Old Audit Logs (Retention Policy)
-- ============================================================================

-- Function to delete audit logs older than 2 years
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM audit_log
  WHERE created_at < NOW() - INTERVAL '2 years'
    AND severity != 'critical'; -- Keep critical logs forever

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup (run monthly via pg_cron or external scheduler)
-- SELECT cleanup_old_audit_logs();

-- ============================================================================
-- Testing Helpers
-- ============================================================================

-- Set session variables for testing
-- SELECT set_config('app.user_id', 'user-uuid-here', false);
-- SELECT set_config('app.tenant_id', 'tenant-uuid-here', false);

-- Test audit trigger
-- UPDATE bulletin_issue SET status = 'locked' WHERE id = 'test-bulletin-id';
-- SELECT * FROM audit_log WHERE resource_id = 'test-bulletin-id' ORDER BY created_at DESC;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON FUNCTION audit_trigger_function IS 'Generic audit trigger function that logs all changes to audit_log table';
COMMENT ON FUNCTION bulletin_status_change_trigger IS 'Logs bulletin status transitions with detailed metadata';
COMMENT ON FUNCTION prevent_locked_bulletin_changes IS 'Enforces immutability of locked bulletins at database level';
COMMENT ON FUNCTION log_emergency_reopen IS 'Logs critical events when locked bulletins are reopened';
COMMENT ON FUNCTION cleanup_old_audit_logs IS 'Deletes audit logs older than 2 years (except critical severity)';

COMMENT ON VIEW bulletin_state_changes IS 'Queryable view of all bulletin state transitions';
COMMENT ON VIEW emergency_reopens IS 'All emergency reopen events with reasons and user info';
COMMENT ON VIEW ccli_compliance_log IS 'CCLI number changes for compliance tracking';
