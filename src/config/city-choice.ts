export const LAST_CITY_KEY = "busearch_city_last";

export function saveCityChoice(slug: string): void {
  try {
    localStorage.setItem("busearch_city_choice", slug);
    localStorage.setItem(LAST_CITY_KEY, slug);
  } catch { /* storage disabled */ }
  document.cookie = `busearch_city=${encodeURIComponent(slug)}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export function openCity(slug: string, url: string): void {
  saveCityChoice(slug);
  const params = new URLSearchParams(location.search);
  params.delete("city");
  params.delete("wybor");
  location.href = `${url}${params.size ? `?${params}` : ""}`;
}
