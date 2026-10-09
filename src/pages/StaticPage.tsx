import { useEffect, useState } from "react";

export function StaticPage({ name }: { name: "testy" | "awaria" | "error" | "404" }) {
  const [body, setBody] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/pages/${name}.html`, { signal: controller.signal })
      .then((res) => { if (!res.ok) throw new Error(String(res.status)); return res.text(); })
      .then((html) => {
        const parsed = new DOMParser().parseFromString(html, "text/html");
        document.title = parsed.title;
        parsed.querySelectorAll("script").forEach((script) => script.remove());
        setBody(parsed.body.innerHTML);
      })
      .catch(() => { if (!controller.signal.aborted) setBody("<p>Nie udało się wczytać strony.</p>"); });
    return () => controller.abort();
  }, [name]);

  return <div className={`static-page static-page--${name}`} dangerouslySetInnerHTML={{ __html: body }} />;
}
