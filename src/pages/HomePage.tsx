import { useEffect, useState } from "react";
import { ArrowRight, Globe, Smartphone, Bus, CalendarDays, Check, Heart, Info, MapPinned, Radio, Route } from "lucide-react";
import { cityChoices } from "../config/city";
import { LAST_CITY_KEY, openCity } from "../config/city-choice";
import "../styles/theme.css";
import "./home-page.css";
import { homeDescription, homeTitle } from "./home-content";
import { HomeInformation } from "./HomeInformation";
import { HomeUsage } from "./HomeUsage";

const PLAY_STORE = "https://play.google.com/store/apps/details?id=com.szymoxyz.busearch&pcampaignid=web_share";

function PlayIcon({ size = 26 }: { size?: number }) {
  return (
    <svg viewBox="0 0 28.99 31.99" width={size} height={size} aria-hidden="true">
      <path d="M13.54 15.28.12 29.34a3.66 3.66 0 0 0 5.33 2.16l15.1-8.6Z" fill="#ea4335" />
      <path d="m27.11 12.89-6.53-3.74-7.35 6.45 7.38 7.28 6.48-3.7a3.54 3.54 0 0 0 1.5-4.79 3.62 3.62 0 0 0-1.5-1.5z" fill="#fbbc04" />
      <path d="M.12 2.66a3.57 3.57 0 0 0-.12.92v24.84a3.57 3.57 0 0 0 .12.92L14 15.64Z" fill="#4285f4" />
      <path d="m13.64 16 6.94-6.85L5.5.51A3.73 3.73 0 0 0 3.63 0 3.64 3.64 0 0 0 .12 2.65Z" fill="#34a853" />
    </svg>
  );
}

function AppleIcon({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.1 2.48-1.34.03-1.77-.79-3.31-.79-1.53 0-2.01.77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.17 17.03 2.8 12.11 4.52 9.13c.85-1.49 2.39-2.43 4.08-2.46 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.16 2.54M13 3.5c.73-.89 1.22-2.13 1.08-3.37-1.07.04-2.36.71-3.13 1.6-.69.79-1.29 2.05-1.13 3.26 1.19.09 2.39-.56 3.18-1.49z" />
    </svg>
  );
}
const featuresLeft = [
  {
    icon: MapPinned,
    colorClass: "feat-map",
    title: "Interaktywna mapa",
    text: "Przeglądaj całą sieć komunikacji miejskiej, linie oraz przystanki w czasie rzeczywistym.",
  },
  {
    icon: Radio,
    colorClass: "feat-stops",
    title: "Przystanki live",
    text: "Wirtualne tablice odjazdów z rzeczywistym czasem przyjazdu i aktualnymi informacjami o opóźnieniach.",
  },
  {
    icon: Bus,
    colorClass: "feat-bus",
    title: "Lokalizacja autobusu",
    text: "Śledź pozycje GPS pojazdów bezpośrednio na mapie. Wiesz dokładnie, gdzie znajduje się Twój kurs.",
  },
];

const featuresRight = [
  {
    icon: CalendarDays,
    colorClass: "feat-timetable",
    title: "Aktualne rozkłady jazdy",
    text: "Zawsze aktualne rozkłady ze wszystkimi wariantami tras, przystankami pośrednimi i godzinami odjazdów.",
  },
  {
    icon: Route,
    colorClass: "feat-planner",
    title: "Wyszukiwarka połączeń",
    text: "Wygodny planer podróży — znajdź najszybszą trasę z punktu A do punktu B wraz z przesiadkami.",
  },
  {
    icon: Heart,
    colorClass: "feat-favorites",
    title: "Ulubione i szybki dostęp",
    text: "Zapisuj najczęściej używane linie i przystanki, aby sprawdzić najbliższy odjazd jednym dotknięciem.",
  },
];

function StoreLink() {
  return (
    <a className="home-store" href={PLAY_STORE} target="_blank" rel="noopener noreferrer" aria-label="Pobierz BUSearch w Google Play">
      <PlayIcon size={32} />
      <span className="home-store-label"><small>POBIERZ Z</small><strong>Google Play</strong></span>
    </a>
  );
}

