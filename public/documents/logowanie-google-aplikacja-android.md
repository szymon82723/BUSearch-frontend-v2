# Logowanie przez Google w aplikacji — co ma zrobić programista Androida

Ekrany `/<miasto>/app/wiki` (i wkrótce inne) mówią już, JAK wywołać logowanie natywne —
strona woła jedną metodę mostka i czeka na dwa możliwe wywołania zwrotne. Do wykonania
zostaje strona natywna: pokazanie natywnego wyboru konta Google i oddanie tokenu ID
z powrotem do WebView.

## Dlaczego natywnie, a nie przez przeglądarkę

Zwykłe logowanie webowe (`/auth/google?next=...` → `accounts.google.com` → powrót) działa
w zwykłej przeglądarce, ale w WebView aplikacji Google coraz częściej **blokuje** logowanie
przez wbudowaną przeglądarkę (polityka „disallowed_useragent"), więc w aplikacji trzeba
przeprowadzić wybór konta natywnie i przekazać już gotowy token — to jest dokładnie to,
co poniższy kontrakt robi.

## Umowa (już działa po stronie strony)

Strona, zanim spróbuje pokazać własny ekran logowania webowego, sprawdza DWA warunki
naraz — sam User-Agent dałoby się podrobić, a bez realnego mostka nie ma czego wywołać:

```js
function isBUSearchApp() {
  return (
    navigator.userAgent.indexOf("BUSearchApp") !== -1 &&
    !!(window.AndroidLogin && typeof window.AndroidLogin.triggerGoogleLogin === "function")
  );
}
```

Gdy oba są spełnione, strona woła:

```js
window.AndroidLogin.triggerGoogleLogin();
```

**Metoda dokłada się do tego samego obiektu, który już wystawiasz jako `AndroidLogin`**
(tam, gdzie `syncFavorites`, `startBusTracking`, `onPanelChanged`, `haptic` — patrz
`dokumenty/haptyka-aplikacja-android.md`). To nie jest nowy most, tylko nowa metoda na
starym.

Aplikacja ma odpowiedzieć **jednym z dwóch** globalnych wywołań w WebView, gdy proces się
zakończy:

```js
// Sukces — token ID z Google, jako zwykły string (trzyczłonowy JWT).
window.onNativeLoginSuccess(idToken);

// Porażka albo anulowanie przez użytkownika.
window.onNativeLoginError("Logowanie anulowane");
```

Strona sama wyśle token na `/auth/google/native`, założy sesję (ciasteczko) i zamknie
ekran zgody — po Twojej stronie zostaje wyłącznie zdobycie tokenu i to jedno wywołanie
z powrotem. Token **nigdy nie zostaje zapisany w przeglądarce** — leci raz, na serwer,
do weryfikacji.

## Jak zdobyć token — Credential Manager, nie stary GoogleSignIn

Stary `GoogleSignInClient`/`GoogleSignInOptions` jest u Google w fazie wygaszania.
Obecnie zalecany sposób to **Credential Manager** z opcją logowania Google:

```kotlin
// build.gradle.kts (app)
dependencies {
    implementation("androidx.credentials:credentials:1.5.0")
    implementation("androidx.credentials:credentials-play-services-auth:1.5.0")
    implementation("com.google.android.libraries.identity.googleid:googleid:1.1.1")
}
```

Sprawdź na pulpicie Androida (developer.android.com/identity/sign-in/credential-manager),
czy te numery wersji są nadal aktualne — biblioteka bywa aktualizowana, a sama koncepcja
(Credential Manager + `GetSignInWithGoogleOption`) zostaje.

```kotlin
class BUSearchBridge(
    private val activity: Activity,
    private val webView: WebView,
) {
    // TEN SAM client_id co GOOGLE_CLIENT_ID na serwerze (typu "Aplikacja internetowa"
    // w Google Cloud Console — nie zakładaj OSOBNEGO client_id typu "Android").
    // Poproś Szymona o wartość — to ten sam identyfikator, którego już używa logowanie
    // w przeglądarce. Dzięki temu po stronie serwera NIC nie trzeba dodatkowo ustawiać.
    private val WEB_CLIENT_ID = "PODMIEN-NA-PRAWDZIWY-CLIENT-ID.apps.googleusercontent.com"

    @JavascriptInterface
    fun triggerGoogleLogin() {
        // UWAGA: to leci na wątku "JavaBridge", nie na głównym — Credential Manager
        // potrzebuje Activity i UI, więc przeskakujemy na główny wątek (ten sam
        // zastrzeżenie co przy haptic() w dokumenty/haptyka-aplikacja-android.md).
        activity.runOnUiThread {
            uruchomLogowanie()
        }
    }

    private fun uruchomLogowanie() {
        val option = GetSignInWithGoogleOption.Builder(WEB_CLIENT_ID).build()
        val request = GetCredentialRequest.Builder()
            .addCredentialOption(option)
            .build()

        val credentialManager = CredentialManager.create(activity)

        activity.lifecycleScope.launch {
            try {
                val result = credentialManager.getCredential(activity, request)
                val credential = result.credential

                if (credential is CustomCredential &&
                    credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL
                ) {
                    val googleIdTokenCredential = GoogleIdTokenCredential.createFrom(credential.data)
                    val idToken = googleIdTokenCredential.idToken
                    oddajDoWebView("onNativeLoginSuccess", idToken)
                } else {
                    oddajDoWebView("onNativeLoginError", "Nieoczekiwany typ danych logowania")
                }
            } catch (e: GetCredentialCancellationException) {
                oddajDoWebView("onNativeLoginError", "Logowanie anulowane")
            } catch (e: NoCredentialException) {
                // Na urzadzeniu nie ma zadnego konta Google (albo uzytkownik nigdy
                // zadnego nie dodal) — Credential Manager samo NIE zaproponuje dodania
                // konta, trzeba to obsluzyc osobno (patrz sekcja nizej).
                oddajDoWebView("onNativeLoginError", "Brak konta Google na urządzeniu")
            } catch (e: GetCredentialException) {
                // Dolacz e.type i e.message do komunikatu (albo przynajmniej do logow) —
                // "Nie udalo sie zalogowac" bez niczego wiecej nie da sie zdiagnozowac.
                // Patrz sekcja "Samsung / One UI" nizej: to najczestsze zrodlo tego wyjatku.
                oddajDoWebView("onNativeLoginError", "Nie udało się zalogować (${e.type}: ${e.message})")
            }
        }
    }

    // JS trzeba wolac na glownym watku WebView, nie z korutyny bezposrednio.
    private fun oddajDoWebView(funkcja: String, argument: String) {
        activity.runOnUiThread {
            val bezpieczny = org.json.JSONObject.quote(argument) // poprawne cudzyslowy/ucieczki w JS
            webView.evaluateJavascript("window.$funkcja($bezpieczny)", null)
        }
    }
}
```

Rejestracja mostka bez zmian — to ten sam obiekt, który już wystawiasz:

```kotlin
webView.addJavascriptInterface(BUSearchBridge(this, webView), "AndroidLogin")
```

## Samsung / One UI — GetCredentialException tam, gdzie na Pixelu działa

Zgłoszony realny przypadek: logowanie działa na Pixelu, a na Samsungu wywala się z ogólnym
`GetCredentialException` (widocznym u nas jako gołe „-1", bo ktoś po drodze pokazał
`e.errorCode`/kod zamiast opisu — stąd zmiana wyżej, żeby zawsze lecieć `e.type` + `e.message`).
To nie przypadek — dwie najczęstsze przyczyny specyficzne dla Samsunga (One UI):

1. **Samsung Pass jako konkurencyjny dostawca poświadczeń.** Samsungi rejestrują własnego
   dostawcę (Samsung Pass) obok Google w Credential Managerze. Selektor dostawcy potrafi się
   pogubić, zwłaszcza gdy Samsung Pass nie obsługuje typu danych logowania Google — kończy się
   ogólnym wyjątkiem zamiast poproszeniem o wybór konta Google.
2. **Wolniej aktualizowane Usługi Google Play.** Samsung dystrybuuje aktualizacje Play Services
   przez własny/operatorski kanał, nie prosto od Google — starszy build może nie obsługiwać
   `GetSignInWithGoogleOption` (stosunkowo nowej ścieżki Credential Managera), podczas gdy Pixel
   zawsze ma najświeższą wersję prosto od Google.

Co sprawdzić / zrobić:
- Zalogować `e.type` i `e.message` (patrz zmiana wyżej) zamiast pokazywać gołą liczbę — bez tego
  nie da się odróżnić przyczyny 1 od 2 ani od czegoś trzeciego.
- Sprawdzić wersję Usług Google Play na zgłaszającym Samsungu (Ustawienia → Aplikacje → Usługi
  Google Play → wersja) i porównać z Play Store.
- `implementation("androidx.credentials:credentials-play-services-auth:1.5.0")` (już w zależnościach
  wyżej) daje fallback na starszą ścieżkę Google Sign-In przez Play Services — upewnić się, że
  faktycznie z niego korzysta na urządzeniach, gdzie nowsza ścieżka Credential Managera zawodzi,
  zamiast po prostu pokazywać błąd.

## Brak konta Google na urządzeniu

`GetSignInWithGoogleOption` **nie** proponuje samo dodania konta, gdy na telefonie nie ma
żadnego skonfigurowanego konta Google — po prostu rzuci `NoCredentialException`. W takiej
sytuacji dobra praktyka to pokazanie własnego komunikatu z przyciskiem otwierającym
ustawienia kont systemowych:

```kotlin
val intent = Intent(Settings.ACTION_ADD_ACCOUNT).apply {
    putExtra(Settings.EXTRA_ACCOUNT_TYPES, arrayOf("com.google"))
}
activity.startActivity(intent)
```

Strona i tak dostanie `onNativeLoginError`, więc UI logowania samo się nie zamyka —
możesz spokojnie pokazać własny dialog nad tym, co jest, i dać użytkownikowi wrócić
do „Zaloguj" po dodaniu konta.

## Czego NIE robić

- **Nie zakładaj osobnego client_id typu „Android"** w Google Cloud Console, chyba że
  naprawdę musisz (np. wymóg podpisu SHA-1 per build). Jeśli jednak dojdzie do tego, że
  token przychodzi z innym `client_id` niż web, serwer i tak ma na to gotowe miejsce:
  zmienna środowiskowa `GOOGLE_ANDROID_CLIENT_ID` (lista po przecinku, jeśli więcej niż
  jeden) — powiedz Szymonowi, żeby ją dopisał, sam kod już to obsługuje
  (`GOOGLE_EXTRA_AUDIENCES` w `server.ts`). Domyślnie jest pusta — najprościej jest jej
  w ogóle nie potrzebować, używając web client id.
- **Nie zapisuj tokenu ID** nigdzie po stronie aplikacji (SharedPreferences, DataStore
  itp.) — to jednorazowy dowód tożsamości do wymiany na sesję, nie coś do trzymania.
  Po zalogowaniu WebView ma zwykłe ciasteczko sesji (`wiki_session`, `HttpOnly`) — to ono
  utrzymuje login, nie token.
- **Nie wywołuj `evaluateJavascript` z tła** — musi lecieć na głównym wątku WebView,
  inaczej bywa cicho gubione.
- **Nie zakładaj `com.google.android.gms.auth.api.signin.*`** (stary `GoogleSignIn`) —
  to inna rodzina API, nieprzetestowana z tym mostkiem; jeżeli aplikacja już go gdzieś
  używa (np. do czegoś innego niż logowanie do Wiki), token z niego też jest zwykłym
  ID tokenem i POWINIEN zadziałać identycznie, ale Credential Manager to droga, na którą
  celuje ten dokument.

## Jak to sprawdzić

Bez klikania w prawdziwy ekran logowania — w konsoli WebView (np. przez
`chrome://inspect` z komputera):

```js
window.onNativeLoginSuccess("zly.token.testowy");
```

Powinno wywołać żądanie do `/auth/google/native`, które odrzuci token jako
niepoprawny (weryfikacja u Google) — to potwierdza, że sama ścieżka JS → fetch działa,
zanim w ogóle dotkniesz Credential Managera. Prawdziwy test wymaga realnego logowania
na urządzeniu z kontem Google.

Gdy zadziała poprawnie: ekran zgody w `/app/wiki` sam się zamknie, pasek konta na górze
pokaże Twoje imię i awatar, a wszystkie akcje pisania (dodawanie zdjęć, wpisów, zmiana
danych pojazdu) się odblokują.
