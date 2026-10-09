import { useEffect, useState } from "react";
import { cityBase } from "../config/city";
import "../styles/theme.css";
import "../styles/dark-panel.css";
import "../styles/api.css";

export function ApiDocsPage() {
  const [body, setBody] = useState("");

  useEffect(() => {
    document.title = "BUSearch — Dokumentacja API";
    const controller = new AbortController();
    fetch("/pages/api.html", { signal: controller.signal })
      .then((res) => { if (!res.ok) throw new Error(String(res.status)); return res.text(); })
      .then((html) => {
        const parsed = new DOMParser().parseFromString(html, "text/html");
        const base = parsed.getElementById("apiBaseUrl");
        if (base) base.textContent = `https://api.busearch.pl${cityBase}`;
        setBody(parsed.body.innerHTML);
      })
      .catch(() => { if (!controller.signal.aborted) setBody("<p>Nie udało się wczytać dokumentacji API.</p>"); });
    return () => controller.abort();
  }, []);

  return <div dangerouslySetInnerHTML={{ __html: body }} />;
}
