import type { FormationEvent, Owner } from "../lib/types";
import type { CSSProperties } from "react";
import { formationById } from "../lib/formations";

export default function FormationCutIn({
  event,
  playerOwner,
}: {
  event: FormationEvent;
  playerOwner: Owner;
}) {
  const formation = formationById(event.id);
  const castle = formation.kind === "castle";
  return (
    <div
      style={
        { "--formation-name-length": formation.name.length } as CSSProperties
      }
      className={`formation-cutin ${event.owner !== playerOwner ? "is-rival" : ""}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="formation-cutin-banner">
        <span className="formation-cutin-seal" aria-hidden="true">
          {castle ? "守" : "攻"}
        </span>
        <p className="formation-cutin-eyebrow">
          {event.owner === "b" ? "▲" : "△"}{" "}
          {event.owner === playerOwner ? "あなた" : "AI"}
          <span>／</span>
          {castle ? "囲い完成" : "戦法発動"}
        </p>
        <p className="formation-cutin-reading" aria-hidden="true">
          {formation.reading}
        </p>
        <p className="formation-cutin-name">{formation.name}</p>
        <p className="formation-cutin-tagline">{formation.tagline}</p>
        <span className="formation-cutin-rule" aria-hidden="true" />
      </div>
    </div>
  );
}
