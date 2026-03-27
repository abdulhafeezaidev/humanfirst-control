import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ConnectionStatus = "checking" | "connected" | "disconnected";

const HEALTH_CHECK_INTERVAL_MS = 30_000; // 30 seconds
const RETRY_DELAY_MS = 5_000; // 5 seconds on failure

/**
 * Continuously monitors the Supabase database connection.
 * Returns the current status and a manual retry function.
 */
export function useSupabaseConnection() {
  const [status, setStatus] = useState<ConnectionStatus>("checking");
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const mountedRef = useRef(true);

  const checkConnection = useCallback(async () => {
    try {
      // Lightweight RPC-less health check: fetch a single row from a system-accessible table.
      // We use the auth helper which hits Supabase's GoTrue endpoint — works even without
      // any database tables and doesn't require RLS bypass.
      const { error } = await supabase.auth.getSession();
      if (!mountedRef.current) return;
      setStatus(error ? "disconnected" : "connected");
    } catch {
      if (!mountedRef.current) return;
      setStatus("disconnected");
    }
  }, []);

  const scheduleNext = useCallback(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      await checkConnection();
      if (mountedRef.current) scheduleNext();
    }, status === "connected" ? HEALTH_CHECK_INTERVAL_MS : RETRY_DELAY_MS);
  }, [checkConnection, status]);

  useEffect(() => {
    mountedRef.current = true;
    checkConnection().then(() => {
      if (mountedRef.current) scheduleNext();
    });
    return () => {
      mountedRef.current = false;
      clearTimeout(timerRef.current);
    };
  }, [checkConnection, scheduleNext]);

  const retry = useCallback(() => {
    setStatus("checking");
    clearTimeout(timerRef.current);
    checkConnection().then(() => {
      if (mountedRef.current) scheduleNext();
    });
  }, [checkConnection, scheduleNext]);

  return { status, retry };
}
