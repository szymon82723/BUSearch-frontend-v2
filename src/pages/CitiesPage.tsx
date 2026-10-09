import { useEffect, useMemo, useState } from "react";
import { ArrowRight, MapPinned, Smartphone } from "lucide-react";
import { cityChoices } from "../config/city";
import { LAST_CITY_KEY, openCity } from "../config/city-choice";
import "../styles/theme.css";
import "../styles/miasta.css";
import "./cities-page.css";

function fold(value: string): string {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ł/g, "l");
}

export function CitiesPage() {
  const [query, setQuery] = useState("");
  const [lastCity] = useState(() => {
    try { return localStorage.getItem(LAST_CITY_KEY) ?? ""; } catch { return ""; }
  });
  const [activeIndex, setActiveIndex] = useState(-1);
  const cities = useMemo(() => cityChoices.filter((entry) => fold(`${entry.name} ${entry.note}`).includes(fold(query.trim()))), [query]);

  useEffect(() => {
    document.documentElement.classList.add("js");
    document.body.dataset.ready = "1";
    document.title = "BUSearch - autobusy i tramwaje na żywo: Bydgoszcz, Toruń, Trójmiasto";
  }, []);


  return (
    <>
      <div className="bg" aria-hidden="true" />
      <nav className="picker-nav" aria-label="Nawigacja główna"><a href="/" className="picker-brand"><img src="/logo/logo512.png" width="28" height="28" alt="" /> BUSearch</a><a href="/aplikacja"><Smartphone size={16} /> Poznaj aplikację <span className="picker-badge">Nowość</span></a></nav>
      <header className="head">
        <div className="head__logo-wrap"><img className="head__logo" src="/logo/logo512.png" alt="" /></div>
        <p className="picker-eyebrow"><MapPinned size={15} /> Komunikacja miejska na żywo</p>
        <h1 className="head__brand">Dokąd dziś jedziemy?</h1>
        <p className="head__tagline">Wybierz miasto i sprawdź pojazdy, trasy oraz odjazdy.</p>
      </header>
      <main className="panel">
        <div className="search">
          <svg className="search__icon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
          <input className="search__input" id="search" type="search" placeholder="Szukaj miasta" autoComplete="off" aria-label="Szukaj miasta" value={query} onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); }} onKeyDown={(event) => {
            if (event.key === "ArrowDown") { event.preventDefault(); setActiveIndex((index) => Math.min(cities.length - 1, index + 1)); }
            if (event.key === "ArrowUp") { event.preventDefault(); setActiveIndex((index) => Math.max(0, index - 1)); }
            if (event.key === "Enter" && cities[activeIndex]) openCity(cities[activeIndex].slug, cities[activeIndex].url);
          }} />
        </div>
        <nav className="list" id="list" aria-label="Dostępne miasta">
          {cities.length ? cities.map((entry, index) => <a key={entry.slug} className={`row ${entry.slug === lastCity ? "is-current" : ""} ${activeIndex === index ? "is-active" : ""}`} href={entry.url} data-slug={entry.slug} aria-current={entry.slug === lastCity ? "page" : undefined} onClick={(event) => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
            event.preventDefault(); openCity(entry.slug, entry.url);
          }}>
            <span className="row__body"><span className="row__name">{entry.name}</span><span className="row__note">{entry.note}</span></span>
            {entry.slug === lastCity && <span className="row__here" role="img" aria-label="Twoje miasto" />}
            <svg className="row__chevron" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
          </a>) : <p className="empty">Nie znaleźliśmy takiego miasta.</p>}
        </nav>
      </main>
      <a className="picker-app" href="/aplikacja"><span className="picker-app-icon"><Smartphone size={25} /></span><span><strong>BUSearch w Twoim telefonie</strong><small>Poznaj aplikację i zobacz, jak ją pobrać.</small></span><ArrowRight size={20} /></a>
      <p className="picker-hint">Bez instalacji. Wybierz miasto i ruszaj w drogę.</p>
      <div className="credit"><nav className="credit__links" aria-label="Informacje o serwisie"><a href="/dokumentacja">Dokumentacja</a><a href="/api-docs">API</a><a href="/regulamin">Regulamin</a><a href="/polityka-prywatnosci">Prywatność</a></nav><a href="https://szymo.xyz" target="_blank" rel="noopener noreferrer">Twórca: szymoxyz</a></div>
    </>
  );
}
