import Link from "next/link";
import type { Bloodline } from "@/lib/bloodlines";
import type { FamilyRecord } from "@/utils/studbook";

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
    }));
  const all = [...records, ...empty].sort((a, b) =>
    a.family.localeCompare(b.family),
  );

  return (
    <section style={{ marginTop: 40 }}>
      <h2>Family Records</h2>
      <p style={{ opacity: 0.7 }}>
        Computed live from the herd — founders, last known purebreds, and
        record holders per family.
      </p>
      {all.map((r) => {
        const meta = registry.get(r.family);
        return (
          <article
            key={r.family}
            style={{
              border: "1px solid #e5e7eb",
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
                  backgroundColor: meta?.hexColor || "#94a3b8",
                  border: "1px solid #ccc",
                }}
              />
              <h3 style={{ margin: 0 }}>
                {r.family}{" "}
                <span style={{ opacity: 0.5, fontWeight: 400, fontSize: 14 }}>
                  · {r.count} horse{r.count === 1 ? "" : "s"}
                </span>
              </h3>
            </header>
            {meta?.theme && (
              <p style={{ opacity: 0.7, margin: "8px 0 0" }}>
                Naming theme: {meta.theme}
              </p>
            )}

            {r.count === 0 ? (
              <p style={{ opacity: 0.5 }}>No horses recorded yet.</p>
            ) : (
              <>
                {r.lastPurebred && (
                  <p style={{ margin: "8px 0 0" }}>
                    Last {r.lastPurebred.tierLabel}:{" "}
                    <Link href={`/horses/${r.lastPurebred.id}`}>
                      {r.lastPurebred.name}
                    </Link>
                    , Gen {r.lastPurebred.generation},{" "}
                    {r.lastPurebred.status} ·{" "}
                    {formatShare(r.lastPurebred.share)}
                  </p>
                )}
                <div
                  style={{
                    display: "flex",
                    gap: 24,
                    flexWrap: "wrap",
                    marginTop: 8,
                  }}
                >
                  {(
                    [
                      ["Fastest", r.records.speed, "m/s"],
                      ["Highest jump", r.records.jump, "blocks"],
                      ["Tankiest", r.records.health, "hp"],
                    ] as const
                  ).map(([label, record, unit]) =>
                    record ? (
                      <span key={label}>
                        {label}: {record.value} {unit} —{" "}
                        <Link href={`/horses/${record.horseId}`}>
                          {record.horseName}
                        </Link>
                      </span>
                    ) : null,
                  )}
                </div>
                {r.founders.length > 0 && (
                  <details style={{ marginTop: 8 }}>
                    <summary>
                      Founders ({r.founders.length})
                    </summary>
                    <ul>
                      {r.founders.map((f) => (
                        <li key={f.id}>
                          <Link href={`/horses/${f.id}`}>{f.name}</Link> — founded{" "}
                          {formatDate(f.foundedAt)} · speed {f.speed} · jump{" "}
                          {f.jump} · health {f.health}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </>
            )}
          </article>
        );
      })}
    </section>
  );
}
