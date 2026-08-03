import { useEffect, useState } from "react";

/**
 * Reads a one-shot `?highlight=<id>` query param (e.g. set when drilling down
 * from the KPI report's delay list) and, once the list data is available,
 * invokes `onFound` with the matching record so the page can open its detail
 * view. The param is then removed from the URL so refreshes don't re-trigger.
 */
export function useHighlight<T extends { id: number }>(
  items: T[] | undefined,
  onFound: (item: T) => void,
) {
  const [pending, setPending] = useState<number | null>(() => {
    const raw = new URLSearchParams(window.location.search).get("highlight");
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) ? n : null;
  });

  useEffect(() => {
    if (pending == null || !items) return;
    const item = items.find((i) => i.id === pending);
    if (item) onFound(item);
    setPending(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("highlight");
    window.history.replaceState({}, "", url.toString());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onFound is intentionally not a dependency
  }, [pending, items]);
}
