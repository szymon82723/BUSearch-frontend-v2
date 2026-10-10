# Zgodność działania frontendów BUSearch

Cel użytkownika: stale porównywać frontend produkcyjny v1 i frontend v2,
usuwać błędy i zapewnić podobne działanie. Wygląd nie musi być identyczny.
Cel pozostaje aktywny. Poniższe wyniki dotyczą konkretnych scenariuszy;
nie dowodzą kompletnej zgodności ani braku wszystkich błędów.

Źródła: `frontend/web/src/app/index.app.js`, komponenty `frontend-v2/src`,
działające API produkcyjne na tym serwerze oraz testy Chromium.
V1 nadal obsługuje produkcję; v2 działa na `beta-testy.busearch.pl`.

## Poprawki mapy — 10 października 2026

- Plakietki słupków pokazują `nazwa`, również dla przystanków bez opisu
  kierunku i słupków dostępnych tylko w odpowiedzi trasy. Zaznaczony słupek
  zastępuje pinezkę trasy, aby nazwa nie była narysowana dwukrotnie.
- Punkty pojazdów przy zoomie poniżej 13 pozostają w pozycji GPS. Rozsuwanie
  działa dla plakietek pojazdów po przybliżeniu; oddalenie zeruje przesunięcia
  i usuwa łączniki, także dla ponownie wykorzystanych markerów.
- Usunięto przycisk przełączania śledzenia z panelu pojazdu. Wybór pojazdu
  uruchamia śledzenie automatycznie; otwarcie przystanku je wstrzymuje,
  a zamknięcie wznawia. Test obejmuje ruch pojazdu po wznowieniu.
- Dodano `bun run check` i GitHub Actions z instalacją zależności według
  `bun.lock`, kontrolą TypeScriptu i budowaniem aplikacji. README opisuje
  wymagania testów, a odznaka build korzysta z wyniku workflow.

Weryfikacja lokalna: instalacja z `--frozen-lockfile`, `check`, `build`,
`test:vehicle`, `test:vehicle:overlap`, `test:map` i `test:line`.
Testy pojazdów i mapy obejmują telefon i komputer; nakładające się pojazdy
sprawdzono również na telefonie w poziomie. Testy przeglądarkowe sprawdzają
błędy wykonania JavaScriptu. Workflow wymaga wysłania zmian na GitHuba,
aby wykonać te kontrole również w CI.

## Stan sprawdzenia — 4 października 2026

