# BUSearch frontend v2

React implementation of the BUSearch frontend. Run `bun run dev` and open
`http://localhost:1500/`. The Vite proxy uses the local API on port 47821.
`bun run build` checks TypeScript and builds the frontend.

## Parity with v1

Implemented routes: combined app landing page and city picker (`/`, `/miasta` and `/aplikacja`), city maps (`/<city>/`), announcements,
install instructions, API documentation, legal documents, testers page and
emergency pages. The map has the city-specific API and configuration, search,
filters, stops, lines, vehicle panels, journey planner, announcements and the
notification panel.

The Wiki keeps the existing v1 HTML and scripts on `https://busearch.pl`.
Links from v2 and direct `/<city>/wiki` requests in development and preview
open that origin so Google sign-in and its session cookie work. The app-specific pages (`/app/wk`, `/app/wiki`), the admin panel and
several advanced map behaviors have not yet reached v1 parity. Do not deploy v2
over the production frontend until those are ported and checked.

The beta page combines the application presentation and city picker. Production keeps serving v1 until the new frontend reaches parity.

## Filmy na stronie beta

Strony używają zoptymalizowanych nagrań `public/videos/*-web.mp4`: H.264 Main, YUV 4:2:0, 720 px
szerokości, 30 fps, bez dźwięku i z metadanymi na początku pliku (`faststart`).
W repozytorium zachowano wyłącznie zoptymalizowane wersje webowe, aby zminimalizować rozmiar kodu.

## Statystyki na stronie głównej

Sekcja „BUSearch w liczbach” korzysta z agregatów lokalnego Rybbit dla
`busearch.pl`. Pokazuje 30 pełnych dni w strefie `Europe/Warsaw`, datę
aktualizacji i definicje pomiarów. Nie publikuje identyfikatorów ani danych wizyt.
Odświeżenie: `python3 scripts/refresh-usage-stats.py` z katalogu `frontend-v2`,
a następnie `bun run build`. Skrypt wymaga dostępu do lokalnego kontenera
`rybbit-clickhouse` i wykonuje wyłącznie zapytania SELECT. To datowany zestaw
statystyk, nie licznik ruchu na żywo.

## Sprawdzanie mapy

`bun run test:map` uruchamia testy w Chromium przy działającym serwerze Vite.
Domyślnie używa `http://127.0.0.1:1500` i `/snap/bin/chromium`; można ustawić
`TEST_BASE_URL` i `CHROMIUM_PATH`. Testuje mobilne komunikaty, wyszukiwanie,
panele oraz pięć przycisków przystanku, wybór godziny, link do przystanku,
powrót po błędzie API i obsługę uchwytu klawiaturą. Zapisy powiadomień są
przechwytywane przez test — nie tworzy subskrypcji na serwerze.

Powiadomienia przystanku korzystają z istniejących endpointów API i wspólnego
identyfikatora klienta v1. Przeglądarka rejestruje `public/push-sw.js`, a aplikacja
Android korzysta z mostka `AndroidLogin`. Dostarczenie powiadomienia wymaga
zgody na urządzeniu i działającej konfiguracji Web Push/FCM w backendzie.

## Panel pojazdu

Panel zachowuje ciemną, nieprzezroczystą powierzchnię BUSearch. Pokazuje
przebieg kursu, godziny planowe i prognozowane, oznaczenie następnego
przystanku oraz śledzenie pojazdu. Zwinięty panel pokazuje dwa najbliższe
przystanki, a rozwinięty listę kolejnych. Wiki i udostępnianie są w nagłówku. Mapa wyróżnia trasę kolorem
linii i oznacza przystanki z odpowiedzi ETA fioletowymi pinezkami. Kliknięcie
pojazdu włącza śledzenie z zachowaniem przybliżenia. Plakietka zachowuje
wygląd wersji HTML, a znany numer taborowy pojawia się pod znacznikiem jako `#numer`.

`bun run test:vehicle` sprawdza panel na telefonie i komputerze z kontrolowanymi
odpowiedziami API (przewijanie, śledzenie, udostępnianie, rozwijanie klawiaturą
i wybór przystanku). Wymaga serwera Vite i Chromium jak `test:map`.

