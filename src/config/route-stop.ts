import type { Stop, VehicleEtaStop, RouteGeometry } from "../types/transit";

// Route responses can contain platforms missing from the general stop list.
export function resolveRouteStop(routeStop: VehicleEtaStop, stops: Stop[], line?: string): Stop | null {
  const id = Number(routeStop.id);
  const known = stops.find(stop => Number(stop.id) === id);
  if (known) return known;
  if (!Number.isFinite(id) || id <= 0 || !Number.isFinite(routeStop.lat) || !Number.isFinite(routeStop.lon)) return null;
  return { id, nazwa: routeStop.name, kod: String(id), lat: routeStop.lat, lon: routeStop.lon, lines: line ? [line] : [] };
}


export function stopsForLineVariant(variant: RouteGeometry["trayectos"][number] | undefined, stops: Stop[], line: string): Stop[] {
  const byId = new Map(stops.map(stop => [Number(stop.id), stop]));
  return [...(variant?.przystanki ?? [])]
    .sort((a, b) => (a.kolejnosc ?? 0) - (b.kolejnosc ?? 0))
    .flatMap(routeStop => {
      const known = byId.get(Number(routeStop.id));
      if (known) return [known];
      if (routeStop.lat == null || routeStop.lon == null) return [];
      const resolved = resolveRouteStop({ id: Number(routeStop.id), name: routeStop.nazwa, lat: routeStop.lat, lon: routeStop.lon }, [], line);
      return resolved ? [{ ...resolved, kod: routeStop.kod ?? resolved.kod }] : [];
    });
}
