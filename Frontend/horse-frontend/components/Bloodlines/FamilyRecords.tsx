import Link from "next/link";
import type { Bloodline } from "@/lib/bloodlines";
import type { FamilyRecord } from "@/utils/studbook";
import { bloodlineSlug } from "@/utils/bloodlineValidation";
import { vars } from "@/styles/theme.css";
import * as chartStyles from "@/components/Charts/Charts.css";

function formatDate(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "date unknown";
}

function formatShare(share: number): string {
  return `${(share * 100).toFixed(1)}%`;
}

export default function FamilyRecords({
  bloodlines,
  records,
}: {
  bloodlines: Bloodline[];
  records: FamilyRecord[];
}) {
  const registry = new Map(bloodlines.map((b) => [b.name, b]));
  const hiddenSlugs = new Set(
    bloodlines.filter((b) => b.hidden).map((b) => bloodlineSlug(b.name)),
  );
  const recorded = new Set(records.map((r) => r.family));
  // Registry families with no horses yet still get a card.
  const empty: FamilyRecord[] = bloodlines
    .filter((b) => !recorded.has(b.name))
    .map((b) => ({
      family: b.name,
      count: 0,
      founders: [],
      lastPurebred: null,
      records: { speed: null, jump: null, health: null },
      averages: { speed: null, jump: null, health: null, aliveCount: 0 },
    }));
  const all = [...records, ...empty].sort((a, b) =>
    a.family.localeCompare(b.family),
  );
  const shown = all.filter((r) => !hiddenSlugs.has(bloodlineSlug(r.family)));
  const hiddenCards = all.filter((r) => hiddenSlugs.has(bloodlineSlug(r.family)));

  return (
    <section style={{ marginTop: 40 }}>
      <h2>Family Records</h2>
      <p style={{ opacity: 0.7 }}>
        Computed live from the herd — founders, last known purebreds, and
        record holders per family.
      </p>
      {shown.map((r) => {
        const meta = registry.get(r.family);
        return <FamilyCard key={r.family} record={r} meta={meta} />;
      })}
      {hiddenCards.length > 0 && (
        <details style={{ marginTop: 8 }}>
          <summary style={{ cursor: "pointer", fontWeight: 600 }}>
            Hidden families ({hiddenCards.length})
          </summary>
          {hiddenCards.map((r) => {
            const meta = registry.get(r.family);
            return <FamilyCard key={r.family} record={r} meta={meta} />;
          })}
        </details>
      )}
    </section>
  );
}

function FamilyCard({
  record: r,
  meta,
}: {
  record: FamilyRecord;
  meta: Bloodline | undefined;
}) {
  const stats = [
    {
      label: "Speed",
      unit: "m/s",
      decimals: 2,
      record: r.records.speed,
      average: r.averages.speed,
    },
    {
      label: "Jump",
      unit: "blocks",
      decimals: 2,
      record: r.records.jump,
      average: r.averages.jump,
    },
    {
      label: "Health",
      unit: "hp",
      decimals: 1,
      record: r.records.health,
      average: r.averages.health,
    },
  ] as const;
  return (
    <article
      style={{
        border: `1px solid ${vars.color.goldSoft}`,
        borderLeft: `4px solid ${vars.color.gold}`,
        backgroundColor: vars.color.secondary,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
      }}
    >
      <header
        style={{ display: "flex", alignItems: "center", gap: 8 }}
      >
        <span
          style={{
            display: "inline-block",
            width: 20,
            height: 20,
            borderRadius: 6,
            backgroundColor: meta?.hexColor || vars.color.textMuted,
            border: `1px solid ${vars.color.border}`,
          }}
        />
        <h3 style={{ margin: 0, fontFamily: vars.font.display, color: vars.color.ink }}>
          {r.family}{" "}
          <span style={{ opacity: 0.5, fontWeight: 400, fontSize: 14 }}>
            · {r.count} horse{r.count === 1 ? "" : "s"}
            {meta?.theme ? ` · ${meta.theme}` : ""}
          </span>
        </h3>
      </header>

      {r.count === 0 ? (
        <p style={{ opacity: 0.5, margin: "12px 0 0" }}>No horses recorded yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
          <table className={chartStyles.ledgerTable}>
            <thead>
              <tr>
                <th className={chartStyles.ledgerTh}>Stat</th>
                <th className={chartStyles.ledgerTh}>Record</th>
                <th className={chartStyles.ledgerTh}>
                  Living avg{r.averages.aliveCount > 0 ? ` (${r.averages.aliveCount} alive)` : ""}
                </th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => (
                <tr key={s.label}>
                  <td className={chartStyles.ledgerTd}>{s.label}</td>
                  <td className={chartStyles.ledgerTd}>
                    {s.record ? (
                      <>
                        {s.record.value.toFixed(s.decimals)} {s.unit} —{" "}
                        <Link
                          href={`/horses/${s.record.horseId}`}
                          className={chartStyles.ledgerLink}
                        >
                          {s.record.horseName}
                        </Link>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className={chartStyles.ledgerTd}>
                    {s.average !== null ? (
                      <>
                        {s.average.toFixed(s.decimals)} {s.unit}
                      </>
                    ) : (
                      <span style={{ opacity: 0.5 }}>No living horses</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {r.lastPurebred && (
            <p style={{ margin: 0 }}>
              Last {r.lastPurebred.tierLabel}:{" "}
              <Link href={`/horses/${r.lastPurebred.id}`}>
                {r.lastPurebred.name}
              </Link>
              , Gen {r.lastPurebred.generation},{" "}
              {r.lastPurebred.status} ·{" "}
              {formatShare(r.lastPurebred.share)}
            </p>
          )}
          {r.founders.length > 0 && (
            <details style={{ margin: 0 }}>
              <summary>
                Founders ({r.founders.length})
              </summary>
              <ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>
                {r.founders.map((f) => (
                  <li key={f.id}>
                    <Link href={`/horses/${f.id}`}>{f.name}</Link> — founded{" "}
                    {formatDate(f.foundedAt)} · speed {f.speed.toFixed(2)} m/s · jump{" "}
                    {f.jump.toFixed(2)} blocks · health {f.health.toFixed(1)} hp
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </article>
  );
}