## Zgodność działania obu frontendów

Bieżący zakres i wyniki porównania: [dziennik zgodności](docs/frontend-parity.md).
Panel linii używa przystanków wybranego wariantu w kolejności z API, zachowuje
powtórzone przystanki na pętlach i zmienia przebieg na mapie razem z kierunkiem.
Nie zastępuje brakującego wariantu zbiorczą listą wszystkich przystanków linii.
Po błędzie pobierania można ponowić próbę. `bun run test:line` sprawdza oba
kierunki, kolejność, wybór słupka, zmianę linii i ponowienie w Chromium na
telefonie i komputerze. Wymaga serwera Vite jak pozostałe testy mapy.

## Rozkład przystanku

Kliknięcie przystanku na liście linii otwiera rozkład z istniejącego endpointu
`/api/line/<linia>/timetable`. Pokazuje kierunki, typy dni, wybraną datę,
legendę i okres ważności. Najbliższy odjazd wyznaczany jest według czasu
Europe/Warsaw, także gdy urządzenie jest w innej strefie. Dane nie są pobierane
z odjazdów na żywo; przycisk w nagłówku pozwala przejść do ich osobnego panelu.
Powrót zachowuje listę i kierunek linii. Wybór godziny otwiera przystanki i trasę konkretnego kursu, według wybranej
daty, kierunku i litery wariantu. Powrót zachowuje wybory rozkładu. API kursu
uwzględnia wyjątki kalendarza; zgodność samej tabeli godzin dla konkretnej daty
i numeracja GTFS/API pozostają do dalszej kontroli.

`bun run test:timetable` obejmuje kierunki i legendę, daty, czas Warszawy,
krańcówkę bez odjazdów, błędy i ponowienie, odjazdy na żywo oraz powrót.
Panel przystanku otwarty z pojazdu zachowuje trasę w tle, wstrzymuje śledzenie
na czas odjazdów i przywraca stan po zamknięciu. `test:vehicle` sprawdza także,
że kolejne odświeżenie pojazdu nie odciąga kamery od przystanku.

Wyszukiwarka obsługuje strzałki i Enter, Escape/Tab, polskie znaki wpisane
bez diakrytyków oraz kilka słów w dowolnej kolejności. Przy jednakowych
nazwach pokazuje ID, kod i kierunek słupka; dokładny numer linii i kod mają
pierwszeństwo. `bun run test:search` sprawdza te zachowania w Chromium
przy 1440 i 390 px, w tym dotyk, IME oraz wybór przeciwnych słupków.

## Wyszukiwarka połączeń

Przycisk „Połączenie” otwiera boczny panel na komputerze i pełny ekran na
telefonie. Wyszukiwarka korzysta z `/api/polaczenia`: wybór słupków i najbliższego
przystanku, zamiana kierunku, termin wyjazdu w czasie Polski, limit przesiadek,
czas na przesiadkę i tempo chodzenia. Wynik pokazuje godziny, linie i kolejne
odcinki podróży. Na telefonie „Pokaż trasę na mapie” zwija panel do podsumowania;
powrót zachowuje wybrane połączenie. Zmiana miasta otwiera jego planer.

`bun run test:planner` sprawdza te widoki i wyszukiwanie w Chromium przy 1440
i 390 px, także przy urządzeniu w innej strefie czasowej, błędzie API i pustych
wynikach. Test używa kontrolowanych odpowiedzi API i nie zapisuje danych.

`bun run test:planner:mobile` wykonuje 30 pełnych przebiegów: 10 rozmiarów
ekranów po trzy razy (strefy Warszawa, Los Angeles i Tokio). Chromium emuluje
mobilny ekran i dotyk. Test obejmuje też obrót z wybraną trasą, błędy sieci,
uszkodzoną odpowiedź API, anulowanie poprzedniego wyszukiwania i poprawne
ponowienie. Raport trafia do `/tmp/busearch-planner-mobile-audit`; katalog
można zmienić przez `PLANNER_REPORT_DIR`.

## Licencja

Projekt udostępniany na licencji [MIT](LICENSE).

