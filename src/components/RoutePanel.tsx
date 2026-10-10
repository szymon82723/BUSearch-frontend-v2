import { formatFleetNumber } from "../config/vehicle-filters";
import { useState, useEffect } from "react";
import { BusFront, TramFront, X, Share2, BookOpen } from "lucide-react";
import { tramLines } from "../config/city";
import type { Vehicle, VehicleEtaStop } from "../types/transit";
import { fetchVehicleEtas } from "../services/api";
import { useBottomSheet } from "../hooks/useBottomSheet";
import { city, wikiPath } from "../config/city";
import { TechnicalStopBadge } from "./TechnicalStopBadge";

interface RoutePanelProps {
  isVisible?: boolean;
  vehicle: Vehicle;
  onClose: () => void;
  onSelectStop: (stop: VehicleEtaStop) => void;
  routeName?: string;
  onStopsChange: (vehicleId: string, stops: VehicleEtaStop[]) => void;
}

export function RoutePanel({
  vehicle,
  isVisible = true,
  onClose,
  onSelectStop,
  routeName,
  onStopsChange,
}: RoutePanelProps) {
  const [stops, setStops] = useState<VehicleEtaStop[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [nextIndex, setNextIndex] = useState<number | null>(null);

  const { panelRef, headRef, handleRef, isExpanded, toggleExpanded, openAttr } =
    useBottomSheet({
      isOpen: !!vehicle && isVisible,
      onClose,
      canExpand: true,
      initialExpanded: false,
    });

  useEffect(() => {
    let isMounted = true;
    setStops([]);
    setCurrentIndex(null);
    setNextIndex(null);
    setLoading(true);

    const loadEtas = async () => {
      const res = await fetchVehicleEtas(vehicle.nr_boczny);
      if (isMounted) {
        setStops(res?.stops || []);
        onStopsChange(vehicle.nr_boczny, res?.stops || []);
        setCurrentIndex(res?.currentIndex != null && res.currentIndex >= 0 ? res.currentIndex : null);
        setNextIndex(res?.nextIndex != null && res.nextIndex >= 0 ? res.nextIndex : null);
        setLoading(false);
      }
    };

    loadEtas();
    const interval = setInterval(loadEtas, 4000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [vehicle.nr_boczny, onStopsChange]);

  const delayS = vehicle.opoznienie_s ?? 0;
  const delayMin = Math.round(delayS / 60);
  const firstUpcomingIndex = stops.findIndex((stop) => !stop.passed);
  const firstVisibleIndex = currentIndex ?? nextIndex ?? (firstUpcomingIndex >= 0 ? firstUpcomingIndex : stops.length);
  const visibleStops = stops.slice(firstVisibleIndex);
  const direction = vehicle.cel || routeName?.replace(/\s+-\s+/, " → ") || "Koniec trasy";
  const VehicleIcon = tramLines.has(vehicle.linia) ? TramFront : BusFront;
  const mapId = String(vehicle.nr_boczny).trim();
  const wikiNumber = String(vehicle.wiki_nr || (city.MAP_ID_IS_FLEET_NUMBER === "1" ? mapId : "")).trim();
  const wikiHref = wikiPath(wikiNumber ? `?id=${encodeURIComponent(wikiNumber)}` : `?mapId=${encodeURIComponent(mapId)}`);
  const hasWiki = !/^ISKA/i.test(mapId);

  const shareVehicle = async () => {
    const url = new URL(window.location.href);
    url.searchParams.set("vehicle", vehicle.nr_boczny);
    if (navigator.share) {
      try { await navigator.share({ title: `Linia ${vehicle.linia} • ${formatFleetNumber(vehicle.nr_boczny)}`, url: url.href }); } catch { /* dismissed */ }
    } else {
      try { await navigator.clipboard.writeText(url.href); } catch { /* clipboard unavailable */ }
    }
  };

  return (
    <div
      ref={panelRef}
      hidden={!isVisible}
      style={isVisible ? undefined : { display: "none" }}
      className="ui-routepanel ui-anim"
      id="routePanel"
      data-open={openAttr}
      data-expanded={isExpanded ? "1" : "0"}
      data-has-wiki={hasWiki ? "1" : "0"}
      aria-live="polite"
    >
      <div className="ui-routepanel__head" ref={headRef}>
        <div
          ref={handleRef}
          className="ui-routepanel__handle"
          id="routePanelHandle"
          role="button"
          tabIndex={0}
          aria-label="Przeciągnij, aby rozwinąć lub zwinąć listę przystanków"
          onClick={toggleExpanded}
        />
        <div className="ui-routepanel__headrow">
          <div>
            <div className="ui-routepanel__title" id="routePanelTitle">
              <span id="routePanelTitleText">{`Linia ${vehicle.linia} • ${formatFleetNumber(vehicle.nr_boczny)}`}</span>
            </div>
            <div className="ui-routepanel__meta" id="routePanelMeta">{direction}</div>
          </div>
          {hasWiki && <div className="ui-routepanel__center">
            <a className="ui-routepanel__wiki ui-anim" id="routePanelWiki" href={wikiHref} aria-label="Wiki pojazdu"><BookOpen size={18} aria-hidden="true" /><span>Wiki</span></a>
          </div>}
          <div className="ui-routepanel__actions">
            <button className="ui-routepanel__close ui-anim" type="button" aria-label="Udostępnij pojazd" onClick={shareVehicle}><Share2 size={18} /></button>
            <button className="ui-routepanel__close ui-anim ui-close" id="routePanelClose" type="button" aria-label="Zamknij" onClick={onClose}><X size={18} /></button>
          </div>
        </div>
      </div>

      <div className="ui-routepanel__body" id="routePanelBody">
        <div className="ui-routepanel__section-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="ui-routepanel__section-title" id="routePanelSectionTitle">Przebieg trasy</div>
          <button
            className="ui-routepanel__expand-btn"
            id="routePanelExpandBtn"
            type="button"
            aria-label={isExpanded ? "Zwiń listę przystanków" : "Pokaż wszystkie przystanki"}
            aria-expanded={isExpanded ? "true" : "false"}
            onClick={toggleExpanded}
          >
            <span>{isExpanded ? "Zwiń" : "Wszystkie przystanki"}</span>
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 9l6 6 6-6"></path>
            </svg>
          </button>
        </div>

        <div className="ui-routepanel__stopswrap" id="routePanelStopsWrap">
          <div className="ui-routepanel__stops" id="routePanelStops">
            {loading && stops.length === 0 ? (
              <div className="ui-routepanel__skeleton">Wczytywanie trasy pojazdu…</div>
            ) : stops.length === 0 ? (
              <div className="ui-routepanel__skeleton">Brak szczegółowych przystanków dla tego kursu.</div>
            ) : visibleStops.length === 0 ? (
              <div className="ui-routepanel__skeleton">Kurs zakończony. Brak kolejnych przystanków.</div>
            ) : (
              visibleStops.map((st, visibleIndex) => {
                const i = firstVisibleIndex + visibleIndex;
                const isCurrent = currentIndex === i;
                const isNext = nextIndex === i && !isCurrent;
                const passed = st.passed && !isCurrent;
                const eta = isCurrent ? "teraz" : st.etaMin != null ? `~${Math.max(0, Math.round(st.etaMin))} min` : "";
                const delay = st.delayMin ?? delayMin;
                const hasArrivalEstimate = st.etaMin != null;
                const status = isCurrent ? "Na przystanku" : delay >= 2 ? `Opóźniony ${delay} min` : delay <= -2 ? `Przyspieszony ${Math.abs(delay)} min` : hasArrivalEstimate ? "Planowo" : "Brak informacji o pojeździe";
                const statusClass = isCurrent ? "ontime" : delay >= 2 ? "late" : delay <= -2 ? "early" : hasArrivalEstimate ? "ontime" : "unknown";

                return (
                  <button
                    type="button"
                    key={`${st.name}-${i}`}
                    className={`ui-routepanel__stop ${passed ? "ui-routepanel__stop--passed" : ""} ${isCurrent ? "ui-routepanel__stop--current" : ""} ${isNext ? "ui-routepanel__stop--next" : ""}`}
                    onClick={() => onSelectStop(st)}
                  >
                    <div className={`ui-routepanel__stop-time ${st.plannedTime && st.actualTime && st.plannedTime !== st.actualTime ? "ui-routepanel__stop-time--split" : ""} ${statusClass !== "unknown" ? `ui-routepanel__stop-time--${statusClass}` : ""}`}>
                      {st.plannedTime && st.actualTime && st.plannedTime !== st.actualTime ? (
                        <><span className="ui-routepanel__stop-time-planned">{st.plannedTime}</span><span className="ui-routepanel__stop-time-actual">{st.actualTime}</span></>
                      ) : st.actualTime || st.plannedTime || st.time || "—"}
                    </div>
                    <div className="ui-routepanel__stop-rail">
                      <div className="ui-routepanel__stop-dot">{isCurrent && <VehicleIcon size={13} aria-hidden="true" />}</div>
                    </div>
                    <div className="ui-routepanel__stop-content">
                      <div className="ui-routepanel__stop-main">
                        {(isCurrent || isNext) && <div className="ui-routepanel__stop-label">{isCurrent ? "Aktualny przystanek" : "Następny przystanek"}</div>}
                        <div className="ui-routepanel__stop-name">{st.name}<TechnicalStopBadge name={st.name} /></div>
                        <div className={`ui-routepanel__stop-status ui-routepanel__stop-status--${statusClass}`}>{status}</div>
                      </div>
                      {(isCurrent || isNext) && <div className="ui-routepanel__stop-eta">{eta}</div>}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
