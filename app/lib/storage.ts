const fallback = new Map<string, string | null>();
export const STORAGE_EVENT = "shogi-storage";

export const readStoredValue = (key: string): string | null => {
  if (fallback.has(key)) return fallback.get(key) ?? null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

// Restricted storage and quota errors must not interrupt an ongoing game.
export const writeStoredValue = (key: string, value: string | null) => {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
    fallback.delete(key);
  } catch {
    fallback.set(key, value);
  }
  window.dispatchEvent(new CustomEvent(STORAGE_EVENT, { detail: key }));
};

export const invalidateStoredValue = (key: string | null) => {
  if (key === null) fallback.clear();
  else fallback.delete(key);
};
