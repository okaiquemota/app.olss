// Os campos de valor são digitados à mão e aceitam vírgula decimal ("0,85").
// parseFloat pararia na vírgula e devolveria 0, então a conversão passa sempre
// por aqui — tanto no cálculo da tela quanto na montagem do PDF, para os dois
// não divergirem.
export function paraNumero(valor) {
  if (valor === null || valor === undefined || valor === '') return 0;
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : 0;

  const normalizado = String(valor).trim().replace(/\s/g, '').replace(',', '.');
  const n = parseFloat(normalizado);
  return Number.isFinite(n) ? n : 0;
}

// Formata em reais no padrão brasileiro: 1234.5 -> "1.234,50"
export function formatarReal(valor) {
  return paraNumero(valor).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
