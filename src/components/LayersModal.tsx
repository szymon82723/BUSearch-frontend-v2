import { useBottomSheet } from "../hooks/useBottomSheet";

export type MapStyleType = "basic" | "osm" | "satellite";

interface LayersModalProps {
  isOpen: boolean;
  activeLayer: MapStyleType;
  onSelectLayer: (layer: MapStyleType) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onClose: () => void;
}

export function LayersModal({
  isOpen,
  activeLayer,
  onSelectLayer,
  isDarkMode,
  onToggleDarkMode,
  onClose,
}: LayersModalProps) {
  const { panelRef, headRef, handleRef, isExpanded, toggleExpanded, openAttr } =
    useBottomSheet({
      isOpen,
      onClose,
      canExpand: false,
      initialExpanded: true,
    });

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className="ui-routepanel ui-anim"
      id="layersModal"
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
            <div className="ui-routepanel__title">Warstwy</div>
          </div>
          <div style={{ display: "flex", gap: "8px", flex: "none" }}>
            <button
              className="ui-routepanel__close ui-anim ui-close"
              id="layersModalClose"
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
        <div className="ui-layers-grid">
          <button
            className={`ui-layers-card ${activeLayer === "basic" ? "ui-layers-card--active" : ""}`}
            id="layerCardBasic"
            data-layer="basic"
            type="button"
            onClick={() => onSelectLayer("basic")}
          >
            <span className="ui-layers-card__preview ui-layers-card__preview--basic">
              <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon>
                <line x1="8" y1="2" x2="8" y2="18"></line>
                <line x1="16" y1="6" x2="16" y2="22"></line>
              </svg>
            </span>
            <span className="ui-layers-card__label">Podstawowa</span>
          </button>
          <button
            className={`ui-layers-card ${activeLayer === "osm" ? "ui-layers-card--active" : ""}`}
            id="layerCardOsm"
            data-layer="osm"
            type="button"
            onClick={() => onSelectLayer("osm")}
          >
            <span className="ui-layers-card__preview ui-layers-card__preview--osm">
              <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="2" y1="12" x2="22" y2="12"></line>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
              </svg>
            </span>
            <span className="ui-layers-card__label">OpenStreetMap</span>
          </button>
          <button
            className={`ui-layers-card ${activeLayer === "satellite" ? "ui-layers-card--active" : ""}`}
            id="layerCardSatellite"
            data-layer="satellite"
            type="button"
            onClick={() => onSelectLayer("satellite")}
          >
            <span className="ui-layers-card__preview ui-layers-card__preview--satellite">
              <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                <line x1="12" y1="22.08" x2="12" y2="12"></line>
              </svg>
            </span>
            <span className="ui-layers-card__label">Satelita</span>
          </button>
        </div>
        <label className="ui-layers-toggle-row" htmlFor="darkThemeToggle">
          <span>Ciemny motyw</span>
          <span className="ui-toggle-switch">
            <input
              type="checkbox"
              id="darkThemeToggle"
              checked={isDarkMode}
              onChange={onToggleDarkMode}
            />
            <span className="ui-toggle-switch__track"><span className="ui-toggle-switch__thumb"></span></span>
          </span>
        </label>
      </div>
    </div>
  );
}
