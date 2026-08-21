// Só http(s) vira link clicável. Sem essa checagem, um valor salvo como
// "javascript:..." no campo de link da plataforma viraria um href executável.
const ESQUEMAS_PERMITIDOS = ['http:', 'https:'];

export function linkSeguro(valor) {
  if (!valor) return null;

  const bruto = valor.trim();
  if (!bruto) return null;

  // Sem esquema explícito (ex: "portal.plataforma.com") assume https
  const comEsquema = /^[a-z][a-z0-9+.-]*:/i.test(bruto) ? bruto : `https://${bruto}`;

  try {
    const url = new URL(comEsquema);
    return ESQUEMAS_PERMITIDOS.includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}
