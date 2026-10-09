import { useEffect, useState } from "react";
import { ArrowLeft, X, Radio } from "lucide-react";
import type { Stop, LineTimetable, TripRun } from "../types/transit";
import { fetchLineTimetable, fetchTripRun } from "../services/api";
import { useBottomSheet } from "../hooks/useBottomSheet";
import { preferredTimetableVariant, timetableDayKey, timetableValidity, warsawClock } from "../config/timetable";

interface Props {
  line: string;
  stop: Stop;
  direction: string;
  onClose: () => void;
  onCourseChange: (course: TripRun | null) => void;
  onLiveDepartures: () => void;
}

export function TimetablePanel({ line, stop, direction, onClose, onLiveDepartures, onCourseChange }: Props) {
  const [courseChoice, setCourseChoice] = useState<{ time: string; day: string; date: string; direction: string; variant: string } | null>(null);
  const [course, setCourse] = useState<TripRun | null>(null);
  const [courseError, setCourseError] = useState("");
  const [courseRetry, setCourseRetry] = useState(0);
  useEffect(() => {
    const abort = new AbortController();
    setCourse(null); setCourseError(""); onCourseChange(null);
    if (courseChoice) fetchTripRun(line, stop, courseChoice, abort.signal).then(value => {
      if (!abort.signal.aborted) { setCourse(value); onCourseChange(value); }
    }).catch(reason => { if (!abort.signal.aborted) setCourseError(reason instanceof SyntaxError ? "Nie udało się pobrać kursu." : reason instanceof Error ? reason.message : "Nie udało się pobrać kursu."); });
    return () => { abort.abort(); onCourseChange(null); };
  }, [courseChoice, courseRetry, line, stop.id, onCourseChange]);
  const goBack = () => courseChoice ? setCourseChoice(null) : onClose();
  const [data, setData] = useState<LineTimetable | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [requestDate, setRequestDate] = useState("");
  const [dateInput, setDateInput] = useState(() => warsawClock().iso);
  const [dayKey, setDayKey] = useState("");
  const [variantId, setVariantId] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const { panelRef, headRef, handleRef, isExpanded, toggleExpanded, openAttr } = useBottomSheet({ isOpen: true, onClose, initialExpanded: true });

  useEffect(() => {
    const abort = new AbortController();
    setLoading(true); setError(""); setData(null);
    fetchLineTimetable(line, stop, requestDate, abort.signal).then(value => {
      if (abort.signal.aborted) return;
      setData(value); setLoading(false);
    }).catch(reason => {
      if (abort.signal.aborted) return;
      setError(reason instanceof Error && !(reason instanceof SyntaxError) ? reason.message : "Nie udało się pobrać rozkładu. Spróbuj ponownie.");
      setLoading(false);
    });
    return () => abort.abort();
  }, [line, stop.id, requestDate, retry]);

  useEffect(() => {
    const update = () => setNow(Date.now());
    const interval = setInterval(update, 30000);
    document.addEventListener("visibilitychange", update);
    return () => { clearInterval(interval); document.removeEventListener("visibilitychange", update); };
  }, []);

  const clock = warsawClock(now);
  const selectedDay = data?.dni.find(day => day.klucz === dayKey) ?? data?.dni.find(day => timetableDayKey(day.klucz) === clock.day) ?? data?.dni[0];
  const chosenVariant = variantId === -1 ? -1 : data?.warianty.some(variant => variant.idx === variantId) ? variantId! : data ? preferredTimetableVariant(data, direction) : -1;
  const variant = data?.warianty.find(item => item.idx === chosenVariant);
  const hours = (selectedDay?.godziny ?? []).map(hour => ({ ...hour, m: hour.m.filter(minute => chosenVariant === -1 || minute.w === chosenVariant).sort((a, b) => a.min - b.min) })).filter(hour => hour.m.length).sort((a, b) => a.h - b.h);
  const count = hours.reduce((total, hour) => total + hour.m.length, 0);
  const dayDate = selectedDay?.date ?? selectedDay?.data;
  const isToday = dayDate ? dayDate.replace(/-/g, "") === clock.iso.replace(/-/g, "") : timetableDayKey(selectedDay?.klucz ?? "") === clock.day;
  const next = isToday ? hours.flatMap(hour => hour.m.map(minute => hour.h * 60 + minute.min)).filter(time => time >= clock.minutes).sort((a, b) => a - b)[0] : undefined;
  const from = timetableValidity(data?.wazny_od);
  const to = timetableValidity(data?.wazny_do);

  return <div ref={panelRef} id="timetablePanel" className="ui-routepanel ui-anim timetable-panel" data-open={openAttr} data-expanded={isExpanded ? "1" : "0"} aria-live="polite">
    <div ref={headRef} className="ui-routepanel__head">
      <div ref={handleRef} className="ui-routepanel__handle" role="button" tabIndex={0} aria-label="Rozwiń lub zwiń rozkład" onClick={toggleExpanded} />
      <div className="ui-routepanel__headrow">
        <div><div className="ui-routepanel__title" id="timetablePanelTitle">{courseChoice ? `Kurs ${courseChoice.time}` : stop.nazwa}</div><div className="ui-routepanel__meta" id="timetablePanelMeta">Linia {line}{courseChoice ? (course ? ` · → ${course.kierunek} · ${course.przystanki.length} przystanków · ${course.dzien.nazwa}` : " · Przebieg kursu") : loading ? " · Wczytywanie rozkładu…" : variant ? ` · → ${variant.kierunek}` : data ? " · Wszystkie kierunki" : ""}{data && !courseChoice ? ` · ${count} odjazdów` : ""}</div></div>
        <div className="timetable-panel__actions">
          <button type="button" className="ui-routepanel__close" id="timetableLive" aria-label="Pokaż odjazdy na żywo" title="Odjazdy na żywo" onClick={onLiveDepartures}><Radio size={18}/></button>
          <button type="button" className="ui-routepanel__close" id="timetableBack" aria-label={courseChoice ? "Wróć do rozkładu" : "Wróć do przystanków linii"} onClick={goBack}><ArrowLeft size={18}/></button>
          <button type="button" className="ui-routepanel__close" id="timetableClose" aria-label="Zamknij rozkład" onClick={onClose}><X size={18}/></button>
        </div>
      </div>
    </div>
    <div className="ui-routepanel__body">
      {courseChoice && <div id="timetableCourse">
        {courseError ? <div className="line-tt__empty" role="status">{courseError} <button className="line-tab" id="timetableCourseRetry" onClick={() => setCourseRetry(value => value + 1)}>Ponów</button></div> : !course ? <div className="ui-routepanel__skeleton">Wczytywanie kursu…</div> : <>
          <div className="ui-routepanel__section-title">Przebieg kursu · godziny według rozkładu</div>
          <div className="line-stops">{course.przystanki.map((item, index) => <div key={`${item.id}-${index}`} className="ui-routepanel__stop" data-stop-id={item.id} data-active={item.wybrany ? "1" : "0"}><div className="ui-routepanel__stop-time">{item.czas}</div><div className="ui-routepanel__stop-rail"><div className="ui-routepanel__stop-dot"/></div><div className="ui-routepanel__stop-content"><div className="ui-routepanel__stop-name">{item.nazwa}</div></div></div>)}</div>
        </>}
      </div>}
      <div hidden={!!courseChoice}>
      <form className="timetable-panel__date" onSubmit={event => { event.preventDefault(); setDayKey(""); setRequestDate(dateInput); }}>
        <label htmlFor="timetableDate">Data rozkładu</label><input type="date" id="timetableDate" required value={dateInput} onChange={event => setDateInput(event.target.value)}/><button type="submit" className="line-tab">Pokaż</button>
        {requestDate && <button type="button" className="line-tab" id="timetableDefaultDays" onClick={() => { setRequestDate(""); setDayKey(""); setDateInput(clock.iso); }}>Typy dni</button>}
      </form>
      {loading ? <div className="ui-routepanel__skeleton">Wczytywanie rozkładu…</div> : error ? <div className="line-tt__empty" role="status">{error} <button type="button" className="line-tab" id="timetableRetry" onClick={() => setRetry(value => value + 1)}>Ponów</button></div> : data && <>
        {data.warianty.length > 1 && <div className="line-tabs" id="timetableVariants" aria-label="Kierunek rozkładu">
          <button type="button" className="line-tab" data-active={chosenVariant === -1 ? "1" : "0"} aria-pressed={chosenVariant === -1} onClick={() => setVariantId(-1)}>Wszystkie</button>
          {data.warianty.map(item => <button key={item.idx} type="button" className="line-tab" data-variant-id={item.idx} data-active={chosenVariant === item.idx ? "1" : "0"} aria-pressed={chosenVariant === item.idx} onClick={() => setVariantId(item.idx)}>{item.litera ? `${item.litera} · ` : ""}{item.kierunek}</button>)}
        </div>}
        <div className="line-tabs" id="timetableDays" aria-label="Dzień rozkładu">{data.dni.map(day => <button key={`${day.klucz}-${day.data}`} type="button" className="line-tab" data-day-key={day.klucz} data-active={day === selectedDay ? "1" : "0"} aria-pressed={day === selectedDay} onClick={() => setDayKey(day.klucz)}>{day.nazwa}</button>)}</div>
        <div className="line-tt" id="timetableHours">{hours.length === 0 ? <div className="line-tt__empty">{data.powod || "Brak odjazdów w tym dniu i kierunku."}</div> : hours.map(hour => <div key={hour.h} className="line-tt__row"><div className="line-tt__hour">{String(hour.h).padStart(2, "0")}</div><div className="line-tt__mins">{hour.m.map((minute, index) => {
          const item = data.warianty.find(v => v.idx === minute.w);
          const mark = minute.ozn || minute.litera || item?.litera;
          const hhmm = `${String(hour.h).padStart(2, "0")}:${String(minute.min).padStart(2, "0")}`;
          return <button type="button" onClick={() => setCourseChoice({ time: hhmm, day: selectedDay!.klucz, date: dayDate || requestDate || clock.iso, direction: item?.kierunek || "", variant: item?.litera || "" })} key={`${minute.min}-${minute.w}-${index}`} className="line-tt__min" data-time={hhmm} data-variant={minute.w} data-next={hour.h * 60 + minute.min === next ? "1" : "0"} title={`${hhmm}${item ? ` → ${item.kierunek}` : ""}`}>{String(minute.min).padStart(2, "0")}{mark && <sup className="line-tt__mark">{mark}</sup>}</button>;
        })}</div></div>)}</div>
        {data.warianty.length > 1 && <div className="line-legend"><div className="line-legend__title">Dokąd jadą kursy</div>{data.warianty.map(item => <div key={item.idx} className="line-legend__item"><span className="line-legend__mark" data-plain={item.litera ? "0" : "1"}>{item.litera || "bez oznaczenia"}</span><span>→ {item.kierunek}{item.opis && item.opis !== item.kierunek ? ` · ${item.opis}` : ""}</span></div>)}</div>}
        {(data.objasnienia ?? []).map((explanation, index) => <div key={index} className="line-legend__item">{explanation}</div>)}
        <div className="line-tt__foot">{from || to ? `Ważny${from ? ` od ${from}` : ""}${to ? ` do ${to}` : ""}` : "Rozkład z aktualnych danych przewoźnika"}</div>
      </>}
      </div>
    </div>
  </div>;
}
