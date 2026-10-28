"use client";

import { useSyncExternalStore } from "react";

const query = "(min-width: 1024px)";
const getSnapshot = () => window.matchMedia(query).matches;
const getServerSnapshot = () => false;
const subscribe = (onChange: () => void) => {
  const media = window.matchMedia(query);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
};

export const useDesktopLayout = () =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
