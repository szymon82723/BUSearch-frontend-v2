import { apiPath } from "../config/city";
import type { Stop } from "../types/transit";

export interface DepartureWatch { id: string; line: string; stopId: number; stopName: string; leadMinutes: number }
export function notifyClientId(): string {
  const key = "busearch_notify_client_id";
  let id = localStorage.getItem(key);
  if (!id) { id = `c${crypto.randomUUID().replaceAll("-", "")}`; localStorage.setItem(key, id); }
  return id;
}
async function request(path: string, init?: RequestInit) {
  const response = await fetch(apiPath(path), { cache: "no-store", ...init });
  const data = await response.json();
  if (!response.ok || data.ok === false) throw new Error(data.error || "Nie udało się zapisać powiadomienia.");
  return data;
}
export async function readDepartureWatches(): Promise<DepartureWatch[]> {
  if (!localStorage.getItem("busearch_notify_client_id")) return [];
  const data = await request(`notify-watches?clientId=${encodeURIComponent(notifyClientId())}`);
  return Array.isArray(data.watches) ? data.watches : [];
}
export async function removeDepartureWatch(id: string): Promise<void> {
  await request(`notify-watches/${encodeURIComponent(id)}?clientId=${encodeURIComponent(notifyClientId())}`, { method: "DELETE" });
}
async function subscribe() {
  const bridge = (window as Window & { AndroidLogin?: { getFcmToken?: () => string; requestNotificationPermission?: () => void } }).AndroidLogin;
  if (bridge?.getFcmToken) {
    bridge.requestNotificationPermission?.();
    let token = bridge.getFcmToken();
    for (let i = 0; !token && i < 15; i++) { await new Promise(resolve => setTimeout(resolve, 400)); token = bridge.getFcmToken(); }
    if (!token) throw new Error("Aplikacja przygotowuje powiadomienia. Spróbuj ponownie za chwilę.");
    await request("push/fcm-subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientId: notifyClientId(), token, platform: "android" }) });
    return;
  }
  if (!window.isSecureContext || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) throw new Error("Ta przeglądarka nie obsługuje powiadomień. Na iPhonie dodaj BUSearch do ekranu głównego z Safari.");
  if (await Notification.requestPermission() !== "granted") throw new Error("Zezwól na powiadomienia w ustawieniach przeglądarki.");
  await navigator.serviceWorker.register("/push-sw.js");
  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    const data = await request("push/vapid-public-key");
    if (!data.publicKey) throw new Error("Powiadomienia są chwilowo niedostępne.");
    const base64 = data.publicKey.replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(base64 + "=".repeat((4 - base64.length % 4) % 4));
    subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: Uint8Array.from(raw, (char: string) => char.charCodeAt(0)) });
  }
  await request("push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientId: notifyClientId(), subscription: subscription.toJSON() }) });
}
export async function saveDepartureWatch(stop: Stop, line: string, leadMinutes: number): Promise<void> {
  await subscribe();
  await request("notify-watches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientId: notifyClientId(), line, stopId: stop.id, stopName: stop.nazwa, leadMinutes }) });
}
