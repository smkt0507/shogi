"use client";

import { useEffect, useRef, useState } from "react";

// The list owns a bounded viewport; only the number of rows changes on resize.
export function usePanelPageSize(rowHeight: number, maximum = 24) {
  const ref = useRef<HTMLDivElement>(null);
  const [pageSize, setPageSize] = useState(1);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const rows = Math.max(1, Math.min(maximum, Math.floor(entry.contentRect.height / rowHeight)));
      setPageSize((current) => current === rows ? current : rows);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [rowHeight, maximum]);
  return { ref, pageSize };
}