| Obszar | Ustalenia i dowody | Co pozostaje |
| --- | --- | --- |
| Pojazd i kamera | V2: wybór ukrywa pozostałe pojazdy, zachowuje zoom i włącza śledzenie. `test:vehicle`, szerokości 1440 i 390. | Porównać ręczne przesuwanie kamery, zniknięcie pojazdu i powrót po utracie sieci z v1. |
| Oznaczenia pojazdu | V2: plakietka ID i aktualizacji, znany numer taborowy pod pinezką. Kontrolowane testy DOM. | Sprawdzić wszystkie miasta, typy pojazdów i daty/świeżość danych. |
| Przystanek z trasy | V2: wybór po ID, także brakujący słupek. Otwarcie przystanku zachowuje trasę i rozwinięcie panelu; śledzenie czeka, a zamknięcie przywraca poprzedni stan. `test:vehicle` obejmuje odświeżanie przy otwartym przystanku bez ściągania kamery, powrót i wznowienie. | Historia przeglądarki i przejścia przez planer/ulubione wymagają dalszego sprawdzenia. |
| Rozwijanie przystanku | V2: przeciąganie i kliknięcie uchwytu pokazują pełną listę, odświeżają dane; bez dodatkowego przycisku. `test:map` obejmuje przeciąganie przystanków współdzielonych. | Porównać pozycję przewijania i stan przy zmianie przystanku oraz wszystkie arkusze. |
| Zławieś Wielka | API i v2: pary 2002/2234 w kierunku Złejwsi, 2003/2233: 43 Przylesie i 132 Uniwersytet. Testy backendu, Chromium i kontrola rzeczywistych odpowiedzi po wdrożeniu. | Kontrolować po aktualizacji rozkładów. |
| Kierunek linii | Naprawiono w v2: mapa i lista biorą wybrany wariant, flota jest ograniczona do wybranej linii; kolejność z API, powtarzające się przystanki zachowane. `test:line` obejmuje kierunki, granice mapy, brakujący słupek, zmianę linii i błąd HTTP, wadliwy JSON i wadliwą strukturę API/ponowienie. | Pełny wybór wariantów i legendy jak w v1; zawężanie odjazdów do wybranego wariantu. |
| Wyszukiwanie | V2: strzałki/Enter wybierają aktywny wynik, Escape/Tab zamykają listę, czyszczenie przywraca fokus. Wyszukiwanie bez polskich znaków i po słowach w dowolnej kolejności; dokładne numery linii/kody słupków mają pierwszeństwo. Słupki pokazują ID, kod, kierunek i wspólne linie. `test:search` obejmuje Chromium 1440/390, IME, kliknięcie/dotyk oraz oba słupki Złejwsi. `test:line` obejmuje ponowny wybór linii. | Wyszukiwanie pojazdów i porównanie pełnego zakresu wyników/limitów z v1. |
| Filtry | V2: typy, modele, elektryki, zdjęcia, oznaczenia i brak numeru taborowego w Toruniu. `test:vehicle` obejmuje liczniki i łączenie warunków. | Przewoźnicy i obsługa kolei; porównać zakres i stany z v1 w Trójmieście. |
| Rozkłady | V2: z linii otwierany rozkład słupka, wybór kierunku, typu dnia i konkretnej daty, legenda, okres ważności, odjazdy na żywo i powrót do linii. `test:timetable` w Chromium 1440/390 sprawdza czas Warszawy przy strefie Hawajów, daty, kierunki, błędne JSON/dane, ponowienie i krańcówkę. Pinezka pozostaje nad rozwiniętym panelem. Wybór godziny otwiera przebieg kursu i mapę; `test:timetable` obejmuje datę i wariant, obsługę klawiatury, błąd/ponowienie i powrót. API przyjmuje `date`, `kierunek`, `wariant`; 3 testy backendu obejmują jednoczesne kierunki, wyjątki kalendarza i krańcówki. | Zgodność godzin tabeli z wyjątkami kalendarza (tabela konkretnej daty nadal bierze typ dnia), kursy nocne i rozróżnianie numeracji GTFS/API przy klikaniu pinezek kursu, dokumenty przewoźnika i dalsze kontrole rzeczywistych rozkładów. |
| Planer | V2 ma formularz i wyniki. Kod wybiera słupek po pierwszej pasującej nazwie i ogranicza podpowiedzi do pierwszych 50 przystanków. | Naprawić wybór słupków, datę/godzinę, błędy, przesiadki i prezentację całej podróży na mapie. |
| Ulubione i powiadomienia | Testowane przyciski, odczyt i zapisy powiadomień przechwycone w Chromium — nie wysyłają prawdziwych powiadomień. | Zgodność istniejących ulubionych, zapisów w aplikacji Android i rzeczywistego dostarczenia powiadomień. |
| Strony i logowanie | README v2 opisuje dostępne trasy i przekierowanie Wiki do produkcji. | `/app/wk`, `/app/wiki`, admin, sesje/logowanie i pozostałe zaawansowane zachowania wymagają osobnego audytu. |
| Odporność i urządzenia | Obecne testy obejmują wybrane błędy API, mobile layout i Chromium. | Utrata sieci, uśpienie, nawigacja historii, współdzielone linki, tryby mapy, dostępność i inne przeglądarki/Android. |

## Polecenia weryfikacji

W `frontend-v2`, przy działającym Vite:

- `bun run build`
- `bun run test:map`
- `bun run test:vehicle`
- `bun run test:line`
- `bun run test:timetable`
- `bun run test:search`

