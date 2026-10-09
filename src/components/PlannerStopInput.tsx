import { useMemo, useRef, useState } from 'react';
import { LocateFixed, X, MapPin } from 'lucide-react';
import type { Stop } from '../types/transit';
import { searchStops, searchStopDirection } from '../config/search';

interface PlannerStopInputProps {
  id: string; label: string; stops: Stop[]; query: string; selected: Stop | null;
  onChange: (value: string) => void; onSelect: (stop: Stop) => void;
  onLocate?: () => void; locating?: boolean;
}

export function PlannerStopInput({ id, label, stops, query, selected, onChange, onSelect, onLocate, locating }: PlannerStopInputProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const results = useMemo(() => searchStops(stops, query), [stops, query]);
  const visible = open && !!query.trim() && !selected;
  const index = active < results.length ? active : -1;
  const select = (stop: Stop) => { onSelect(stop); setOpen(false); setActive(-1); };
  return <div className="planner-stop-input" onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false);
  }}>
    <label className="planner-stop-input__label" htmlFor={id}>{label}</label>
    <div className="planner-stop-input__field">
      <span className={`planner-stop-input__dot ${onLocate ? 'planner-stop-input__dot--from' : ''}`} aria-hidden="true" />
      <input ref={inputRef} id={id} autoComplete="off" placeholder={onLocate ? 'Przystanek początkowy' : 'Przystanek docelowy'} value={query}
        role="combobox" aria-autocomplete="list" aria-expanded={visible} aria-controls={visible ? `${id}Options` : undefined}
        aria-activedescendant={visible && index >= 0 ? `${id}Option${index}` : undefined}
        onFocus={() => setOpen(true)} onChange={event => { onChange(event.target.value); setActive(-1); setOpen(true); }}
        onKeyDown={event => {
          if (event.nativeEvent.isComposing || event.keyCode === 229) return;
          if (event.key === 'Escape' && visible) { event.preventDefault(); event.stopPropagation(); setOpen(false); }
          if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && visible && results.length) {
            event.preventDefault();
            setActive(event.key === 'ArrowDown' ? (index + 1) % results.length : index < 0 ? results.length - 1 : (index - 1 + results.length) % results.length);
          }
          if (event.key === 'Enter' && visible && results.length) { event.preventDefault(); select(results[index < 0 ? 0 : index]); }
        }} />
      {query && <button className="planner-icon-button" type="button" aria-label={`Wyczyść pole ${label}`} onClick={() => {
        onChange(''); setActive(-1); inputRef.current?.focus(); setOpen(true);
      }}><X size={16} /></button>}
      {onLocate && <button className="planner-icon-button" type="button" aria-label="Wybierz najbliższy przystanek" title="Najbliższy przystanek" disabled={locating || !stops.length} onClick={onLocate}><LocateFixed size={17} /></button>}
    </div>
    {selected && <div className="planner-stop-input__meta">{searchStopDirection(selected) ? `Kierunek: ${searchStopDirection(selected)} · ` : ''}Słupek {selected.kod || selected.id}</div>}
    {visible && <div id={`${id}Options`} role="listbox" aria-label={`Przystanki: ${label}`} className="planner-stop-input__options">
      {results.length ? results.map((stop, i) => <button type="button" role="option" aria-selected={index === i} id={`${id}Option${i}`} key={stop.id} data-stop-id={stop.id}
        onPointerDown={event => event.preventDefault()} onClick={() => select(stop)}>
        <MapPin size={16} aria-hidden="true" /><span><strong>{stop.nazwa}</strong><small>Słupek {stop.kod || stop.id}{searchStopDirection(stop) ? ` · → ${searchStopDirection(stop)}` : ''}</small></span>
      </button>) : <div className="planner-no-stops" role="status">Nie znaleziono przystanku. Spróbuj innej nazwy lub kodu.</div>}
    </div>}
  </div>;
}
