"use client";

import * as chartStyles from "@/components/Charts/Charts.css";

export interface RecordsNavSection {
  id: string;
  title: string;
  count: number;
  open: boolean;
}

/**
 * Sticky mini-nav for the records ledger: anchor chips jump to each
 * section (collapsed sections expand first), plus expand/collapse-all.
 */
export function RecordsMiniNav({
  sections,
  onNavigate,
  onExpandAll,
  onCollapseAll,
}: {
  sections: RecordsNavSection[];
  onNavigate: (id: string) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
}) {
  return (
    <nav aria-label="Records sections" className={chartStyles.miniNav}>
      {sections.map((s) => (
        <button
          key={s.id}
          type="button"
          className={chartStyles.miniNavChip}
          data-open={s.open}
          onClick={() => onNavigate(s.id)}
          title={s.open ? `${s.title} (${s.count})` : `Expand ${s.title} (${s.count})`}
        >
          {s.title} ({s.count})
        </button>
      ))}
      <span style={{ flex: 1 }} />
      <button type="button" className={chartStyles.miniNavAction} onClick={onExpandAll}>
        Expand all
      </button>
      <button type="button" className={chartStyles.miniNavAction} onClick={onCollapseAll}>
        Collapse all
      </button>
    </nav>
  );
}
