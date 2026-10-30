"use client";

import { useEffect, useRef, useState } from "react";
import { formationById, FORMATIONS_KEY, parseCollection } from "./formations";
import { playFormationSound } from "./formation-sound";
import { readStoredValue, writeStoredValue } from "./storage";
import type { FormationEvent, GameSettings } from "./types";

export function useFormations(
  events: FormationEvent[],
  session: number,
  settings: GameSettings,
) {
  const [cursor, setCursor] = useState({ session, index: 0 });
  const index = cursor.session === session ? cursor.index : 0;
  const active = settings.showFormationEffects ? (events[index] ?? null) : null;
  const sounded = useRef<string | null>(null);

  useEffect(() => {
    const own = events.filter((event) => event.owner === settings.playerOwner);
    if (!own.length) return;
    const collected = parseCollection(readStoredValue(FORMATIONS_KEY));
    const updated = [
      ...new Set([...collected, ...own.map((event) => event.id)]),
    ];
    if (updated.length !== collected.length) {
      writeStoredValue(FORMATIONS_KEY, JSON.stringify(updated));
    }
  }, [events, settings.playerOwner]);

  useEffect(() => {
    if (!active) return;
    const key = `${session}:${active.owner}:${active.id}`;
    if (settings.formationSound && sounded.current !== key) {
      playFormationSound(formationById(active.id).kind === "castle");
      sounded.current = key;
    }
    const timer = setTimeout(
      () => setCursor({ session, index: index + 1 }),
      1700,
    );
    return () => clearTimeout(timer);
  }, [active, index, session, settings.formationSound]);

  return active;
}
