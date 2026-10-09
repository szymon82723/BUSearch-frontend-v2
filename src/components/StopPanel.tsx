import { Bell, Clock3, Share2 } from "lucide-react";
import { StopNotificationForm } from "./StopNotificationForm";
import { useEffect, useState, useRef } from "react";
import type { Stop, StopDeparture } from "../types/transit";
import { fetchStopDepartures } from "../services/api";
import { useBottomSheet } from "../hooks/useBottomSheet";
import { citySlug, tramLines } from "../config/city";
import { TechnicalStopBadge } from "./TechnicalStopBadge";
import { linesAtStop, linkedStopFor } from "../config/shared-stop-lines";

interface StopPanelProps {
  stop: Stop | null;
  isFavorite: boolean;
  onToggleFavorite: (stop: Stop) => void;
  onClose: () => void;
  onSelectLine: (lineCode: string) => void;
  onTrackVehicle: (departure: StopDeparture) => Promise<boolean>;
}

const TRAM_LINES = tramLines;

const BUS_ICON_SVG = `<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z"/></svg>`;

const TRAM_ICON_SVG = `<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><g fill-rule="evenodd"><path d="M6.2 1.2h11.6a.9.9 0 1 1 0 1.8h-4.9v2.1h-1.8V3H6.2a.9.9 0 0 1 0-1.8Z"/><path d="M8.3 5.1h7.4a3.9 3.9 0 0 1 3.9 3.9v7.6a3.9 3.9 0 0 1-2.7 3.71l.83 2.36a.5.5 0 0 1-.47.67h-1.2a.5.5 0 0 1-.47-.34l-.95-2.7H9.36l-.95 2.7a.5.5 0 0 1-.47.34h-1.2a.5.5 0 0 1-.47-.67l.83-2.36A3.9 3.9 0 0 1 4.4 16.6V9a3.9 3.9 0 0 1 3.9-3.9ZM6.9 8.7h4.2v4.6H6.9Zm6 0h4.2v4.6h-4.2ZM8.7 15.6a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm6.6 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z"/></g></svg>`;

