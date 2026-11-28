import { useEffect, useMemo, useState } from "react";
function statusOf(error: unknown) {
  return typeof error === "object" && error !== null && "status" in error
    ? Number(error.status)
    : 0;
}
export function useStaffJourney<T>(load: (signal: AbortSignal) => Promise<T>) {
  const [result, setResult] = useState<{ owner: typeof load; data: T }>();
  const data = result?.owner === load ? result.data : undefined;
  const setData = (data: T | undefined) =>
    setResult(data === undefined ? undefined : { owner: load, data });
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(false);
  const [error, setError] = useState<"denied" | "error" | "failed" | "conflict" | "">("");
  const [revision, setRevision] = useState(0);
  const mounted = useMemo(() => ({ current: false }), [load]),
    running = useMemo(() => ({ current: false }), [load]),
    keys = useMemo(() => ({ current: new Map<string, string>() }), [load]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, [mounted]);
  useEffect(() => {
    const abort = new AbortController();
    setData(undefined);
    setLoading(true);
    setBusy(false);
    setNotice(false);
    setError("");
    void load(abort.signal)
      .then((result) => {
        if (!abort.signal.aborted) {
          setData(result);
        }
      })
      .catch((error: unknown) => {
        if (!abort.signal.aborted) {
          setError([401, 403, 404].includes(statusOf(error)) ? "denied" : "error");
        }
      })
      .finally(() => {
        if (!abort.signal.aborted) {
          setLoading(false);
        }
      });
    return () => abort.abort();
  }, [load, revision]);
  async function command(signature: string, write: (key: string) => Promise<T>) {
    if (running.current) {
      return false;
    }
    running.current = true;
    setBusy(true);
    setError("");
    setNotice(false);
    const key = keys.current.get(signature) ?? crypto.randomUUID();
    keys.current.set(signature, key);
    try {
      const result = await write(key);
      keys.current.delete(signature);
      if (!mounted.current) {
        return false;
      }
      setData(result);
      setNotice(true);
      return true;
    } catch (error: unknown) {
      if (mounted.current) {
        const status = statusOf(error);
        if ([401, 403, 404].includes(status)) {
          setData(undefined);
          keys.current.clear();
        }
        setError(
          status === 409 ? "conflict" : [401, 403, 404].includes(status) ? "denied" : "failed"
        );
      }
      return false;
    } finally {
      running.current = false;
      if (mounted.current) {
        setBusy(false);
      }
    }
  }
  return {
    data,
    loading,
    busy,
    error,
    notice,
    command,
    reload: () => {
      setNotice(false);
      keys.current.clear();
      setRevision((v) => v + 1);
    },
  };
}
