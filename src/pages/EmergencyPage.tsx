import { StaticPage } from "./StaticPage";
import "../styles/theme.css";
import "../styles/error-pages.css";
import "../styles/awaria.css";

export function EmergencyPage({ name = "awaria" }: { name?: "awaria" | "error" }) { return <StaticPage name={name} />; }
