# Jak działają przystanki i pozycje pojazdów na mapie

Notatka referencyjna — jak dane o przystankach trafiają na mapę, jak liczona jest pozycja
pojazdu względem trasy i skąd bierze się czas do najbliższego przystanku. Na końcu:
otwarty, obserwowany problem z niepoprawnym "następnym przystankiem".

## 1. Skąd biorą się przystanki

- `GET /api/stops` (server.ts) zwraca wszystkie przystanki: `{id, nazwa, lat, lon, lines[], tram}`.
- Dane budowane są z GTFS + rozkładów linii (`getStopsAllCached`), cache'owane po stronie serwera.
- Klient (`ensureStopsData()` w index.html) pobiera tę listę raz i trzyma w `stopsData`.

## 2. Jak przystanek trafia na mapę

- Warstwa przystanków (`stopsCluster`) to `L.markerClusterGroup` (nie zwykła `L.layerGroup`) —
  blisko leżące przystanki grupują się w fioletową "bombkę" z licznikiem.
- `disableClusteringAtZoom: 17`, `maxClusterRadius: 30` — od zoomu 17 przystanki są zawsze
  pojedyncze i klikalne.
- Przystanki w ogóle pokazują się dopiero od zoomu **16** (`renderStops()`, `zoom >= 16`) —
  zamierzone, żeby nie zaśmiecać widoku miasta.
- Kliknięcie pojedynczego przystanku → `openStopPanelForStop(id, nazwa)` → `GET
  /api/stop/:id/departures` → panel z realnymi odjazdami z tablicy LCD (bez lokalnych
  wyliczeń, dane 1:1 z API).

## 3. Jak liczona jest pozycja pojazdu na trasie ("along")

Każda trasa (`trayecto`) ma listę punktów polilinii. `buildRouteProjectionMeta()` zamienia to
w model: dla dowolnego punktu (lat/lon) potrafi wyliczyć **`along`** — dystans w metrach od
początku trasy do najbliższego rzutu tego punktu na polilinię (`projectPointToRoute()`).

Używane do dwóch rzeczy:
- pozycja pojazdu → `vehicleAlong`,
- pozycja każdego przystanku na trasie → `stop.along`.

**Znane ograniczenie:** rzutowanie szuka *najbliższego segmentu w całej trasie*, nie
najbliższego "po kolejności przystanków". Jeśli trasa zawraca blisko siebie (pętla,
ulica w dwie strony), punkt może się rzutować na segment "nie ten", przez co `along` dla
kolejnych przystanków nie zawsze rośnie idealnie monotonicznie z ich kolejnością w rozkładzie.
To źródło większości dziwnych zachowań opisanych niżej.

## 4. Jak liczone jest ETA do przystanku po kliknięciu autobusu

Endpoint: `GET /api/vehicle/:id/etas` (server.ts, ok. linia 6221).

1. Znajdź pojazd (`/api/vehicles`), jego linię i wybraną trasę (`trayecto`).
2. Zrzutuj wszystkie przystanki trasy na `along` (p. wyżej).
3. `vehicleAlong` = `vehicle.route_progress`, jeśli jest dostępny (preferowane — już
   wyliczony przez pipeline pozycji), inaczej świeże rzutowanie GPS.
4. Pobierz równolegle żywe dane z tablic LCD (`GetLCDEntries`) dla **każdego** przystanku na
   trasie, dopasuj do tej linii+kierunku (`depMatches`) — **upstream nie ma ID konkretnego
   kursu**, tylko linię i cel, więc przy 2+ autobusach na tej samej linii można trafić czas
   *innego* kursu.
5. **Wybór "następnego przystanku" (`nextStopIdx`)**:
   - baza: geometria — pierwszy przystanek z `along >= vehicleAlong - 50m` (fallback: najbliższy
     "do przodu" po prostej odległości, gdy projekcja się nie uda),
   - jeśli pojazd ma `live_anchor_stop_id` (potwierdzony wcześniej przez pipeline pozycji na
     podstawie dopasowania do LCD) — **nadpisuje geometrię TYLKO gdy jest jej wiarygodnym
     doprecyzowaniem**: różnica indeksu ≤4 przystanki ORAZ różnica `along` ≤1200 m względem
     geometrycznego wyboru. Poza tym oknem — czyli gdy anchor wskazuje kompletnie inną część
     trasy — jest ignorowany i zostaje wynik geometrii. To bezpośrednia poprawka na H1 niżej
     (anchor dopasowany do kursu *innego* pojazdu na tej samej linii nie może już przeskoczyć
     wyboru na przystanek oddalony o kilkanaście stacji).
