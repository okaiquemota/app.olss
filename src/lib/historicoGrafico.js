const MESES_MAP = { Jan: 1, Fev: 2, Mar: 3, Abr: 4, Mai: 5, Jun: 6, Jul: 7, Ago: 8, Set: 9, Out: 10, Nov: 11, Dez: 12 };

// Monta os últimos 6 meses (cronológicos, sem duplicata) de geração de um cliente para o gráfico do PDF
// `relatorios` já deve vir filtrado pelo chamador (ex: excluindo o relatório em edição)
export function montarHistoricoGrafico(relatorios, clienteId, extra = null) {
  const historicoBruto = relatorios.filter(r => r.cliente_id === clienteId);
  if (extra) historicoBruto.push(extra);

  historicoBruto.sort((a, b) => {
    const [mesA, anoA] = a.mes_referencia.split('/');
    const [mesB, anoB] = b.mes_referencia.split('/');
    return (parseInt(anoA) * 100 + MESES_MAP[mesA]) - (parseInt(anoB) * 100 + MESES_MAP[mesB]);
  });

  const historicoAgrupado = {};
  historicoBruto.forEach(r => {
    historicoAgrupado[r.mes_referencia] = parseFloat(r.geracao_atual) || 0;
  });

  const chavesMeses = Object.keys(historicoAgrupado).slice(-6);
  return chavesMeses.map(chave => ({
    mes: chave.substring(0, 3),
    geracao: historicoAgrupado[chave],
  }));
}
