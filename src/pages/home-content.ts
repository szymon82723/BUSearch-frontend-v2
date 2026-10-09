export const homeTitle = "BUSearch — mapa autobusów, tramwajów i odjazdy na żywo";
export const homeDescription = "Sprawdź mapę autobusów i tramwajów, odjazdy przystanków i połączenia w Bydgoszczy, Toruniu i Trójmieście. Pobierz BUSearch z Google Play.";

export const cityDescriptions: Record<string, string> = {
  bydgoszcz: "Sprawdzaj autobusy i tramwaje w Bydgoszczy na mapie BUSearch. Znajdź przystanek, zobacz odjazdy i sprawdź trasę wybranej linii. Mapa obejmuje pojazdy MZK i Mobilis, dla których dostępne są dane o lokalizacji.",
  torun: "Korzystasz z komunikacji miejskiej w Toruniu? Otwórz mapę autobusów i tramwajów MZK Toruń, wyszukaj linię lub przystanek i sprawdź informacje o przejeździe przed wyjściem z domu.",
  trojmiasto: "Sprawdź komunikację w Gdańsku, Gdyni i Sopocie. BUSearch udostępnia informacje dla ZTM Gdańsk, ZKM Gdynia i SKM. Dostępne środki transportu oraz dane o ich ruchu zależą od wybranego przewoźnika.",
};

export const journeyTopics = [
  {
    title: "Lokalizacja autobusów i tramwajów na mapie",
    paragraphs: [
      "Czekasz na przystanku i chcesz sprawdzić, czy autobus jest już blisko? Wyszukaj numer linii w BUSearch, a następnie wybierz pojazd na mapie. Jego położenie i kierunek pomagają ocenić, z której strony nadjeżdża. Przed wejściem do autobusu sprawdź również nazwę przystanku końcowego — ten sam numer linii może obsługiwać przejazdy w różnych kierunkach.",
      "Jeśli na mapie jest dużo pojazdów, skorzystaj z filtrów autobusów i tramwajów. Możesz skupić się na środku transportu, którym zamierzasz jechać. Gdy pojazdu nie widać, sprawdź odjazdy na przystanku: brak lokalizacji nie oznacza sam w sobie, że kurs został odwołany.",
    ],
  },
  {
    title: "Rozkład jazdy na przystanku i właściwy kierunek",
    paragraphs: [
      "Nazwa przystanku to pierwszy krok do znalezienia odjazdu. Zwróć uwagę na jego położenie na mapie i kierunek jazdy. Przystanki o tej samej nazwie mogą znajdować się po przeciwnych stronach ulicy i obsługiwać inne kierunki. Wybierając przystanek w BUSearch, sprawdź linię oraz cel przejazdu, zanim zaplanujesz dojście.",
      "Informacje o odjazdach przydają się zarówno przed wyjściem z domu, jak i podczas oczekiwania na autobus lub tramwaj. Na często używanym przystanku możesz korzystać z ulubionych, aby ponownie otworzyć jego odjazdy bez szukania nazwy. To wygodne przy codziennych dojazdach do pracy, szkoły lub na uczelnię.",
    ],
  },
  {
    title: "Opóźnienia autobusów i tramwajów",
    paragraphs: [
      "Korki i zmiany warunków na trasie mogą sprawić, że pojazd przyjedzie później, niż wynika z rozkładu. Jeżeli dla kursu dostępna jest informacja o opóźnieniu, BUSearch pokazuje ją przy odjeździe. Na mapie możesz też filtrować pojazdy według punktualności, korzystając z dostępnych danych.",
      "Sprawdzaj, czy oglądasz godzinę rozkładową, czy informację na żywo. Prognoza przyjazdu może się zmieniać, a brak aktualnych danych ogranicza możliwość oceny opóźnienia. Przy ważnym przejeździe zostaw czas na dojście do przystanku i ewentualną zmianę połączenia.",
    ],
  },
  {
    title: "Planowanie podróży i przesiadki",
    paragraphs: [
      "Gdy nie znasz odpowiedniej linii, otwórz wyszukiwarkę połączeń i wybierz przystanek początkowy oraz docelowy. Sprawdź dostępne propozycje przejazdu i przebieg wybranej trasy. Jeśli podróż wymaga przesiadki, zwróć uwagę na miejsce zmiany pojazdu i czas potrzebny na przejście między przystankami.",
      "Wyszukiwarka pomaga wybrać przejazd, a mapa i odjazdy pozwalają sprawdzić dostępne informacje przed podróżą. Warto ponownie zajrzeć do odjazdów przed przesiadką, szczególnie gdy pierwszy pojazd jedzie z opóźnieniem. Dostępność propozycji zależy od rozkładów i połączeń obsługiwanych w danym mieście.",
    ],
  },
];

export const cityGuides = [
  {
    slug: "bydgoszcz", title: "Komunikacja miejska w Bydgoszczy — autobusy i tramwaje",
    paragraphs: [
      "Mapa BUSearch dla Bydgoszczy pozwala sprawdzać pozycje pojazdów MZK i Mobilis oraz informacje o przystankach i liniach. Jeśli szukasz autobusu w Bydgoszczy, zacznij od numeru linii lub nazwy przystanku. Możesz sprawdzić kierunek jazdy i trasę, a następnie przejść do odjazdów z wybranego miejsca.",
      "Przy dojazdach po Bydgoszczy pomocne jest zapisanie przystanków w ulubionych i sprawdzenie połączenia przed rozpoczęciem podróży. Korzystaj z mapy autobusów i tramwajów w przeglądarce albo z aplikacji BUSearch na Androida. Dane na żywo są dostępne dla pojazdów i kursów objętych informacjami ze źródeł komunikacyjnych.",
    ],
  },
  {
    slug: "torun", title: "Komunikacja miejska w Toruniu — mapa MZK Toruń",
    paragraphs: [
      "W BUSearch sprawdzisz komunikację miejską MZK Toruń, wybierając toruńską mapę. Wyszukaj linię autobusową lub tramwajową, znajdź przystanek i zobacz dostępne informacje o odjazdach. Położenie przystanku na mapie ułatwia wybranie miejsca odjazdu, zwłaszcza gdy korzystasz z nieznanej wcześniej trasy.",
      "Podczas planowania przejazdu przez Toruń sprawdź kierunek linii oraz połączenie między przystankiem początkowym a docelowym. Mapę możesz otworzyć na komputerze przed wyjściem i ponownie sprawdzić na telefonie w drodze. Dostępność lokalizacji pojazdów zależy od danych udostępnianych dla danego kursu.",
    ],
  },
  {
    slug: "trojmiasto", title: "Komunikacja w Trójmieście — Gdańsk, Gdynia, Sopot i SKM",
    paragraphs: [
      "Podróż po Trójmieście może łączyć kilka środków transportu. BUSearch udostępnia informacje dla ZTM Gdańsk, ZKM Gdynia i SKM, dzięki czemu możesz sprawdzać dostępne przystanki, linie i odjazdy w jednym serwisie. Wybierz mapę Trójmiasta i wyszukaj miejsce, z którego chcesz rozpocząć przejazd.",
      "Przed przejazdem w Gdańsku, Gdyni lub Sopocie sprawdź przewoźnika, kierunek i przystanek docelowy. Przy zmianie środka transportu uwzględnij czas dojścia między przystankami lub do stacji. Zakres rozkładów, prognoz i pozycji na mapie różni się między przewoźnikami — nie każda informacja ma charakter danych na żywo.",
    ],
  },
];
