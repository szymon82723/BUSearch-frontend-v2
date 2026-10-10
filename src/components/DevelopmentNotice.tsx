import { ExternalLink } from "lucide-react";
import "../styles/development-notice.css";

export function DevelopmentNotice({ home = false }: { home?: boolean }) {
  return (
    <aside className={`development-notice${home ? " development-notice--home" : ""}`} aria-label="Prace nad nową wersją">
      <span>Trwają prace nad nową wersją BUSearch.</span>
      <a href="https://github.com/szymon82723/BUSearch-frontend-v2" target="_blank" rel="noopener noreferrer">
        GitHub <ExternalLink size={14} aria-hidden="true" />
      </a>
    </aside>
  );
}
