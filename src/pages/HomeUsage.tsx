import { TrendingUp } from "lucide-react";
import stats from "./home-usage.json";

const number = (value: number) => value.toLocaleString("pl-PL");
const date = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString("pl-PL");

export function HomeUsage() {
  const metrics = [
    [number(stats.averageDailyVisitors), "odwiedzających dziennie", "średnia z 30 pełnych dni"],
    [number(stats.sessions), "sesji w serwisie", "wizyty w badanym okresie"],
    [number(stats.pageviews), "odsłon stron", "mapa i pozostałe strony serwisu"],
    [`${number(stats.mobilePageviewsPercent)}%`, "odsłon na telefonach", "udział urządzeń mobilnych"],
  ];
  return <section className="home-usage" aria-labelledby="usage-title">
    <div className="home-container">
      <div className="home-usage-heading"><div>
        <span className="home-eyebrow">BUSEARCH W LICZBACH</span>
        <h2 id="usage-title">Codziennie towarzyszymy Twoim podróżom.</h2>
      </div><p>Rzeczywiste statystyki odwiedzin busearch.pl<br /><time dateTime={stats.periodStart}>{date(stats.periodStart)}</time> – <time dateTime={stats.periodEnd}>{date(stats.periodEnd)}</time></p></div>
      <dl className="home-usage-metrics">{metrics.map(([value, label, detail]) => <div key={label}>
        <dt>{label}</dt><dd>{value}</dd><p>{detail}</p>
      </div>)}</dl>
      <div className="home-usage-trend">
        <div className="home-usage-trend-copy"><TrendingUp size={26} aria-hidden="true" /><h3>Odwiedzający każdego dnia</h3><p>Najwięcej w jednym dniu: <strong>{number(stats.peakDailyVisitors)}</strong>.<br />Średnio <strong>{number(stats.averageDailyVisitors)}</strong> dziennie w całym okresie.</p></div>
        <div className="home-usage-chart-wrap">
          <svg className="home-usage-chart" viewBox="0 0 600 130" role="img" aria-labelledby="usage-chart-title usage-chart-desc">
            <title id="usage-chart-title">Dzienna liczba odwiedzających BUSearch</title>
            <desc id="usage-chart-desc">{stats.daily.map(row => `${date(row.day)}: ${row.visitors}`).join("; ")}</desc>
            {stats.daily.map((row, index) => <rect key={row.day} x={index * 20 + 3} y={124 - row.visitors / stats.peakDailyVisitors * 112} width="13" height={row.visitors / stats.peakDailyVisitors * 112} rx="3"><title>{date(row.day)}: {number(row.visitors)} odwiedzających</title></rect>)}
          </svg>
          <div className="home-usage-chart-dates"><span>{date(stats.periodStart)}</span><span>{date(stats.periodEnd)}</span></div>
        </div>
      </div>
      <p className="home-usage-note">Źródło: {stats.source}, statystyki serwisu {stats.hostname}. Aktualizacja: {date(stats.generatedOn)}. Odwiedzający to unikalne identyfikatory mierzone w obrębie dnia, a nie liczba kont ani potwierdzona liczba osób. Sesja oznacza wizytę, a odsłona — otwarcie strony. Ten sam odwiedzający może wracać w kolejnych dniach.</p>
    </div>
  </section>;
}
