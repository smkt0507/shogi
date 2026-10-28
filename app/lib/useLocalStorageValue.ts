"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  invalidateStoredValue,
  readStoredValue,
  STORAGE_EVENT,
} from "./storage";

const getServerSnapshot = () => undefined;

// undefined means hydration is pending; null means there is no stored value.
export const useLocalStorageValue = (key: string) => {
  const getSnapshot = useCallback(() => readStoredValue(key), [key]);
  const subscribe = useCallback(
    (onChange: () => void) => {
      const onStorage = (event: StorageEvent) => {
        if (event.key !== key && event.key !== null) return;
        invalidateStoredValue(event.key);
        onChange();
      };
      const onLocalChange = (event: Event) => {
        if ((event as CustomEvent<string>).detail === key) onChange();
      };
      window.addEventListener("storage", onStorage);
      window.addEventListener(STORAGE_EVENT, onLocalChange);
      return () => {
        window.removeEventListener("storage", onStorage);
        window.removeEventListener(STORAGE_EVENT, onLocalChange);
      };
    },
    [key],
  );
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
};
