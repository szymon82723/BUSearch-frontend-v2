import { ArrowRight, Bus, Clock3, Feather, Radio, Server, Smartphone, Zap } from "lucide-react";
import { journeyTopics } from "./home-content";
import "./home-information.css";

const advantages = [
  { icon: Clock3, color: "green", title: "Aktualne informacje", text: "Odjazdy na żywo pomagają sprawdzić, kiedy autobus lub tramwaj dotrze na przystanek. BUSearch pokazuje dostępne prognozy i opóźnienia obok godzin rozkładowych, aby łatwiej zaplanować wyjście i przesiadkę." },
  { icon: Feather, color: "white", title: "Wygoda na co dzień", text: "Mapa, przystanki, trasy linii i rozkłady jazdy są dostępne w jednej aplikacji. Otwórz BUSearch w przeglądarce na telefonie lub komputerze, bez zakładania konta do sprawdzania komunikacji. Zapisz swoje przystanki w ulubionych i wracaj do nich przed kolejną podróżą." },
  { icon: Zap, color: "yellow", title: "Prosta droga do odjazdu", text: "Wybierz miasto, wpisz nazwę przystanku lub numer linii i przejdź do informacji o przejeździe. Filtry pozwalają skupić mapę na autobusach lub tramwajach, a kierunki odjazdów ułatwiają wybranie właściwego pojazdu." },
];

const dataSteps = [
  { icon: Bus, color: "yellow", title: "Dane z komunikacji miejskiej", text: "Źródła miejskie i przewoźnicy udostępniają informacje o ruchu pojazdów, odjazdach i rozkładach. BUSearch korzysta z dostępnych źródeł dla Bydgoszczy, Torunia oraz Gdańska, Gdyni i Sopotu." },
  { icon: Server, color: "orange", title: "Jedna mapa i wspólna tablica", text: "BUSearch łączy dane z przystankami, liniami i kierunkami przejazdu. Porządkuje odjazdy, a tam, gdzie dostępne są informacje o ruchu, pokazuje prognozy oraz opóźnienia. Kolejne kursy mogą pochodzić z rozkładu jazdy." },
  { icon: Smartphone, color: "blue", title: "Informacje na Twoim ekranie", text: "Na telefonie widzisz mapę, lokalizację pojazdu i odjazdy wybranego przystanku. Możesz sprawdzić trasę linii, wyszukać połączenie i wrócić do ulubionych. Te same informacje są dostępne w przeglądarce i aplikacji na Androida." },
];

export function HomeInformation() {
  return <>
    <section className="home-benefits" aria-labelledby="benefits-title">
      <div className="home-container">
        <h2 id="benefits-title">Zalety BUSearch</h2>
        <p className="home-info-intro">Komunikacja miejska pod ręką — przed wyjściem z domu, na przystanku i podczas przesiadki.</p>
        <div className="home-info-columns">
          {advantages.map(({ icon: Icon, color, title, text }) => <article key={title}>
            <Icon className={`home-info-icon home-info-icon--${color}`} size={58} strokeWidth={1.8} aria-hidden="true" />
            <h3>{title}</h3><p>{text}</p>
          </article>)}
        </div>
      </div>
    </section>

    <section className="home-data-flow" id="jak-dziala" aria-labelledby="data-flow-title">
      <div className="home-container">
        <h2 id="data-flow-title">Jak działa BUSearch</h2>
        <p className="home-info-intro">Od danych o autobusie lub tramwaju do informacji, którą sprawdzasz przed podróżą.</p>
        <ol className="home-info-columns">
          {dataSteps.map(({ icon: Icon, color, title, text }, index) => <li key={title}>
            <Icon className={`home-info-icon home-info-icon--${color}`} size={58} strokeWidth={1.8} aria-hidden="true" />
            <span className="home-info-step">{index + 1}.</span>
            <h3>{title}</h3><p>{text}</p>
          </li>)}
        </ol>
        <div className="home-source-note">
          <Radio size={22} aria-hidden="true" />
          <p>W Bydgoszczy źródłem informacji jest ZDMiKP, w Toruniu miejski System Informacji Pasażerskiej, a w Trójmieście źródła transportowe obejmujące ZTM Gdańsk, ZKM Gdynia i SKM. Informacje na żywo są dostępne w zakresie udostępnianym przez poszczególne systemy.</p>
        </div>
      </div>
    </section>

    <section className="home-reading" id="odjazdy" aria-labelledby="departures-info-title">
      <div className="home-container">
        <div className="home-reading-heading">
          <span className="home-eyebrow">ODJAZDY I ROZKŁAD JAZDY</span>
          <h2 id="departures-info-title">Sprawdź godzinę. Poznaj sytuację na trasie.</h2>
          <p>BUSearch pomaga odczytać zarówno plan podróży, jak i dostępne informacje o bieżącym ruchu. Oznaczenie przy odjeździe mówi, z jakiego rodzaju danych korzystasz.</p>
        </div>
        <div className="home-departure-types">
          <article><span className="home-status home-status--live">Na żywo</span><h3>Prognoza przyjazdu na przystanek</h3><p>Informacja na żywo pochodzi z dostępnych danych o ruchu lub miejskiej tablicy. Pokazuje przewidywany czas przyjazdu albo odjazdu i może zmieniać się wraz z sytuacją na trasie. Gdy dostępna jest lokalizacja, pojazd zobaczysz również na mapie.</p></article>
          <article><span className="home-status home-status--planned">Planowo</span><h3>Godzina z rozkładu jazdy</h3><p>Odjazd planowy opisuje godzinę zapisaną w rozkładzie. Pomaga sprawdzić późniejsze kursy, także wtedy, gdy nie ma jeszcze informacji o ich ruchu. Sam wpis rozkładowy nie potwierdza aktualnego położenia pojazdu ani jego punktualności.</p></article>
          <article><span className="home-status home-status--delay">Opóźnienie</span><h3>Różnica względem planu</h3><p>Jeśli dane pozwalają ustalić opóźnienie, zobaczysz je przy kursie. Porównaj odjazd, kierunek i pozycję pojazdu, aby ocenić swoją przesiadkę. Brak znacznika na mapie może oznaczać brak danych o lokalizacji — sprawdź również tablicę przystanku.</p></article>
        </div>
      </div>
    </section>

    <section className="home-travel-guide" aria-labelledby="travel-guide-title">
      <div className="home-container">
        <div className="home-reading-heading">
          <span className="home-eyebrow">MAPA, PRZYSTANKI I POŁĄCZENIA</span>
          <h2 id="travel-guide-title">BUSearch w codziennych podróżach</h2>
          <p>Do pracy, szkoły, na uczelnię lub w nowe miejsce. Sprawdź dostępne informacje przed przejazdem i łatwiej odnajdź się w komunikacji miejskiej.</p>
        </div>
        <div className="home-guide-grid">
          {journeyTopics.map(({ title, paragraphs }, index) => <article key={title}>
            <span className="home-guide-number" aria-hidden="true">0{index + 1}</span>
            <h3>{title}</h3>
            {paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
          </article>)}
        </div>
        <a className="home-info-link" href="#miasta">Wybierz miasto i sprawdź odjazdy <ArrowRight size={18} aria-hidden="true" /></a>
      </div>
    </section>

  </>;
}
