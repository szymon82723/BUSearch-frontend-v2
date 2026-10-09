import { useEffect, useState } from "react";
import "../../public/documents/_styl.css";

type DocumentName = "regulamin" | "polityka-prywatnosci" | "dokumentacja";

export function DocumentPage({ name }: { name: DocumentName }) {
  const [body, setBody] = useState("");
  const [pageStyle, setPageStyle] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/documents/${name}.html`, { signal: controller.signal })
      .then((res) => { if (!res.ok) throw new Error(String(res.status)); return res.text(); })
      .then((html) => {
        const parsed = new DOMParser().parseFromString(html, "text/html");
        document.title = parsed.title;
        setPageStyle(parsed.querySelector("style")?.textContent ?? "");
        parsed.querySelectorAll("img[src^='/public/documents/']").forEach((image) => {
          image.setAttribute("src", image.getAttribute("src")!.replace("/public/documents/", "/documents/"));
        });
        parsed.querySelectorAll("a[href^='/public/']").forEach((link) => {
          link.setAttribute("href", link.getAttribute("href")!.replace("/public/", "/"));
        });
        setBody(parsed.body.innerHTML);
      })
      .catch(() => { if (!controller.signal.aborted) setBody("<p>Nie udało się wczytać dokumentu.</p>"); });
    return () => controller.abort();
  }, [name]);

  return <>
    {pageStyle && <style>{pageStyle}</style>}
    <div dangerouslySetInnerHTML={{ __html: body }} />
    {name !== "dokumentacja" && <p className="stopka-web"><a href="/">← BUSearch</a> · <a href={`/documents/${name}.pdf`}>Ten dokument w PDF</a></p>}
  </>;
}
