interface BottomIslandProps {
  onOpenPlanner: () => void;
  onOpenSchedules: () => void;
  showOffline: boolean;
  allowOffline?: boolean;
  onToggleOffline: () => void;
  onResetView: () => void;
  onOpenFavorites: () => void;
  onOpenLayers: () => void;
  onOpenNotifications: () => void;
  notificationCount: number;
  onLocateMe: () => void;
}

export function BottomIsland({
  onOpenPlanner,
  onOpenSchedules,
  showOffline,
  allowOffline = true,
  onToggleOffline,
  onResetView,
  onOpenFavorites,
  onOpenLayers,
  onOpenNotifications,
  notificationCount,
  onLocateMe,
}: BottomIslandProps) {
  return (
    <div className="ui-map-type">
      <button
        className="ui-map-btn"
        id="btnMapSearch"
        title="Szukaj połączenia"
        aria-label="Wyszukaj połączenie"
        type="button"
        onClick={onOpenPlanner}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <span className="ui-map-btn__etykieta">Połączenie</span>
      </button>

      <button
        className="ui-map-btn"
        id="btnRozklady"
        title="Rozkłady jazdy"
        aria-label="Rozkłady jazdy — wybierz linię"
        type="button"
        onClick={onOpenSchedules}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="5" width="18" height="16" rx="2.5"></rect>
          <path d="M3 10h18"></path>
          <path d="M8 3v4"></path>
          <path d="M16 3v4"></path>
        </svg>
        <span className="ui-map-btn__etykieta">Rozkłady</span>
      </button>

      <button
        className={`ui-map-btn ${showOffline ? "ui-map-btn--active" : ""}`}
        id="btnToggleOffline"
        style={allowOffline ? undefined : { display: "none" }}
        disabled={!allowOffline}
        title="Pojazdy offline"
        aria-label="Pokaż/ukryj pojazdy offline"
        type="button"
        onClick={onToggleOffline}
      >
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 3l18 18"></path>
          <path d="M7 7h10c2.2 0 4 1.8 4 4v5"></path>
          <path d="M5 15v-4c0-2.2 1.8-4 4-4"></path>
          <path d="M7 17a1.5 1.5 0 1 0 3 0"></path>
          <path d="M14 17a1.5 1.5 0 1 0 3 0"></path>
        </svg>
        <span className="ui-map-btn__etykieta">Offline</span>
      </button>

      <button
        className="ui-map-btn"
        id="btnMapReset"
        title="Reset widoku"
        aria-label="Reset widoku mapy"
        type="button"
        onClick={onResetView}
      >
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="1 4 1 10 7 10"></polyline>
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
        </svg>
        <span className="ui-map-btn__etykieta">Widok</span>
      </button>

      <button
        className="ui-map-btn"
        id="favBtn"
        title="Ulubione przystanki"
        aria-label="Ulubione przystanki"
        type="button"
        style={{ color: "#fbbf24" }}
        onClick={onOpenFavorites}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
          <path d="M12 2.8l2.9 6.06 6.6.77-4.86 4.6 1.28 6.57L12 17.7l-5.92 3.1 1.28-6.57-4.86-4.6 6.6-.77z"></path>
        </svg>
        <span className="ui-map-btn__etykieta">Ulubione</span>
      </button>

      <button
        className="ui-map-btn"
        id="btnLayers"
        title="Warstwy"
        aria-label="Warstwy mapy"
        type="button"
        onClick={onOpenLayers}
      >
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
          <polyline points="2 17 12 22 22 17"></polyline>
          <polyline points="2 12 12 17 22 12"></polyline>
        </svg>
        <span className="ui-map-btn__etykieta">Warstwy</span>
      </button>

      <button
        className="ui-map-btn"
        id="btnPowiadomienia"
        title="Powiadomienia z Wiki"
        aria-label="Powiadomienia z Wiki"
        type="button"
        onClick={onOpenNotifications}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
          <path d="M9 17a3 3 0 0 0 6 0" />
        </svg>
        {notificationCount > 0 && <span className="ui-map-btn__odznaka" id="powiadomieniaOdznaka">{notificationCount > 99 ? "99+" : notificationCount}</span>}
        <span className="ui-map-btn__etykieta">Powiadomienia</span>
      </button>

      <button
        className="ui-geo-btn"
        id="geoBtn"
        type="button"
        aria-label="Moja lokalizacja"
        onClick={onLocateMe}
      >
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="7"></circle>
          <path d="M12 2v3"></path>
          <path d="M12 19v3"></path>
          <path d="M2 12h3"></path>
          <path d="M19 12h3"></path>
          <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"></circle>
        </svg>
      </button>
    </div>
  );
}