Przed każdą zmianą produkcji obowiązują kontrole z `AGENTS.md`:
`bun run check` w backendzie i frontendzie, `bun run check:config` w backendzie,
następnie lokalne `bash deploy-to-production.sh`. Nie podmieniać produkcji
na v2 na podstawie samych testów kilku komponentów.

Najbliższe działania: zgodność rozkładu konkretnej daty z kalendarzem GTFS,
zawężanie odjazdów wariantu oraz wyszukiwarka i planer. Nie usuwa to pozostałego
zakresu celu z tabeli.

API kursu wdrożone lokalnie po kontrolach: backend 396 testów, oba `check`,
`check:config`. Weryfikacja rzeczywistego API: 43/2003, 05.10.2026 o 04:40,
Przylesie P+R — 13 przystanków. V2 nadal działa jako beta.

Pierwsza kontrola rozkładu miejskiego ze `name` wykazała fałszywe godziny
nocne 43/2003 (np. 00:25). Dalsza analiza wykazała błąd parsera, opisany
i naprawiony poniżej. Nie były to rzeczywiste odjazdy brakujące w GTFS.

Chromium na rzeczywistych danych potwierdził również kurs niedzielny
43/2003 o 05:40 (13 przystanków) i powrót do tabeli. Mapę kursu
dopasowano z uwzględnieniem wysokości panelu rozkładu.

## Korekta parsera urzędowej tabeli 43 — 04.10.2026

Poprzednia hipoteza o brakujących nocnych kursach 00:25/00:40/00:55 była
błędna. ZDMiKP publikuje osobne godziny dla każdej kolumny dnia, a parser
czytał wyłącznie godzinę z dni roboczych. Puste komórki stawały się `0`;
07:25, 14:40 i 19:55 zmieniały się w fałszywe odjazdy po północy.
`parseOfficialTimetableRows` czyta teraz każdą parę godzina/minuty osobno.
Rzeczywista północ jest zachowana; puste komórki i nagłówki są pomijane.

Źródło: https://zdmikp.bydgoszcz.pl/rozklady/paczka/0043/0043t014.htm.
Fixture `zdmikp-43-2003-timetable.html` zachowuje pobrany HTML i kodowanie.
`official-timetable-parser.test.ts` sprawdza pełną listę weekendową
05:40, 07:25, 14:40, 16:40, 19:55, 22:15 i dni robocze.
Daty reprezentatywne urzędowych typów dni odpowiadają teraz kategorii
w czasie Polski, zamiast oznaczać wszystkie kolumny dzisiejszą datą UTC.
To nie rozstrzyga jeszcze świąt ani zgodności wszystkich paczek GTFS.

Wdrożenie lokalne: `before-deploy-20261004T151435Z-3788252`; wymagane kontrole
przeszły (399 testów backendu, konfiguracja, build backendu i frontendu).
Rzeczywiste API po wdrożeniu oddaje wszystkie sześć poprawnych godzin
weekendowych i odtwarza kursy 07:25, 14:40 i 19:55 po 13 przystanków.
Chromium na rzeczywistym API przy 1440 i 390 px potwierdził sześć godzin
niedzielnych, przebieg 07:25 z 13 przystankami i powrót do rozkładu.

Zmiany wyszukiwarki dotyczą v2 (Vite beta), bez podmiany frontendów produkcji.
Lista używa semantyki combobox/listbox/options, wskazuje aktywny wynik przez
`aria-activedescendant` i zachowuje fokus pola podczas wyboru kliknięciem.
Wyniki są obliczane ponownie po zmianie tekstu/danych, nie przy każdym ruchu
strzałkami. Nie potwierdza to jeszcze dostępności wszystkich paneli aplikacji.

Po zmianie wyszukiwarki przeszły build v2, `test:search`, `test:line`
i cały `test:map`. Kontrola rzeczywistych danych przy 390 px:
`zlawies` pokazuje ID 2002/2003, kody 13337/13338, linie 43/132
oraz różne kierunki; dotyk drugiego wyniku otwiera tablicę 2003.
Lista ma szerokość/scrollWidth 318 px i mieści się w ekranie.