6. **Sanity-check danych live** (dodane w tej sesji, bo bez tego potrafiło pokazać np. "21 min"
   do przystanku obok którego pojazd realnie stoi):
   - jeśli pojazd jest geometrycznie tuż przy najbliższym przystanku (<150 m), a "żywy" czas
     mówi >4 min — odrzucamy tę wartość (prawdopodobnie należy do innego kursu),
   - czas przyjazdu na kolejnych przystankach **nie może maleć** wzdłuż trasy — jeśli maleje,
     ta wartość jest odrzucana i dociągana interpolacją (dystans/prędkość) zamiast surowego
     (błędnego) odczytu z LCD.
7. Dla przystanków bez bezpośrednich danych live — interpolacja: dystans po trasie od
   najbliższego "zakotwiczonego" przystanku / szacowana prędkość (na podstawie `predkosc`
   pojazdu, domyślnie ~20 km/h jeśli pojazd zgłasza 0).

## 5. Skąd bierze się `predkosc` (prędkość)

Obecnie **wszystkie** aktywne pojazdy (`GTFS-...`) to pozycje wyliczane z rozkładu i
potwierdzane żywymi tablicami LCD (`calc_source: "its_bydgoszcz_live_priority"") — surowy GPS
ze speedometru nie jest teraz dostępny. Prędkość jest więc **wyliczana** z tempa realnego
przesuwania się `route_progress` między kolejnymi odczytami (`vehicleSpeedTrackByKey` w
server.ts), nie odczytywana wprost z urządzenia.

## 6. Problem z mylącym "następnym przystankiem" — [ZAADRESOWANY]

**Zgłoszenie:** autobus 89 (Linia 89, Tatrzańskie-Błonie), panel pokazywał "Następny
przystanek: Dworzec - Politechnika ~31 min", mimo że pojazd na mapie wizualnie stał tuż przy
dwóch przystankach w tym rejonie (Dworzec-Politechnika / Fordońska-Traktorzystów).

**Diagnoza (H1 potwierdzona jako najbardziej prawdopodobna):** `live_anchor_stop_id` — sygnał
uznawany dotąd za "bardziej wiarygodny niż geometria" — może pochodzić z dopasowania do
odczytu LCD *innego* pojazdu na tej samej linii (upstream nie ma ID konkretnego kursu, patrz
punkt 4.4). Skoro nadpisywał geometrię bezwarunkowo, mógł przerzucić "następny przystanek" na
zupełnie inną część trasy — dokładnie ten obraz.

**Poprawka (server.ts, sekcja 9b w `/api/vehicle/:id/etas`):** anchor nadpisuje geometryczny
wybór wyłącznie gdy jest jej wiarygodnym doprecyzowaniem — różnica indeksu ≤4 przystanki ORAZ
różnica `along` ≤1200 m. Poza tym oknem anchor jest ignorowany, zostaje wynik geometrii.

**Weryfikacja:** sprawdzone programowo na wszystkich aktywnych pojazdach (59/59) — dla
każdego dystans do wybranego "następnego przystanku" jest teraz zgodny z geometrycznie
najbliższym nieminiętym przystankiem (0 podejrzanych przypadków, próg: >3× dystans
najbliższego LUB >400 m różnicy). Wcześniej ten sam test nie był jeszcze uruchamiany na tym
konkretnym wystąpieniu, więc nie mamy dowodu "przed/po" dla dokładnie tego autobusu — ale
mechanizm, który to umożliwiał, jest teraz zablokowany strukturalnie, nie tylko załatany
punktowo.

**Pozostałe, mniejsze niedoskonałości:** przy przystankach bardzo blisko "teraz" (0-3 min)
zdarzają się nadal drobne (1-2 min) niemonotoniczne wahania w kilku procentach przypadków —
efekt tej samej niejednoznaczności upstream (brak ID kursu), zbyt drobny żeby dawał
"awaryjne" wrażenie jak w zgłoszeniu, więc pozostawiony bez dalszej ingerencji.

## 7. Drugi problem: ETA "cofające się w czasie" mimo dobrego next-stopu — [ZAADRESOWANY]

**Zgłoszenie (2026-07-22):** użytkownik zgłosił dwie rzeczy: (1) autobus "jedzie za szybko" —
wygląda, jakby docierał do przystanku dużo wcześniej niż wynikało z wcześniej pokazanego ETA,
(2) czasy na kolejnych przystankach "gadają głupoty".

**Diagnoza:** zweryfikowana programowo na 131-141 aktywnych pojazdach naraz (fetch
`/api/vehicle/:id/etas` dla każdego, sprawdzenie czy sekwencja ETA dla nieminiętych
przystanków rośnie monotonicznie). Przed poprawką: **28 z ~131** pojazdów miało spadki, część
drastyczne — np. linia 89 (ten sam kurs Tatrzańskie-Błonie co w punkcie 6): `..., 25, 27, 29,
31, 33, 35, 37, 38, 18, 20, ...` (spadek o 20 min), linia 69: podobne spadki 15-20 min.

**Przyczyna:** sanity-check z punktu 6.6 (`sanitizedLcd`, sekcja 9c w kodzie) porównywał każdą
żywą wartość z LCD tylko z **poprzednią żywą wartością** (`runningMax`) — pomijał przystanki
bez własnych danych live (typowe, bo LCD nie ma danych na każdym przystanku). Skutek: gdy
interpolacja między dwoma "zakotwiczonymi" przystankami wspinała się do np. 29 min, a kolejny
przystanek miał WŁASNE dane live pokazujące np. 11 min — 11 > ostatniej faktycznej wartości
live (powiedzmy 6 min sprzed kilku przystanków), więc przechodziło sanity-check, mimo że było
bez sensu na tle interpolowanej trajektorii. Ta "żywa" wartość niemal zawsze należy do innego
kursu tej samej linii (upstream nie ma ID kursu — patrz punkt 4.4/6).

**Poprawka (server.ts, sekcja 9c w `/api/vehicle/:id/etas`):** sanity-check porównuje teraz
każdą kandydującą wartość live z **interpolowanym dołnym progiem** liczonym od ostatniego
zaakceptowanego zakotwiczenia (ten sam wzór dystans/prędkość co przy interpolacji w sekcji 10),
z tolerancją 2 min na drobny jitter blisko "teraz". Odrzucona wartość spada do interpolacji —
tak jak wcześniej.

**Weryfikacja:** ten sam pojazd linii 89 po poprawce: `..., 20, 23, 24, 25, 27, 29, 32, 33, 37,
39, ...` — czysto rosnąco, zero spadków. W skali floty: 28 → 16 pojazdów z jakimkolwiek
spadkiem, a wśród pozostałych 16 niemal wszystkie to pojedyncze spadki 2-4 min blisko "teraz"
(ten sam rodzaj drobnego jittera co w punkcie 6, celowo tolerowany).

**Nowo odkryte, osobne ograniczenie — linie okrężne (np. 98, 97):** te linie mają PRAWDZIWIE
zapętloną trasę — np. linia 98 ma 41 przystanków w rozkładzie, z czego tylko 22 unikalne (19
przystanków odwiedzanych dwukrotnie). Tu "along" nie jest niejednoznacznością do naprawienia
sanity-checkiem — to fundamentalne ograniczenie pojedynczej osi "along" (punkt 3): przy
faktycznym zapętleniu trasy nie da się jednoznacznie rozstrzygnąć "które przejście" danego
przystanku jest tym najbliższym, więc ETA tam nadal potrafi drastycznie oscylować. Nie
tknięte w tej sesji — wymagałoby osobnego podejścia (np. rozbicie trasy na segmenty pętli
zamiast jednej ciągłej osi dystansu), nie samej korekty sanity-checka.

## 8. Trzeci problem: pojazd "siedzi na pętli" mimo że tablica LCD pokazuje ETA — [ZAADRESOWANY]

**Zgłoszenie (2026-07-22, ten sam dzień):** użytkownik pokazał zrzut ekranu — panel odjazdów
przystanku "Łochowice - Nakielska - Kanałowa" pokazywał linię 90 za "2 min", ale pojazd na
mapie widniał jako stojący dokładnie przy pętli na końcu trasy ("Zajęcza (pętla)"), a nie 2 min
od tego przystanku.

**Diagnoza:** to NIE ten sam mechanizm co punkt 7 (tam chodziło o wewnętrzną spójność listy ETA
w panelu pojazdu; tu chodzi o to, że pozycja pojazdu na mapie w ogóle nigdy nie zostaje
potwierdzona żywymi danymi). Sprawdzone programowo: pojazd `GTFS-90-705475` (`cel: "Łochowice/
Zajęcza"`) miał `calc_source: "gtfs_fallback"`, `calc_confidence: 0.3` — czyli pozycja czysto z
rozkładu, NIGDY nie potwierdzona przez `refineGtfsVehicleByLiveStops` (patrz punkt 4). Test na
całej flocie: **wszystkie pojazdy (5/5)**, których `cel` zawiera ukośnik ("Łochowice/Zajęcza",
"Brzoza/Okrężna", "Smol./Pińczowska", "Żołędowo/August.") utknęły na `gtfs_fallback` — vs tylko
~11% (15/135) wśród pozostałych.

**Przyczyna:** dopasowanie kierunku (`liveDepartureMatchesVehicle` i 4 analogiczne miejsca w
server.ts) porównywało pełny, znormalizowany tekst celu pojazdu (`"lochowice/zajecza"`) z pełnym
tekstem celu z tablicy LCD (`"lochowice - nakielska - zajecza (petla)"`) metodą "czy jeden
zawiera drugi". Wstawiony środkowy segment ("Nakielska") i inny separator (`/` vs ` - `)
gwarantują, że to nigdy nie pasuje — mimo że oba opisują dokładnie ten sam przystanek
docelowy. Skutek: te pojazdy nigdy nie mogły zostać potwierdzone żywymi danymi, więc ich
pozycja na mapie to zawsze czysty, niepotwierdzony rozkład — co przy realnym opóźnieniu daje
dokładnie efekt "pojazd wygląda jakby był gdzie indziej niż mówi ETA".

**Poprawka (server.ts):** nowa funkcja `destTailsLooselyMatch()` — zamiast porównywać całe
teksty, wyciąga z obu stron tylko OSTATNI segment (po rozbiciu na `-`/`-`/`—`/`/`) i porównuje
te fragmenty. Dodana jako dodatkowy warunek (OR) w 5 miejscach, które robiły to porównanie:
`liveDepartureMatchesVehicle`, `chooseBestTrayectoForVehicle` (scoring trayecto), scan
potwierdzający w generowaniu `gtfs_fallback`, `depMatches` w `/api/vehicle/:id/etas`, dopasowanie
GTFS headsign przy liczeniu opóźnienia.

**Weryfikacja:** po poprawce, z 5 pojazdów z ukośnikiem w `cel`, **4 przeskoczyły na
`its_bydgoszcz_live_priority`** z wysoką pewnością (0.95-0.99): obie linia 90, linia 91, linia
92. Pozostałe 2 (linia 43 "Zławieś Wlk. / UG", linia 76 "Smol./Pińczowska") wciąż
`gtfs_fallback` — prawdopodobnie brak jakichkolwiek żywych danych LCD w oknie skanowania w
danym momencie (nie problem dopasowania tekstu), albo inny format skrótu niepokryty przez
"ostatni segment" (np. skrót urzędowy typu "UG"). Nie badane dalej w tej sesji.

## 9. Czwarty problem: "aktualny przystanek" kilka przystanków za rzeczywistością — [ZAADRESOWANY]

**Zgłoszenie (2026-07-22, ten sam dzień):** zrzut ekranu linii 62 — panel pokazywał "Aktualny
przystanek: Wilczak", ale pojazd na mapie stał wyraźnie dalej na trasie; użytkownik ocenił to
na ok. 2 przystanki różnicy i zasugerował "niech szuka aktualnego przystanku z lokalizacji".

**Diagnoza:** sprawdzone na żywym pojeździe (`GTFS-62-710614`). Surowe dane z `/api/vehicles`
pokazywały `calc_source: its_bydgoszcz_live_priority`, `calc_confidence: 0.99`,
`live_anchor_stop_id: 402` ("Nakielska - Żywiecka") — czyli pipeline pozycji MIAŁ świeże, pewne
potwierdzenie z żywej tablicy. Ale panel (`/api/vehicle/:id/etas`) pokazywał "Wilczak" — 4
przystanki wcześniej niż potwierdzony anchor. Przyczyna: `vehicleAlong` w endpointzie `/etas`
bierze `vehicle.route_progress` — wartość liczoną przez tę samą syntezę rozkład+anchor, która
dla pojazdów bez realnego GPS potrafi się cofać/opóźniać między cyklami odpytywania (co innego
niż ciągły GPS). Skoro geometryczny wybór "następnego przystanku" opiera się na tej właśnie
wartości, sam też zostaje w tyle — a wtedy okno zaufania do anchor (punkt 6, ≤4 przystanki/
≤1200 m różnicy geometrii) odrzucało NAWET pewny (0.99) anchor, bo różnica względem
(nieprawidłowej) geometrii wypadała poza oknem.

**Poprawka (server.ts, sekcja 9b w `/api/vehicle/:id/etas`):** okno zaufania do anchor skaluje
się teraz z `calc_confidence` pojazdu (te same progi 0.95/0.99 co przy nadawaniu pewności w
`refineGtfsVehicleByLiveStops`, patrz punkt 4): przy pewności ≥0.95 ("teraz" lub "≤1 min" z
żywej tablicy — mocny, świeży sygnał dla TEGO konkretnego pojazdu) okno rośnie z 4→12
przystanków i z 1200→4000 m. Przy niższej pewności (0.88, "≤3 min" — ryzykowniejszy przypadek,
częściej pasujący do INNEGO autobusu tej samej linii, patrz punkt 6) okno zostaje bez zmian.

**Weryfikacja:** próbka 6 aktualnie potwierdzonych (pewność ≥0.95) pojazdów — różnica między
zgłaszanym `nextIndex` a indeksem przystanku z anchor: `-1, 0, 0, 4, 1, -1` (5/6 w granicach
±1 przystanku, jeden przypadek nadal z różnicą 4 — prawdopodobnie odległość geometryczna między
tymi przystankami przekracza nowy limit 4000 m; nie douczone dalej w tej sesji).

## 10. Piąty problem, najpoważniejszy: dwa pojazdy potrafią ZAMIENIĆ SIĘ tożsamością — [ZAADRESOWANY]

**Zgłoszenie (2026-07-22, ten sam dzień):** linia 65 — użytkownik pokazał pojazd wyraźnie
daleko na trasie na mapie, ale panel pokazywał "Następny przystanek: Dworzec Leśne" (czyli
początek zupełnie INNEGO kierunku trasy), z komentarzem że to ten sam błąd co punkt 9 i prośbą
o "bardziej precyzyjną logikę".

**Diagnoza:** to NIE to samo co punkt 9 (tam chodziło o opóźnioną geometrię w obrębie
POPRAWNEGO kursu) — tu okazało się, że sam "kurs" pod daną, widoczną dla użytkownika nazwą
pojazdu (`nr_boczny`, np. `GTFS-65-704479`) potrafi się PRZEŁĄCZYĆ na zupełnie inny, fizycznie
odrębny przejazd między jednym cyklem odpytywania a następnym. Sprawdzone live, dwukrotnie w
odstępie ~10s: `GTFS-65-704405` (który powinien reprezentować `trip_id 6704405`) pokazywał
`trip_id 6704479` (cel "Łoskoń"), a `GTFS-65-704479` pokazywał `trip_id 6704405` (cel "Dworzec
Leśne") — **zamienione miejscami**, mimo że to dwa PRZECIWNE krańce tej samej linii. Chwilę
później to samo zaobserwowane między `GTFS-65-704437`/`GTFS-65-704461` ("Dworzec Leśne" vs
"Nad Wisłą").

**Przyczyna:** mechanizm "ciągłości tożsamości między cyklami" w `synthesizeVehiclesFromGtfs`
(server.ts) — ponieważ dopasowanie realnego autobusu do `tripId` jest z natury niejednoznaczne
cykl do cyklu (upstream nie ma stabilnego ID kursu), nowo dopasowany kandydat dziedziczy
`nr_boczny` najbliższego (≤500 m) pojazdu tej samej linii z POPRZEDNIEGO cyklu — żeby na mapie
nie znikał i nie pojawiał się jako "nowy" pojazd przy każdej drobnej zmianie dopasowania
`tripId`. Problem: dopasowanie było WYŁĄCZNIE po odległości, bez sprawdzania kierunku/celu. Gdy
dwa RÓŻNE, fizycznie odrębne autobusy tej samej linii (jadące w przeciwne strony) mijają się
lub są blisko wspólnego przystanku, "najbliższy poprzedni pojazd" dla każdego z nich to ten
DRUGI — więc zamieniają się widocznymi tożsamościami. Z perspektywy użytkownika: ta sama
"kropka" na mapie nagle zaczyna opisywać zupełnie inny przejazd.

**Poprawka (server.ts, `synthesizeVehiclesFromGtfs`):** dopasowanie "poprzedniego pojazdu do
przejęcia ID" wymaga teraz DODATKOWO, żeby cel (`cel`/headsign) był zgodny (ta sama logika
`normalizeLooseKey`/`destTailsLooselyMatch` co w punktach 7-8) — sama bliskość geograficzna już
nie wystarcza. Dwa autobusy jadące w przeciwne strony (różne `cel`) nigdy już nie przejmą
nawzajem swoich ID, niezależnie jak blisko siebie się znajdą.

**Weryfikacja:** 3 próbki linii 65 w odstępach ~12s po poprawce — wszystkie pojazdy (3/3) miały
`nr_boczny` zgodny z własnym `trip_id` i stabilny, poprawnie rozróżniony kierunek ("Nad Wisłą",
"Dworzec Leśne", "Łoskoń") we wszystkich trzech próbkach, zero zamian. Rozmiar floty i rozkład
`calc_source` po zmianie bez zaskoczeń (113 pojazdów, 94 potwierdzone / 19 wg rozkładu).

## 11. Szósty problem: "ghost" pojazd — nigdy niepotwierdzony kurs pokazywany jako spóźniony — [ZAADRESOWANY]

**Zgłoszenie (2026-07-22, ten sam dzień):** użytkownik pokazał `GTFS-90-705478` — panel pokazywał
"Następny przystanek: Łochowice - Nakielska - Zajęcza (pętla)", "Opóźniony 13 min", "teraz" —
ale zauważył, że wg rozkładu następny prawdziwy odjazd na tę pętlę powinien być za godzinę.

**Diagnoza:** `GTFS-90-705478` miał `calc_source: "gtfs_fallback"`, `calc_confidence: 0.3` —
pozycja nigdy niepotwierdzona żywymi danymi. Sprawdzone bezpośrednio na tablicy LCD dla
przystanków w okolicy (`/api/stop/:id/departures`) — **żaden** odjazd tej linii/kierunku nie był
bliżej niż ok. 55 min ("20:34"-"20:36", zero wpisów "X min"/"teraz"). Czyli "Opóźniony 13/14 min,
przyjazd teraz" było w 100% zmyślone z samej ekstrapolacji rozkładu, sprzeczne z tym, co realnie
pokazuje tablica.

**Przyczyna:** `synthesizeVehiclesFromGtfs` (server.ts) ma 20-minutowe "okno łaski" po
zaplanowanym końcu kursu dla linii kończących się na pętli (bo prawdziwy autobus czekający na
pętli na warstwę powrotną nie powinien znikać z mapy) — ale to okno działało RÓWNIEŻ dla kursów,
które nigdy nie zostały potwierdzone żadną żywą tablicą. Skutek: kurs, który w rzeczywistości
prawdopodobnie już dawno się zakończył (albo w ogóle się nie odbył), dalej był ekstrapolowany
przez do 20 minut po zaplanowanym zakończeniu, z rosnącym, zmyślonym "opóźnieniem".

**Poprawka (server.ts, `synthesizeVehiclesFromGtfs`):** 20-minutowe okno łaski na pętli nadal
trzyma kurs jako kandydata do skanu potwierdzającego, ale **nowy kurs zostaje faktycznie
wyemitowany na mapę po przekroczeniu normalnego 180s okna TYLKO jeśli w tym cyklu naprawdę
dostał żywe potwierdzenie** (`withinCoreGrace || confirmed`). Nigdy niepotwierdzony kurs, który
przeżywa wyłącznie dzięki wydłużonemu oknu pętli, jest teraz odrzucany — prawdziwy, potwierdzony
autobus czekający na pętli nadal zostaje widoczny bez zmian.

**Weryfikacja:** po poprawce `GTFS-90-705478` całkowicie zniknął z `/api/vehicles?lines=90` —
zostaje tylko drugi, realnie potwierdzony kurs tej linii (`GTFS-90-705498`, `calc_confidence:
0.99`). Flota ogółem: 91 pojazdów, 81 potwierdzonych / 10 wg rozkładu — bez skoku ani zapadnięcia
się liczby, logi czyste, CPU w normie.

## 12. Siódmy problem: "teraz" na przystanku, a autobusu przy nim nie ma — [ZAADRESOWANY]

**Zgłoszenie (2026-08-03):** panel przystanku pokazuje "teraz", ale na mapie w pobliżu nie ma
żadnego autobusu tej linii.

**Diagnoza:** to NIE był błąd w wyliczaniu ETA — panel odjazdów bierze dane 1:1 z tablicy LCD
(punkt 2), więc "teraz" było prawdziwe. Fałszywa była pozycja pojazdu. Zmierzone na
produkcji: **wszystkie 91 pojazdów** miało `calc_source: "gtfs_fallback"`, `calc_confidence:
0.3` — zero `its_bydgoszcz_live_priority`. Cała ścieżka potwierdzania pozycji żywymi tablicami
(punkt 4, `refineGtfsVehicleByLiveStops` + skan w `synthesizeVehiclesFromGtfs`) była martwa, więc
każdy pojazd na mapie stał tam, gdzie wypadał z samego rozkładu. Próbka 180 przystanków: 8
wpisów "teraz", a najbliższy autobus tej linii 4078 m / 4107 m / 2896 m / 1729 m dalej.

**Przyczyna:** podmiana paczki GTFS (`GTFS_URL` w docker-compose.yml) z oficjalnej ZDMiKP na
lustro mkuran.pl — zrobiona w lipcu 2026, bo oficjalna stoi z kalendarzem do 21.06.2026.
Lustro numeruje przystanki po swojemu (`"01002"`, `"11079"`), a numeracja ZDMiKP używana przez
`GetLCDEntries` to 1..2016 — zbiory rozłączne (zmierzone: 0/60 pokrycia). Kod podawał stop_id
z paczki wprost do LCD, a `Number("01002")` = 1002 wpada w zakres ZDMiKP, więc odpytywana była
tablica **zupełnie innego przystanku**. Do tego `live_anchor_stop_id` wracał jako numer GTFS i
nigdy nie trafiał w przystanki trasy w `/api/vehicle/:id/etas` (§9b). Trzy niezależne mechanizmy
padły naraz i po cichu — nic tego nie logowało, bo "brak wpisów na tablicy" to normalny stan.

**Poprawka (server.ts, `gtfsStopIdToCityStopIdMap`):** warstwa mapująca numer przystanku z
paczki na numer miasta, po nazwie i pozycji (ta sama nazwa ≤250 m, inaczej najbliższy ≤60 m),
budowana raz na 6 h z blokadą przed równoległym budowaniem. Podpięta w trzech miejscach: skan
potwierdzający w `synthesizeVehiclesFromGtfs`, `refineGtfsVehicleByLiveStops` oraz zapis
`live_anchor_stop_id`. Dla paczki o numeracji zgodnej z miastem dopasowanie jest tożsamościowe
(dystans ~0 m), więc podmiana źródła paczki nie może już po cichu zabić potwierdzania pozycji.

Osobno przywrócono `GTFS_URL` na oficjalną paczkę ZDMiKP — jej numery zgadzają się natywnie.
Koszt: rozkłady lecą z fallbacku "ta sama data o tym samym dniu tygodnia" (kalendarz kończy się
21.06.2026) i nie ma linii ZaT8.

**Weryfikacja:** przed wdrożeniem, porównanie na 144 kursach aktywnych w danej chwili i 1370
odpytanych tablicach: stara logika 0/144 potwierdzeń, z mapowaniem 97/144. Po wdrożeniu na
produkcji: 128 pojazdów, **109 `its_bydgoszcz_live_priority`** (79 z pewnością 0.99, 22 z 0.95)
/ 17 wg rozkładu, mapowanie 1167/1211 przystanków. Powtórzona próbka 180 przystanków: z 11
wpisów "teraz" **9 ma autobus w odległości 0-12 m** (wcześniej: kilometry). Dwa pozostałe to
kursy, których kierunek nie ma jeszcze potwierdzenia — ten sam rezydualny ~15%, co przed
podmianą paczki.