function InstallSection({ initialTab }: { initialTab?: "android" | "ios" } = {}) {
  const [activeTab, setActiveTab] = useState<"android" | "ios">(() => {
    if (initialTab) return initialTab;
    try {
      return /iPhone|iPad|iPod/.test(navigator.userAgent) ? "ios" : "android";
    } catch {
      return "android";
    }
  });

  return (
    <section className="home-install-section home-container" id="instrukcja-instalacji" aria-labelledby="download-title">
      <div className="home-section-heading">
        <p className="home-eyebrow">ZAINSTALUJ BUSEARCH</p>
        <h2 id="download-title">Miej BUSearch zawsze pod ręką.</h2>
        <p>
          Wybierz swój telefon, aby pobrać oficjalną aplikację ze Sklepu Google Play lub dodać skrót do ekranu początkowego na iPhone.
        </p>
      </div>

      <div className="home-install-tabs" role="tablist" aria-label="Wybór systemu operacyjnego">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "android"}
          className={`home-install-tab ${activeTab === "android" ? "active" : ""}`}
          onClick={() => setActiveTab("android")}
        >
          <div className="tab-icon"><PlayIcon size={24} /></div>
          <div className="tab-text">
            <strong>Android</strong>
            <small>Google Play</small>
          </div>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "ios"}
          className={`home-install-tab ${activeTab === "ios" ? "active" : ""}`}
          onClick={() => setActiveTab("ios")}
        >
          <div className="tab-icon"><AppleIcon size={24} /></div>
          <div className="tab-text">
            <strong>iPhone (iOS)</strong>
            <small>Ekran początkowy</small>
          </div>
        </button>
      </div>

      <div className="home-install-content">
        {activeTab === "android" ? (
          <div className="home-install-android">
            <div className="home-install-android-card">
              <div className="android-header">
                <div className="android-logo">
                  <img src="/logo/logo512.png" width="64" height="64" alt="Logo BUSearch" />
                </div>
                <div>
                  <h3>BUSearch na system Android</h3>
                  <p>Oficjalna aplikacja w Sklepie Google Play. Szybka, bezpłatna i zawsze gotowa do drogi.</p>
                </div>
              </div>

              <div className="android-badges">
                <StoreLink />
              </div>

              <ul className="android-features">
                <li><Check size={18} /> Pozycje autobusów i tramwajów w czasie rzeczywistym</li>
                <li><Check size={18} /> Wirtualne tablice odjazdów i informacje o opóźnieniach</li>
                <li><Check size={18} /> Działa natychmiast bez konieczności rejestracji</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="home-install-ios">
            <div className="ios-alert-banner">
              <Info size={22} />
              <div>
                <strong>Na iPhone nie instaluj aplikacji z App Store!</strong>
                <p>BUSearch działa bezpośrednio w przeglądarce Safari jako nowoczesna aplikacja internetowa (PWA). Wystarczy dodać skrót do ekranu początkowego, by mieć pełny dostęp do mapy i rozkładów.</p>
              </div>
            </div>

            <div className="ios-video-showcase">
              <div className="ios-phone-frame" aria-label="Wideo instruktażowe dodawania BUSearch do ekranu początkowego">
                <div className="ios-phone-notch" aria-hidden="true" />
                <div className="ios-phone-screen">
                  <video
                    src="/videos/ios-install-web.mp4"
                    autoPlay
                    loop
                    muted
                    playsInline
                    controls
                    preload="metadata"
                    poster="/logo/IMG_0419.png"
                    aria-label="Wideo instruktażowe dodawania BUSearch do ekranu początkowego na iPhone"
                  />
                </div>
              </div>
              <div className="ios-video-guide">
                <h3>Dodaj BUSearch do ekranu głównego</h3>
                <p className="ios-guide-lead">Cała konfiguracja zajmuje mniej niż 15 sekund:</p>
                <ol className="ios-quick-steps">
                  <li>
                    <span className="step-badge">1</span>
                    <div>
                      <strong>Wejdź na busearch.pl w Safari</strong>
                      <small>Otwórz stronę w domyślnej przeglądarce Safari na telefonie.</small>
                    </div>
                  </li>
                  <li>
                    <span className="step-badge">2</span>
                    <div>
                      <strong>Kliknij „Udostępnij”</strong>
                      <small>Naciśnij menu z trzema kropkami <code>...</code> na dolnym pasku i wybierz pierwszą opcję <b>Udostępnij</b>.</small>
                    </div>
                  </li>
                  <li>
                    <span className="step-badge">3</span>
                    <div>
                      <strong>Wybierz „Do ekranu głównego”</strong>
                      <small>Przewiń w dół, naciśnij <b>Do ekranu głównego</b> i zatwierdź przyciskiem <b>Dodaj</b> w prawym górnym rogu.</small>
                    </div>
                  </li>
                </ol>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

const cityLogos: Record<string, string> = {
  bydgoszcz: "/images/cities/bydgoszcz.svg",
  torun: "/images/cities/torun.svg",
  trojmiasto: "/images/cities/trojmiasto.svg",
};

function CityChooser() {
  const [lastCity] = useState(() => {
    try { return localStorage.getItem(LAST_CITY_KEY) ?? ""; } catch { return ""; }
  });
  return <nav className="home-start-cities" id="miasta" aria-label="Otwórz mapę miasta w przeglądarce">
    {cityChoices.map(city => <a href={city.url} key={city.slug} onClick={event => {
      if (event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
        event.preventDefault(); openCity(city.slug, city.url);
      }
    }}>
      <img src={cityLogos[city.slug]} width="44" height="44" alt="" />
      <span><strong>{city.name}</strong><small>{city.note}</small>{lastCity === city.slug && <em>Ostatnio wybrane</em>}</span>
      <ArrowRight size={20} aria-hidden="true" />
    </a>)}
  </nav>;
}

function StartSection() {
  const [showIos, setShowIos] = useState(false);
  useEffect(() => {
    if (!showIos) return;
    const frame = requestAnimationFrame(() => document.getElementById("home-start-ios-guide")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    return () => cancelAnimationFrame(frame);
  }, [showIos]);
  return <section className="home-start" id="zacznij" aria-labelledby="start-title">
    <div className="home-container">
      <div className="home-start-heading"><h2 id="start-title">Korzystaj tak, jak Ci wygodnie.</h2><p>Pobierz BUSearch na telefon albo od razu otwórz mapę w przeglądarce.</p></div>
      <div className="home-start-options">
        <article className="home-start-app" id="pobierz" aria-labelledby="start-app-title">
          <div className="home-start-label"><Smartphone size={21} aria-hidden="true" /> APLIKACJA NA TELEFON</div>
          <h3 id="start-app-title">Miej BUSearch pod ręką</h3>
          <p>Sprawdzaj odjazdy i mapę pojazdów podczas codziennych dojazdów. Wybierz sposób instalacji dla swojego telefonu.</p>
          <div className="home-start-android"><div><PlayIcon size={26} /><strong>Android</strong><span>Aplikacja w Google Play</span></div><StoreLink /></div>
          <div className="home-start-ios"><div><AppleIcon size={25} /><strong>iPhone i iPad</strong><span>Dodaj BUSearch z Safari</span></div><button type="button" onClick={() => setShowIos(!showIos)} aria-expanded={showIos} aria-controls="home-start-ios-guide">{showIos ? "Ukryj instrukcję" : "Pokaż, jak dodać"}<ArrowRight size={17} aria-hidden="true" /></button></div>
          <p className="home-start-hint">Na Androidzie pobierasz aplikację. Na iPhonie dodajesz stronę do ekranu głównego z Safari.</p>
        </article>
        <article className="home-start-browser" aria-labelledby="start-browser-title">
          <div className="home-start-label"><Globe size={21} aria-hidden="true" /> MAPA W PRZEGLĄDARCE</div>
          <h3 id="start-browser-title">Sprawdź odjazdy już teraz</h3>
          <p>Wybierz miasto i przejdź prosto do mapy autobusów, tramwajów i przystanków. Działa na telefonie i komputerze, bez instalacji.</p>
          <CityChooser />
          <p className="home-start-hint"><Check size={16} aria-hidden="true" /> Bez rejestracji · Bez pobierania aplikacji</p>
        </article>
      </div>
      <div id="home-start-ios-guide">{showIos && <InstallSection initialTab="ios" />}</div>
    </div>
  </section>;
}

export function HomePage() {
  useEffect(() => {
    document.title = homeTitle;
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const previousDescription = description?.content;
    if (description) description.content = homeDescription;
    const existingCanonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const canonical = existingCanonical ?? document.createElement("link");
    canonical.rel = "canonical";
    const pageUrl = new URL("/", location.origin).href;
    canonical.href = pageUrl;
    const social = Object.entries({
      "og:type": "website", "og:locale": "pl_PL", "og:site_name": "BUSearch",
      "og:title": homeTitle, "og:description": homeDescription, "og:url": pageUrl,
      "og:image": new URL("/logo/logo512.png", location.origin).href, "og:image:alt": "Logo BUSearch",
    }).map(([property, content]) => {
      const meta = document.createElement("meta");
      meta.setAttribute("property", property);
      meta.content = content;
      return meta;
    });
    const structuredData = document.createElement("script");
    structuredData.type = "application/ld+json";
    structuredData.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [
        { "@type": "WebSite", "@id": `${location.origin}/#website`, name: "BUSearch", url: `${location.origin}/`, inLanguage: "pl", description: homeDescription },
        { "@type": "WebApplication", "@id": `${pageUrl}#application`, name: "BUSearch", url: pageUrl, applicationCategory: "TravelApplication", operatingSystem: "Android, iOS, Windows, macOS, Linux", browserRequirements: "Requires JavaScript", description: homeDescription, installUrl: PLAY_STORE },
      ],
    });
    const nodes = [...(existingCanonical ? [] : [canonical]), ...social, structuredData];
    nodes.forEach(node => document.head.appendChild(node));
    return () => {
      nodes.forEach(node => node.remove());
      if (description && previousDescription !== undefined) description.content = previousDescription;
    };
  }, []);
  return <div className="home-page">
    <header className="home-header">
      <div className="home-container home-header-inner">
        <a className="home-brand" href="/" aria-label="BUSearch — strona główna"><img src="/logo/logo512.png" width="38" height="38" alt="" /><span>BUSearch</span></a>
        <nav aria-label="Nawigacja główna"><a href="#funkcje">Funkcje</a><a href="#jak-dziala">Jak działa</a><a href="#pobierz">Pobierz</a><a className="home-nav-map" href="#miasta">Wybierz miasto <ArrowRight size={16} /></a></nav>
      </div>
    </header>

    <main>
      <section className="home-hero" aria-labelledby="home-title">
        <div className="home-container home-hero-grid">
          <div className="home-hero-copy">
            <h1 id="home-title">BUSearch<span>Autobusy i tramwaje.
W aplikacji i przeglądarce.</span></h1>
            <p className="home-lead">Sprawdź odjazdy, znajdź swój autobus lub tramwaj i zaplanuj przejazd. Pobierz aplikację albo korzystaj z mapy bez instalacji. Bydgoszcz, Toruń i Trójmiasto.</p>
            <div className="home-actions"><a className="home-hero-primary" href="#miasta"><MapPinned size={19} /> Korzystaj w przeglądarce</a><a className="home-hero-download" href="#pobierz"><Smartphone size={19} /> Pobierz aplikację</a></div>
            <ul className="home-hero-points" aria-label="Najważniejsze cechy"><li><Check size={15} /> Bez rejestracji</li><li><Check size={15} /> Działa w przeglądarce</li><li><Check size={15} /> Pozycje pojazdów na żywo</li></ul>
          </div>
          <div className="home-device-stage" aria-label="Podgląd aplikacji BUSearch">
            <div className="home-device-glow" aria-hidden="true" />
            <div className="home-device"><img src="/images/app-phone-54.png" width="920" height="2048" alt="Ekran aplikacji BUSearch z linią 54 (P) i odjazdami przy przystanku Garbary" fetchPriority="high" /></div>
          </div>
        </div>
      </section>

      <StartSection />

      <section className="home-section home-container" id="funkcje" aria-labelledby="features-title">
        <div className="home-section-heading">
          <p className="home-eyebrow">NAJWAŻNIEJSZE FUNKCJE</p>
          <h2 id="features-title">Wszystko, czego potrzebujesz przed wyjściem.</h2>
          <p>
            Od pozycji pojazdu na żywo i wirtualnych tablic odjazdów, po rozkłady jazdy i planer połączeń — kompletne dane w zasięgu ręki.
          </p>
        </div>

        <div className="home-features-showcase">
          <div className="home-features-col left">
            {featuresLeft.map(({ icon: Icon, colorClass, title, text }) => (
              <article className={`home-feat-item ${colorClass}`} key={title}>
                <div className="home-feat-icon" aria-hidden="true">
                  <Icon size={26} strokeWidth={2} />
                </div>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>

          <div className="home-features-phone" aria-label="Prezentacja działania aplikacji BUSearch">
            <div className="home-phone-mockup">
              <div className="home-phone-notch" aria-hidden="true" />
              <div className="home-phone-screen">
                <video
                  src="/videos/app-demo-web.mp4"
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="metadata"
                  poster="/images/app-phone-54.png"
                  aria-label="Wideo przedstawiające działanie aplikacji BUSearch"
                />
              </div>
            </div>
          </div>

          <div className="home-features-col right">
            {featuresRight.map(({ icon: Icon, colorClass, title, text }) => (
              <article className={`home-feat-item ${colorClass}`} key={title}>
                <div className="home-feat-icon" aria-hidden="true">
                  <Icon size={26} strokeWidth={2} />
                </div>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>

        <p className="home-data-note">
          BUSearch łączy udostępniane dane o pozycjach pojazdów, miejskie tablice odjazdów i rozkłady jazdy. Zakres informacji zależy od miasta i przewoźnika.
        </p>
      </section>

      <HomeUsage />
      <HomeInformation />

    </main>

    <footer className="home-footer home-container"><div><a className="home-brand" href="/"><img src="/logo/logo512.png" width="28" height="28" alt="" />BUSearch</a><p>Komunikacja miejska na żywo.</p></div><nav aria-label="Informacje o serwisie"><a href="/dokumentacja">Dokumentacja</a><a href="/api-docs">API</a><a href="/regulamin">Regulamin</a><a href="/polityka-prywatnosci">Prywatność</a><a href="mailto:kontakt@busearch.pl">Kontakt</a></nav><a className="home-credit" href="https://szymo.xyz" target="_blank" rel="noopener noreferrer">Twórca: szymoxyz</a></footer>
  </div>;
}
