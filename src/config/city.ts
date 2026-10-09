import cities from "./cities.json";

export type CitySlug = keyof typeof cities.dictionaries;

const requestedCity = window.location.pathname.split("/")[1];
export const citySlug: CitySlug = requestedCity in cities.dictionaries
  ? requestedCity as CitySlug
  : "bydgoszcz";

export const city = cities.dictionaries[citySlug];
export const cityName = city.CITY_NAME;
export const cityBase = `/${citySlug}`;
export const cityCenter: [number, number] = [city.MAP_CENTER[1], city.MAP_CENTER[0]];
export const tramLines = new Set<string>(city.TRAM_LINES.map(String));

export const cityChoices = cities.registry.filter((entry) => entry.enabled);

export function cityPath(path: string): string {
  return `${cityBase}${path.startsWith("/") ? path : `/${path}`}`;
}

// Wiki remains the v1 page. Its Google callback and session cookies use busearch.pl,
// so opening it on the Vite host would leave users unable to sign in.
export function wikiPath(query = ""): string {
  return `https://busearch.pl${cityPath("/wiki")}${query}`;
}

export function apiPath(path: string): string {
  return cityPath(`/api/${path.replace(/^\/+/, "")}`);
}
