import type { Stop, TransitLine } from '../types/transit';

export function searchText(value: string): string {
  return value.toLocaleLowerCase('pl').replace(/ł/g, 'l').normalize('NFD').replace(/\p{M}/gu, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

export function searchLines(lines: TransitLine[], query: string): TransitLine[] {
  const q = searchText(query);
  if (!q) return [];
  const score = (line: TransitLine) => {
    const number = searchText(line.number);
    return number === q ? 0 : number.startsWith(q) ? 1 : 2;
  };
  return lines.filter(line => searchText(line.number).includes(q))
    .sort((a, b) => score(a) - score(b) || a.number.localeCompare(b.number, 'pl', {numeric: true})).slice(0, 5);
}

export function searchStops(stops: Stop[], query: string): Stop[] {
  const q = searchText(query);
  if (!q) return [];
  const tokens = q.split(' ');
  const score = (stop: Stop) => {
    const name = searchText(stop.nazwa);
    if (searchText(String(stop.kod ?? '')) === q || String(stop.id) === q) return 0;
    return name === q ? 1 : name.startsWith(q) ? 2 : 3;
  };
  return stops.filter(stop => {
    const searchable = searchText(`${stop.nazwa} ${stop.kod ?? ''} ${stop.id}`);
    return tokens.every(token => searchable.includes(token));
  }).sort((a, b) => score(a) - score(b) || a.nazwa.localeCompare(b.nazwa, 'pl') || a.id - b.id).slice(0, 7);
}

export function searchStopDirection(stop: Stop): string {
  if (stop.kierunek_opis) return stop.kierunek_opis;
  return [...new Set((stop.linie_kierunki ?? []).flatMap(row => row.kierunki?.length ? row.kierunki : [row.kierunek]).filter(Boolean))].slice(0, 3).join(" · ");
}
