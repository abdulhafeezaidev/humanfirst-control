-- PostgreSQL function for cleaning up violation logs
-- Deletes violations older than 90 days, keeps session anchors for 1 year

CREATE OR REPLACE FUNCTION cleanup_violation_logs()
RETURNS TABLE (
  violations_deleted INT,
  anchors_deleted INT,
  total_deleted INT
) AS $$
DECLARE
  v_deleted INT := 0;
  a_deleted INT := 0;
BEGIN
  -- Delete non-session-anchor violations older than 90 days
  DELETE FROM violation_logs
  WHERE
    event_type NOT IN ('session_start', 'session_end', 'assignment_submitted')
    AND occurred_at < (NOW() - INTERVAL '90 days');
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  -- Delete session anchors older than 1 year
  DELETE FROM violation_logs
  WHERE
    event_type IN ('session_start', 'session_end', 'assignment_submitted')
    AND occurred_at < (NOW() - INTERVAL '1 year');
  
  GET DIAGNOSTICS a_deleted = ROW_COUNT;

  RETURN QUERY SELECT v_deleted, a_deleted, (v_deleted + a_deleted)::INT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution to authenticated users (with RLS to restrict)
GRANT EXECUTE ON FUNCTION cleanup_violation_logs() TO authenticated;
