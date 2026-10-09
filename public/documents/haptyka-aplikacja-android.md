# Wibracje w aplikacji — co ma zrobić programista Androida

Ekran połączeń (`/<miasto>/app/wk`, plik `templates/app-wk.html`) mówi już aplikacji,
KIEDY telefon ma zawibrować i JAK MOCNO. Strona sama nie wibruje — z WebView nie da się
tego zrobić porządnie, a `navigator.vibrate` to jeden, tępy silniczek bez odcieni.
Do wykonania zostaje strona natywna: jedna metoda w mostku i mapowanie pięciu rodzajów
na efekty Androida.

## Umowa

Strona woła **opcjonalną** metodę istniejącego mostka:

```js
window.AndroidLogin.haptic("tick");   // "tick" | "tick-slaby" | "klik" | "sukces" | "blad"
```

Metoda jest opcjonalna w obie strony:

- strona sprawdza `typeof AndroidLogin.haptic === "function"` i bez niej schodzi na
  `navigator.vibrate` — starsze wersje aplikacji nie wybuchną,
- aplikacja może zignorować nieznany rodzaj (patrz „Nieznane rodzaje" niżej).

Argument to zwykły `String` — `@JavascriptInterface` przyjmuje wyłącznie typy proste.
Zwracana wartość nie jest czytana; metoda ma być `void` i nigdy nie rzucać.

## Pięć rodzajów i nic więcej

Cała umowa polega na tym, że jeden rodzaj znaczy **zawsze to samo**, niezależnie od
ekranu. Nowy rodzaj = nowa umowa po obu stronach, więc dokładamy je tylko wtedy, gdy
naprawdę nie da się inaczej.

| rodzaj | znaczenie | Android (API 29+) | zapasowo (< 29) |
| --- | --- | --- | --- |
| `tick` | wybór z listy, kafel ulubionych, zamiana Skąd/Dokąd, usunięcie z „Ostatnich" | `VibrationEffect.EFFECT_TICK` | `createOneShot(10, 60)` |
| `tick-slaby` | adres pod pinezką się zmienił (mapa jedzie pod palcem) | `PRIMITIVE_TICK` ze skalą `0.4`, a bez kompozycji `EFFECT_TICK` | `createOneShot(5, 40)` |
| `klik` | chwycenie pinezki, „Szukaj połączeń", „Wybierz to miejsce" | `VibrationEffect.EFFECT_CLICK` | `createOneShot(20, 128)` |
| `sukces` | znaleziono połączenia, zapisano miejsce | `EFFECT_DOUBLE_CLICK` | `createWaveform([0,18,60,18], -1)` |
| `blad` | brak połączeń, brak GPS-a, brak sieci | `createWaveform([0,30,90,30], -1)` | to samo |

`blad` celowo NIE jest `EFFECT_HEAVY_CLICK` — ma być rozpoznawalny bez patrzenia na ekran,
a jedno mocne szarpnięcie myli się z potwierdzeniem. Dwa dłuższe impulsy z wyraźną przerwą
czyta ręka jednoznacznie.

## Kod

Metoda dokłada się do tego samego obiektu, który już wystawiasz jako `AndroidLogin`
(tam, gdzie `syncFavorites`, `startBusTracking`, `onPanelChanged`).

```kotlin
class BUSearchBridge(
    private val activity: Activity,
    private val webView: WebView,
) {
    private val vibrator: Vibrator? by lazy {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val mgr = activity.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
            mgr?.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            activity.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
        }?.takeIf { it.hasVibrator() }
    }

    private var ostatniaMs = 0L

    @JavascriptInterface
    fun haptic(rodzaj: String) {
        // UWAGA: to leci na wątku "JavaBridge", nie na głównym. Nic z UI tutaj.
        val v = vibrator ?: return
        if (!haptykaWlaczona()) return

        // Dławik. Strona już dławi u siebie, ale wersji strony nie kontrolujesz —
        // ta linijka jest tym, co chroni baterię, gdy jutro ktoś doda pętlę.
        val minOdstep = if (rodzaj == "tick-slaby") 150L else 120L
        val teraz = SystemClock.uptimeMillis()
        if (teraz - ostatniaMs < minOdstep) return
        ostatniaMs = teraz

        val efekt = efektDla(rodzaj) ?: return   // nieznany rodzaj = cisza, nie wyjątek
        runCatching { v.vibrate(efekt, ATRYBUTY) }
    }

    private fun efektDla(rodzaj: String): VibrationEffect? {
        val q = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q
        return when (rodzaj) {
            "tick" ->
                if (q) VibrationEffect.createPredefined(VibrationEffect.EFFECT_TICK)
                else VibrationEffect.createOneShot(10, 60)

            "tick-slaby" -> slabyTick()

            "klik" ->
                if (q) VibrationEffect.createPredefined(VibrationEffect.EFFECT_CLICK)
                else VibrationEffect.createOneShot(20, 128)

            "sukces" ->
                if (q) VibrationEffect.createPredefined(VibrationEffect.EFFECT_DOUBLE_CLICK)
                else VibrationEffect.createWaveform(longArrayOf(0, 18, 60, 18), -1)

            "blad" -> VibrationEffect.createWaveform(longArrayOf(0, 30, 90, 30), -1)

            else -> null
        }
    }

    // Najsłabsze, co telefon potrafi. Kompozycje (API 30+) pozwalają zejść ze skalą
    // poniżej EFFECT_TICK — bez nich adres skaczący pod pinezką łomocze w rękę.
    private fun slabyTick(): VibrationEffect {
        val v = vibrator
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R && v != null &&
            v.areAllPrimitivesSupported(VibrationEffect.Composition.PRIMITIVE_TICK)
        ) {
            return VibrationEffect.startComposition()
                .addPrimitive(VibrationEffect.Composition.PRIMITIVE_TICK, 0.4f)
                .compose()
        }
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q)
            VibrationEffect.createPredefined(VibrationEffect.EFFECT_TICK)
        else VibrationEffect.createOneShot(5, 40)
    }

    private companion object {
        // USAGE_TOUCH, a nie USAGE_ALARM/NOTIFICATION — system sam wycisza to razem
        // z resztą haptyki dotykowej i nie przebija trybu „nie przeszkadzać".
        val ATRYBUTY: VibrationAttributes =
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU)
                VibrationAttributes.createForUsage(VibrationAttributes.USAGE_TOUCH)
            else VibrationAttributes.Builder().build()
    }
}
```

Rejestracja mostka bez zmian:

```kotlin
webView.addJavascriptInterface(BUSearchBridge(this, webView), "AndroidLogin")
```

W `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.VIBRATE" />
```

To uprawnienie jest „normalne" — nie wymaga pytania użytkownika w czasie działania.

## Systemowe „wyłącz haptykę" trzeba uszanować ręcznie

`Vibrator.vibrate()` **nie** patrzy na przełącznik „Wibracja przy dotknięciu" w
ustawieniach systemu (patrzy na niego tylko `View.performHapticFeedback`). Skoro to jest
haptyka dotykowa, użytkownik, który ją wyłączył, ma jej u nas też nie dostać:

```kotlin
private fun haptykaWlaczona(): Boolean =
    Settings.System.getInt(
        activity.contentResolver,
        Settings.System.HAPTIC_FEEDBACK_ENABLED,
        1,
    ) == 1
```

Alternatywa: wołać `webView.performHapticFeedback(HapticFeedbackConstants.…)` na głównym
wątku — wtedy system sam pilnuje ustawienia, ale masz do dyspozycji tylko
`CLOCK_TICK` / `CONTEXT_CLICK` / `CONFIRM` / `REJECT` (te dwa ostatnie od API 30), bez
własnych wzorców. Dobre dla `tick`, za ubogie dla `sukces` i `blad`. Jeśli pójdziesz tą
drogą, pamiętaj o `activity.runOnUiThread { … }` — metoda mostka leci z wątku JavaBridge.

Czego nie robić: `HapticFeedbackConstants.FLAG_IGNORE_GLOBAL_SETTING`. To jest jawne
„wiem lepiej niż ustawienia użytkownika" i pierwsza rzecz, za którą lecą jedynki w sklepie.

## Nie wibruj, gdy nikt nie patrzy

Ekran w tle albo wygaszony nie ma prawa wibrować — wystarczy warunek na stan cyklu życia:

```kotlin
if (!activity.lifecycle.currentState.isAtLeast(Lifecycle.State.RESUMED)) return
```

Bez tego zapytanie wysłane tuż przed zablokowaniem telefonu wraca po chwili i telefon
brzęczy w kieszeni.

## Nieznane rodzaje

Strona wdraża się kilka razy w tygodniu, aplikacja rzadziej. Jeśli kiedyś dojdzie szósty
rodzaj, stara aplikacja dostanie napis, którego nie zna — ma go **przemilczeć**, nigdy nie
rzucić wyjątkiem i nie podstawiać „czegokolwiek podobnego" (fałszywy sygnał jest gorszy
niż jego brak). Odwrotnie też: nowa aplikacja przy starej stronie po prostu nie dostanie
części wywołań.

