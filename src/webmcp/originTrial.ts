export const WEBMCP_ORIGIN_TRIAL_TOKEN =
  "Ah+a/JEJbks1kbcvf41GJqA9OdIVDjt/QzRUJ1RsxRu9bLx3SvJbeBasrQhOkiGuHoaiV63CMdvD/L+/NA8OLg4AAABceyJvcmlnaW4iOiJodHRwczovL2NvbnNwaXJhY3kuYWxpcmV6YWFmc2hhbi5jb206NDQzIiwiZmVhdHVyZSI6IldlYk1DUCIsImV4cGlyeSI6MTc5NDg3MzYwMH0=";

export function ensureWebMCPOriginTrial(): void {
  if (typeof document === "undefined" || !document.head || typeof document.createElement !== "function") return;
  if (document.head.querySelector('meta[http-equiv="origin-trial"]')) return;

  const meta = document.createElement("meta");
  meta.httpEquiv = "origin-trial";
  meta.content = WEBMCP_ORIGIN_TRIAL_TOKEN;
  document.head.prepend(meta);
}
