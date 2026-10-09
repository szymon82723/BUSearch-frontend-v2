import { useState } from "react";
import { sendErrorReport } from "../services/api";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ReportModal({ isOpen, onClose }: ReportModalProps) {
  const [topic, setTopic] = useState("Dane o pojeździe/linii");
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!message.trim()) {
      setStatus("Opisz napotkany problem przed wysłaniem.");
      return;
    }

    setSending(true);
    setStatus(null);

    const ok = await sendErrorReport({ topic, message, contact });
    setSending(false);

    if (ok) {
      setStatus("Dziękujemy! Zgłoszenie zostało wysłane.");
      setTimeout(() => {
        setMessage("");
        setStatus(null);
        onClose();
      }, 1500);
    } else {
      setStatus("Wystąpił błąd podczas wysyłania. Spróbuj ponownie później.");
    }
  };

  return (
    <div className="ui-modal-overlay" id="reportModal" onClick={onClose}>
      <div className="ui-modal" style={{ maxWidth: "460px" }} onClick={(e) => e.stopPropagation()}>
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
        <h2 className="ui-modal__title">Zgłoś błąd</h2>
        <div className="ui-modal__content">
          <p style={{ marginTop: 0 }}>
            Coś nie działa albo dane się nie zgadzają? Napisz — czytamy każde zgłoszenie.
          </p>
          <div style={{ marginBottom: "12px" }}>
            <div style={{ fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>Czego dotyczy zgłoszenie</div>
            <select
              className="ui-input"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              style={{ width: "100%", padding: "8px", borderRadius: "var(--ui-radius)", background: "rgba(0,0,0,0.3)", color: "white", border: "1px solid var(--ui-line-strong)" }}
            >
              <option value="Dane o pojeździe/linii">Dane o pojeździe lub linii</option>
              <option value="Lokalizacja GPS">Niedokładna pozycja pojazdu</option>
              <option value="Błąd w rozkładzie">Błąd w rozkładzie jazdy / przystankach</option>
              <option value="Działanie aplikacji">Błąd w działaniu aplikacji</option>
              <option value="Inne">Inne zgłoszenie</option>
            </select>
          </div>
          <div style={{ marginBottom: "12px" }}>
            <div style={{ fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>Opisz problem</div>
            <textarea
              className="ui-input"
              rows={4}
              maxLength={2000}
              placeholder="Np. linia 5 w stronę Rycerskiej znika z mapy..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              style={{ width: "100%", padding: "8px", borderRadius: "var(--ui-radius)", background: "rgba(0,0,0,0.3)", color: "white", border: "1px solid var(--ui-line-strong)", resize: "vertical" }}
            />
          </div>
          <div style={{ marginBottom: "12px" }}>
            <div style={{ fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>Twój e-mail (opcjonalnie)</div>
            <input
              className="ui-input"
              type="email"
              placeholder="jan@example.com"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              style={{ width: "100%", padding: "8px", borderRadius: "var(--ui-radius)", background: "rgba(0,0,0,0.3)", color: "white", border: "1px solid var(--ui-line-strong)" }}
            />
          </div>
          {status && (
            <div style={{ fontSize: "13px", fontWeight: 600, color: status.includes("Dziękujemy") ? "#86efac" : "#fca5a5", marginBottom: "8px" }}>
              {status}
            </div>
          )}
        </div>
        <button
          className="ui-modal__btn"
          type="button"
          disabled={sending}
          onClick={handleSubmit}
          style={{ width: "100%", padding: "10px", background: "var(--ui-accent)", color: "var(--ui-on-accent)", border: "none", borderRadius: "var(--ui-radius)", fontWeight: 700, cursor: "pointer" }}
        >
          {sending ? "Wysyłanie…" : "Wyślij zgłoszenie"}
        </button>
      </div>
    </div>
  );
}
