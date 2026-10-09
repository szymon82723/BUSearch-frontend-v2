import type { Announcement } from "../types/transit";

interface AnnounceModalProps {
  announcement: Announcement | null;
  onClose: () => void;
}

export function AnnounceModal({ announcement, onClose }: AnnounceModalProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    if (!announcement) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onCloseRef.current(); }
      if (event.key !== "Tab") return;
      const elements = dialogRef.current?.querySelectorAll<HTMLElement>('button, a[href], [tabindex="0"]');
      if (!elements?.length) return;
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); if (previousFocus?.isConnected) previousFocus.focus(); };
  }, [announcement?.id]);
  if (!announcement) return null;

  return (
    <div className="ui-modal-overlay" id="announceModal" onClick={onClose}>
      <section
        className="ui-modal ui-announce-modal"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="announceModalTitle"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="ui-modal__close ui-close"
          id="announceModalClose"
          ref={closeRef}
          type="button"
          aria-label="Zamknij komunikat"
          onClick={onClose}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <header className="ui-announce-modal__header">
          <span className="ui-announce-modal__label">Komunikat</span>
          <h2 className="ui-modal__title" id="announceModalTitle">{announcement.title}</h2>
          <div className="ui-announce-modal__date" id="announceModalDate">
            {new Date(announcement.createdAt).toLocaleDateString("pl-PL")}
          </div>
        </header>
        <div className="ui-modal__content ui-announce-modal__body" id="announceModalBody">
          <p>{announcement.shortDesc}</p>
          {(announcement.body || announcement.content) && (
            <p style={{ whiteSpace: "pre-wrap" }}>{announcement.body || announcement.content}</p>
          )}
          {announcement.photos?.map((src, index) => <a key={src} className="ui-announce-modal__image" href={src} target="_blank" rel="noopener noreferrer">
            <img src={src} loading="lazy" alt={`Ilustracja komunikatu: ${announcement.title} (${index + 1})`} />
            <span>Otwórz obraz w pełnym rozmiarze ↗</span>
          </a>)}
        </div>
      </section>
    </div>
  );
}
import { useEffect, useRef } from "react";
