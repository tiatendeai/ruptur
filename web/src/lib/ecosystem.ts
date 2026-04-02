import branding from "./branding.json";

export const ecosystemBranding = branding;

const PATH_LABELS: Array<{ test: RegExp; label: string }> = [
  { test: /^\/warmup(\/|$)/, label: ecosystemBranding.product.warmupName },
  { test: /^\/connections(\/|$)/, label: "Conexões" },
  { test: /^\/inbox(\/|$)/, label: "Inbox" },
  { test: /^\/crm(\/|$)/, label: "CRM" },
  { test: /^\/pipeline(\/|$)/, label: "Pipeline" },
  { test: /^\/broadcasts(\/|$)/, label: "Campanhas" },
  { test: /^\/sendflow(\/|$)/, label: "Sendflow" },
  { test: /^\/metrics(\/|$)/, label: "Métricas" },
  { test: /^\/billing(\/|$)/, label: "Planos" },
  { test: /^\/studio(\/|$)/, label: "Studio" },
  { test: /^\/showcase(\/|$)/, label: "Showcase" },
  { test: /^\/login(\/|$)/, label: "Acesso" },
  { test: /^\/app(\/|$)/, label: "Aplicação" },
  { test: /^\/$/, label: ecosystemBranding.product.frontName },
];

export function getEcosystemPageLabel(pathname: string | null | undefined) {
  const normalizedPath = pathname?.trim() || "/";
  const matched = PATH_LABELS.find(({ test }) => test.test(normalizedPath));
  return matched?.label ?? ecosystemBranding.product.shortName;
}

export function buildEcosystemBrowserTitle(pathname: string | null | undefined) {
  const label = getEcosystemPageLabel(pathname);
  if (label === ecosystemBranding.product.shortName) {
    return ecosystemBranding.browser.defaultTitle;
  }
  return `${ecosystemBranding.product.shortName} — ${label}`;
}

export function buildEcosystemWhatsAppMessage(pathname: string | null | undefined) {
  const normalizedPath = pathname?.trim() || "/";
  const pageLabel = getEcosystemPageLabel(normalizedPath);
  return `Olá! Vim do módulo ${pageLabel} na página ${normalizedPath} do projeto ${ecosystemBranding.product.shortName} e preciso de ajuda.`;
}

export function buildEcosystemWhatsAppHref(pathname: string | null | undefined) {
  const message = buildEcosystemWhatsAppMessage(pathname);
  return `${ecosystemBranding.support.whatsappBaseUrl}?text=${encodeURIComponent(message)}`;
}
