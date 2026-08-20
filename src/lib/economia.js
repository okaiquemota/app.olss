const MESES_MAP = { Jan: 1, Fev: 2, Mar: 3, Abr: 4, Mai: 5, Jun: 6, Jul: 7, Ago: 8, Set: 9, Out: 10, Nov: 11, Dez: 12 };

// Economia de um relatório = soma, por UC, de (valor sem sistema - valor com sistema)
export function somarEconomiaRelatorio(relatorio) {
  const ucs = relatorio.faturas_cpfl?.ucs || [];
  return ucs.reduce((acc, u) => acc + (u.economia || 0), 0);
}

// Soma a economia de todos os meses do cliente dentro do mesmo ano do relatório,
// do início do ano até (e incluindo) o mês de referência informado.
// `relatorios` já deve vir filtrado pelo chamador (ex: excluindo o relatório em edição).
export function calcularEconomiaAcumuladaAno(relatorios, clienteId, mesReferenciaAlvo, extra = null) {
  const [mesAlvo, anoAlvo] = (mesReferenciaAlvo || '').split('/');
  const ordemAlvo = MESES_MAP[mesAlvo];

  const doAno = relatorios.filter(r => {
    if (r.cliente_id !== clienteId) return false;
    const [mes, ano] = (r.mes_referencia || '').split('/');
    return ano === anoAlvo && MESES_MAP[mes] <= ordemAlvo;
  });

  const lista = extra ? [...doAno, extra] : doAno;
  return lista.reduce((acc, r) => acc + somarEconomiaRelatorio(r), 0);
}
