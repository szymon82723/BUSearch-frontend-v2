import { useEffect, useState } from "react";
import type { Stop } from "../types/transit";
import { readDepartureWatches, removeDepartureWatch, saveDepartureWatch, type DepartureWatch } from "../services/departure-notifications";

export function StopNotificationForm({ stop, lines }: { stop: Stop; lines: string[] }) {
  const [watches, setWatches] = useState<DepartureWatch[]>([]);
  const [line, setLine] = useState(lines[0] || "");
  const [lead, setLead] = useState(3);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  useEffect(() => { let active = true; readDepartureWatches().then(data => { if (active) setWatches(data); }).catch(() => { if (active) setStatus("Nie udało się odczytać aktywnych powiadomień."); }); return () => { active = false; }; }, [stop.id]);
  const existing = watches.find(w => w.stopId === stop.id && w.line === line);
  const available = [...new Set([...lines, ...watches.filter(w => w.stopId === stop.id).map(w => w.line)])];
  async function update(remove = false) {
    if (!line || busy) return;
    setBusy(true); setStatus(remove ? "Usuwanie…" : "Włączanie powiadomienia…");
    try {
      if (remove && existing) await removeDepartureWatch(existing.id);
      else await saveDepartureWatch(stop, line, lead);
      setWatches(await readDepartureWatches());
      setStatus(remove ? "Powiadomienie usunięte." : `Powiadomimy Cię, gdy linia ${line} będzie około ${lead} min od przystanku.`);
    } catch (error) { setStatus(error instanceof Error ? error.message : "Błąd sieci. Spróbuj ponownie."); }
    finally { setBusy(false); }
  }
  return <div className="stop-panel__notification-form" id="stopPanelNotifyPop">
    <label>Linia<select id="notifyLineSelect" value={line} disabled={busy} onChange={e => setLine(e.target.value)}>{available.map(value => <option key={value} value={value}>{value}{watches.some(w => w.stopId === stop.id && w.line === value) ? " (aktywne)" : ""}</option>)}</select></label>
    <label>Powiadom<select id="notifyLeadSelect" value={lead} disabled={busy} onChange={e => setLead(Number(e.target.value))}>{[1, 3, 5, 10].map(value => <option key={value} value={value}>{value} min przed przyjazdem</option>)}</select></label>
    <div><button id="notifySetBtn" type="button" disabled={busy || !line} onClick={() => void update()}>{existing ? "Zaktualizuj powiadomienie" : "Ustaw powiadomienie"}</button>{existing && <button id="notifyRemoveBtn" type="button" disabled={busy} onClick={() => void update(true)}>Usuń powiadomienie</button>}</div>
    <p role="status" id="notifyPopStatus">{status || (existing ? `Aktywne — linia ${line}, ${existing.leadMinutes} min przed przyjazdem.` : "")}</p>
  </div>;
}
