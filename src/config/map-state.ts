import { citySlug } from "./city";

const COOKIE_NAME = `busearch_map_state_v1__${citySlug}`;

export interface SavedMapState {
  lat: number;
  lon: number;
  zoom: number;
  showOffline: boolean;
}

export function readMapState(): SavedMapState | null {
  try {
    const raw = document.cookie.split("; ").find((entry) => entry.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length + 1);
    if (!raw) return null;
    const state = JSON.parse(decodeURIComponent(raw));
    const lat = Number(state.lat);
    const lon = Number(state.lon);
    const zoom = Number(state.zoom);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(zoom)) return null;
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180 || zoom < 0 || zoom > 20) return null;
    return { lat, lon, zoom, showOffline: state.showOffline === true };
  } catch { return null; }
}

export function writeMapState(state: SavedMapState): void {
  try {
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify(state))}; Max-Age=31536000; Path=/; SameSite=Lax`;
  } catch { /* cookies disabled */ }
}
