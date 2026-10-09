import { useState } from "react";

const CONSENT_KEY = "busearch_dokumenty_potwierdzone";

export function ConsentBanner() {
  const [visible, setVisible] = useState(() => {
    if (document.documentElement.dataset.goly === "1") return false;
    try { return !localStorage.getItem(CONSENT_KEY); } catch { return true; }
  });

  if (!visible) return null;

  return (
    <div className="ui-zgoda" id="uiZgoda">
      <div className="ui-zgoda__czytak" aria-hidden="true">
        <svg viewBox="0 0 52 44" width="46" height="39">
          <g className="czytak-bus">
            <rect x="6" y="4" width="30" height="24" rx="7" fill="#D7FFE0" />
            <rect x="9.5" y="7.5" width="23" height="9" rx="3.5" fill="#050505" />
            <circle className="czytak-oko" cx="16" cy="21" r="2.6" fill="#050505" />
            <circle className="czytak-oko" cx="26" cy="21" r="2.6" fill="#050505" />
            <circle cx="13" cy="30" r="3.6" fill="#050505" />
            <circle cx="29" cy="30" r="3.6" fill="#050505" />
            <circle cx="13" cy="30" r="1.3" fill="#6a6a6a" />
            <circle cx="29" cy="30" r="1.3" fill="#6a6a6a" />
          </g>
          <g className="czytak-ksiazka">
            <path d="M24 30 L36 26 L36 39 L24 43 Z" fill="#ededed" />
            <path d="M48 26 L36 26 L36 39 L48 39 Z" fill="#9a9a9a" />
            <path className="czytak-kartka" d="M36 26 L48 26 L48 39 L36 39 Z" fill="#ededed" />
            <path d="M36 26 L36 39" stroke="#6a6a6a" strokeWidth="1.1" />
            <path d="M27.5 32.5 L33 30.6 M27.5 35.5 L33 33.6 M39 30 L45 30 M39 33 L45 33" stroke="#6a6a6a" strokeWidth="1.1" strokeLinecap="round" />
          </g>
        </svg>
      </div>
      <div className="ui-zgoda__tresc">
        Korzystając z BUSearch akceptujesz <a href="/regulamin" target="_blank" rel="noopener">regulamin</a> i <a href="/polityka-prywatnosci" target="_blank" rel="noopener">politykę prywatności</a>. Dane o pojazdach mają charakter orientacyjny.
      </div>
      <button className="ui-zgoda__ok" id="uiZgodaOk" type="button" onClick={() => {
        setVisible(false);
        try { localStorage.setItem(CONSENT_KEY, "1"); } catch { /* storage disabled */ }
      }}>Rozumiem</button>
    </div>
  );
}
