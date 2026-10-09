import { useState, useMemo } from "react";
import type { TransitLine } from "../types/transit";
import { useBottomSheet } from "../hooks/useBottomSheet";
import { tramLines } from "../config/city";

interface SchedulesPanelProps {
  isOpen: boolean;
  lines: TransitLine[];
  onClose: () => void;
  onSelectLine: (lineCode: string) => void;
}

const TRAM_LINES = tramLines;

export function SchedulesPanel({
  isOpen,
  lines,
  onClose,
  onSelectLine,
}: SchedulesPanelProps) {
  const [query, setQuery] = useState("");

  const { panelRef, headRef, handleRef, isExpanded, toggleExpanded, openAttr } =
    useBottomSheet({
      isOpen,
      onClose,
      canExpand: true,
      initialExpanded: true,
    });

  const filteredLines = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return lines;
    return lines.filter((l) => l.number.toLowerCase().includes(q));
  }, [lines, query]);

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className="ui-routepanel ui-anim"
      id="schedulesPanel"
      data-open={openAttr}
      data-expanded={isExpanded ? "1" : "0"}
      aria-live="polite"
    >
      <div className="ui-routepanel__head" ref={headRef}>
        <div
          ref={handleRef}
          className="ui-routepanel__handle"
          role="button"
          tabIndex={0}
          aria-label="Rozwiń lub zwiń"
          onClick={toggleExpanded}
        />
        <div className="ui-routepanel__headrow">
          <div>
            <div className="ui-routepanel__title">Rozkłady</div>
            <div className="ui-routepanel__meta" id="schedulesPanelMeta">Wybierz linię</div>
          </div>
          <div style={{ display: "flex", gap: "8px", flex: "none" }}>
            <button
              className="ui-routepanel__close ui-anim ui-close"
              id="schedulesPanelClose"
              type="button"
              aria-label="Zamknij"
              onClick={onClose}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
        <input
          className="ui-lines-search"
          id="schedulesPanelSearch"
          type="search"
          inputMode="search"
          autoComplete="off"
          placeholder="Numer linii…"
          aria-label="Filtruj linie"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ width: "100%", marginTop: "10px", padding: "8px 12px", borderRadius: "var(--ui-radius)", background: "rgba(255,255,255,0.06)", border: "1px solid var(--ui-line-strong)", color: "white" }}
        />
      </div>
      <div className="ui-routepanel__body" id="schedulesPanelBody">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(64px, 1fr))", gap: "8px" }}>
          {filteredLines.map((line) => {
            const isTram = TRAM_LINES.has(line.number);
            return (
              <button
                key={line.id || line.number}
                type="button"
                onClick={() => {
                  onSelectLine(line.number);
                  onClose();
                }}
                className={`line-badge ${isTram ? "line-badge--tram" : ""}`}
                style={{
                  height: "38px",
                  fontSize: "14px",
                  cursor: "pointer",
                  margin: 0,
                  width: "100%",
                }}
              >
                {line.number}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
