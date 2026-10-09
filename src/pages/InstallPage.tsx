import { useEffect, useState } from "react";
import "../styles/theme.css";
import "../styles/dark-panel.css";
import "../styles/webapp.css";

const PLAY_STORE = "https://play.google.com/store/apps/details?id=com.szymoxyz.busearch&pcampaignid=web_share";

function PlayIcon({ size = 30 }: { size?: number }) {
  return <svg viewBox="0 0 28.99 31.99" width={size} height={size} aria-hidden="true"><path d="M13.54 15.28.12 29.34a3.66 3.66 0 0 0 5.33 2.16l15.1-8.6Z" fill="#ea4335" /><path d="m27.11 12.89-6.53-3.74-7.35 6.45 7.38 7.28 6.48-3.7a3.54 3.54 0 0 0 1.5-4.79 3.62 3.62 0 0 0-1.5-1.5z" fill="#fbbc04" /><path d="M.12 2.66a3.57 3.57 0 0 0-.12.92v24.84a3.57 3.57 0 0 0 .12.92L14 15.64Z" fill="#4285f4" /><path d="m13.64 16 6.94-6.85L5.5.51A3.73 3.73 0 0 0 3.63 0 3.64 3.64 0 0 0 .12 2.65Z" fill="#34a853" /></svg>;
}

function Step({ number, title, text, image, alt }: { number: number; title: React.ReactNode; text: string; image?: string; alt?: string }) {
  return <div className="step"><div className="step-header"><div className="step-num">{number}</div><div className="step-title">{title}</div></div><div className="step-desc">{text}</div>{image && <div className="step-img"><img src={image} alt={alt ?? ""} loading="lazy" /></div>}</div>;
}

export function InstallPage() {
  const [showIos, setShowIos] = useState(false);
  const [inApp] = useState(() => {
    try { return !!(window as Window & { AndroidLogin?: unknown }).AndroidLogin || navigator.userAgent.includes("BUSearchApp") || new URLSearchParams(location.search).get("app") === "1" || localStorage.getItem("busearch_tryb_aplikacji") === "1"; } catch { return false; }
  });

  useEffect(() => { document.title = "Zainstaluj aplikację - BUSearch"; }, []);

  return <div className="wrap">
    <a className="back" href="/"><svg className="ui-arrow" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" aria-hidden="true"><path d="M19 12H5m0 0 6-6m-6 6 6 6" /></svg><span>Mapa</span></a>
    <header><div className="logo-wrap"><img src="/logo/logo.png" alt="BUSearch" /></div><h1>{inApp ? "Masz już aplikację BUSearch" : "Zainstaluj BUSearch"}</h1><p className="subtitle" id="subtitleTxt">{inApp ? "Korzystasz z aplikacji na telefonie — nic nie musisz instalować." : showIos ? "Podążaj za instrukcją poniżej" : "Wybierz swój system, żeby zobaczyć dokładne kroki"}</p></header>

    {!inApp && !showIos && <div id="system-selection">
      <a className="selection-card android" href={PLAY_STORE} target="_blank" rel="noopener noreferrer"><div className="os-icon-large"><PlayIcon /></div><span>Android</span><span className="selection-sub">Sklep Play</span></a>
      <button className="selection-card ios" type="button" onClick={() => setShowIos(true)}><div className="os-icon-large"><svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.1 2.48-1.34.03-1.77-.79-3.31-.79-1.53 0-2.01.77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.17 17.03 2.8 12.11 4.52 9.13c.85-1.49 2.39-2.43 4.08-2.46 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.16 2.54M13 3.5c.73-.89 1.22-2.13 1.08-3.37-1.07.04-2.36.71-3.13 1.6-.69.79-1.29 2.05-1.13 3.26 1.19.09 2.39-.56 3.18-1.49z" /></svg></div><span>iPhone</span><span className="selection-sub">Ekran początkowy</span></button>
    </div>}

    {!inApp && <div id="ios-instruction" className={`instruction-section ${showIos ? "active" : ""}`}><div className="section-card"><div className="section-header"><span className="os-name">Safari na iOS</span><button className="btn-change-os" type="button" onClick={() => setShowIos(false)}>Zmień system</button></div>
      <div className="ios-alert-banner" style={{ margin: "16px 0 20px", display: "flex", gap: "14px", padding: "16px 18px", borderRadius: "16px", background: "linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)", border: "1.5px solid #fb923c" }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, color: "#ea580c", marginTop: "2px" }}>
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <div>
          <strong style={{ display: "block", color: "#9a3412", fontSize: "15px", marginBottom: "4px" }}>Na iPhone nie instaluj aplikacji z App Store!</strong>
          <p style={{ margin: 0, color: "#7c2d12", fontSize: "13px", lineHeight: "1.5" }}>BUSearch działa bezpośrednio w przeglądarce Safari jako aplikacja internetowa (PWA). Wystarczy dodać skrót do ekranu początkowego.</p>
        </div>
      </div>
      <div style={{ marginBottom: "24px", borderRadius: "20px", overflow: "hidden", border: "1px solid #dce4f1", background: "#000", boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}>
        <video src="/videos/ios-install-web.mp4" controls autoPlay loop muted playsInline poster="/logo/IMG_0419.png" style={{ width: "100%", maxHeight: "380px", objectFit: "contain", display: "block", background: "#000" }} />
      </div>
      <Step number={1} title={<>Wejdź na <span className="highlight">busearch.pl</span> w Safari</>} text="Upewnij się, że przeglądasz stronę bezpośrednio w Safari i kliknij menu (...)." image="/logo/IMG_0419.png" alt="Otwórz stronę busearch.pl w Safari" />
      <Step number={2} title={<>Kliknij opcję <span className="highlight">Udostępnij</span></>} text="W menu, które się wysunie, wybierz pozycję Udostępnij na samej górze." image="/logo/IMG_0420.png" alt="Przycisk Udostępnij w Safari" />
      <Step number={3} title={<>Przewiń w dół i wybierz <span className="highlight">Do ekranu głównego</span></>} text="Naciśnij „Do ekranu głównego” i zatwierdź przyciskiem „Dodaj” w prawym górnym rogu — ikona BUSearch pojawi się na Twoim ekranie." image="/logo/IMG_0421.jpeg" alt="Dodaj do ekranu początkowego - iOS" />
    </div></div>}
    <a href="/" className="btn-back">Wróć do mapy bez instalacji</a>
  </div>;
}