## Co gdzie wibruje — stan na dziś

Wszystko poniżej jest **już w kodzie** ekranu `/<miasto>/app/wk` (22 miejsca). Nie ma tu
nic „zaplanowanego": jeśli obsłużysz pięć rodzajów, obsłużysz całą listę.

Wyszukiwanie:

| zdarzenie | rodzaj |
| --- | --- |
| wybór podpowiedzi (przystanek, adres, „Moja lokalizacja") | `tick` |
| stuknięcie w wiersz „Ostatnie" | `tick` |
| usunięcie z „Ostatnich" (krzyżyk) | `tick` |
| przełączenie „Teraz" / godzina | `tick` |
| zamiana Skąd ↔ Dokąd | `tick` |
| „Szukaj połączeń" | `klik` |
| znaleziono połączenia | `sukces` |
| brak połączeń na tę godzinę | `blad` |
| błąd serwera lub brak sieci | `blad` |
| nie udało się ustalić położenia | `blad` |

Zapisane miejsca (Dom / Praca / Uczelnia / Inne — kafle nad chipami):

| zdarzenie | rodzaj |
| --- | --- |
| stuknięcie kafla zapisanego miejsca | `tick` |
| usunięcie kafla (krzyżyk) | `tick` |
| „Dodaj miejsce" (otwiera arkusz) | `tick` |
| wybór typu w arkuszu „Zapisz miejsce jako" | `tick` |
| zapisano miejsce | `sukces` |

Wybór punktu na mapie (pinezka na środku ekranu):

| zdarzenie | rodzaj |
| --- | --- |
| wejście w „Wybierz na mapie" | `klik` |
| adres pod pinezką się zmienił | `tick-slaby` (maks. co 150 ms) |
| „Wybierz to miejsce" / „Zapisz to miejsce" | `klik` |

Podgląd trasy (najpierw przebieg, mapa po stuknięciu):

| zdarzenie | rodzaj |
| --- | --- |
| otwarcie połączenia z listy wyników | `tick` |
| „Zobacz na mapie" (przejście na pełną mapę) | `klik` |
| „Pokaż przebieg" (powrót z mapy do osi czasu) | `tick` |

Zasada, według której to powstało: **wibruje wybór, potwierdzenie i błąd**. Nawigacja
między ekranami, przewijanie i wpisywanie tekstu nie wibrują nigdy. Dlatego przejście
NA mapę dostaje `klik` (zmiana trybu pracy ekranu, mocniejszy sygnał), a powrót do
przebiegu tylko `tick` — wracasz tam, gdzie już byłeś.

Ta sama lista, w formie maszynowej, wychodzi z `GET /api/app` (pole `haptyka`) — jeśli
wolisz sprawdzić kontrakt z aplikacji zamiast czytać dokument.

## Jak to sprawdzić

Bez aplikacji, w przeglądarce na komputerze — strona rozgłasza każde wywołanie jako
zdarzenie DOM:

```js
addEventListener("busearch:haptyka", (e) => console.log(e.detail.rodzaj));
```

W WebView aplikacji, bez klikania po ekranie:

```js
BUSearchWKHaptyka("sukces");   // wywoła mostek dokładnie tak jak prawdziwe zdarzenie
```

Emulator nie wibruje — do odbioru trzeba telefonu. Warto przejść całą listę z tabeli wyżej
na jednym urządzeniu pod rząd: rodzaje mają się od siebie **odróżniać w ręce**, a nie
tylko w kodzie. Jeśli `tick` i `klik` czuć tak samo, podbij amplitudę `klik`-a — lepiej
mieć trzy wyraźne poziomy niż pięć nierozróżnialnych.

Awaryjny wyłącznik po stronie strony (gdyby trzeba było coś szybko wyciszyć bez wydania
aplikacji): `localStorage.setItem("busearch_haptyka", "0")` w WebView.
