import { useEffect, useRef, useState } from "react";
import { cityName, cityPath, wikiPath } from "../config/city";
import materialSymbol from "./material-symbols";
import { menuFooterMarkup } from "./menu-footer";
import { showMenuRipple } from "./menu-ripple";

interface SideMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenReport: () => void;
  onOpenAbout: () => void;
}

function Icon({ name }: { name: string }) {
  return <span className="ui-sidemenu__icon" style={{ flex: "none" }} dangerouslySetInnerHTML={{ __html: materialSymbol(name) }} />;
}

export function SideMenu({ isOpen, onClose, onOpenReport, onOpenAbout }: SideMenuProps) {
  const menuRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [showWikiIntro, setShowWikiIntro] = useState(false);

  useEffect(() => {
    const menuButton = document.getElementById("menuBtn");
    if (isOpen) closeRef.current?.focus({ preventScroll: true });
    else if (menuRef.current?.contains(document.activeElement)) menuButton?.focus({ preventScroll: true });
  }, [isOpen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (showWikiIntro) setShowWikiIntro(false);
      else if (isOpen) onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose, showWikiIntro]);

  function openWiki(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    onClose();
    try {
      if (localStorage.getItem("busearch_wiki_seen") === "true") {
        location.href = wikiPath();
        return;
      }
    } catch { /* storage disabled */ }
    setShowWikiIntro(true);
  }

  function changeCity() {
    onClose();
    try {
      localStorage.removeItem("busearch_city_choice");
      localStorage.removeItem("busearch_city_last");
    } catch { /* storage disabled */ }
    document.cookie = "busearch_city=; Path=/; Max-Age=0; SameSite=Lax";
    location.href = "/";
  }

  return <>
    <div className="ui-sidemenu-overlay" id="sideMenuOverlay" data-open={isOpen ? "1" : "0"} inert={!isOpen} aria-hidden={!isOpen} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <aside className="ui-sidemenu" id="sideMenu" aria-label="Menu" ref={menuRef}
        onPointerDownCapture={(event) => {
          const control = (event.target as Element).closest("a, button") as HTMLElement | null;
          if (control && event.button === 0 && event.isPrimary) showMenuRipple(control, event.nativeEvent);
        }}
        onKeyDownCapture={(event) => {
          const control = (event.target as Element).closest("a, button") as HTMLElement | null;
          if (control && !event.repeat && (event.key === "Enter" || (event.key === " " && control.tagName === "BUTTON"))) showMenuRipple(control);
        }}>
        <div className="ui-sidemenu__brand">
          <div className="ui-sidemenu__logo-wrap"><img className="ui-sidemenu__logo" src="/logo/logo.png" alt="" width="44" height="44" /></div>
          <div className="ui-sidemenu__identity"><div className="ui-sidemenu__brand-name">BUSearch</div><div className="ui-sidemenu__brand-city">{cityName}</div></div>
          <button className="ui-sidemenu__close ui-close" id="sideMenuClose" type="button" aria-label="Zamknij menu" onClick={onClose} ref={closeRef} dangerouslySetInnerHTML={{ __html: materialSymbol("close") }} />
        </div>
        <nav className="ui-sidemenu__list" id="sideMenuList" aria-label="Nawigacja główna">
          <button className="ui-sidemenu__item ui-sidemenu__item--active" id="sideMenuMap" aria-current="page" type="button" onClick={onClose}><Icon name="map" /><span>Mapa</span></button>
          <a className="ui-sidemenu__item" id="sideMenuAnnouncements" href={cityPath("/ogloszenia")} target="_blank" rel="noopener noreferrer" onClick={onClose}><Icon name="notifications" /><span>Ogłoszenia</span></a>
          <a className="ui-sidemenu__item" id="sideMenuWiki" href={wikiPath()} onClick={openWiki}><Icon name="menu_book" /><span>Wiki</span></a>
          <div className="ui-sidemenu__divider" role="separator" />
          <button className="ui-sidemenu__city" id="sideMenuChangeCity" type="button" aria-label={`Zmień miasto. Obecne miasto: ${cityName}`} onClick={changeCity}><Icon name="location_city" /><span>Zmień miasto</span></button>
          <a className="ui-sidemenu__item" id="sideMenuInstall" href={cityPath("/webapp")}><Icon name="install_mobile" /><span>Zainstaluj aplikację</span></a>
          <button className="ui-sidemenu__item" id="sideMenuReport" type="button" onClick={() => { onClose(); onOpenReport(); }}><Icon name="feedback" /><span>Zgłoś błąd</span></button>
          <button className="ui-sidemenu__item" id="sideMenuInfo" type="button" onClick={() => { onClose(); onOpenAbout(); }}><Icon name="info" /><span>O BUSearch</span></button>
          <a className="ui-sidemenu__item" id="sideMenuDokumentacja" href="/dokumentacja" target="_blank" rel="noopener noreferrer"><Icon name="description" /><span>Dokumentacja</span></a>
        </nav>
        <div className="ui-sidemenu__footer-slot" dangerouslySetInnerHTML={{ __html: menuFooterMarkup }} />
      </aside>
    </div>
    <div className={`ui-modal-overlay ${showWikiIntro ? "" : "ui-hidden"}`} id="wikiIntroModal" onClick={(event) => { if (event.target === event.currentTarget) setShowWikiIntro(false); }}>
      <div className="ui-modal" style={{ maxWidth: 560 }} role="dialog" aria-modal="true" aria-label="Wiki pojazdów">
        <h2 className="ui-modal__title">Wiki pojazdów</h2>
        <div className="ui-modal__content">
          <p>Wiki pozwala dodawać opisy i zdjęcia do konkretnego pojazdu (ID). Wpisy są widoczne od razu, a administrator dostaje powiadomienie.</p>
          <p>Aktualizacja danych (np. numer taborowy / patron / notatka / elektryk) trafia do zatwierdzenia w panelu administratorów serwisu.</p>
          <p>Logowanie odbywa się przez Google. Do działania potrzebne jest cookie sesji.</p>
        </div>
        <button className="ui-modal__btn" id="wikiIntroOk" type="button" onClick={() => {
          try { localStorage.setItem("busearch_wiki_seen", "true"); } catch { /* storage disabled */ }
          location.href = wikiPath();
        }}>Rozumiem</button>
      </div>
    </div>
  </>;
}
