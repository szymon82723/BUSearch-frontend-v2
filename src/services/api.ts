import type {
  Vehicle,
  Stop,
  TransitLine,
  RouteGeometry,
  LineTimetable,
  TripRun,
  StopDeparture,
  VehicleEtaResponse,
  Announcement,
  ConnectionOption,
} from "../types/transit";
import { journeyTime } from "../config/journey-time";
import { apiPath, citySlug, type CitySlug } from "../config/city";

export async function fetchVehicles(sourceCity: CitySlug = citySlug): Promise<Vehicle[]> {
  const res = await fetch(`/${sourceCity}/api/vehicles`, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return res.json();
}

export async function fetchStops(): Promise<Stop[]> {
  const res = await fetch(apiPath("stops"), { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return res.json();
}

export async function fetchLines(): Promise<TransitLine[]> {
  const res = await fetch(apiPath("lines"), { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return res.json();
}

export async function fetchLineRoute(lineCode: string): Promise<RouteGeometry | null> {
  try {
    const res = await fetch(apiPath(`line/${encodeURIComponent(lineCode)}/route`), { cache: "no-store" });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    if (!data || typeof data !== "object" || !("trayectos" in data) || !Array.isArray(data.trayectos)) return null;
    const valid = data.trayectos.every((route: any) => route && typeof route === "object" &&
      (typeof route.trayecto_id === "number" || typeof route.trayecto_id === "string") &&
      (route.przystanki == null || (Array.isArray(route.przystanki) && route.przystanki.every((stop: any) =>
        stop && (typeof stop.id === "number" || typeof stop.id === "string") && typeof stop.nazwa === "string"))) &&
      Array.isArray(route.punkty) && route.punkty.every((point: unknown) =>
        Array.isArray(point) && point.length === 2 && point.every(value => typeof value === "number" && Number.isFinite(value))));
    return valid ? data as RouteGeometry : null;
  } catch {
    return null;
  }
}

export async function fetchStopDepartures(stopId: number | string, sourceCity: CitySlug = citySlug, afterMs?: number): Promise<StopDeparture[]> {
  const query = afterMs == null ? "" : `?schedule=1&after=${encodeURIComponent(afterMs)}`;
  const res = await fetch(`/${sourceCity}/api/stop/${encodeURIComponent(stopId)}/departures${query}`, { cache: "no-store", signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  const departures: unknown = await res.json();
  if (!Array.isArray(departures)) throw new Error("Invalid departure response");
  return departures.map((departure: StopDeparture) => ({ ...departure, originCity: departure.sourceCity ?? sourceCity }));
}

export async function fetchVehicleEtas(vehicleId: string): Promise<VehicleEtaResponse | null> {
  try {
    const res = await fetch(apiPath(`vehicle/${encodeURIComponent(vehicleId)}/etas`), { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function fetchAnnouncements(): Promise<Announcement[]> {
  try {
    const res = await fetch(apiPath("announcements"), { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return data.announcements || [];
  } catch {
    return [];
  }
}

export async function fetchAnnouncement(id: string): Promise<Announcement | null> {
  try {
    const res = await fetch(apiPath(`announcements/${encodeURIComponent(id)}`), { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    return data.ok ? data.announcement ?? null : null;
  } catch {
    return null;
  }
}

export interface JourneyPreferences {
  maxTransfers: number;
  transferMinutes: number;
  walkingSpeed: number;
}

export async function searchConnections(fromStop: Stop, toStop: Stop, whenMs: number, signal: AbortSignal, preferences?: JourneyPreferences): Promise<ConnectionOption[]> {
  const res = await fetch(apiPath("polaczenia"), {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ from: { stopId: fromStop.id }, to: { stopId: toStop.id }, whenMs, limit: 5,
      maxPrzesiadki: preferences?.maxTransfers ?? 2,
      ...(preferences ? { ustawienia: { minPrzesiadkaS: preferences.transferMinutes * 60, predkoscMarszu: preferences.walkingSpeed } } : {}),
    }),
    cache: "no-store", signal: AbortSignal.any([signal, AbortSignal.timeout(20_000)]),
  });
  const data = await res.json();
  if (!res.ok || data?.ok !== true) throw new Error(typeof data?.blad === "string" ? data.blad : "Nie udało się pobrać połączeń.");
  if (!Array.isArray(data.polaczenia) || !data.polaczenia.every((option: any) => option &&
    [option.wyjscieMs ?? option.odjazdMs, option.przyjazdMs, option.czasPodrozyMin, option.przesiadki].every(Number.isFinite) &&
    Array.isArray(option.odcinki) && option.odcinki.length > 0 && option.odcinki.every((leg: any) => leg &&
      ["przejazd", "przejscie", "pieszo"].includes(leg.rodzaj) && typeof leg.zPrzystanku?.nazwa === "string" && typeof leg.doPrzystanku?.nazwa === "string" &&
      Number.isFinite(leg.odjazdMs) && Number.isFinite(leg.przyjazdMs) &&
      (leg.rodzaj !== "przejazd" || typeof leg.linia === "string") &&
      (leg.ksztalt == null || (Array.isArray(leg.ksztalt) && leg.ksztalt.every((p: any) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite))))))) throw new Error("Serwer zwrócił nieprawidłowe połączenia.");
  return data.polaczenia.map((option: any) => ({
    depTime: journeyTime(option.wyjscieMs ?? option.odjazdMs), arrTime: journeyTime(option.przyjazdMs), durationMin: option.czasPodrozyMin, transfersCount: option.przesiadki,
    legs: option.odcinki.map((leg: any) => ({
      line: leg.linia ?? "Pieszo", type: leg.rodzaj, destination: leg.cel,
      fromStop: leg.zPrzystanku.nazwa, toStop: leg.doPrzystanku.nazwa,
      fromStopId: leg.zPrzystanku.id, toStopId: leg.doPrzystanku.id,
      depTime: journeyTime(leg.odjazdMs), arrTime: journeyTime(leg.przyjazdMs),
      durationMin: Math.max(0, Math.round((leg.przyjazdMs - leg.odjazdMs) / 60000)), stopsCount: leg.przystankow, geometry: leg.ksztalt ?? undefined,
    })),
  }));
}

export async function sendErrorReport(data: { topic: string; message: string; contact?: string }): Promise<boolean> {
  try {
    const res = await fetch(apiPath("zglos-blad"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.ok;
  } catch {
    return false;
  }
}


export async function fetchLineTimetable(line: string, stop: Stop, date: string, signal: AbortSignal): Promise<LineTimetable> {
  const query = new URLSearchParams({ stop: String(stop.id), name: stop.nazwa });
  if (date) query.set("date", date);
  const res = await fetch(apiPath(`line/${encodeURIComponent(line)}/timetable?${query}`), { cache: "no-store", signal });
  const data = await res.json();
  if (!res.ok) throw new Error(typeof data?.error === "string" ? data.error : "Nie udało się pobrać rozkładu.");
  const valid = data && Array.isArray(data.dni) && Array.isArray(data.warianty) &&
    data.warianty.every((variant: any) => variant && Number.isFinite(variant.idx) && typeof variant.kierunek === "string" &&
      (variant.litera == null || typeof variant.litera === "string") && (variant.opis == null || typeof variant.opis === "string")) &&
    data.dni.every((day: any) => day && typeof day.klucz === "string" && typeof day.nazwa === "string" && (day.data == null || typeof day.data === "string") && (day.date == null || typeof day.date === "string") && Array.isArray(day.godziny) &&
      day.godziny.every((hour: any) => hour && Number.isInteger(hour.h) && hour.h >= 0 && Array.isArray(hour.m) &&
        hour.m.every((minute: any) => minute && Number.isInteger(minute.min) && minute.min >= 0 && minute.min < 60 && Number.isFinite(minute.w) &&
          (minute.ozn == null || typeof minute.ozn === "string") && (minute.litera == null || typeof minute.litera === "string")))) &&
    (data.powod == null || typeof data.powod === "string") &&
    (data.objasnienia == null || (Array.isArray(data.objasnienia) && data.objasnienia.every((text: unknown) => typeof text === "string"))) &&
    [data.wazny_od, data.wazny_do].every(value => value == null || typeof value === "string");
  if (!valid) throw new Error("Serwer zwrócił nieprawidłowy rozkład. Spróbuj ponownie.");
  return data;
}

export async function fetchTripRun(line: string, stop: Stop, choice: { time: string; day: string; date: string; direction: string; variant: string }, signal: AbortSignal): Promise<TripRun> {
  const query = new URLSearchParams({ stop: String(stop.id), name: stop.nazwa, time: choice.time, day: choice.day, date: choice.date, kierunek: choice.direction, wariant: choice.variant });
  const response = await fetch(apiPath(`line/${encodeURIComponent(line)}/trip-run?${query}`), { cache: "no-store", signal });
  const data = await response.json();
  if (!response.ok) throw new Error(typeof data?.error === "string" ? data.error : "Nie udało się pobrać kursu.");
  if (!data || typeof data.linia !== "string" || typeof data.kierunek !== "string" || typeof data.odjazd !== "string" || !data.dzien || typeof data.dzien.data !== "string" || typeof data.dzien.nazwa !== "string" ||
    !Array.isArray(data.przystanki) || data.przystanki.length < 2 || !data.przystanki.every((stop: any) => stop && ["string", "number"].includes(typeof stop.id) && typeof stop.nazwa === "string" && typeof stop.czas === "string" && [stop.lat, stop.lon].every(value => value == null || Number.isFinite(value))) ||
    !Array.isArray(data.punkty) || !data.punkty.every((point: any) => Array.isArray(point) && point.length === 2 && point.every(Number.isFinite))) throw new Error("Serwer zwrócił nieprawidłowy przebieg kursu.");
  return data;
}
