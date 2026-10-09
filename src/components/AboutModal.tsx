import { city } from "../config/city";

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AboutModal({ isOpen, onClose }: AboutModalProps) {
  if (!isOpen) return null;

  return (
    <div className="ui-modal-overlay" id="aboutModal" onClick={onClose}>
      <div className="ui-modal" onClick={(e) => e.stopPropagation()}>
        <button
          className="ui-modal__close ui-close"
          type="button"
          aria-label="Zamknij"
          onClick={onClose}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <h2 className="ui-modal__title">O projekcie i prawach autorskich</h2>
        <div className="ui-modal__content">
          <p>
            BUSearch to darmowa, interaktywna mapa komunikacji miejskiej w {city.CITY_LOCATIVE},
            pokazująca lokalizację pojazdów i realny czas odjazdów na żywo.
          </p>
          <p>
            Pozycje autobusów i tramwajów są odświeżane w czasie rzeczywistym bezpośrednio
            z {city.DATA_SOURCE}. Serwis jest projektem edukacyjno-społecznym tworzonym dla mieszkańców.
          </p>
          <p>
            Wszelkie prawa do znaków i oznaczeń należą do ich właścicieli. Dane mapowe © OpenStreetMap contributors.
          </p>
        </div>
      </div>
    </div>
  );
}
