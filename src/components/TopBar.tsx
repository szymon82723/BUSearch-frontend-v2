import { useState, useRef, useEffect, useLayoutEffect, useMemo, type CSSProperties } from "react";
import type { TransitLine, Stop, Announcement } from "../types/transit";
import { apiPath, citySlug, tramLines } from "../config/city";
import { searchLines, searchStops, searchText, searchStopDirection } from "../config/search";
import { linesAtStop } from "../config/shared-stop-lines";
import { showMenuRipple } from "./menu-ripple";

const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.szymoxyz.busearch&pcampaignid=web_share";

interface TopBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  lines: TransitLine[];
  stops: Stop[];
  activeFilterCount: number;
  latestAnnouncement: Announcement | null;
  isFiltersOpen?: boolean;
  isMenuOpen: boolean;
  onOpenMenu: () => void;
  onOpenFilters: () => void;
  onOpenAnnouncement: (announcement: Announcement) => void;
  onSelectLine: (lineCode: string) => void;
  onSelectStop: (stop: Stop) => void;
}

export function TopBar({
  searchQuery,
  onSearchChange,
  lines,
  stops,
  activeFilterCount,
  latestAnnouncement,
  isFiltersOpen,
  isMenuOpen,
  onOpenMenu,
  onOpenFilters,
  onOpenAnnouncement,
  onSelectLine,
  onSelectStop,
}: TopBarProps) {
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isFocused, setIsFocused] = useState(false);
  const [dismissedAnnouncementId, setDismissedAnnouncementId] = useState<string | null>(() => {
    try { return localStorage.getItem(`busearch_announce_dismissed_${citySlug}`); } catch { return null; }
  });
  const [showPlayStore, setShowPlayStore] = useState(() => {
    if (document.documentElement.dataset.app === "1" || document.documentElement.dataset.goly === "1") return false;
    try { return localStorage.getItem("busearch_play_store_dismissed") !== "1"; } catch { return true; }
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [suggestionPosition, setSuggestionPosition] = useState<CSSProperties>({});

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    }
    document.addEventListener("pointerdown", handleClickOutside);
    return () => document.removeEventListener("pointerdown", handleClickOutside);
  }, []);

  const q = searchText(searchQuery);
  const lineSuggestions = useMemo(() => searchLines(lines, searchQuery), [lines, searchQuery]);
  const stopSuggestions = useMemo(() => searchStops(stops, searchQuery), [stops, searchQuery]);
  const resultCount = lineSuggestions.length + stopSuggestions.length;
  const showSuggestions = isFocused && !!q;
  const selectedIndex = activeIndex >= 0 && activeIndex < resultCount ? activeIndex : -1;
  const resultId = (index: number) => `search-result-${index}`;
  const selectSuggestion = (index: number) => {
    if (index < 0 || index >= resultCount) return;
    if (index < lineSuggestions.length) onSelectLine(lineSuggestions[index].number);
    else onSelectStop(stopSuggestions[index - lineSuggestions.length]);
    setIsFocused(false); setActiveIndex(-1);
  };
  useEffect(() => { setActiveIndex(-1); }, [searchQuery]);
  useEffect(() => {
    if (showSuggestions && selectedIndex >= 0) document.getElementById(resultId(selectedIndex))?.scrollIntoView({block: "nearest"});
  }, [selectedIndex, showSuggestions]);

  useLayoutEffect(() => {
    if (!showSuggestions) return;
    const position = () => {
      const rect = searchRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(Math.max(rect.width, 320), window.innerWidth - 24);
      setSuggestionPosition({ top: rect.bottom + 12, left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)), width, maxHeight: Math.min(360, window.innerHeight - rect.bottom - 24) });
    };
    position();
    window.addEventListener("resize", position);
    return () => window.removeEventListener("resize", position);
  }, [showSuggestions]);

  const showAnnounceBanner =
    latestAnnouncement && dismissedAnnouncementId !== latestAnnouncement.id;
  const showPlayStoreBanner = showPlayStore && !isFiltersOpen;

  function openPlayStore() {
    const body = JSON.stringify({ source: "top-banner", page: location.pathname });
    try { navigator.sendBeacon(apiPath("events/play-store-click"), new Blob([body], { type: "application/json" })); } catch { /* optional analytics */ }
    window.open(PLAY_STORE_URL, "_blank", "noopener,noreferrer");
  }

  return (
    <div
      className={`ui-topbar ${showAnnounceBanner || showPlayStoreBanner ? "ui-topbar--z-listwa" : ""} ${isFiltersOpen ? "ui-topbar--filtry" : ""}`}
      id="topbar"
      ref={containerRef}
    >
      <div className="ui-topbar__rzad">
        <button
          className="ui-menu-btn"
          id="menuBtn"
          type="button"
          aria-label="Menu"
          aria-controls="sideMenuOverlay"
          aria-expanded={isMenuOpen}
          onPointerDown={(event) => { if (event.button === 0 && event.isPrimary) showMenuRipple(event.currentTarget, event.nativeEvent); }}
          onKeyDown={(event) => { if (!event.repeat && (event.key === "Enter" || event.key === " ")) showMenuRipple(event.currentTarget); }}
          onClick={onOpenMenu}
        >
          <svg className="ui-material-symbol" viewBox="0 -960 960 960" width="24" height="24" fill="currentColor">
            <path d="M120-240v-80h720v80H120Zm0-200v-80h720v80H120Zm0-200v-80h720v80H120Z" />
          </svg>
        </button>

        <div className="ui-search" id="uiSearch">
          <span className="ui-search__icon">
            <svg className="ui-material-symbol" viewBox="0 -960 960 960" width="24" height="24" fill="currentColor">
              <path d="M784-120 532-372q-30 24-69 38t-83 14q-109 0-184.5-75.5T120-580q0-109 75.5-184.5T380-840q109 0 184.5 75.5T640-580q0 44-14 83t-38 69l252 252-56 56ZM380-400q75 0 127.5-52.5T560-580q0-75-52.5-127.5T380-760q-75 0-127.5 52.5T200-580q0 75 52.5 127.5T380-400Z" />
            </svg>
          </span>

          <input
            id="searchLine"
            ref={searchRef}
            role="combobox"
            aria-label="Szukaj linii lub przystanku"
            aria-activedescendant={showSuggestions && selectedIndex >= 0 ? resultId(selectedIndex) : undefined}
            aria-autocomplete="list"
            aria-controls={showSuggestions ? "searchLineLista" : undefined}
            aria-expanded={!!showSuggestions}
            onKeyDown={event => {
              if (event.nativeEvent.isComposing || event.keyCode === 229) return;
              if (event.key === "Escape") { event.preventDefault(); setIsFocused(false); setActiveIndex(-1); }
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                if (!q || !resultCount) return;
                event.preventDefault(); setIsFocused(true);
                setActiveIndex(event.key === "ArrowDown" ? (selectedIndex + 1) % resultCount : selectedIndex < 0 ? resultCount - 1 : (selectedIndex - 1 + resultCount) % resultCount);
              }
              if (event.key === "Enter" && showSuggestions && resultCount) { event.preventDefault(); selectSuggestion(selectedIndex < 0 ? 0 : selectedIndex); }
              if (event.key === "Tab") { setIsFocused(false); setActiveIndex(-1); }
            }}
            placeholder="Szukaj linii lub przystanku"
            enterKeyHint="search"
            autoComplete="off"
            value={searchQuery}
            onChange={(e) => { onSearchChange(e.target.value); setIsFocused(true); }}
            onFocus={() => setIsFocused(true)}
          />

          {searchQuery && (
            <button
              type="button"
              className="ui-close"
              style={{ position: "absolute", right: 10, background: "none", border: "none", color: "var(--ui-text-2)", cursor: "pointer", display: "flex", alignItems: "center" }}
              aria-label="Wyczyść wyszukiwanie"
              onClick={() => { onSearchChange(""); setActiveIndex(-1); searchRef.current?.focus(); }}
            >
              ✕
            </button>
          )}

          {showSuggestions && (
            <div className="ui-ac__list" id="searchLineLista" role="listbox" aria-label="Wyniki wyszukiwania" style={{ display: "block", ...suggestionPosition }}>
              {resultCount === 0 && <div className="ui-ac__empty" role="status">Brak pasujących linii lub przystanków.</div>}
              {lineSuggestions.map((line, index) => {
                const isTram = line.type === "TRAM" || tramLines.has(line.number);
                return (
                  <button type="button" role="option" tabIndex={-1}
                    id={resultId(index)} aria-selected={selectedIndex === index}
                    key={`line-${line.number}`}
                    className="ui-ac__item"
                    onPointerDown={event => event.preventDefault()}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => selectSuggestion(index)}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", cursor: "pointer" }}
                  >
                    <span className={`line-badge ${isTram ? "line-badge--tram" : ""}`} style={{ fontWeight: 800 }}>
                      {line.number}
                    </span>
                    <span style={{ fontSize: 13, color: "var(--ui-text)" }}>
                      {isTram ? "Linia tramwajowa" : "Linia autobusowa"}
                    </span>
                  </button>
                );
              })}

              {stopSuggestions.map((stop, index) => (
                <button type="button" role="option" tabIndex={-1}
                  id={resultId(lineSuggestions.length + index)} aria-selected={selectedIndex === lineSuggestions.length + index}
                  data-stop-id={stop.id}
                  key={`stop-${stop.id}`}
                  className="ui-ac__item"
                  onPointerDown={event => event.preventDefault()}
                  onMouseEnter={() => setActiveIndex(lineSuggestions.length + index)}
                  onClick={() => selectSuggestion(lineSuggestions.length + index)}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", cursor: "pointer", borderTop: "1px solid var(--ui-line)" }}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" color="var(--ui-accent)">
                    <circle cx="12" cy="12" r="8" />
                    <circle cx="12" cy="12" r="3" fill="currentColor" />
                  </svg>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ui-text)" }}>{stop.nazwa}</div>
                    <div style={{ fontSize: 11, color: "var(--ui-text-3)" }}>
                      ID {stop.id}{stop.kod && stop.kod !== String(stop.id) ? ` · Kod ${stop.kod}` : ""} · Linie: {linesAtStop(stop).slice(0, 6).join(", ")}
                      {searchStopDirection(stop) && <div>→ {searchStopDirection(stop)}</div>}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <button className="ui-btn" id="openFilters" type="button" onClick={onOpenFilters}>
          <span>
            <svg className="ui-material-symbol" viewBox="0 -960 960 960" width="20" height="20" fill="currentColor">
              <path d="M440-120v-240h80v80h320v80H520v80h-80Zm-320-80v-80h240v80H120Zm160-160v-80H120v-80h160v-80h80v240h-80Zm160-80v-80h400v80H440Zm160-160v-240h80v80h160v80H680v80h-80Zm-480-80v-80h400v80H120Z" />
            </svg>
          </span>
          Filtry
          {activeFilterCount > 0 && (
            <span className="ui-topbar__licznik" id="filtryLicznik">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {showAnnounceBanner && (
        <div className={`ui-announce ${showPlayStoreBanner ? "ui-listwa--nie-ostatnia" : ""}`} id="announceBanner" style={{ display: "flex" }} onClick={() => onOpenAnnouncement(latestAnnouncement)}>
          <span className="ui-announce__dot" aria-hidden="true">
            <svg viewBox="0 0 4 16" width="4" height="16" fill="none">
              <path d="M2 1.4V9.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <circle cx="2" cy="13.8" r="1.15" fill="currentColor" />
            </svg>
          </span>
          <span className="ui-announce__text" id="announceBannerText">
            {latestAnnouncement.shortDesc || latestAnnouncement.title}
          </span>
          <button
            className="ui-announce__more"
            id="announceBannerLink"
            type="button"
            onClick={(event) => { event.stopPropagation(); onOpenAnnouncement(latestAnnouncement); }}
          >
            Szczegóły
          </button>
          <button
            className="ui-announce__close ui-close"
            id="announceBannerClose"
            type="button"
            aria-label="Zamknij"
            onClick={(event) => {
              event.stopPropagation();
              setDismissedAnnouncementId(latestAnnouncement.id);
              try { localStorage.setItem(`busearch_announce_dismissed_${citySlug}`, latestAnnouncement.id); } catch { /* storage disabled */ }
            }}
          >
            ✕
          </button>
        </div>
      )}

      {showPlayStoreBanner && (
        <div className="ui-play-store" id="playStoreBanner" onClick={openPlayStore}>
          <span className="ui-play-store__icon" aria-hidden="true">
            <svg viewBox="0 0 28.99 31.99" width="18" height="20">
              <path d="M13.54 15.28.12 29.34a3.66 3.66 0 0 0 5.33 2.16l15.1-8.6Z" fill="#ea4335" />
              <path d="m27.11 12.89-6.53-3.74-7.35 6.45 7.38 7.28 6.48-3.7a3.54 3.54 0 0 0 1.5-4.79 3.62 3.62 0 0 0-1.5-1.5z" fill="#fbbc04" />
              <path d="M.12 2.66a3.57 3.57 0 0 0-.12.92v24.84a3.57 3.57 0 0 0 .12.92L14 15.64Z" fill="#4285f4" />
              <path d="m13.64 16 6.94-6.85L5.5.51A3.73 3.73 0 0 0 3.63 0 3.64 3.64 0 0 0 .12 2.65Z" fill="#34a853" />
            </svg>
          </span>
          <span className="ui-play-store__text">Pobierz aplikację na Sklep Play</span>
          <button className="ui-play-store__more" type="button" onClick={(event) => { event.stopPropagation(); openPlayStore(); }}>Pobierz</button>
          <button className="ui-play-store__close ui-close" type="button" aria-label="Zamknij" onClick={(event) => {
            event.stopPropagation();
            setShowPlayStore(false);
            try { localStorage.setItem("busearch_play_store_dismissed", "1"); } catch { /* storage disabled */ }
          }}>✕</button>
        </div>
      )}
    </div>
  );
}
