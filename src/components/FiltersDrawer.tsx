import { useState, type KeyboardEvent, type ReactNode } from 'react';
import { BusFront, TramFront, X } from 'lucide-react';
import { citySlug, tramLines } from '../config/city';
import { emptyVehicleFilters, isKonstalVehicle, hasFleetNumber, hasVehicleIdentity, hasVehiclePhoto, vehicleKind, type VehicleFilters, type VehicleKind } from '../config/vehicle-filters';
import type { Vehicle } from '../types/transit';

interface FiltersDrawerProps {
  isOpen: boolean;
  filterState: VehicleFilters;
  onFilterChange: (newState: VehicleFilters) => void;
  onClose: () => void;
  vehicles: Vehicle[];
  filteredVehiclesCount: number;
}

function FilterChip({ id, active, count, onClick, children }: { id?: string; active: boolean; count: number; onClick: () => void; children: ReactNode }) {
  return <button id={id} className="ui-chip" type="button" data-active={active ? '1' : '0'} aria-pressed={active} onClick={onClick}>{children}<span className="ui-chip__ile">{count}</span></button>;
}

export function FiltersDrawer({ isOpen, filterState, onFilterChange, onClose, vehicles, filteredVehiclesCount }: FiltersDrawerProps) {
  const [tab, setTab] = useState<'general' | 'models'>('general');
  if (!isOpen) return null;
  const identityKnown = vehicles.some(hasVehicleIdentity);
  const showModels = tab === 'models' && identityKnown;
  const models = [...new Set([...vehicles.map(vehicle => String(vehicle.model || '').trim()).filter(Boolean), ...filterState.models])].sort((a, b) => a.localeCompare(b, 'pl', { numeric: true }));
  const count = (predicate: (vehicle: Vehicle) => boolean) => vehicles.filter(predicate).length;
  const toggleType = (type: VehicleKind) => onFilterChange({ ...filterState, types: filterState.types.includes(type) ? filterState.types.filter(value => value !== type) : [...filterState.types, type] });
  const unavailableReason = 'Brak danych o pojazdach — miasto nie podaje teraz numerów bocznych ani modeli.';
  const changeTabByKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!identityKnown || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 'general' : event.key === 'End' ? 'models' : showModels ? 'general' : 'models';
    setTab(next);
    document.getElementById(next === 'models' ? 'zakladkaModele' : 'zakladkaOgolne')?.focus();
  };

  return <div className="ui-drawer" id="filtersDrawer" style={{ zIndex: 25000 }}>
    <div className="ui-drawer__header">
      <div className="ui-drawer__title">Filtry</div>
      <button className="ui-btn ui-btn--ghost ui-xbtn ui-close" id="closeFilters" type="button" aria-label="Zamknij filtry" onClick={onClose}><X size={18} /></button>
    </div>
    <div className="ui-zakladki" id="filtryZakladki" role="tablist" aria-label="Kategorie filtrów">
      <button className="ui-zakladka" id="zakladkaOgolne" type="button" role="tab" data-active={showModels ? '0' : '1'} aria-selected={!showModels} aria-controls="kartaOgolne" tabIndex={showModels ? -1 : 0} onClick={() => setTab('general')} onKeyDown={changeTabByKey}>Ogólne</button>
      <button className="ui-zakladka" id="zakladkaModele" type="button" role="tab" data-active={showModels ? '1' : '0'} data-nieczynne={identityKnown ? '0' : '1'} aria-selected={showModels} aria-controls="kartaModele" tabIndex={showModels ? 0 : -1} disabled={!identityKnown} title={identityKnown ? undefined : unavailableReason} onClick={() => setTab('models')} onKeyDown={changeTabByKey}>Modele</button>
    </div>
    <div className="ui-karta-zakladki" id="kartaOgolne" role="tabpanel" aria-labelledby="zakladkaOgolne" hidden={showModels}>
      <div className="ui-section">
        <div className="ui-section__title">Pojazdy</div>
        <div className="ui-chips" id="typeChips">
          <FilterChip id="filterBus" active={filterState.types.includes('BUS')} count={count(vehicle => vehicleKind(vehicle) === 'BUS')} onClick={() => toggleType('BUS')}><BusFront size={14} aria-hidden="true" /><span>Autobusy</span></FilterChip>
          {tramLines.size > 0 && <FilterChip id="filterTram" active={filterState.types.includes('TRAM')} count={count(vehicle => vehicleKind(vehicle) === 'TRAM')} onClick={() => toggleType('TRAM')}><TramFront size={14} aria-hidden="true" /><span>Tramwaje</span></FilterChip>}
          <FilterChip id="filterElectric" active={filterState.electricOnly} count={count(vehicle => vehicle.electric === true)} onClick={() => onFilterChange({ ...filterState, electricOnly: !filterState.electricOnly })}><span>Elektryki</span></FilterChip>
          {citySlug === 'torun' && <FilterChip id="filterKonstale" active={filterState.konstaleOnly} count={count(isKonstalVehicle)} onClick={() => onFilterChange({ ...filterState, konstaleOnly: !filterState.konstaleOnly })}><span>Konstale</span></FilterChip>}
          <FilterChip id="filterPhoto" active={filterState.withPhoto} count={count(hasVehiclePhoto)} onClick={() => onFilterChange({ ...filterState, withPhoto: !filterState.withPhoto })}><span>Ze zdjęciem</span></FilterChip>
        </div>
      </div>
      {citySlug === 'torun' && <div className="ui-section">
        <div className="ui-section__title">Numer taborowy</div>
        <div className="ui-chips"><FilterChip id="filterWithoutFleetNumber" active={filterState.onlyWithoutFleetNumber} count={count(vehicle => !hasFleetNumber(vehicle))} onClick={() => onFilterChange({ ...filterState, onlyWithoutFleetNumber: !filterState.onlyWithoutFleetNumber })}><span>Bez numeru taborowego</span></FilterChip></div>
      </div>}
      <div className="ui-section" data-nieczynne={identityKnown ? '0' : '1'}>
        <label className="ui-section__title filters-field-label" htmlFor="filterBrigade">Brygada / Oznaczenie / Numer autobusu</label>
        <input className="ui-input" id="filterBrigade" placeholder="np. 069-03 lub 3723" autoComplete="off" disabled={!identityKnown} data-nieczynne={identityKnown ? '0' : '1'} title={identityKnown ? undefined : unavailableReason} value={filterState.searchSideNumber} onChange={event => onFilterChange({ ...filterState, searchSideNumber: event.target.value })} />
      </div>
    </div>
    <div className="ui-karta-zakladki" id="kartaModele" role="tabpanel" aria-labelledby="zakladkaModele" hidden={!showModels}>
      <div className="ui-section">
        <div className="ui-section__title">Modele pojazdów</div>
        <div className="ui-chips" id="modelChips">{models.map(model => <FilterChip key={model} active={filterState.models.includes(model)} count={count(vehicle => String(vehicle.model || '').trim() === model)} onClick={() => onFilterChange({ ...filterState, models: filterState.models.includes(model) ? filterState.models.filter(value => value !== model) : [...filterState.models, model] })}><span>{model}</span></FilterChip>)}</div>
        {models.length === 0 && <p className="ui-modele-pusto">Brak informacji o modelach pojazdów.</p>}
      </div>
    </div>
    <div className="ui-footer">
      <button className="ui-btn ui-btn--ghost" id="resetFilters" type="button" onClick={() => onFilterChange(emptyVehicleFilters())}>Wyczyść</button>
      <div className="ui-stats" id="stats">{filteredVehiclesCount}/{vehicles.length}</div>
    </div>
  </div>;
}
