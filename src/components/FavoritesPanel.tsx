import type { Stop } from "../types/transit";
import { useBottomSheet } from "../hooks/useBottomSheet";

interface FavoritesPanelProps {
  isOpen: boolean;
  favorites: Stop[];
  onClose: () => void;
  onSelectStop: (stop: Stop) => void;
  onRemoveFavorite: (stop: Stop) => void;
}

export function FavoritesPanel({
  isOpen,
  favorites,
  onClose,
  onSelectStop,
  onRemoveFavorite,
}: FavoritesPanelProps) {
  const { panelRef, headRef, handleRef, isExpanded, toggleExpanded, openAttr } =
    useBottomSheet({
      isOpen,
      onClose,
      canExpand: true,
      initialExpanded: true,
    });

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className="ui-routepanel ui-anim"
      id="favoritesPanel"
      data-open={openAttr}
      data-expanded={isExpanded ? "1" : "0"}
      aria-live="polite"
    >
      <div className="ui-routepanel__head" ref={headRef}>
        <div
          ref={handleRef}
          className="ui-routepanel__handle"
          role="button"
          tabIndex={0}
          aria-label="Rozwiń lub zwiń"
          onClick={toggleExpanded}
        />
        <div className="ui-routepanel__headrow">
          <div>
            <div className="ui-routepanel__title">Ulubione przystanki</div>
            <div className="ui-routepanel__meta">{`${favorites.length} zapisanych`}</div>
          </div>
          <div style={{ display: "flex", gap: "8px", flex: "none" }}>
            <button
              className="ui-routepanel__close ui-anim ui-close"
              id="favoritesPanelClose"
              type="button"
              aria-label="Zamknij"
              onClick={onClose}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      <div className="ui-routepanel__body">
        {favorites.length === 0 ? (
          <div className="ui-fav-empty">
            <div className="ui-fav-empty__icon">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                <path d="M12 2.8l2.9 6.06 6.6.77-4.86 4.6 1.28 6.57L12 17.7l-5.92 3.1 1.28-6.57-4.86-4.6 6.6-.77z" />
              </svg>
            </div>
            <div className="ui-fav-empty__title">Brak ulubionych przystanków</div>
            <div className="ui-fav-empty__text">
              Kliknij ikonę gwiazdki przy dowolnym przystanku na mapie, aby mieć do niego szybki dostęp.
            </div>
          </div>
        ) : (
          <div id="favoritesPanelList" style={{ display: "grid", gap: "8px" }}>
            {favorites.map((stop) => (
              <div
                key={stop.id}
                className="ui-fav-item"
                onClick={() => {
                  onSelectStop(stop);
                  onClose();
                }}
              >
                <div className="ui-fav-item__head">
                  <div className="ui-fav-item__name">{stop.nazwa}</div>
                  <button
                    className="ui-fav-item__remove"
                    type="button"
                    title="Usuń z ulubionych"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveFavorite(stop);
                    }}
                  >
                    ★
                  </button>
                </div>
                <div style={{ fontSize: "11.5px", color: "var(--ui-text-3)", padding: "0 6px 6px" }}>
                  ID {stop.id} · Linie: {stop.lines.join(", ")}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
