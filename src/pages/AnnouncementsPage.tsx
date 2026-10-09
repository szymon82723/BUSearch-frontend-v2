import { useEffect, useState } from "react";
import { apiPath, city, cityPath } from "../config/city";
import { fetchAnnouncement } from "../services/api";
import type { Announcement } from "../types/transit";
import "../styles/theme.css";
import "../styles/ogloszenia.css";
import "./announcements-page.css";

const VIEW_KEY = "busearch.ogloszenia.view";

function date(ts: number): string {
  return new Date(ts).toLocaleString("pl-PL", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function AnnouncementsPage() {
  const [view, setView] = useState<"current" | "archive">(() => {
    try { return localStorage.getItem(VIEW_KEY) === "archive" ? "archive" : "current"; } catch { return "current"; }
  });
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState<Announcement | null>(null);
  const basePath = cityPath("/ogloszenia");

  useEffect(() => {
    document.title = `Ogłoszenia i zmiany w komunikacji - ${city.CITY_NAME} | BUSearch`;
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setFailed(false);
    fetch(`${apiPath("announcements")}${view === "archive" ? "?archive=1" : ""}`, { cache: "no-store", signal: controller.signal })
      .then(async (res) => { if (!res.ok) throw new Error(String(res.status)); return res.json(); })
      .then((data) => setItems(Array.isArray(data.announcements) ? data.announcements : []))
      .catch((error) => { if (error.name !== "AbortError") setFailed(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [view]);

  useEffect(() => {
    const id = new URLSearchParams(location.search).get("id");
    if (id) fetchAnnouncement(id).then((item) => { if (item) setSelected(item); });
  }, []);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) { if (event.key === "Escape") close(); }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, []);

  function switchView(next: "current" | "archive") {
    setView(next);
    try { localStorage.setItem(VIEW_KEY, next); } catch { /* storage disabled */ }
  }

  async function open(id: string) {
    const item = await fetchAnnouncement(id);
    if (!item) return;
    setSelected(item);
    history.replaceState(null, "", `${basePath}?id=${encodeURIComponent(id)}`);
  }

  function close() {
    setSelected(null);
    history.replaceState(null, "", basePath);
  }

  async function share() {
    if (!selected) return;
    const url = `${location.origin}${basePath}?id=${encodeURIComponent(selected.id)}`;
    if (navigator.share) {
      try { await navigator.share({ title: selected.title, text: selected.shortDesc, url }); } catch { /* cancelled */ }
    } else {
      try { await navigator.clipboard.writeText(url); } catch { /* clipboard unavailable */ }
    }
  }

  return <>
    <div className="wrap">
      <header className="top"><div className="brand"><img src="/logo/logo.png" alt="BUSearch" /><div><h1>Ogłoszenia</h1><div className="sub"><span className="dot" />BUSearch</div></div></div><a className="back" href={cityPath("/")}><svg className="ui-arrow" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" aria-hidden="true"><path d="M19 12H5m0 0 6-6m-6 6 6 6" /></svg><span>Mapa</span></a></header>
      <div className="tabs"><button className={`tab ${view === "current" ? "active" : ""}`} type="button" onClick={() => switchView("current")}>Aktualne</button><button className={`tab ${view === "archive" ? "active" : ""}`} type="button" onClick={() => switchView("archive")}>Archiwum</button></div>
      <div className="list" id="list">
        {loading ? <div className="loading">Ładowanie…</div> : failed ? <div className="empty">Nie udało się wczytać ogłoszeń.</div> : items.length === 0 ? <div className="empty">{view === "archive" ? "Brak zarchiwizowanych ogłoszeń." : "Brak ogłoszeń."}</div> : items.map((item) => <button className="card in" key={item.id} type="button" onClick={() => open(item.id)}><div className="card__date">{date(item.createdAt)}</div><div className="card__title">{item.title}</div><div className="card__desc">{item.shortDesc}</div><div className="card__more">Więcej informacji →</div></button>)}
      </div>
    </div>
    <div className="overlay" id="overlay" data-open={selected ? "1" : "0"} onClick={close}><div className="sheet" onClick={(event) => event.stopPropagation()}><div className="sheet__handle" /><div className="sheet__head"><div><div className="sheet__title">{selected?.title}</div><div className="sheet__date">{selected && date(selected.createdAt)}</div></div><div className="sheet__actions"><button className="sheet__share" type="button" aria-label="Udostępnij" onClick={share}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.6" y1="10.6" x2="15.4" y2="6.4" /><line x1="8.6" y1="13.4" x2="15.4" y2="17.6" /></svg></button><button className="sheet__close ui-close" type="button" aria-label="Zamknij" onClick={close}>✕</button></div></div><div className="sheet__body"><div className="sheet__photos">{selected?.photos?.map((src) => <a key={src} href={src} target="_blank" rel="noopener noreferrer"><img src={src} loading="lazy" alt="" /></a>)}</div><div className="sheet__text">{selected?.body}</div></div></div></div>
  </>;
}
