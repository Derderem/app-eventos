export function readShareTarget() {
  if (typeof window === "undefined") return null;

  const params = new URLSearchParams(window.location.search);

  const title = params.get("title") || "";
  const text = params.get("text") || "";
  const url = params.get("url") || "";

  // Prioridad:
  // 1. URL si comparten un enlace
  // 2. Texto si comparten texto normal
  // 3. Título como último recurso
  const value = (url || text || title).trim();

  if (!value) return null;

  return {
    title,
    text,
    url,
    value
  };
}

export function clearShareTargetParams() {
  if (typeof window === "undefined") return;

  const cleanUrl = new URL(window.location.href);

  cleanUrl.searchParams.delete("title");
  cleanUrl.searchParams.delete("text");
  cleanUrl.searchParams.delete("url");

  const finalUrl = cleanUrl.pathname + cleanUrl.search + cleanUrl.hash;

  window.history.replaceState({}, document.title, finalUrl);
}
