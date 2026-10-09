import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { ArrowDownUp, ArrowRight, BusFront, ChevronDown, ChevronRight, Clock3, Footprints, Map, MapPin, Route, Search, SlidersHorizontal, TramFront, X } from 'lucide-react';
import type { Stop, ConnectionOption } from '../types/transit';
import { searchConnections, type JourneyPreferences } from '../services/api';
import { PlannerStopInput } from './PlannerStopInput';
import { journeyDateTimeMs, journeyDateTimeValue } from '../config/journey-time';
import '../styles/planner.css';
import { cityChoices, citySlug, tramLines } from '../config/city';
import { colorForLine } from '../config/line-color';

interface PlannerPanelProps {
  isOpen: boolean;
  stops: Stop[];
  onClose: () => void;
  onLocationFound: (location: [number, number]) => void;
  onOpenSchedules: () => void;
  onSelectRouteOption: (option: ConnectionOption | null) => void;
}

export function PlannerPanel({ isOpen, stops, onClose, onLocationFound, onOpenSchedules, onSelectRouteOption }: PlannerPanelProps) {
  const [fromQuery, setFromQuery] = useState('');
  const [toQuery, setToQuery] = useState('');
  const [fromStop, setFromStop] = useState<Stop | null>(null);
  const [toStop, setToStop] = useState<Stop | null>(null);
  const [results, setResults] = useState<ConnectionOption[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<number | null>(null);
  const [scheduled, setScheduled] = useState(false);
  const [dateTime, setDateTime] = useState(() => journeyDateTimeValue());
  const [timeOpen, setTimeOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [mapView, setMapView] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [viewport, setViewport] = useState({ height: window.visualViewport?.height ?? window.innerHeight, top: window.visualViewport?.offsetTop ?? 0 });
  const [preferences, setPreferences] = useState<JourneyPreferences>({ maxTransfers: 2, transferMinutes: 1, walkingSpeed: 1.35 });
  const requestRef = useRef<AbortController | null>(null);
  const locationRequest = useRef(0);
  const panelRef = useRef<HTMLElement>(null);
  const invalidate = useCallback(() => {
    requestRef.current?.abort(); requestRef.current = null;
    setStatus('idle'); setResults([]); setError(''); setSelected(null); setMapView(false);
    onSelectRouteOption(null);
  }, [onSelectRouteOption]);

  useEffect(() => {
    if (!isOpen) {
      invalidate(); setTimeOpen(false); setOptionsOpen(false); setLocating(false);
      locationRequest.current++;
      return;
    }
    panelRef.current?.focus({ preventScroll: true });
  }, [isOpen, invalidate]);
  useEffect(() => () => { requestRef.current?.abort(); locationRequest.current++; }, []);
  useEffect(() => {
    if (!isOpen) return;
    const visual = window.visualViewport;
    const resize = () => setViewport({ height: visual?.height ?? window.innerHeight, top: visual?.offsetTop ?? 0 });
    resize();
    window.addEventListener('resize', resize);
    visual?.addEventListener('resize', resize);
    visual?.addEventListener('scroll', resize);
    return () => {
      window.removeEventListener('resize', resize);
      visual?.removeEventListener('resize', resize);
      visual?.removeEventListener('scroll', resize);
    };
  }, [isOpen]);
  useEffect(() => {
    if (!isOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isOpen, onClose]);

  const handleSearch = async () => {
    if (!fromStop || !toStop || fromStop.id === toStop.id) return;
    invalidate();
    const when = scheduled ? journeyDateTimeMs(dateTime) : Date.now();
    if (when == null) { setError('Wybierz poprawną datę i godzinę. Czas jest podawany dla Polski.'); setStatus('error'); return; }
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    const request = new AbortController(); requestRef.current = request;
    setStatus('loading'); setTimeOpen(false); setOptionsOpen(false);
    try {
      const options = await searchConnections(fromStop, toStop, when, request.signal, preferences);
      if (request.signal.aborted) return;
      setResults(options); setStatus('success');
    } catch (reason) {
      if (request.signal.aborted) return;
      setError(reason instanceof Error && reason.name === 'TimeoutError' ? 'Wyszukiwanie trwało zbyt długo. Spróbuj ponownie.' : reason instanceof SyntaxError ? 'Nie udało się odczytać połączeń.' : reason instanceof TypeError ? 'Nie udało się połączyć z serwerem. Sprawdź połączenie z internetem i spróbuj ponownie.' : reason instanceof Error ? reason.message : 'Nie udało się pobrać połączeń.');
      setStatus('error');
    }
  };
  const swap = () => {
    locationRequest.current++; setLocating(false); setLocationError(''); invalidate();
    setFromStop(toStop); setToStop(fromStop); setFromQuery(toQuery); setToQuery(fromQuery);
  };
  const locate = () => {
    if (!navigator.geolocation) { setLocationError('Ta przeglądarka nie obsługuje lokalizacji. Wpisz przystanek.'); return; }
    const request = ++locationRequest.current;
    setLocating(true); setLocationError('');
    navigator.geolocation.getCurrentPosition(position => {
      if (request !== locationRequest.current) return;
      const { latitude, longitude } = position.coords;
      const nearest = stops.filter(stop => Number.isFinite(stop.lat) && Number.isFinite(stop.lon)).reduce<Stop | null>((best, stop) => {
        const distance = (s: Stop) => (s.lat - latitude) ** 2 + ((s.lon - longitude) * Math.cos(latitude * Math.PI / 180)) ** 2;
        return !best || distance(stop) < distance(best) ? stop : best;
      }, null);
      setLocating(false);
      if (!nearest) { setLocationError('Lista przystanków jeszcze się ładuje. Spróbuj za chwilę.'); return; }
      invalidate(); setFromStop(nearest); setFromQuery(nearest.nazwa); onLocationFound([latitude, longitude]);
    }, () => {
      if (request !== locationRequest.current) return;
      setLocating(false); setLocationError('Nie udało się pobrać lokalizacji. Zezwól na dostęp lub wpisz przystanek.');
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
  };
  const updatePreferences = (changes: Partial<JourneyPreferences>) => { invalidate(); setPreferences(value => ({ ...value, ...changes })); };
  const chooseResult = (index: number) => {
    const next = selected === index ? null : index;
    setSelected(next); onSelectRouteOption(next == null ? null : results[next]);
    if (next != null) requestAnimationFrame(() => {
      panelRef.current?.querySelector(`[data-option="${next}"]`)?.closest('article')?.scrollIntoView({ block: 'start' });
    });
  };
  if (!isOpen) return null;
  const option = selected == null ? null : results[selected];
  const showMap = () => {
    if (!option) return;
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    setMapView(true);
    onSelectRouteOption({ ...option });
  };
  const customOptions = preferences.maxTransfers !== 2 || preferences.transferMinutes !== 1 || preferences.walkingSpeed !== 1.35;

  return <aside ref={panelRef} tabIndex={-1} className="journey-panel" id="polPanel" data-open="1" data-selected={option ? '1' : '0'} data-map-view={mapView ? '1' : '0'} aria-labelledby="plannerTitle" style={{ '--planner-viewport-height': `${viewport.height}px`, '--planner-viewport-top': `${viewport.top}px` } as CSSProperties}>
    <header className="journey-panel__header">
      <a className="journey-brand" href="/" aria-label="BUSearch — strona główna"><img src="/logo/logo.png" alt="" /><strong>BUSearch<span>połączenia</span></strong></a>
      <button className="planner-icon-button" id="polClose" type="button" aria-label="Zamknij wyszukiwarkę" onClick={onClose}><X size={20} /></button>
    </header>
    <div className="journey-panel__city"><MapPin size={15} /><select aria-label="Miasto wyszukiwarki" value={citySlug} onChange={event => location.assign(`/${event.target.value}/?planner=1`)}>{cityChoices.map(city => <option key={city.slug} value={city.slug}>{city.name}</option>)}</select><span className="journey-panel__city-note">Komunikacja miejska</span></div>
    <div className="journey-panel__scroll">
      <form className="planner-form" onSubmit={event => { event.preventDefault(); void handleSearch(); }}>
        <h2 id="plannerTitle">Dokąd jedziemy?</h2>
        <p className="planner-form__intro">Zaplanuj podróż komunikacją miejską.</p>
        <div className="planner-endpoints">
          <PlannerStopInput id="plannerFrom" label="Skąd" stops={stops} query={fromQuery} selected={fromStop} onLocate={locate} locating={locating}
            onChange={query => { locationRequest.current++; setLocating(false); setLocationError(''); invalidate(); setFromQuery(query); setFromStop(null); }}
            onSelect={stop => { locationRequest.current++; setLocating(false); setLocationError(''); invalidate(); setFromStop(stop); setFromQuery(stop.nazwa); }} />
          <button type="button" className="planner-swap" id="plannerSwap" aria-label="Zamień przystanek początkowy i docelowy" title="Zamień przystanki" onClick={swap}><ArrowDownUp size={16} /></button>
          <PlannerStopInput id="plannerTo" label="Dokąd" stops={stops} query={toQuery} selected={toStop}
            onChange={query => { invalidate(); setToQuery(query); setToStop(null); }}
            onSelect={stop => { invalidate(); setToStop(stop); setToQuery(stop.nazwa); }} />
        </div>
        {locating && <p className="planner-inline-status" role="status">Szukam najbliższego przystanku…</p>}
        {locationError && <p className="planner-inline-status" role="status">{locationError}</p>}
        <div className="planner-toolbar">
          <button type="button" id="plannerTimeToggle" className="planner-pill" aria-expanded={timeOpen} aria-controls="plannerTimeOptions" onClick={() => { setTimeOpen(!timeOpen); setOptionsOpen(false); }}><Clock3 size={15} />{scheduled ? `${dateTime.slice(8, 10)}.${dateTime.slice(5, 7)} · ${dateTime.slice(11)}` : 'Wyjazd teraz'}<ChevronDown size={14} /></button>
          <button type="button" id="plannerOptionsToggle" className="planner-pill" data-active={customOptions ? '1' : '0'} aria-expanded={optionsOpen} aria-controls="plannerPreferences" onClick={() => { setOptionsOpen(!optionsOpen); setTimeOpen(false); }}><SlidersHorizontal size={15} />Opcje{customOptions && <span className="planner-pill__dot" />}</button>
        </div>
        {timeOpen && <div className="planner-settings" id="plannerTimeOptions">
          <div className="planner-time-tabs"><button type="button" id="plannerNow" aria-pressed={!scheduled} onClick={() => { invalidate(); setScheduled(false); }}>Teraz</button><button type="button" id="plannerScheduled" aria-pressed={scheduled} onClick={() => { if (!scheduled) { invalidate(); setScheduled(true); } }}>Wybierz termin</button></div>
          {scheduled && <label className="planner-date">Data i godzina wyjazdu<input id="plannerDateTime" type="datetime-local" required value={dateTime} onChange={event => { invalidate(); setDateTime(event.target.value); }} /><span>Czas lokalny w Polsce</span></label>}
        </div>}
        {optionsOpen && <div className="planner-settings" id="plannerPreferences">
          <label>Przesiadki<select id="plannerMaxTransfers" value={preferences.maxTransfers} onChange={event => updatePreferences({ maxTransfers: Number(event.target.value) })}><option value={0}>Bez przesiadek</option><option value={1}>Maksymalnie 1</option><option value={2}>Maksymalnie 2</option></select></label>
          <label>Czas na przesiadkę<select id="plannerTransferMinutes" value={preferences.transferMinutes} onChange={event => updatePreferences({ transferMinutes: Number(event.target.value) })}><option value={1}>Co najmniej 1 minuta</option><option value={3}>Co najmniej 3 minuty</option><option value={5}>Co najmniej 5 minut</option></select></label>
          <label>Tempo chodzenia<select id="plannerWalkingSpeed" value={preferences.walkingSpeed} onChange={event => updatePreferences({ walkingSpeed: Number(event.target.value) })}><option value={1.35}>Zwykłe</option><option value={0.8}>Spokojne</option><option value={1.8}>Szybkie</option></select></label>
        </div>}
        {fromStop && toStop && fromStop.id === toStop.id && <p className="planner-inline-status" role="status">Wybierz dwa różne przystanki.</p>}
        <button id="plannerSearch" className="planner-search" type="submit" disabled={!fromStop || !toStop || fromStop.id === toStop.id || status === 'loading'}><Search size={17} />{status === 'loading' ? 'Szukam połączeń…' : 'Znajdź połączenie'}<ArrowRight size={17} /></button>
      </form>
      <section className="planner-results-section" aria-labelledby="plannerResultsTitle" aria-busy={status === 'loading'}>
        <div className="planner-results-heading"><h3 id="plannerResultsTitle">Twoje połączenia</h3><span id="polMeta">{status === 'success' ? `${results.length} ${results.length === 1 ? 'propozycja' : results.length > 1 && results.length < 5 ? 'propozycje' : 'propozycji'}` : status === 'loading' ? 'Szukam…' : 'Zaplanuj podróż'}</span></div>
        {status === 'idle' && <div className="planner-empty"><span className="planner-empty__icon"><Route size={32} strokeWidth={1.4} /></span><strong>Twoja podróż zaczyna się tutaj</strong><p>Wybierz przystanek początkowy i docelowy.<br />Pokażemy godziny, przesiadki i trasę.</p></div>}
        {status === 'loading' && <div className="planner-loading" role="status"><span className="planner-spinner" />Sprawdzam rozkłady i przesiadki…</div>}
        {status === 'error' && <div className="planner-empty planner-empty--error" id="plannerError" role="status"><strong>Nie udało się wyszukać podróży</strong><p>{error}</p><button type="button" className="planner-pill" onClick={() => void handleSearch()}>Spróbuj ponownie</button></div>}
        {status === 'success' && !results.length && <div className="planner-empty" id="plannerEmpty" role="status"><Route size={30} /><strong>Brak połączeń w tym terminie</strong><p>Zmień godzinę lub pozwól na więcej przesiadek.</p></div>}
        <div className="planner-results">{results.map((result, index) => <article className="planner-result" key={index} data-selected={selected === index ? '1' : '0'}>
          <button type="button" className="planner-option" data-option={index} aria-expanded={selected === index} onClick={() => chooseResult(index)}>
            <span className="planner-option__times"><strong>{result.depTime}<ArrowRight size={15} />{result.arrTime}</strong><b>{result.durationMin}<small> min</small></b></span>
            <span className="planner-option__lines">{result.legs.map((leg, i) => <span key={i} className={leg.type === 'przejazd' ? 'planner-line' : 'planner-walk'} style={leg.type === 'przejazd' ? { borderColor: colorForLine(leg.line) } : undefined}>{leg.type === 'przejazd' ? <>{tramLines.has(leg.line) ? <TramFront size={13} /> : <BusFront size={13} />}{leg.line}</> : <Footprints size={15} />}{i < result.legs.length - 1 && <ChevronRight className="planner-line__next" size={12} />}</span>)}</span>
            <span className="planner-option__meta">{result.transfersCount === 0 ? 'Bez przesiadek' : result.transfersCount === 1 ? '1 przesiadka' : `${result.transfersCount} przesiadki`}<span>{selected === index ? 'Zwiń' : 'Szczegóły'}<ChevronDown size={13} /></span></span>
          </button>
          {selected === index && <div className="planner-legs" id="plannerDetails">{result.legs.map((leg, i) => <div key={i} className="planner-leg">
            <span className="planner-leg__time">{leg.depTime}<small>{leg.arrTime}</small></span>
            <span className="planner-leg__rail" style={leg.type === 'przejazd' ? { color: colorForLine(leg.line) } : undefined}>{leg.type === 'przejazd' ? tramLines.has(leg.line) ? <TramFront size={15} /> : <BusFront size={15} /> : <Footprints size={15} />}</span>
            <div className="planner-leg__description"><strong>{leg.fromStop}</strong><span>{leg.type === 'przejazd' ? `Linia ${leg.line}${leg.destination ? ` → ${leg.destination}` : ''}` : 'Przejście pieszo'}</span><small>{leg.durationMin} min{leg.stopsCount != null ? ` · ${leg.stopsCount} przystanków` : ''}</small><strong className="planner-leg__destination">{leg.toStop}</strong></div>
          </div>)}<button type="button" className="planner-show-map" onClick={showMap}><Map size={16} />Pokaż trasę na mapie<ArrowRight size={15} /></button></div>}
        </article>)}</div>
        {status === 'success' && results.length > 0 && <p className="planner-timetable-note">Godziny według rozkładu jazdy.</p>}
      </section>
      {mapView && option && <div className="planner-map-summary"><strong>{option.depTime} → {option.arrTime}<span>{option.durationMin} min</span></strong><span>{fromStop?.nazwa} → {toStop?.nazwa}</span><button type="button" className="planner-show-map" onClick={() => setMapView(false)}>Wróć do szczegółów połączenia<ArrowRight size={15} /></button></div>}
    </div>
    <nav className="planner-navigation" aria-label="Podróż"><button type="button" aria-current={!mapView ? 'page' : undefined} onClick={() => setMapView(false)}><Route size={19} />Połączenia</button><button type="button" onClick={onOpenSchedules}><Clock3 size={19} />Rozkłady</button><button type="button" aria-current={mapView ? 'page' : undefined} onClick={() => option ? showMap() : onClose()}><Map size={19} />Mapa</button></nav>
  </aside>;
}
