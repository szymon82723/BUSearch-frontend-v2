import { Wrench } from "lucide-react";

const DEPOT_STOP_NAMES = new Set([
  "zajezdnia inowrocławska",
  "zajezdnia tramwajowa",
  "zajezdnia mobilis",
  "zajezdnia nowy port t1",
  "zajezdnia nowy port t2",
  "zajezdnia wrzeszcz t1",
  "zajezdnia wrzeszcz t2",
]);

export function isTechnicalStop(name: string, _stopCode?: string): boolean {
  const normalizedName = name.trim().replace(/\s+/g, " ").toLocaleLowerCase("pl-PL");
  return DEPOT_STOP_NAMES.has(normalizedName) || /(?:^|\s)tech\.(?:\s|$)/i.test(normalizedName);
}

export function TechnicalStopBadge({ name, stopCode }: { name: string; stopCode?: string }) {
  if (!isTechnicalStop(name, stopCode)) return null;
  return (
    <span className="technical-stop-badge" title="Przystanek techniczny" aria-label="Przystanek techniczny">
      <Wrench aria-hidden="true" />
    </span>
  );
}
