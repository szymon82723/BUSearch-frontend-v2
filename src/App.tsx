import { colorForLine } from "./config/line-color";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import "./styles/theme.css";
import "./styles/critical.css";
import "./styles/index.css";
import "./index.css";
import "./styles/v2-overrides.css";
import { TransitMap } from "./components/Map";
import { TopBar } from "./components/TopBar";
import { SideMenu } from "./components/SideMenu";
import { BottomIsland } from "./components/BottomIsland";
import { StopPanel } from "./components/StopPanel";
import { RoutePanel } from "./components/RoutePanel";
import { TimetablePanel } from "./components/TimetablePanel";
import { LinePanel } from "./components/LinePanel";
import { PlannerPanel } from "./components/PlannerPanel";
import { SchedulesPanel } from "./components/SchedulesPanel";
import { FavoritesPanel } from "./components/FavoritesPanel";
import { emptyVehicleFilters, vehicleMatchesFilters, activeVehicleFilterCount, type VehicleFilters } from "./config/vehicle-filters";
import { FiltersDrawer } from "./components/FiltersDrawer";
import { LayersModal, type MapStyleType } from "./components/LayersModal";
import { AboutModal } from "./components/AboutModal";
import { ReportModal } from "./components/ReportModal";
import { AnnounceModal } from "./components/AnnounceModal";
import { ConsentBanner } from "./components/ConsentBanner";
import { NotificationsPanel } from "./components/NotificationsPanel";
import { apiPath, citySlug } from "./config/city";
import { resolveRouteStop, stopsForLineVariant } from "./config/route-stop";

import {
  fetchVehicles,
  fetchStops,
  fetchLines,
  fetchLineRoute,
  fetchAnnouncements,
  fetchAnnouncement,
} from "./services/api";
import type { Vehicle, Stop, StopDeparture, TransitLine, RouteGeometry, Announcement, ConnectionOption, VehicleEtaStop } from "./types/transit";

const FAV_STORAGE_KEY = "busearch_fav_stops_v2";

