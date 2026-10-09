import type { Stop, RouteGeometry } from "../types/transit";
import { useBottomSheet } from "../hooks/useBottomSheet";
import { tramLines } from "../config/city";
import { TechnicalStopBadge } from "./TechnicalStopBadge";

interface LinePanelProps {
  isVisible?: boolean;
  lineCode: string;
  routeGeometry: RouteGeometry | null;
  lineStops: Stop[];
  selectedVariantId: string | null;
  onSelectVariant: (id: string) => void;
  loading: boolean;
  onRetry: () => void;
  onClose: () => void;
  onSelectStop: (stop: Stop) => void;
}

const TRAM_LINES = tramLines;

export function LinePanel({
  lineCode,
  isVisible = true,
  routeGeometry,
  lineStops,
  selectedVariantId,
  onSelectVariant,
  loading,
  onRetry,
  onClose,
  onSelectStop,
}: LinePanelProps) {
  const { panelRef, headRef, handleRef, isExpanded, toggleExpanded, openAttr } =
    useBottomSheet({
      isOpen: !!lineCode && isVisible,
      onClose,
      canExpand: true,
      initialExpanded: false,
    });

  const isTram = TRAM_LINES.has(lineCode);
  const trayectos = routeGeometry?.trayectos || [];
  const directionIndex = Math.max(0, trayectos.findIndex(variant => String(variant.trayecto_id) === selectedVariantId));
  const currentTrayecto = trayectos[directionIndex];
  const toggleDirection = () => {
    const next = trayectos[(directionIndex + 1) % trayectos.length];
    if (next) onSelectVariant(String(next.trayecto_id));
  };

  const destinationText = currentTrayecto?.tekst_kierunkowy || currentTrayecto?.nazwa || "Kierunek trasy";

  return (
    <div
      ref={panelRef}
      hidden={!isVisible}
      style={isVisible ? undefined : { display: "none" }}
      className="ui-routepanel ui-anim"
      id="linePanel"
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
          <div style={{ minWidth: 0 }}>
            <div className="ui-routepanel__title">
              <span className={`line-badge ${isTram ? "line-badge--tram" : ""}`} id="linePanelBadge">
                {lineCode}
              </span>
              <span id="linePanelTitleText">{destinationText}</span>
            </div>
            <div className="ui-routepanel__meta" id="linePanelMeta">
              {loading ? "Wczytywanie trasy…" : `${lineStops.length} przystanków na trasie${trayectos.length > 1 ? ` · kierunek ${directionIndex + 1}/${trayectos.length}` : ""}`}
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", flex: "none" }}>
            {trayectos.length > 1 && (
              <button
                className="ui-routepanel__close ui-anim"
                id="linePanelDir"
                type="button"
                aria-label="Zmień kierunek"
                title="Zmień kierunek"
                onClick={toggleDirection}
              >
                ⇄
              </button>
            )}
            <button
              className="ui-routepanel__close ui-anim ui-close"
              id="linePanelClose"
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
      </div>

      <div className="ui-routepanel__body">
        <div className="ui-routepanel__section-title" id="linePanelSectionTitle">Przystanki na trasie</div>
        <div className="ui-routepanel__section-hint" id="linePanelHint" style={{ fontSize: "12px", color: "var(--ui-text-3)", marginBottom: "4px" }}>
          Kliknij przystanek, żeby zobaczyć godziny odjazdów
        </div>
        <div className="line-stops" id="linePanelStrip">
          {loading ? <div className="ui-routepanel__skeleton">Wczytywanie trasy…</div> : lineStops.length === 0 ? (
            <div className="line-strip__empty">Brak danych o przystankach tego wariantu. <button type="button" onClick={onRetry}>Ponów</button></div>
          ) : (
            lineStops.map((st, index) => (
              <button
                type="button"
                key={`${st.id}-${index}`}
                className="ui-routepanel__stop"
                data-stop-id={st.id}
                onClick={() => onSelectStop(st)}
              >
                <div className="ui-routepanel__stop-rail">
                  <div className="ui-routepanel__stop-dot" />
                </div>
                <div className="ui-routepanel__stop-content">
                  <div className="ui-routepanel__stop-name">{st.nazwa}<TechnicalStopBadge name={st.nazwa} /></div>
                  <div className="ui-routepanel__stop-sub" style={{ fontSize: "11px", color: "var(--ui-text-3)" }}>
                    ID {st.id}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
