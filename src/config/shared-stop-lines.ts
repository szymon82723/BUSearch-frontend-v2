import type { Stop } from "../types/transit";
import { citySlug, type CitySlug } from "./city";

// Link the matching physical poles, preserving the direction of each feed.
type LinkedStop = { city: CitySlug; stopId: number; line: string };
const ZLAWIES_LINKS: Partial<Record<CitySlug, Record<string, LinkedStop>>> = {
  bydgoszcz: {
    "13337": { city: "torun", stopId: 2234, line: "132" },
    "13338": { city: "torun", stopId: 2233, line: "132" },
  },
  torun: {
    "99225": { city: "bydgoszcz", stopId: 2002, line: "43" },
    "99226": { city: "bydgoszcz", stopId: 2003, line: "43" },
  },
};

export function linkedStopFor(stop: Stop): LinkedStop | null {
  return ZLAWIES_LINKS[citySlug]?.[String(stop.kod)] ?? null;
}

export function linesAtStop(stop: Stop): string[] {
  const linked = linkedStopFor(stop);
  return [...new Set([...stop.lines, ...(linked ? [linked.line] : [])])];
}
