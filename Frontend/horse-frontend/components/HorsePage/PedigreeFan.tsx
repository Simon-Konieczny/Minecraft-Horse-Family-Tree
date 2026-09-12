"use client";

import Link from "next/link";
import type { Horse } from "@/types/horse";
import { getHorseFullName } from "@/utils/horseNames";
import { vars } from "@/styles/theme.css";

const MAX_DEPTH = 3;

function AncestorCell({
  horse,
  horses,
  depth,
}: {
  horse?: Horse;
  horses: Horse[];
  depth: number;
}) {
  if (!horse) {
    return (
      <div
        style={{
          padding: "6px 10px",
          border: `1px dashed ${vars.color.goldSoft}`,
          borderRadius: 8,
          fontSize: 12,
          opacity: 0.5,
          whiteSpace: "nowrap",
        }}
      >
        Unknown
      </div>
    );
  }
  const byId = new Map(horses.map((h) => [h.id, h]));
  const parents =
    depth < MAX_DEPTH
      ? [horse.parentId1, horse.parentId2].map((id) =>
          id ? byId.get(id) : undefined,
        )
      : null;
  return (
    <div style={{ display: "flex", alignItems: "stretch", gap: 8 }}>
      <div
        style={{
          padding: "6px 10px",
          backgroundColor: horse.hexColor || "#1e293b",
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 700,
          whiteSpace: "nowrap",
          alignSelf: "center",
        }}
      >
        <Link
          href={`/horses/${horse.id}`}
          style={{ color: "inherit", textDecoration: "none" }}
        >
          {getHorseFullName(horse)}
        </Link>
      </div>
      {parents && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            justifyContent: "center",
            borderLeft: `1px solid ${vars.color.goldSoft}`,
            paddingLeft: 8,
          }}
        >
          {parents.map((p, i) => (
            <AncestorCell key={i} horse={p} horses={horses} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

/** 3-generation ancestor fan (sire/dam lines with links). */
export default function PedigreeFan({
  horse,
  horses,
}: {
  horse: Horse;
  horses: Horse[];
}) {
  const byId = new Map(horses.map((h) => [h.id, h]));
  const sire = horse.parentId1 ? byId.get(horse.parentId1) : undefined;
  const dam = horse.parentId2 ? byId.get(horse.parentId2) : undefined;
  if (!sire && !dam) return null;
  return (
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
      <div>
        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Sire line</div>
        <AncestorCell horse={sire} horses={horses} depth={1} />
      </div>
      <div>
        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Dam line</div>
        <AncestorCell horse={dam} horses={horses} depth={1} />
      </div>
    </div>
  );
}
