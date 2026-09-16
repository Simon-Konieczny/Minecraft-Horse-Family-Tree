"use client";

import { useDeferredValue, useMemo, useRef, useState } from "react";
import type { Horse } from "@/types/horse";
import { getHorseFullName } from "@/utils/horseNames";
import { searchHorses } from "@/utils/horseSearch";
import * as styles from "./SearchBar.css";

const RESULT_LIMIT = 8;
const OPERATOR_HINT_CHARS = [">", "<", "=", ":"];

interface SearchBarProps {
  horses: Horse[];
  colors: Record<string, string>;
  onPick: (horseId: string) => void;
}

export default function SearchBar({ horses, colors, onPick }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const deferredQuery = useDeferredValue(query);
  const results = useMemo(
    () => searchHorses(horses, deferredQuery, RESULT_LIMIT),
    [horses, deferredQuery],
  );
  const showDropdown = open && deferredQuery.trim().length > 0;
  const showOperatorHint = OPERATOR_HINT_CHARS.some((c) => deferredQuery.includes(c));

  const pick = (horseId: string) => {
    onPick(horseId);
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
    inputRef.current?.blur();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" && results.length > 0) {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp" && results.length > 0) {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter" && results.length > 0) {
      e.preventDefault();
      const hit = results[Math.min(activeIndex, results.length - 1)];
      if (hit) pick(String(hit.horse.id));
    } else if (e.key === "Escape") {
      setQuery("");
      setOpen(false);
      setActiveIndex(0);
    }
  };

  return (
    <div className={styles.wrapper}>
      <input
        ref={inputRef}
        type="search"
        role="combobox"
        aria-expanded={showDropdown}
        aria-controls="tree-search-results"
        aria-activedescendant={
          showDropdown && results.length > 0
            ? `tree-search-option-${Math.min(activeIndex, results.length - 1)}`
            : undefined
        }
        aria-label="Find a horse in the family tree"
        placeholder="Find horse… name, family, gen:2, speed>12"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActiveIndex(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        className={styles.input}
      />
      {showDropdown && (
        <div
          id="tree-search-results"
          role="listbox"
          aria-label="Matching horses"
          className={styles.dropdown}
        >
          {results.map((hit, i) => {
            const name = getHorseFullName(hit.horse);
            const active = i === Math.min(activeIndex, results.length - 1);
            return (
              <button
                key={String(hit.horse.id)}
                id={`tree-search-option-${i}`}
                type="button"
                role="option"
                aria-selected={active}
                className={`${styles.option} ${active ? styles.optionActive : ""}`}
                onMouseDown={(e) => {
                  // Fire before the input blur closes the dropdown.
                  e.preventDefault();
                  pick(String(hit.horse.id));
                }}
                onMouseEnter={() => setActiveIndex(i)}
                title={`${name} · Gen ${hit.horse.generation || 0} · ${hit.horse.status}`}
              >
                <span
                  className={styles.dot}
                  style={{ backgroundColor: hit.horse.hexColor || colors[hit.horse.familyName] || "#94a3b8" }}
                />
                <span>{name}</span>
                <span className={styles.optionMeta}>
                  Gen {hit.horse.generation || 0} · {hit.horse.status}
                </span>
              </button>
            );
          })}
          {results.length === 0 && (
            <div className={styles.empty}>
              No horses match — try a name, family, gen:2, or speed&gt;12.
            </div>
          )}
          {showOperatorHint && results.length > 0 && (
            <div className={styles.hint}>
              Operators compare display units: speed&gt;12 (m/s), jump&gt;=3 (blocks), hp&lt;10, gen:2.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
