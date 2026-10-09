import { useEffect, useState } from "react";
import { readDepartureWatches, removeDepartureWatch, type DepartureWatch } from "../services/departure-notifications";
import { apiPath, wikiPath } from "../config/city";

interface WikiNotification {
  id: string;
  title?: string;
  message?: string;
  reason?: string;
  vehicleId?: string;
  createdAt?: number;
  readAt?: number | null;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onRead: () => void;
}

function when(ms?: number): string {
  if (!ms) return "";
  const date = new Date(ms);
  return date.toDateString() === new Date().toDateString()
    ? date.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit" });
}

export function NotificationsPanel({ isOpen, onClose, onRead }: Props) {
  const [items, setItems] = useState<WikiNotification[]>([]);
  const [signedIn, setSignedIn] = useState(false);
  const [shown, setShown] = useState(3);
  const [watches, setWatches] = useState<DepartureWatch[]>([]);
  const [watchError, setWatchError] = useState("");
  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    readDepartureWatches().then(data => { if (active) { setWatches(data); setWatchError(""); } }).catch(() => { if (active) setWatchError("Nie udało się odczytać powiadomień o odjazdach."); });
    return () => { active = false; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setShown(3);
    let cancelled = false;
    fetch(apiPath("wiki/notifications"), { cache: "no-store", headers: { Accept: "application/json" } })
      .then(async (res) => {
        if (res.status === 401) return { signedIn: false, items: [] };
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        return { signedIn: true, items: Array.isArray(data.items) ? data.items as WikiNotification[] : [] };
      })
      .then((data) => {
        if (cancelled) return;
        setSignedIn(data.signedIn);
        setItems(data.items);
        if (data.signedIn) {
          onRead();
          fetch(apiPath("wiki/notifications"), { method: "POST" }).catch(() => {});
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isOpen, onRead]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return <div className="ui-routepanel ui-anim" id="notifPanel" data-open="1" aria-live="polite">
    <div className="ui-routepanel__head"><div className="ui-routepanel__handle" /><div className="ui-routepanel__headrow"><div><div className="ui-routepanel__title">Powiadomienia</div><div className="ui-routepanel__meta" id="notifPanelMeta">{signedIn && items.length ? `${items.length} z Wiki` : "Odjazdy i Wiki"}</div></div><button className="ui-routepanel__close ui-anim ui-close" type="button" aria-label="Zamknij" onClick={onClose}>✕</button></div></div>
    <div className="ui-routepanel__body" id="notifPanelBody">
      <div className="ui-lines-group"><div className="ui-lines-group__head">Odjazdy z przystanku</div>{watchError && <p role="status">{watchError}</p>}{watches.length ? watches.map(watch => <div className="ui-notif-item" key={watch.id}><strong>Linia {watch.line} · {watch.stopName}</strong><p>{watch.leadMinutes} min przed przyjazdem</p><button type="button" onClick={async () => { try { await removeDepartureWatch(watch.id); setWatches(await readDepartureWatches()); } catch { setWatchError("Nie udało się usunąć powiadomienia."); } }}>Usuń powiadomienie</button></div>) : !watchError && <div className="ui-routepanel__skeleton">Nie czeka żadne powiadomienie o odjeździe. Ustawisz je dzwonkiem w panelu przystanku.</div>}</div>
      <div className="ui-lines-group"><div className="ui-lines-group__head">Wiki</div>
        {!signedIn ? <div className="ui-notif-logowanie"><div className="ui-routepanel__skeleton">Powiadomienia o Twoich zgłoszeniach w Wiki widać po zalogowaniu przez Google.</div><a className="ui-modal__btn" href={wikiPath()}>Przejdź do Wiki i zaloguj się</a></div> : items.length === 0 ? <div className="ui-routepanel__skeleton">Brak powiadomień.</div> : <>{items.slice(0, shown).map((item) => <div className="ui-notif-item" data-nowe={item.readAt ? "0" : "1"} key={item.id}><div className="ui-notif-item__glowa"><div className="ui-notif-item__tytul">{item.title || "Powiadomienie"}</div><div className="ui-notif-item__czas">{when(item.createdAt)}</div></div><div className="ui-notif-item__tresc">{item.message}</div>{item.reason && <div className="ui-notif-item__powod"><b>Powód:</b> {item.reason}</div>}{item.vehicleId && <div className="ui-notif-item__pojazd">Nr taborowy: {item.vehicleId}</div>}</div>)}{items.length > shown && <button className="ui-notif-wiecej" type="button" onClick={() => setShown((count) => count + 3)}>Załaduj więcej ({items.length - shown})</button>}</>}
      </div>
    </div>
  </div>;
}
