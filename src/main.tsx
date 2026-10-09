import React, { lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";
import { cityName } from "./config/city";

const path = location.pathname.replace(/\/+$/, "") || "/";
const HomePage = lazy(() => import("./pages/HomePage").then((module) => ({ default: module.HomePage })));
const AnnouncementsPage = lazy(() => import("./pages/AnnouncementsPage").then((module) => ({ default: module.AnnouncementsPage })));
const DocumentPage = lazy(() => import("./pages/DocumentPage").then((module) => ({ default: module.DocumentPage })));
const InstallPage = lazy(() => import("./pages/InstallPage").then((module) => ({ default: module.InstallPage })));
const ApiDocsPage = lazy(() => import("./pages/ApiDocsPage").then((module) => ({ default: module.ApiDocsPage })));
const TestersPage = lazy(() => import("./pages/TestersPage").then((module) => ({ default: module.TestersPage })));
const EmergencyPage = lazy(() => import("./pages/EmergencyPage").then((module) => ({ default: module.EmergencyPage })));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage").then((module) => ({ default: module.NotFoundPage })));
const App = lazy(() => import("./App").then((module) => ({ default: module.App })));
const subpath = path.replace(/^\/(bydgoszcz|torun|trojmiasto)/, "") || "/";
const knownCity = /^\/(bydgoszcz|torun|trojmiasto)(\/|$)/.test(path);
const isMapPage = knownCity && (subpath === "/" || subpath === "/app");
const documentName = (["regulamin", "polityka-prywatnosci", "dokumentacja"] as const).find((name) => subpath === `/${name}`);
if (path !== "/" && path !== "/miasta") document.title = `BUSearch ${cityName} — autobusy i tramwaje na żywo`;

const rootElement = document.getElementById("root");
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <Suspense fallback={null}>{(path === "/" || path === "/miasta" || path === "/aplikacja") ? <HomePage /> : subpath === "/ogloszenia" ? <AnnouncementsPage /> : documentName ? <DocumentPage name={documentName} /> : subpath === "/webapp" ? <InstallPage /> : subpath === "/api-docs" || subpath === "/api" ? <ApiDocsPage /> : subpath === "/testy" ? <TestersPage /> : subpath === "/awaria" || subpath === "/error" ? <EmergencyPage name={subpath.slice(1) as "awaria" | "error"} /> : isMapPage ? <App /> : <NotFoundPage />}</Suspense>
    </React.StrictMode>
  );
}
