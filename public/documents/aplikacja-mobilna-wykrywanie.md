# Jak serwis rozpoznaje aplikację mobilną

Strona busearch.pl jest tą samą stroną w przeglądarce i w WebView aplikacji na Androida.
Część rzeczy ma sens tylko w przeglądarce — przede wszystkim namawianie na instalację PWA,
bo użytkownik aplikacji nie ma już czego instalować.

## Co robi strona

Skrypt w `<head>` mapy (`templates/index.html`) ustala tryb PRZED wczytaniem stylów i
wystawia go w trzech miejscach:

| co | wartość |
| --- | --- |
| `window.__BUSEARCH_APP__` | `true` / `false` |
| `window.__BUSEARCH_APP_ZRODLO__` | `mostek` \| `useragent` \| `parametr` \| `pamiec` \| `przegladarka` |
| `<html data-app="…">` | `1` w aplikacji, `0` w przeglądarce |

Tropy, w kolejności sprawdzania:

1. **`mostek`** — istnieje obiekt `window.AndroidLogin` (WebView wstrzykuje go przed
   uruchomieniem naszego JS-u). Działa bez żadnych zmian w aplikacji.
2. **`useragent`** — User-Agent zawiera `BUSearchApp`. Zalecane, patrz niżej.
3. **`parametr`** — wejście z `?app=1`; zapamiętywane w `localStorage`, bo parametr ginie
   przy pierwszej nawigacji.
4. **`pamiec`** — `localStorage["busearch_tryb_aplikacji"] === "1"` z wcześniejszego wejścia.

## Co znika w trybie aplikacji

- pozycja **„Zainstaluj aplikację"** w menu bocznym (`#sideMenuInstall`),
- przycisk **„Dodaj"** na górnym pasku (`#installBtn`),
- dolny dymek o dodaniu do ekranu głównego (`#installToast`),
- strona `/webapp` — zamiast instrukcji instalacji pokazuje „Masz już aplikację BUSearch".

Chowanie robi CSS (`html[data-app="1"] { display: none !important }`), więc nic nie mruga
przed wyświetleniem strony.

## Co warto dołożyć po stronie aplikacji

Mostek `AndroidLogin` wystarcza, ale znika, gdy WebView otworzy podstronę bez wstrzykniętego
interfejsu albo gdy interfejs zostanie kiedyś przemianowany. Pewniejszy jest znacznik w
User-Agencie — jedna linijka przy konfiguracji WebView:

```kotlin
webView.settings.apply {
    javaScriptEnabled = true
    domStorageEnabled = true          // localStorage: ulubione, tryb aplikacji
    userAgentString = "$userAgentString BUSearchApp/1.0"
}
```

Znacznik **dokładamy** do domyślnego User-Agenta, nigdy nie podmieniamy całego — inaczej
serwis traci informację o wersji Androida i Chrome'a, a statystyki przestają się zgadzać.

Wersja po ukośniku jest dowolna, strona patrzy tylko na sam napis `BUSearchApp`.

## Jak sprawdzić, czy działa

1. Podłącz telefon i otwórz `chrome://inspect` w Chrome na komputerze → *inspect* przy
   WebView aplikacji.
2. Wklej do konsoli zawartość [`scripts/wykryj-aplikacje.js`](../scripts/wykryj-aplikacje.js).

Skrypt wypisze wielkim drukiem `UŻYTKOWNIK ŁĄCZY SIĘ Z APLIKACJI MOBILNEJ` albo
`… ZE ZWYKŁEJ PRZEGLĄDARKI`, tabelkę wszystkich tropów (który zadziałał, a który nie),
to co ogłasza sama strona i pełny User-Agent. Jeśli tropy mówią „aplikacja", a strona
tego nie ogłasza — w kontenerze siedzi stary obraz.

Bez telefonu: otwórz `busearch.pl/bydgoszcz/?app=1` w zwykłej przeglądarce — pozycja
„Zainstaluj aplikację" ma zniknąć z menu bocznego. Powrót do trybu przeglądarki:
`localStorage.removeItem("busearch_tryb_aplikacji")` i odświeżenie.

## Ulubione a widget

Osobna, ale pokrewna sprawa: każda zmiana ulubionych przystanków leci do aplikacji przez
`AndroidLogin.syncFavorites(json)` — patrz `setFavoriteStops()` w `templates/index.html`.
Format to `[{"id":"1541","name":"Nakielska - Pijarów"}]`, `id` jako **tekst**. Lista jest
per miasto (Bydgoszcz, Toruń, Trójmiasto… mają własne klucze w `localStorage`), więc widget
dostaje ulubione z miasta, które użytkownik ma akurat otwarte.