export function StopPanel({
  stop,
  isFavorite,
  onToggleFavorite,
  onClose,
  onSelectLine,
  onTrackVehicle,
}: StopPanelProps) {
  const refreshDeparturesRef = useRef<() => void>(() => {});
  const [departures, setDepartures] = useState<StopDeparture[]>([]);
  const [loading, setLoading] = useState(false);
  const [departureError, setDepartureError] = useState("");
  const [retry, setRetry] = useState(0);
  const [trackingError, setTrackingError] = useState("");
  const [scheduleChoice, setScheduleChoice] = useState<{ stopId: number; atMs: number } | null>(null);
  const scheduleAt = stop && scheduleChoice?.stopId === stop.id ? scheduleChoice.atMs : undefined;
  const [tool, setTool] = useState<{ stopId: number; kind: "time" | "notify" } | null>(null);
  const activeTool = stop && tool?.stopId === stop.id ? tool.kind : null;
  const [timeValue, setTimeValue] = useState("");
  const [share, setShare] = useState<{ stopId: number; text: string; url?: string } | null>(null);
  useEffect(() => {
    setScheduleChoice(null); setTool(null); setShare(null); setTimeValue("");
  }, [stop?.id]);

  const shareStop = async () => {
    if (!stop) return;
    const url = new URL(`/${citySlug}/`, location.origin);
    url.searchParams.set("stop", String(stop.id));
    try {
      if (navigator.share) await navigator.share({ title: `${stop.nazwa} — BUSearch`, url: url.href });
      else { await navigator.clipboard.writeText(url.href); setShare({ stopId: stop.id, text: "Link do przystanku skopiowany." }); }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setShare({ stopId: stop.id, text: "Skopiuj link do przystanku:", url: url.href });
    }
  };

  const { panelRef, headRef, handleRef, isExpanded, toggleExpanded, openAttr } =
    useBottomSheet({
      isOpen: !!stop,
      onClose,
      canExpand: true,
      initialExpanded: false,
    });

  useEffect(() => {
    if (!stop) {
      setDepartures([]);
      setTrackingError("");
      return;
    }

    setLoading(true);
    setDepartureError("");
    setDepartures([]);
    setTrackingError("");
    let isMounted = true;
    let inFlight = false;

    const loadDepartures = async () => {
      if (inFlight || document.hidden) return;
      inFlight = true;
      const linked = linkedStopFor(stop);
      const results = await Promise.allSettled([
        fetchStopDepartures(stop.id, citySlug, scheduleAt),
        linked ? fetchStopDepartures(linked.stopId, linked.city, scheduleAt) : Promise.resolve([]),
      ]);
      const [local, neighbouring] = results.map(result => result.status === "fulfilled" ? result.value : []);
      const failed = results.some(result => result.status === "rejected");
      const seen = new Set<string>();
      const data = [...local, ...neighbouring.filter(departure => departure.linia === linked?.line)]
        .filter((departure) => {
          const key = [departure.originCity, departure.linia, departure.cel, departure.tripId, departure.vehicleId, departure.atMs ?? departure.godzina].join("|");
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .sort((a, b) => (Number(a.atMs) || Infinity) - (Number(b.atMs) || Infinity));
      inFlight = false;
      if (isMounted) {
        setDepartureError(failed ? (data.length ? "Nie udało się pobrać części odjazdów." : "Nie udało się pobrać odjazdów. Spróbuj ponownie.") : "");
        setDepartures(data);
        setLoading(false);
      }
    };

    refreshDeparturesRef.current = () => { void loadDepartures(); };
    loadDepartures();
    const timer = scheduleAt == null ? setInterval(loadDepartures, 5000) : undefined;
    document.addEventListener("visibilitychange", loadDepartures);

    return () => {
      isMounted = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", loadDepartures);
    };
  }, [stop?.id, scheduleAt, retry]);

  useEffect(() => {
    if (isExpanded) refreshDeparturesRef.current();
  }, [isExpanded]);

  const openDeparture = async (departure: StopDeparture) => {
    setTrackingError("");
    const openLine = () => {
      if (departure.originCity && departure.originCity !== citySlug) {
        location.assign(`/${departure.originCity}/?line=${encodeURIComponent(departure.linia)}`);
      } else {
        onSelectLine(departure.linia);
      }
    };
    if (departure.vehicleId || departure.tripId) {
      if (!await onTrackVehicle(departure)) {
        if (departure.originCity && departure.originCity !== citySlug) openLine();
        else setTrackingError("Tego pojazdu nie ma już na mapie.");
      }
      return;
    }
    openLine();
  };

  if (!stop) return null;
  const availableLines = linesAtStop(stop);
  // Keep every row mounted so the sheet can measure its expanded height while
  // dragging. In the compact view show the first departure of each linked line.
  const firstByLine = new Set<string>();
  const summary = new Set<StopDeparture>();
  for (const departure of departures) {
    if (!firstByLine.has(departure.linia)) { firstByLine.add(departure.linia); summary.add(departure); }
  }
  const visibleDepartures = linkedStopFor(stop) && !isExpanded
    ? [...departures.filter(departure => summary.has(departure)), ...departures.filter(departure => !summary.has(departure))]
    : departures;

  return (
    <div
      ref={panelRef}
      className="ui-routepanel ui-anim"
      id="stopPanel"
      data-open={openAttr}
      data-expanded={isExpanded ? "1" : "0"}
      aria-live="polite"
    >
      <div className="ui-routepanel__head" ref={headRef}>
        <div
          ref={handleRef}
          className="ui-routepanel__handle"
          id="stopPanelHandle"
          role="button"
          tabIndex={0}
          aria-label="Rozwiń lub zwiń"
          onClick={toggleExpanded}
        />
        <div className="ui-routepanel__headrow">
          <div style={{ minWidth: 0 }}>
            <div className="ui-routepanel__title" id="stopPanelTitle">
              <span id="stopPanelTitleText">{stop.nazwa}</span><TechnicalStopBadge name={stop.nazwa} stopCode={stop.kod} />
            </div>
            <div className="ui-routepanel__meta" id="stopPanelMeta">
              ID {stop.id} · Linie: {availableLines.join(", ")}
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", flex: "none", alignItems: "center" }}>
            <button
              className={`ui-routepanel__bell ${isFavorite ? "ui-routepanel__star--active" : ""}`}
              id="stopPanelFav"
              type="button"
              aria-label={isFavorite ? "Usuń przystanek z ulubionych" : "Dodaj przystanek do ulubionych"}
              aria-pressed={isFavorite}
              onClick={() => onToggleFavorite(stop)}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill={isFavorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2.8l2.9 6.06 6.6.77-4.86 4.6 1.28 6.57L12 17.7l-5.92 3.1 1.28-6.57-4.86-4.6 6.6-.77z" />
              </svg>
            </button>

            <button className="ui-routepanel__close" id="stopPanelAtTime" type="button" aria-label="Pokaż odjazdy o wybranej godzinie" aria-expanded={activeTool === "time"} onClick={() => {
              if (!timeValue) { const now = new Date(); const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000); setTimeValue(local.toISOString().slice(0, 16)); }
              setTool(activeTool === "time" ? null : { stopId: stop.id, kind: "time" });
              if (activeTool !== "time" && !isExpanded) toggleExpanded();
            }}><Clock3 size={18} /></button>
            <button className="ui-routepanel__close" id="stopPanelShare" type="button" aria-label="Udostępnij link do tego przystanku" onClick={() => void shareStop()}><Share2 size={18} /></button>
            <button className="ui-routepanel__bell" id="stopPanelBell" type="button" aria-label="Powiadom mnie o autobusie" aria-expanded={activeTool === "notify"} onClick={() => { setTool(activeTool === "notify" ? null : { stopId: stop.id, kind: "notify" }); if (activeTool !== "notify" && !isExpanded) toggleExpanded(); }}><Bell size={18} /></button>

            <button
              className="ui-routepanel__close ui-anim ui-close"
              id="stopPanelClose"
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
        {activeTool === "time" && <form className="stop-panel__time-form" onSubmit={event => {
          event.preventDefault(); const atMs = new Date(timeValue).getTime();
          if (!Number.isFinite(atMs)) return;
          setScheduleChoice({ stopId: stop.id, atMs }); setTool(null);
          if (!isExpanded) toggleExpanded();
        }}><label htmlFor="stopPanelDateTime">Data i godzina odjazdów</label><input id="stopPanelDateTime" type="datetime-local" value={timeValue} required onChange={event => setTimeValue(event.target.value)} /><button type="submit">Pokaż rozkład</button><button type="button" onClick={() => setTool(null)}>Anuluj</button></form>}
        {activeTool === "notify" && <StopNotificationForm key={stop.id} stop={stop} lines={availableLines} />}
        {share?.stopId === stop.id && <div className="stop-panel__share-status" role="status">{share.text}{share.url && <input aria-label="Link do przystanku" readOnly value={share.url} onFocus={event => event.target.select()} />}</div>}
        {scheduleAt != null && <div className="ui-stoptime-bar"><span>Rozkład: {new Date(scheduleAt).toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "short" })}</span><button id="stopPanelScheduleBack" type="button" onClick={() => setScheduleChoice(null)}>Wróć do teraz</button></div>}
        <div className="ui-routepanel__section-title" style={{ padding: "10px 0 6px" }}>{scheduleAt == null ? "Najbliższe odjazdy" : "Odjazdy z rozkładu"}</div>
        {departureError && <div className="stop-panel__tracking-error" role="status">{departureError} <button type="button" onClick={() => setRetry(value => value + 1)}>Ponów</button></div>}
        {trackingError && <div className="stop-panel__tracking-error" role="status">{trackingError}</div>}
        <div className="ui-routepanel__stopswrap" id="stopPanelListWrap">
          <div className="ui-routepanel__rail" aria-hidden="true">
            <div className="ui-routepanel__rail-fill" style={{ height: "100%" }} />
          </div>
          <div className="ui-routepanel__stops" id="stopPanelList">
            {loading && departures.length === 0 ? (
              <div className="ui-routepanel__skeleton">Wczytywanie odjazdów na żywo…</div>
            ) : visibleDepartures.length === 0 ? (
              <div className="ui-routepanel__skeleton">{departureError ? "Tablica jest chwilowo niedostępna." : "Brak zaplanowanych odjazdów w najbliższym czasie."}</div>
            ) : (
              visibleDepartures.map((dep, idx) => {
                const isTram = TRAM_LINES.has(dep.linia);
                const delay = dep.delayMin ?? 0;
                // Format ETA
                const matchMins = dep.czas.match(/^(\d+)\s*min/);
                const etaMins = matchMins ? matchMins[1] : null;
                const hasArrivalEstimate = etaMins !== null;
                const statusKind = delay >= 2 ? "late" : delay <= -2 ? "early" : hasArrivalEstimate ? "ontime" : "unknown";
                const statusText =
                  delay >= 2
                    ? `Opóźniony ${delay} min`
                    : delay <= -2
                    ? `Przyspieszony ${Math.abs(delay)} min`
                    : hasArrivalEstimate ? "Planowo" : "Brak informacji o pojeździe";

                return (
                  <div
                    key={`${dep.linia}-${dep.cel}-${idx}`}
                    className="stop-panel__row stop-panel__row--clickable ui-anim"
                    role="button"
                    tabIndex={0}
                    aria-label={dep.vehicleId || dep.tripId ? `Śledź pojazd linii ${dep.linia} do ${dep.cel}` : `Pokaż trasę linii ${dep.linia} do ${dep.cel}`}
                    onClick={() => { void openDeparture(dep); }}
                    onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); void openDeparture(dep); } }}
                  >
                    <div className={`stop-panel__linebadge ${isTram ? "stop-panel__linebadge--tram" : ""}`}>
                      <span dangerouslySetInnerHTML={{ __html: isTram ? TRAM_ICON_SVG : BUS_ICON_SVG }} />
                      <span>{dep.linia}</span>
                    </div>

                    <div className="stop-panel__main">
                      <div className="stop-panel__dest">{dep.cel}</div>
                      <div className="stop-panel__status" data-kind={statusKind}>
                        <span>{statusText}</span>
                        {dep.godzina && <span className="stop-panel__status-time"> · {dep.godzina}</span>}
                      </div>
                    </div>

                    <div className="stop-panel__eta">
                      {etaMins ? (
                        <div className="stop-panel__etaStack">
                          <div className="stop-panel__etaVal">{etaMins}</div>
                          <div className="stop-panel__etaUnit">min</div>
                        </div>
                      ) : (
                        <div className="stop-panel__etaText">{dep.czas || "teraz"}</div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
