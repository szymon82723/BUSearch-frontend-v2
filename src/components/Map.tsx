import { formatFleetNumber } from "../config/vehicle-filters";
import { resolveRouteStop } from "../config/route-stop";
import { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import type { Vehicle, Stop, RouteGeometry, VehicleEtaStop } from "../types/transit";
import type { MapStyleType } from "./LayersModal";
import { city, cityCenter, tramLines } from "../config/city";
import { readMapState, writeMapState } from "../config/map-state";
import { colorForLine } from "../config/line-color";
import { isTechnicalStop } from "./TechnicalStopBadge";
import { layoutVehicleMarkers } from "../config/vehicle-marker-layout";

interface MapProps {
  vehicles: Vehicle[];
  stops: Stop[];
  selectedVehicle: Vehicle | null;
  selectedStop: Stop | null;
  routeGeometry: RouteGeometry | null;
  fitRouteToBounds: boolean;
  vehicleRouteStops: VehicleEtaStop[];
  lineRouteStops: Stop[];
  trackedVehicleId: string | null;
  activeMapStyle: MapStyleType;
  isDarkMode: boolean;
  userLocation: [number, number] | null;
  resetViewTrigger: number;
  showOffline: boolean;
  onSelectVehicle: (vehicle: Vehicle | null) => void;
  onSelectStop: (stop: Stop | null) => void;
}

const TRAM_LINES = tramLines;

const BUS_ICON_SVG = `<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z"/></svg>`;

const TRAM_ICON_SVG = `<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><g fill-rule="evenodd"><path d="M6.2 1.2h11.6a.9.9 0 1 1 0 1.8h-4.9v2.1h-1.8V3H6.2a.9.9 0 0 1 0-1.8Z"/><path d="M8.3 5.1h7.4a3.9 3.9 0 0 1 3.9 3.9v7.6a3.9 3.9 0 0 1-2.7 3.71l.83 2.36a.5.5 0 0 1-.47.67h-1.2a.5.5 0 0 1-.47-.34l-.95-2.7H9.36l-.95 2.7a.5.5 0 0 1-.47.34h-1.2a.5.5 0 0 1-.47-.67l.83-2.36A3.9 3.9 0 0 1 4.4 16.6V9a3.9 3.9 0 0 1 3.9-3.9ZM6.9 8.7h4.2v4.6H6.9Zm6 0h4.2v4.6h-4.2ZM8.7 15.6a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm6.6 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z"/></g></svg>`;

const STOP_ICON_SVG = `<svg class="stop-marker__ico" viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 2C7.58 2 4 5.58 4 10c0 5.25 6.72 11.19 7 11.45.28.26.72.26 1 0C12.28 21.19 20 15.25 20 10c0-4.42-3.58-8-8-8zm0 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/></svg>`;
const TRAIN_STOP_ICON_SVG = `<svg class="stop-marker__ico" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2c-4 0-8 .5-8 4v9.5A3.5 3.5 0 0 0 7.5 19L6 20.5v.5h12v-.5L16.5 19a3.5 3.5 0 0 0 3.5-3.5V6c0-3.5-3.58-4-8-4zM7.5 17A1.5 1.5 0 1 1 9 15.5 1.5 1.5 0 0 1 7.5 17zm3.5-7H6V6h5zm2 0V6h5v4zm3.5 7a1.5 1.5 0 1 1 1.5-1.5 1.5 1.5 0 0 1-1.5 1.5z"/></svg>`;

function vehicleCard(vehicle: Vehicle): HTMLDivElement {
  const card = document.createElement("div");
  card.className = "vehicle-map-card";
  const addLine = (text: string, muted = false) => {
    const row = document.createElement("div");
    row.textContent = text;
    if (muted) row.className = "vehicle-map-card__updated";
    card.append(row);
  };
  addLine(`ID pojazdu: ${formatFleetNumber(vehicle.nr_boczny)}`);
  const fleetNumber = String(vehicle.nr_rzeczywisty || vehicle.wiki_nr || "").trim();
  if (fleetNumber) addLine(`Numer taborowy: ${formatFleetNumber(fleetNumber)}`);
  if (vehicle.brygada) addLine(`Oznaczenie: ${vehicle.brygada}`);
  const until = Number(vehicle.layover_until_ms);
  if (!vehicle.offline && Number.isFinite(until) && until > 0) {
    const minutes = Math.ceil((until - Date.now()) / 60000);
    const unit = minutes === 1 ? "minutę" : minutes % 10 >= 2 && minutes % 10 <= 4 && (minutes % 100 < 12 || minutes % 100 > 14) ? "minuty" : "minut";
    addLine(minutes > 0 ? `Odjazd za ${minutes} ${unit}` : "Oczekuje na odjazd");
  } else if (vehicle.predkosc > 0) addLine(`Prędkość: ${Math.round(vehicle.predkosc)} km/h`);
  if (vehicle.position_imprecise) addLine("ISKA: lokalizacja nieprecyzyjna");
  if (vehicle.model) addLine(`Model: ${vehicle.model}`);
  if (vehicle.rok_produkcji) addLine(`Rok produkcji: ${vehicle.rok_produkcji}`);
  if (vehicle.notatka) addLine(`Notatka: ${vehicle.notatka}`);
  if (vehicle.patron) addLine(`Patron: ${vehicle.patron}`);
  const timestamp = String(vehicle.ts || "").trim();
  if (timestamp) {
    let updateTime = timestamp;
    if (!/^\d{1,2}:\d{2}(:\d{2})?$/.test(timestamp)) {
      const date = new Date(timestamp);
      if (Number.isFinite(date.getTime())) updateTime = date.toLocaleTimeString("pl-PL", { timeZone: "Europe/Warsaw" });
    }
    addLine(`Aktualizacja: ${updateTime}`, true);
  }
  return card;
}

function routeStopImage(): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 48;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath(); ctx.arc(24, 24, 22, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#9252e8";
  ctx.beginPath(); ctx.arc(24, 24, 18.5, 0, Math.PI * 2); ctx.fill();
  // White location pin inside the purple stop badge.
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(24, 36);
  ctx.bezierCurveTo(20, 32, 13.5, 25.5, 13.5, 21);
  ctx.bezierCurveTo(13.5, 7.5, 34.5, 7.5, 34.5, 21);
  ctx.bezierCurveTo(34.5, 25.5, 28, 32, 24, 36);
  ctx.fill();
  ctx.fillStyle = "#9252e8";
  ctx.beginPath(); ctx.arc(24, 20, 4.3, 0, Math.PI * 2); ctx.fill();
  return ctx.getImageData(0, 0, 48, 48);
}

export function TransitMap({
  vehicles,
  stops,
  selectedVehicle,
  selectedStop,
  routeGeometry,
  fitRouteToBounds,
  vehicleRouteStops,
  lineRouteStops,
  trackedVehicleId,
  activeMapStyle,
  isDarkMode,
  userLocation,
  resetViewTrigger,
  showOffline,
  onSelectVehicle,
  onSelectStop,
}: MapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [styleRevision, setStyleRevision] = useState(0);
  const [viewportRevision, setViewportRevision] = useState(0);
  useEffect(() => {
    let frame = 0;
    const resize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setViewportRevision(value => value + 1));
    };
    window.addEventListener('resize', resize);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', resize); };
  }, []);
  const appliedStyleRef = useRef(`${activeMapStyle}:${isDarkMode}`);
  const markerZoomBandRef = useRef<number | null>(null);
  const showOfflineRef = useRef(showOffline);
  showOfflineRef.current = showOffline;

  const vehiclePopupRef = useRef<maplibregl.Popup | null>(null);
  const popupVehicleIdRef = useRef<string | null>(null);
  const selectedVehicleIdRef = useRef<string | null>(null);
  selectedVehicleIdRef.current = selectedVehicle?.nr_boczny ?? null;
  const showVehicleCard = (vehicle: Vehicle) => {
    const map = mapRef.current;
    if (!map) return;
    const popup = vehiclePopupRef.current ?? new maplibregl.Popup({
      closeButton: false, closeOnClick: false, offset: 22,
      maxWidth: "260px", className: "vehicle-map-popup",
    });
    vehiclePopupRef.current = popup;
    popupVehicleIdRef.current = vehicle.nr_boczny;
    const point = map.project([vehicle.lon, vehicle.lat]);
    const offset = vehicleMarkersRef.current.get(vehicle.nr_boczny)?.getOffset();
    if (offset) { point.x += offset.x; point.y += offset.y; }
    popup.setLngLat(map.unproject(point)).setDOMContent(vehicleCard(vehicle)).addTo(map);
  };
  const hideVehicleCard = () => {
    vehiclePopupRef.current?.remove();
    popupVehicleIdRef.current = null;
  };

  // Markers stored in maps for recycling
  const vehicleMarkersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const stopMarkersRef = useRef<Map<number, maplibregl.Marker>>(new Map());
  const vehiclesByIdRef = useRef<Map<string, Vehicle>>(new Map());
  const stopsByIdRef = useRef<Map<number, Stop>>(new Map());
  const routeStopsByIdRef = useRef<Map<number, VehicleEtaStop>>(new Map());
  const routeStops = selectedVehicle ? vehicleRouteStops : lineRouteStops.map(stop => ({ ...stop, name: stop.nazwa }));
  routeStopsByIdRef.current = new Map(routeStops.map(stop => [Number(stop.id), stop]));
  const onSelectVehicleRef = useRef(onSelectVehicle);
  const onSelectStopRef = useRef(onSelectStop);
  vehiclesByIdRef.current = new Map(vehicles.map((vehicle) => [vehicle.nr_boczny, vehicle]));
  stopsByIdRef.current = new Map([...stops, ...lineRouteStops, ...(selectedStop ? [selectedStop] : [])].map((stop) => [stop.id, stop]));
  onSelectVehicleRef.current = onSelectVehicle;
  onSelectStopRef.current = onSelectStop;

  const getStyleDefinition = (styleType: MapStyleType, dark: boolean): string | maplibregl.StyleSpecification => {
    if (styleType === "basic") {
      return dark ? "/map-style-ciemny.json" : "/map-style.json";
    }
    if (styleType === "osm") {
      return {
        version: 8,
        glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "&copy; OpenStreetMap contributors",
          },
        },
        layers: [{ id: "osm-tiles", type: "raster", source: "osm" }],
      };
    }
    return {
      version: 8,
      glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
      sources: {
        satellite: {
          type: "raster",
          tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
          tileSize: 256,
          attribution: "&copy; Esri World Imagery",
        },
      },
      layers: [{ id: "satellite-tiles", type: "raster", source: "satellite" }],
    };
  };

  const setupTransitLayers = (map: maplibregl.Map) => {
    // 1. Route Line
    if (!map.getSource("route-source")) {
      map.addSource("route-source", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.addLayer({
        id: "route-casing",
        type: "line",
        source: "route-source",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": ["case", ["==", ["get", "active"], true], ["get", "color"], "#334155"],
          "line-width": 6,
          "line-opacity": ["case", ["==", ["get", "active"], true], 0.15, 0.15],
        },
      });

      map.addLayer({
        id: "route-line",
        type: "line",
        source: "route-source",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": ["case", ["==", ["get", "active"], true], ["get", "color"], "#64748b"],
          "line-width": ["case", ["==", ["get", "active"], true], 4, 3],
          "line-opacity": ["case", ["==", ["get", "active"], true], 1, 0.35],
        },
      });
    }

    if (!map.getSource("route-stops-source")) {
      map.addSource("route-stops-source", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      if (!map.hasImage("route-stop-icon")) map.addImage("route-stop-icon", routeStopImage(), { pixelRatio: 2 });
      map.addLayer({ id: "route-stops", type: "symbol", source: "route-stops-source", layout: {
        "icon-image": "route-stop-icon",
        "icon-size": ["interpolate", ["linear"], ["zoom"], 9, 0.3, 11, 0.45, 13, 0.7, 15, 1, 19, 1.1],
        "icon-allow-overlap": true, "icon-ignore-placement": true,
      } });
      map.addLayer({ id: "route-stop-labels", type: "symbol", source: "route-stops-source", minzoom: 13.5,
        layout: { "text-field": ["get", "name"], "text-font": ["Noto Sans Bold"], "text-size": 12,
          "text-anchor": "top", "text-offset": [0, 1.6], "text-max-width": 12 },
        paint: { "text-color": isDarkMode ? "#d4bfff" : "#6e3dab", "text-halo-color": isDarkMode ? "#17201f" : "#ffffff", "text-halo-width": 1.5 },
      });
    }

    // 2. User Location Layer
    if (!map.getSource("user-location-source")) {
      map.addSource("user-location-source", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.addLayer({
        id: "user-location-pulse",
        type: "circle",
        source: "user-location-source",
        paint: {
          "circle-radius": 14,
          "circle-color": "#38bdf8",
          "circle-opacity": 0.35,
          "circle-blur": 0.5,
        },
      });

      map.addLayer({
        id: "user-location-dot",
        type: "circle",
        source: "user-location-source",
        paint: {
          "circle-radius": 6,
          "circle-color": "#0284c7",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });
    }
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const savedView = readMapState();
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: getStyleDefinition(activeMapStyle, isDarkMode),
      center: savedView ? [savedView.lon, savedView.lat] : cityCenter,
      zoom: savedView?.zoom ?? 11,
      minZoom: 9,
      maxZoom: 19,
      attributionControl: false,
    });

    // Smaller zoom steps make wheel and trackpad movement easier to control.
    map.scrollZoom.setWheelZoomRate(1 / 700);
    map.scrollZoom.setZoomRate(1 / 140);

    map.addControl(new maplibregl.AttributionControl({ compact: false }), "bottom-right");

    map.on("load", () => {
      setupTransitLayers(map);
      setMapLoaded(true);
    });

    const saveView = () => {
      const center = map.getCenter();
      writeMapState({ lat: Number(center.lat.toFixed(6)), lon: Number(center.lng.toFixed(6)), zoom: map.getZoom(), showOffline: showOfflineRef.current });
    };
    map.on("moveend", saveView);
    const resizeOnReturn = () => { if (!document.hidden) map.resize(); };
    window.addEventListener("pageshow", resizeOnReturn);
    document.addEventListener("visibilitychange", resizeOnReturn);

    map.on("click", (event) => {
      const layers = ["route-stops", "route-stop-labels"].filter(id => map.getLayer(id));
      if (!layers.length) return;
      // Keep small pins easy to tap, and allow clicking the stop name as well.
      const radius = 12;
      const features = map.queryRenderedFeatures([
        [event.point.x - radius, event.point.y - radius],
        [event.point.x + radius, event.point.y + radius],
      ], { layers });
      const nearest = features.filter(feature => feature.geometry.type === "Point").sort((a, b) => {
        const distance = (feature: typeof a) => {
          const point = map.project((feature.geometry as GeoJSON.Point).coordinates as [number, number]);
          return Math.hypot(point.x - event.point.x, point.y - event.point.y);
        };
        return distance(a) - distance(b);
      })[0];
      if (!nearest) return;
      const id = Number(nearest.properties?.id);
      const stop = stopsByIdRef.current.get(id);
      if (stop) { onSelectStopRef.current(stop); return; }
      const routeStop = routeStopsByIdRef.current.get(id);
      if (routeStop && Number.isFinite(id) && id > 0) {
        const vehicle = selectedVehicleIdRef.current ? vehiclesByIdRef.current.get(selectedVehicleIdRef.current) : undefined;
        const resolved = resolveRouteStop(routeStop, [...stopsByIdRef.current.values()], vehicle?.linia);
        if (resolved) onSelectStopRef.current(resolved);
      }
    });
    for (const layer of ["route-stops", "route-stop-labels"]) {
      map.on("mouseenter", layer, () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", layer, () => { map.getCanvas().style.cursor = ""; });
    }
    mapRef.current = map;

    return () => {
      map.off("moveend", saveView);
      window.removeEventListener("pageshow", resizeOnReturn);
      document.removeEventListener("visibilitychange", resizeOnReturn);
      hideVehicleCard();
      vehiclePopupRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update HTML markers (Vehicles dots/badges and Stop pins) in visible viewport
  const updateMarkersInView = useCallback(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const zoom = map.getZoom();
    const bounds = map.getBounds();

    // Boundary buffer so markers don't clip at screen edges
    const west = bounds.getWest() - 0.03;
    const east = bounds.getEast() + 0.03;
    const south = bounds.getSouth() - 0.03;
    const north = bounds.getNorth() + 0.03;

    const inBounds = (lon: number, lat: number) =>
      lon >= west && lon <= east && lat >= south && lat <= north;

    // 1. VEHICLE MARKERS (all zoom levels)
    const currentVehKeys = new Set<string>();

    vehicles.forEach((v) => {
      if (selectedVehicle && selectedVehicle.nr_boczny !== v.nr_boczny) return;
      if (!inBounds(v.lon, v.lat)) return;
      const key = v.nr_boczny;
      currentVehKeys.add(key);

      const isTram = TRAM_LINES.has(v.linia);
      const color = colorForLine(v.linia);
      const isSelected = selectedVehicle?.nr_boczny === v.nr_boczny;
      const rot = Number.isFinite(v.kierunek_ruch_deg) ? v.kierunek_ruch_deg : 0;
      // Show the direction as soon as the full marker appears.
      const hasHeading = Number.isFinite(v.kierunek_ruch_deg) && zoom >= 14;

      const isDot = zoom < 13 && !isSelected;
      const isCompact = zoom >= 13 && zoom < 14 && !isSelected;

      const markerClass = isDot
        ? `maplibregl-marker veh-marker veh-marker--dot ${isSelected ? "veh-marker--selected" : ""}`
        : `maplibregl-marker veh-marker ${isCompact ? "veh-marker--compact" : ""} ${isSelected ? "veh-marker--selected" : ""}`;

      const dirIco = hasHeading
        ? `<svg class="veh-marker__dir" viewBox="0 0 24 24" aria-hidden="true" style="--veh-rot:${rot}deg;--veh-arrow-opacity:1"><path d="M12 3l7 8h-4.2v10h-5.6V11H5l7-8z"/></svg>`
        : "";

      const innerContent = isDot
        ? `<div class="veh-marker__dot-shape"></div>`
        : `
          <div class="veh-marker__chip">
            ${dirIco}
            <span class="veh-marker__icons">
              ${isTram ? TRAM_ICON_SVG : BUS_ICON_SVG}
            </span>
            <span class="veh-marker__line">${v.linia}</span>
          </div>
        `;

      let marker = vehicleMarkersRef.current.get(key);

      if (!marker) {
        const el = document.createElement("div");
        el.className = markerClass;
        el.style.setProperty("--veh-color", color);
        el.style.cursor = "pointer";
        el.tabIndex = 0;
        el.setAttribute("role", "button");
        el.setAttribute("aria-label", `Linia ${v.linia}, pojazd ${v.nr_boczny}`);
        el.dataset.mode = isDot ? "dot" : isCompact ? "compact" : "full";
        el.dataset.heading = String(hasHeading);
        el.dataset.line = v.linia;
        el.innerHTML = innerContent;

        const showCard = () => {
          const vehicle = vehiclesByIdRef.current.get(key);
          if (vehicle) showVehicleCard(vehicle);
        };
        const hideCard = () => { if (!selectedVehicleIdRef.current) hideVehicleCard(); };
        el.addEventListener("mouseenter", showCard);
        el.addEventListener("mouseleave", hideCard);
        el.addEventListener("focus", showCard);
        el.addEventListener("blur", hideCard);
        el.addEventListener("keydown", (event) => {
          if (event.key === "Escape") hideVehicleCard();
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            const current = vehiclesByIdRef.current.get(key);
            if (current) onSelectVehicleRef.current(current);
          }
        });

        el.addEventListener("click", (e) => {
          e.stopPropagation();
          const current = vehiclesByIdRef.current.get(key);
          if (current) onSelectVehicleRef.current(current);
        });

        marker = new maplibregl.Marker({ element: el })
          .setLngLat([v.lon, v.lat])
          .addTo(map);

        vehicleMarkersRef.current.set(key, marker);
      } else {
        marker.setLngLat([v.lon, v.lat]);
        const el = marker.getElement();
        const mode = isDot ? "dot" : isCompact ? "compact" : "full";

        if (el.dataset.mode !== mode || el.dataset.heading !== String(hasHeading) || el.dataset.line !== v.linia || isSelected !== el.classList.contains("veh-marker--selected")) {
          el.dataset.mode = mode;
          el.dataset.heading = String(hasHeading);
          el.dataset.line = v.linia;
          el.className = markerClass;
          el.style.setProperty("--veh-color", color);
          el.innerHTML = innerContent;
        } else if (!isDot && hasHeading) {
          const dirEl = el.querySelector(".veh-marker__dir") as HTMLElement | null;
          if (dirEl && Number.isFinite(rot)) {
            dirEl.style.setProperty("--veh-rot", `${rot}deg`);
          }
        }
      }
      const fleetNumber = String(v.wiki_nr || v.nr_rzeczywisty || (city.MAP_ID_IS_FLEET_NUMBER === "1" ? v.nr_boczny : "")).trim();
      const element = marker.getElement();
      let fleetLabel = element.querySelector<HTMLSpanElement>(".veh-marker__fleet");
      if (fleetNumber && !isDot) {
        if (!fleetLabel) {
          fleetLabel = document.createElement("span");
          fleetLabel.className = "veh-marker__fleet";
          element.append(fleetLabel);
        }
        fleetLabel.textContent = `#${formatFleetNumber(fleetNumber)}`;
      } else fleetLabel?.remove();

    });

    const viewport = map.getContainer().getBoundingClientRect();
    const topbar = document.getElementById("topbar")?.getBoundingClientRect();
    // Dots show the actual GPS position. Only spread overlapping vehicle badges.
    const badgeKeys = [...currentVehKeys].filter(id =>
      !vehicleMarkersRef.current.get(id)!.getElement().classList.contains("veh-marker--dot"));
    const offsets = layoutVehicleMarkers(badgeKeys.map(id => {
      const vehicle = vehiclesByIdRef.current.get(id)!;
      const element = vehicleMarkersRef.current.get(id)!.getElement();
      const point = map.project([vehicle.lon, vehicle.lat]);
      const chip = element.querySelector(".veh-marker__chip");
      return { id, x: point.x, y: point.y,
        width: Math.max(element.offsetWidth, chip?.getBoundingClientRect().width ?? 0),
        height: element.offsetHeight + (element.querySelector(".veh-marker__fleet") ? 20 : 0) };
    }), box => {
      const left = viewport.left + box.x - box.width / 2;
      const right = viewport.left + box.x + box.width / 2;
      const top = viewport.top + box.y - box.height / 2;
      const bottom = viewport.top + box.y + box.height / 2;
      return left >= viewport.left + 8 && right <= viewport.right - 8 &&
        top >= viewport.top + 8 && bottom <= viewport.bottom - 76 &&
        (!topbar || right <= topbar.left || left >= topbar.right || top >= topbar.bottom + 8 || bottom <= topbar.top);
    });
    for (const id of currentVehKeys) {
      const offset = offsets.get(id) ?? [0, 0];
      const marker = vehicleMarkersRef.current.get(id)!;
      marker.setOffset(offset);
    }

    const popupVehicle = popupVehicleIdRef.current ? vehiclesByIdRef.current.get(popupVehicleIdRef.current) : undefined;
    if (popupVehicle && currentVehKeys.has(popupVehicle.nr_boczny)) {
      showVehicleCard(popupVehicle);
    } else if (popupVehicleIdRef.current) hideVehicleCard();

    // Cleanup vehicles out of view
    vehicleMarkersRef.current.forEach((marker, key) => {
      if (!currentVehKeys.has(key)) {
        marker.remove();
        vehicleMarkersRef.current.delete(key);
      }
    });

    // 2. STOP MARKERS (zoom >= 14)
    const currentStopKeys = new Set<number>();

    {
      const ordinaryStops = !selectedVehicle && lineRouteStops.length === 0 ? stops : [];
      const displayedStops = selectedStop
        ? [...ordinaryStops.filter(stop => stop.id !== selectedStop.id), selectedStop]
        : ordinaryStops;
      displayedStops.forEach((s) => {
        const isSelected = selectedStop?.id === s.id;
        if (!isSelected && (zoom < 14 || !inBounds(s.lon, s.lat))) return;
        currentStopKeys.add(s.id);

        const isRailStop = s.kolej === true;
        const isTramStop = !isRailStop && (s.tram ?? s.lines.some((l) => TRAM_LINES.has(l)));
        const isTechnical = isTechnicalStop(s.nazwa, s.kod);

        let marker = stopMarkersRef.current.get(s.id);

        if (!marker) {
          const el = document.createElement("div");
          el.className = `maplibregl-marker stop-marker ${isTramStop ? "stop-marker--tram" : ""} ${isRailStop ? "stop-marker--kolej" : ""} ${isSelected ? "stop-marker--selected" : ""}`;
          el.dataset.stopId = String(s.id);
          el.style.cursor = "pointer";
          el.title = `${s.nazwa} · ID ${s.id}${isTechnical ? " · przystanek techniczny" : ""}`;

          el.innerHTML = `
            <div class="stop-marker__dot">
              ${isRailStop ? TRAIN_STOP_ICON_SVG : STOP_ICON_SVG}
            </div>
          `;

          if (s.kierunek != null && Number.isFinite(Number(s.kierunek))) {
            const arrow = document.createElement("div");
            arrow.className = "stop-marker__strzalka";
            arrow.style.transform = `rotate(${Number(s.kierunek)}deg)`;
            arrow.append(document.createElement("i"));
            el.prepend(arrow);
          }
          el.addEventListener("click", (e) => {
            e.stopPropagation();
            const current = stopsByIdRef.current.get(s.id);
            onSelectStopRef.current(current ?? s);
          });

          marker = new maplibregl.Marker({ element: el })
            .setLngLat([s.lon, s.lat])
            .addTo(map);

          stopMarkersRef.current.set(s.id, marker);
        } else {
          marker.setLngLat([s.lon, s.lat]);
          const el = marker.getElement();
          const expectedClass = `maplibregl-marker stop-marker ${isTramStop ? "stop-marker--tram" : ""} ${isRailStop ? "stop-marker--kolej" : ""} ${isSelected ? "stop-marker--selected" : ""}`;
          if (el.className !== expectedClass) {
            el.className = expectedClass;
          }
        }
        const el = marker.getElement();
        el.title = `${s.nazwa} · ID ${s.id}${isTechnical ? " · przystanek techniczny" : ""}`;
        let label = el.querySelector<HTMLDivElement>(".stop-marker__plakietka");
        if (!label) {
          label = document.createElement("div");
          label.className = "stop-marker__plakietka";
          el.append(label);
        }
        label.textContent = s.nazwa;
      });
    }

    // Cleanup stops out of view or zoomed out
    stopMarkersRef.current.forEach((marker, id) => {
      if (!currentStopKeys.has(id)) {
        marker.remove();
        stopMarkersRef.current.delete(id);
      }
    });
  }, [vehicles, stops, vehicleRouteStops, lineRouteStops, selectedVehicle, selectedStop, mapLoaded, onSelectVehicle, onSelectStop]);
  const updateMarkersInViewRef = useRef(updateMarkersInView);
  updateMarkersInViewRef.current = updateMarkersInView;

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const zoomBand = () => map.getZoom() < 13 ? 0 : map.getZoom() < 14 ? 1 : map.getZoom() < 17 ? 2 : 3;
    const refreshMarkers = () => {
      map.getContainer().classList.toggle("pokaz-plakietki", map.getZoom() >= 17);
      markerZoomBandRef.current = zoomBand();
      updateMarkersInView();
    };
    const refreshAtZoomThreshold = () => {
      const band = zoomBand();
      if (band !== markerZoomBandRef.current) refreshMarkers();
    };

    refreshMarkers();

    // MapLibre moves existing DOM markers with the map. Rebuild only when a
    // visibility threshold changes or the map finishes moving.
    map.on("moveend", refreshMarkers);
    map.on("zoom", refreshAtZoomThreshold);

    return () => {
      map.off("moveend", refreshMarkers);
      map.off("zoom", refreshAtZoomThreshold);
    };
  }, [updateMarkersInView, mapLoaded]);

  useEffect(() => {
    if (!mapLoaded) return;
    if (selectedVehicle) showVehicleCard(selectedVehicle);
    else hideVehicleCard();
  }, [selectedVehicle, mapLoaded]);

  // Auto-track followed vehicle
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !trackedVehicleId) return;

    const tracked = vehicles.find((v) => v.nr_boczny === trackedVehicleId);
    if (tracked) {
      const viewport = map.getContainer().getBoundingClientRect();
      const top = document.getElementById("topbar")?.getBoundingClientRect().bottom ?? viewport.top;
      const bottom = document.getElementById("routePanel")?.getBoundingClientRect().top ?? viewport.bottom;
      const targetY = Math.min(bottom - 30, (top + bottom) / 2 + 30);
      map.easeTo({
        center: [tracked.lon, tracked.lat],
        offset: [0, targetY - viewport.top - viewport.height / 2],
        duration: 1000,
      });
    }
  }, [vehicles, trackedVehicleId, mapLoaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    const center = map.getCenter();
    writeMapState({ lat: Number(center.lat.toFixed(6)), lon: Number(center.lng.toFixed(6)), zoom: map.getZoom(), showOffline });
  }, [showOffline, mapLoaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    if (!selectedStop) return;
    const panel = document.getElementById("stopPanel") ?? document.getElementById("timetablePanel");
    const topbar = document.getElementById("topbar");
    let frame = 0;
    let lastOffset: number | null = null;
    const focusStop = () => {
      frame = 0;
      const viewport = map.getContainer().getBoundingClientRect();
      const top = topbar?.getBoundingClientRect().bottom ?? viewport.top;
      // Layout height is stable while the sheet's entrance transform animates.
      const bottomInset = panel ? Number.parseFloat(getComputedStyle(panel).bottom) || 0 : 0;
      const bottom = panel ? window.innerHeight - panel.offsetHeight - bottomInset : viewport.bottom;
      const target = (top + Math.max(top + 40, bottom)) / 2;
      const offset = target - viewport.top - viewport.height / 2;
      if (lastOffset != null && Math.abs(offset - lastOffset) < 2) return;
      lastOffset = offset;
      map.easeTo({ center: [selectedStop.lon, selectedStop.lat], zoom: Math.max(map.getZoom(), 16), offset: [0, offset], duration: 350 });
    };
    const scheduleFocus = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(focusStop); };
    const observer = new ResizeObserver(scheduleFocus);
    if (panel) observer.observe(panel);
    if (topbar) observer.observe(topbar);
    observer.observe(map.getContainer());
    scheduleFocus();
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [selectedStop, mapLoaded]);

  // Handle Style Switch (Basic, OSM, Satellite, Dark/Light)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    const styleKey = `${activeMapStyle}:${isDarkMode}`;
    if (appliedStyleRef.current === styleKey) return;
    appliedStyleRef.current = styleKey;

    const onStyleLoad = () => {
      setupTransitLayers(map);
      setStyleRevision((revision) => revision + 1);
      updateMarkersInViewRef.current();
    };
    map.once("style.load", onStyleLoad);
    map.setStyle(getStyleDefinition(activeMapStyle, isDarkMode));
    return () => { map.off("style.load", onStyleLoad); };
  }, [activeMapStyle, isDarkMode, mapLoaded]);

  // Handle Reset View Trigger
  useEffect(() => {
    if (resetViewTrigger > 0 && mapRef.current) {
      mapRef.current.easeTo({
        center: cityCenter,
        zoom: 11,
        duration: 800,
      });
    }
  }, [resetViewTrigger]);

  // Update User Location
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const source = map.getSource("user-location-source") as maplibregl.GeoJSONSource | undefined;
    if (!source) return;

    if (!userLocation) {
      source.setData({ type: "FeatureCollection", features: [] });
      return;
    }

    source.setData({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [userLocation[1], userLocation[0]] },
          properties: {},
        },
      ],
    });

    map.flyTo({
      center: [userLocation[1], userLocation[0]],
      zoom: 15,
      duration: 1200,
    });
  }, [userLocation, mapLoaded, styleRevision]);

  // Update Route Geometry
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const source = map.getSource("route-source") as maplibregl.GeoJSONSource | undefined;
    if (!source) return;

    if (!routeGeometry || !routeGeometry.trayectos.length) {
      source.setData({ type: "FeatureCollection", features: [] });
      return;
    }

    map.setPaintProperty("route-stop-labels", "text-color", isDarkMode ? "#d4bfff" : "#6e3dab");
    map.setPaintProperty("route-stop-labels", "text-halo-color", isDarkMode ? "#17201f" : "#ffffff");
    const selectedTrayecto = selectedVehicle?.trayecto;
    const hasMatchedTrayecto = !!selectedTrayecto && routeGeometry.trayectos.some(
      (route) => String(route.trayecto_id) === String(selectedTrayecto),
    );
    const routes = selectedVehicle && hasMatchedTrayecto
      ? routeGeometry.trayectos.filter((t) => String(t.trayecto_id) === String(selectedTrayecto))
      : routeGeometry.trayectos;
    const lineFeatures = routes.map((t) => ({
      type: "Feature" as const,
      geometry: {
        type: "LineString" as const,
        coordinates: t.punkty.map(([lat, lon]) => [lon, lat]),
      },
      properties: {
        name: t.nazwa,
        color: t.color ?? colorForLine(selectedVehicle?.linia ?? String(routeGeometry.linia)),
        active: !selectedVehicle || !hasMatchedTrayecto || String(t.trayecto_id) === String(selectedTrayecto),
      },
    }));

    source.setData({
      type: "FeatureCollection",
      features: lineFeatures,
    });

    // Fit route bounds
    const allPoints = routes.flatMap((t) => t.punkty);
    if (fitRouteToBounds && !selectedVehicle && allPoints.length > 0) {
      const bounds = new maplibregl.LngLatBounds();
      allPoints.forEach(([lat, lon]) => bounds.extend([lon, lat]));
      const planner = document.querySelector<HTMLElement>("#polPanel[data-selected='1']");
      const desktopPlanner = planner && !window.matchMedia('(max-width: 760px), (pointer: coarse)').matches;
      const coursePanel = document.querySelector("#timetableCourse")?.closest<HTMLElement>("#timetablePanel") ?? (desktopPlanner ? null : planner);
      const top = coursePanel || desktopPlanner ? Math.max(90, (document.getElementById("topbar")?.getBoundingClientRect().bottom ?? 70) + 20) : 90;
      const bottom = coursePanel ? Math.min(coursePanel.offsetHeight + 35, window.innerHeight - top - 80) : 100;
      const left = desktopPlanner ? planner.getBoundingClientRect().right + 30 : 45;
      map.fitBounds(bounds, { padding: { top, left, right: 45, bottom: Math.max(0, bottom) }, maxZoom: 16, duration: 700 });
    }
  }, [routeGeometry, selectedVehicle?.nr_boczny, selectedVehicle?.trayecto, fitRouteToBounds, isDarkMode, mapLoaded, styleRevision, viewportRevision]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    const source = map.getSource("route-stops-source") as maplibregl.GeoJSONSource | undefined;
    source?.setData({ type: "FeatureCollection", features: (selectedVehicle || lineRouteStops.length > 0) ? routeStops
      // The selected platform already has its HTML pin and name plaque.
      .filter((stop) => Number.isFinite(stop.lat) && Number.isFinite(stop.lon) && Number(stop.id) !== selectedStop?.id)
      .map((stop) => ({ type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [stop.lon, stop.lat] },
        properties: { id: stop.id, name: stop.name, color: colorForLine(selectedVehicle?.linia ?? String(routeGeometry?.linia ?? "")) },
      })) : [] });
  }, [vehicleRouteStops, lineRouteStops, selectedStop?.id, selectedVehicle?.linia, selectedVehicle?.nr_boczny, routeGeometry, mapLoaded, styleRevision]);

  return <div ref={mapContainerRef} id="map" className="map-viewport" />;
}