export function App() {
  useEffect(() => {
    try { localStorage.setItem("busearch_city_last", citySlug); } catch { /* storage disabled */ }
  }, []);
  // Data State
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const sharedVehicleOpenedRef = useRef(false);
  const [stops, setStops] = useState<Stop[]>([]);
  const [lines, setLines] = useState<TransitLine[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  // Selection State
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [selectedStop, setSelectedStop] = useState<Stop | null>(null);
  const [plannedJourney, setPlannedJourney] = useState<ConnectionOption | null>(null);
  const [timetableCourse, setTimetableCourse] = useState<import("./types/transit").TripRun | null>(null);
  const [timetableStop, setTimetableStop] = useState<Stop | null>(null);
  const [selectedLine, setSelectedLine] = useState<string | null>(() => {
    const query = new URLSearchParams(location.search);
    return query.has("vehicle") ? null : query.get("line");
  });
  const [selectedLineVariantId, setSelectedLineVariantId] = useState<string | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeRetry, setRouteRetry] = useState(0);
  const [routeGeometry, setRouteGeometry] = useState<RouteGeometry | null>(null);
  const [routeGeometryLine, setRouteGeometryLine] = useState<string | null>(null);
  const [vehicleRoute, setVehicleRoute] = useState<{ id: string; stops: VehicleEtaStop[] } | null>(null);
  const handleRouteStops = useCallback((id: string, stops: VehicleEtaStop[]) => setVehicleRoute({ id, stops }), []);
  const [trackedVehicleId, setTrackedVehicleId] = useState<string | null>(null);

  // Panels & Modals
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isPlannerOpen, setIsPlannerOpen] = useState(() => new URLSearchParams(location.search).get("planner") === "1");
  const [isSchedulesOpen, setIsSchedulesOpen] = useState(false);
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
  const [isLayersOpen, setIsLayersOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const clearNotificationBadge = useCallback(() => setNotificationCount(0), []);
  const [activeAnnouncement, setActiveAnnouncement] = useState<Announcement | null>(null);

  // Map & Controls
  const [activeMapStyle, setActiveMapStyle] = useState<MapStyleType>("basic");
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showOffline, setShowOffline] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [resetViewTrigger, setResetViewTrigger] = useState(0);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterState, setFilterState] = useState<VehicleFilters>(emptyVehicleFilters);

  // Favorites
  const [favorites, setFavorites] = useState<Stop[]>(() => {
    try {
      const saved = localStorage.getItem(FAV_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Initial Data Load
  useEffect(() => {
    let active = true;
    fetchStops().then((data) => {
      if (!active) return;
      setStops(data);
      const query = new URLSearchParams(location.search);
      const stopId = query.get("stop");
      if (stopId && !query.has("vehicle")) setSelectedStop(data.find(stop => String(stop.id) === stopId) ?? null);
    }).catch(console.error);
    fetchLines().then(setLines).catch(console.error);
    fetchAnnouncements().then(setAnnouncements).catch(console.error);
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    const refresh = () => fetch(apiPath("wiki/notifications"), { cache: "no-store" })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => { if (alive) setNotificationCount(Number(data?.unreadCount) || 0); })
      .catch(() => {});
    refresh();
    const timer = setInterval(refresh, 60000);
    return () => { alive = false; clearInterval(timer); };
  }, []);

  // Live Vehicles Polling (every 3 seconds)
  useEffect(() => {
    let isMounted = true;
    let inFlight = false;

    const loadVehicles = async () => {
      if (document.hidden || inFlight) return;
      inFlight = true;
      try {
        const data = await fetchVehicles();
        if (isMounted) {
          setVehicles(data);
          if (!sharedVehicleOpenedRef.current) {
            const sharedId = new URLSearchParams(location.search).get("vehicle");
            const sharedVehicle = sharedId ? data.find((v) => v.nr_boczny === sharedId) : null;
            if (sharedVehicle) {
              sharedVehicleOpenedRef.current = true;
              setSelectedVehicle(sharedVehicle);
              setTrackedVehicleId(sharedVehicle.nr_boczny);
            }
          }

          // Update active vehicle attributes smoothly
          setSelectedVehicle((current) => current ? data.find((v) => v.nr_boczny === current.nr_boczny) ?? current : null);
        }
      } catch (err) {
        console.warn("Poll error:", err);
      } finally {
        inFlight = false;
      }
    };

    loadVehicles();
    const interval = setInterval(loadVehicles, 3000);
    document.addEventListener("visibilitychange", loadVehicles);
    window.addEventListener("pageshow", loadVehicles);

    return () => {
      isMounted = false;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", loadVehicles);
      window.removeEventListener("pageshow", loadVehicles);
    };
  }, []);

  // Load Route Geometry when line or vehicle is selected
  const activeLineToFetch = selectedVehicle?.linia || selectedLine;
  useEffect(() => {
    if (!activeLineToFetch) {
      setRouteGeometry(null);
      setRouteLoading(false);
      return;
    }

    let active = true;
    setRouteGeometry(null);
    setRouteLoading(true);
    fetchLineRoute(activeLineToFetch).then((geo) => {
      if (active) { setRouteGeometry(geo); setRouteGeometryLine(activeLineToFetch); setRouteLoading(false); }
    });
    return () => { active = false; };
  }, [activeLineToFetch, routeRetry]);

  const currentRouteGeometry = routeGeometryLine === activeLineToFetch ? routeGeometry : null;
  const selectedLineVariant = currentRouteGeometry?.trayectos.find(variant => String(variant.trayecto_id) === selectedLineVariantId) ?? currentRouteGeometry?.trayectos[0];
  const lineRouteStops = useMemo(() => selectedLine ? stopsForLineVariant(selectedLineVariant, stops, selectedLine) : [], [selectedLineVariant, stops, selectedLine]);
  const courseGeometry = useMemo(() => selectedLine && timetableStop && timetableCourse ? {
    linia: selectedLine,
    trayectos: [{ trayecto_id: -1, direccion: 0, nazwa: timetableCourse.kierunek, tekst_kierunkowy: timetableCourse.kierunek, punkty: timetableCourse.punkty, przystanki: timetableCourse.przystanki }],
  } : null, [selectedLine, timetableStop, timetableCourse]);
  const courseStops = useMemo(() => courseGeometry ? stopsForLineVariant(courseGeometry.trayectos[0], stops, selectedLine!) : [], [courseGeometry, stops, selectedLine]);
  const displayedRouteGeometry = useMemo(() => selectedLine && currentRouteGeometry
    ? { ...currentRouteGeometry, trayectos: selectedLineVariant ? [selectedLineVariant] : [] }
    : currentRouteGeometry, [selectedLine, currentRouteGeometry, selectedLineVariant]);

  // Handle Favorites toggle
  const handleToggleFavorite = useCallback((stop: Stop) => {
    setFavorites((prev) => {
      const exists = prev.some((s) => s.id === stop.id);
      const next = exists ? prev.filter((s) => s.id !== stop.id) : [...prev, stop];
      try {
        localStorage.setItem(FAV_STORAGE_KEY, JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  }, []);

  // Filtered vehicles
  const filteredVehicles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return vehicles.filter((v) => {
      if (selectedLine && v.linia !== selectedLine) return false;
      if (v.offline && (citySlug === "torun" || !showOffline)) return false;
      if (!vehicleMatchesFilters(v, filterState)) return false;

      // Topbar search query
      if (q) {
        const matchLine = v.linia.toLowerCase().includes(q);
        const matchDest = (v.cel || "").toLowerCase().includes(q);
        const matchSide = (v.nr_boczny || "").toLowerCase().includes(q);
        if (!matchLine && !matchDest && !matchSide) return false;
      }

      return true;
    });
  }, [vehicles, filterState, searchQuery, showOffline, selectedLine]);

  // Selection handlers
  const handleSelectVehicle = (vehicle: Vehicle | null) => {
    setSelectedVehicle(vehicle);
    setTimetableStop(null);
    setSelectedStop(null);
    setSelectedLine(null);
    setTrackedVehicleId(vehicle?.nr_boczny ?? null);
  };

  const handleTrackDepartureVehicle = async (departure: StopDeparture): Promise<boolean> => {
    const sourceCity = departure.originCity || citySlug;
    const vehicleId = String(departure.vehicleId || "").trim();
    const tripId = String(departure.tripId || "").trim();
    if (!vehicleId && !tripId) return false;
    const line = String(departure.linia).trim().toUpperCase();
    const findVehicle = (list: Vehicle[]) => list.find((vehicle) =>
      String(vehicle.linia).trim().toUpperCase() === line &&
      ((vehicleId && vehicle.nr_boczny === vehicleId) || (tripId && String(vehicle.trip_id || "") === tripId)) &&
      !vehicle.offline,
    );

    let vehicle = sourceCity === citySlug ? findVehicle(vehicles) : undefined;
    if (!vehicle) {
      try { vehicle = findVehicle(await fetchVehicles(sourceCity)); } catch { /* retry on the next click */ }
    }
    if (!vehicle) return false;

    if (sourceCity !== citySlug) {
      location.assign(`/${sourceCity}/?vehicle=${encodeURIComponent(vehicle.nr_boczny)}&track=1`);
      return true;
    }

    setSearchQuery("");
    setFilterState(emptyVehicleFilters());
    handleSelectVehicle(vehicle);
    setTrackedVehicleId(vehicle.nr_boczny);
    return true;
  };

  const handleSelectStop = (stop: Stop | null) => {
    setTimetableStop(null);
    // Keep the underlying route and its follow state for the return journey.
    // The map pauses following while the stop panel is visible.
    setSelectedStop(stop);
    setIsPlannerOpen(false);
    setIsSchedulesOpen(false);
    setIsFavoritesOpen(false);
  };

  const handleSelectLine = (lineCode: string) => {
    setSelectedLine(lineCode);
    setTimetableStop(null);
    setSelectedLineVariantId(null);
    setSelectedVehicle(null);
    setSelectedStop(null);
    setTrackedVehicleId(null);
    setIsSchedulesOpen(false);
    setIsPlannerOpen(false);
  };

  const handleSelectRouteStop = (routeStop: VehicleEtaStop) => {
    const stop = resolveRouteStop(routeStop, stops, selectedVehicle?.linia);
    if (stop) handleSelectStop(stop);
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert("Twoja przeglądarka nie obsługuje geolokalizacji.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation([pos.coords.latitude, pos.coords.longitude]);
      },
      (err) => {
        alert("Nie udało się pobrać lokalizacji: " + err.message);
      },
      { enableHighAccuracy: true }
    );
  };

  const journeyGeometry = useMemo(() => isPlannerOpen && plannedJourney ? {
    linia: "Podróż",
    trayectos: plannedJourney.legs.flatMap((leg, index) => {
      const from = stops.find(stop => stop.id === leg.fromStopId);
      const to = stops.find(stop => stop.id === leg.toStopId);
      const points: [number, number][] = leg.geometry?.length ? leg.geometry : from && to ? [[from.lat, from.lon], [to.lat, to.lon]] : [];
      return points.length > 1 ? [{ trayecto_id: index, direccion: 0, nazwa: leg.line, tekst_kierunkowy: leg.toStop, punkty: points, color: leg.type === "przejazd" ? colorForLine(leg.line) : "#a3a3b0" }] : [];
    }),
  } : null, [isPlannerOpen, plannedJourney, stops]);

  const activeTimetableStop = selectedLine ? timetableStop : null;
  const highlightedStop = activeTimetableStop ?? selectedStop;

  const activeFilterCount = activeVehicleFilterCount(filterState);

  const latestAnnouncement = announcements.length > 0 ? announcements[0] : null;

  return (
    <div className="app-container" data-planner-open={isPlannerOpen ? "1" : "0"}>
      {/* Topbar */}
      <TopBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        lines={lines}
        stops={stops}
        activeFilterCount={activeFilterCount}
        latestAnnouncement={latestAnnouncement}
        isFiltersOpen={isFiltersOpen}
        isMenuOpen={isMenuOpen}
        onOpenMenu={() => {
          if (!isMenuOpen) {
            setIsPlannerOpen(false);
            setSelectedVehicle(null);
            setSelectedStop(null);
            setTrackedVehicleId(null);
          }
          setIsMenuOpen((open) => !open);
        }}
        onOpenFilters={() => setIsFiltersOpen(true)}
        onOpenAnnouncement={(announcement) => {
          setActiveAnnouncement(announcement);
          fetchAnnouncement(announcement.id).then((full) => {
            if (full) setActiveAnnouncement((current) => current?.id === full.id ? full : current);
          });
        }}
        onSelectLine={handleSelectLine}
        onSelectStop={handleSelectStop}
      />

      {/* Side Menu Drawer */}
      <SideMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        onOpenReport={() => setIsReportOpen(true)}
        onOpenAbout={() => setIsAboutOpen(true)}
      />

      {/* WebGL GPU Map */}
      <TransitMap
        vehicles={filteredVehicles}
        stops={stops}
        selectedVehicle={selectedVehicle}
        selectedStop={courseGeometry ? null : highlightedStop}
        routeGeometry={journeyGeometry ?? courseGeometry ?? displayedRouteGeometry}
        lineRouteStops={journeyGeometry ? [] : courseGeometry ? courseStops : lineRouteStops}
        fitRouteToBounds={!!journeyGeometry || !!courseGeometry || (!highlightedStop && !selectedVehicle && selectedLine !== null)}
        vehicleRouteStops={vehicleRoute?.id === selectedVehicle?.nr_boczny ? vehicleRoute?.stops ?? [] : []}
        trackedVehicleId={highlightedStop || !selectedVehicle ? null : trackedVehicleId}
        activeMapStyle={activeMapStyle}
        isDarkMode={isDarkMode}
        userLocation={userLocation}
        resetViewTrigger={resetViewTrigger}
        showOffline={showOffline}
        onSelectVehicle={handleSelectVehicle}
        onSelectStop={handleSelectStop}
      />

      {/* Bottom Island Navigation */}
      <BottomIsland
        onOpenPlanner={() => {
          setIsPlannerOpen(true);
          setIsSchedulesOpen(false);
          setIsFavoritesOpen(false);
          setIsMenuOpen(false);
          setSelectedStop(null);
          setSelectedVehicle(null);
          setSelectedLine(null);
        }}
        onOpenSchedules={() => {
          setIsPlannerOpen(false);
          setIsSchedulesOpen(true);
          setSelectedStop(null);
          setSelectedVehicle(null);
          setSelectedLine(null);
        }}
        showOffline={showOffline}
        allowOffline={citySlug !== "torun"}
        onToggleOffline={() => setShowOffline(!showOffline)}
        onResetView={() => setResetViewTrigger((c) => c + 1)}
        onOpenFavorites={() => {
          setIsPlannerOpen(false);
          setIsFavoritesOpen(true);
          setSelectedStop(null);
          setSelectedVehicle(null);
          setSelectedLine(null);
        }}
        onOpenLayers={() => setIsLayersOpen(true)}
        onOpenNotifications={() => setIsNotificationsOpen((open) => !open)}
        notificationCount={notificationCount}
        onLocateMe={handleLocateMe}
      />
      <ConsentBanner />
      <NotificationsPanel isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} onRead={clearNotificationBadge} />

      {/* Bottom Sheets */}
      {selectedVehicle && (
        <RoutePanel
          key={selectedVehicle.nr_boczny}
          vehicle={selectedVehicle}
          isVisible={!highlightedStop}
          isTracking={trackedVehicleId === selectedVehicle.nr_boczny}
          onToggleTracking={() => setTrackedVehicleId(trackedVehicleId === selectedVehicle.nr_boczny ? null : selectedVehicle.nr_boczny)}
          onStopsChange={handleRouteStops}
          routeName={currentRouteGeometry?.trayectos.find((route) => String(route.trayecto_id) === String(selectedVehicle.trayecto))?.nazwa}
          onClose={() => handleSelectVehicle(null)}
          onSelectStop={handleSelectRouteStop}
        />
      )}

      {selectedStop && (
        <StopPanel
          stop={selectedStop}
          isFavorite={favorites.some((s) => s.id === selectedStop.id)}
          onToggleFavorite={handleToggleFavorite}
          onClose={() => handleSelectStop(null)}
          onSelectLine={handleSelectLine}
          onTrackVehicle={handleTrackDepartureVehicle}
        />
      )}

      {selectedLine && !selectedVehicle && (
        <LinePanel
          lineCode={selectedLine}
          isVisible={!highlightedStop}
          routeGeometry={currentRouteGeometry}
          lineStops={lineRouteStops}
          selectedVariantId={selectedLineVariantId}
          onSelectVariant={setSelectedLineVariantId}
          loading={routeLoading}
          onRetry={() => setRouteRetry(value => value + 1)}
          onClose={() => setSelectedLine(null)}
          onSelectStop={stop => { setSelectedStop(null); setTimetableStop(stop); }}
        />
      )}

      {selectedLine && activeTimetableStop && <TimetablePanel
        key={`${selectedLine}-${activeTimetableStop.id}`}
        onCourseChange={setTimetableCourse}
        line={selectedLine}
        stop={activeTimetableStop}
        direction={selectedLineVariant?.tekst_kierunkowy || selectedLineVariant?.nazwa || ""}
        onClose={() => setTimetableStop(null)}
        onLiveDepartures={() => handleSelectStop(activeTimetableStop)}
      />}

      {/* Modals & Panels */}
      <PlannerPanel
        isOpen={isPlannerOpen}
        stops={stops}
        onClose={() => setIsPlannerOpen(false)}
        onLocationFound={setUserLocation}
        onOpenSchedules={() => { setIsPlannerOpen(false); setIsSchedulesOpen(true); }}
        onSelectRouteOption={setPlannedJourney}
      />

      <SchedulesPanel
        isOpen={isSchedulesOpen}
        lines={lines}
        onClose={() => setIsSchedulesOpen(false)}
        onSelectLine={handleSelectLine}
      />

      <FavoritesPanel
        isOpen={isFavoritesOpen}
        favorites={favorites}
        onClose={() => setIsFavoritesOpen(false)}
        onSelectStop={handleSelectStop}
        onRemoveFavorite={handleToggleFavorite}
      />

      <FiltersDrawer
        isOpen={isFiltersOpen}
        filterState={filterState}
        onFilterChange={setFilterState}
        onClose={() => setIsFiltersOpen(false)}
        vehicles={vehicles}
        filteredVehiclesCount={filteredVehicles.length}
      />

      <LayersModal
        isOpen={isLayersOpen}
        activeLayer={activeMapStyle}
        onSelectLayer={setActiveMapStyle}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        onClose={() => setIsLayersOpen(false)}
      />

      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />

      <ReportModal isOpen={isReportOpen} onClose={() => setIsReportOpen(false)} />

      <AnnounceModal
        announcement={activeAnnouncement}
        onClose={() => setActiveAnnouncement(null)}
      />
    </div>
  );
}

export default App;
